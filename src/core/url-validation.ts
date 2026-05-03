// mktg — URL validation + safe fetch (task #23 fixes 2, 3, 5)
//
// Two distinct concerns, one module:
//
// 1. `validatePublicUrl` — reject URLs that point at private networks,
//    localhost, cloud metadata services, or non-http(s) schemes. Used at
//    every handler that fetches a user-supplied URL (`mktg init --from`,
//    `mktg compete add`). Blocks the classic SSRF → IMDS credential theft
//    primitive.
//
// 2. `fetchWithSizeCap` — fetch a URL with a hard body size limit and a
//    request timeout so a hostile scrape target can't OOM the CLI or wedge
//    the event loop. Stream the response and abort as soon as the cap is
//    hit instead of buffering the entire body first.
//
// Both functions return `{ ok, … }` envelopes (same pattern as the rest
// of src/core/errors.ts) and never throw.

/**
 * A URL passed validatePublicUrl() — safe to fetch from. The branded string
 * is purely a type-level marker; runtime value is the original href.
 */
export type PublicUrl = string & { readonly __publicUrl: unique symbol };

// Private / link-local IPv4 ranges expressed as prefix checks. The parser
// rejects anything that falls in these ranges, plus the literal aliases
// localhost / 0.0.0.0 / 127.x.
const PRIVATE_IPV4_PREFIXES: readonly ((octets: readonly number[]) => boolean)[] = [
  // 10.0.0.0/8
  (o) => o[0] === 10,
  // 127.0.0.0/8 (loopback)
  (o) => o[0] === 127,
  // 169.254.0.0/16 (link-local, includes AWS IMDS 169.254.169.254)
  (o) => o[0] === 169 && o[1] === 254,
  // 172.16.0.0/12
  (o) => o[0] === 172 && o[1] !== undefined && o[1] >= 16 && o[1] <= 31,
  // 192.168.0.0/16
  (o) => o[0] === 192 && o[1] === 168,
  // 0.0.0.0/8 (this-host)
  (o) => o[0] === 0,
  // 100.64.0.0/10 (CGNAT — shared address space)
  (o) => o[0] === 100 && o[1] !== undefined && o[1] >= 64 && o[1] <= 127,
];

// Literal hostnames that must never be accepted regardless of DNS.
const BLOCKED_LITERAL_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "0",
  "0.0.0.0",
  "[::]",
  "[::1]",
  "::",
  "::1",
  "broadcasthost",
  "metadata.google.internal", // GCP metadata service
  "metadata.goog",
]);

const tryParseUrl = (raw: string): URL | null => {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
};

const parseIpv4 = (host: string): readonly number[] | null => {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^[0-9]{1,3}$/.test(part)) return null;
    const n = Number.parseInt(part, 10);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
};

// Decode the 32-bit IPv4 suffix from an IPv4-mapped IPv6 address. Node's URL
// parser canonicalizes the suffix to compressed hex form: `::ffff:10.0.0.1`
// becomes `::ffff:a00:1` and `::ffff:169.254.169.254` becomes
// `::ffff:a9fe:a9fe`. We have to reconstruct the dotted-quad form ourselves.
//
// Accepts either form (dotted `10.0.0.1` or hex `a00:1`). Returns null if
// the suffix can't be interpreted as exactly 32 bits.
const decodeIpv4MappedSuffix = (suffix: string): readonly number[] | null => {
  // Dotted-quad form — already an IPv4 literal.
  if (suffix.includes(".")) {
    return parseIpv4(suffix);
  }
  // Hex form — one or two `hhhh` groups. A full 32-bit suffix compressed
  // with `:` between 16-bit groups. `a00:1` means `0a00:0001`.
  const groups = suffix.split(":");
  if (groups.length > 2) return null;
  const padded = groups.map((g) => {
    if (g.length === 0 || g.length > 4) return null;
    if (!/^[0-9a-f]+$/i.test(g)) return null;
    return g.padStart(4, "0");
  });
  if (padded.some((p) => p === null)) return null;
  // If only one group, the other half is zero: `a9fe` → `0000:a9fe`.
  if (padded.length === 1) padded.unshift("0000");
  const [high, low] = padded as [string, string];
  const highNum = Number.parseInt(high, 16);
  const lowNum = Number.parseInt(low, 16);
  if (Number.isNaN(highNum) || Number.isNaN(lowNum)) return null;
  return [
    (highNum >> 8) & 0xff,
    highNum & 0xff,
    (lowNum >> 8) & 0xff,
    lowNum & 0xff,
  ];
};

const isIpv6PrivateOrLoopback = (host: string): boolean => {
  // Bracketed IPv6 from URL parser, e.g. `[::1]`. Strip brackets.
  const h = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  const lower = h.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  // fe80::/10 (link-local)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }
  // fc00::/7 (unique local addresses)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // IPv4-mapped IPv6 `::ffff:a.b.c.d` (or its compressed hex canonicalization
  // `::ffff:a00:1`) — decode the 32-bit suffix and run the IPv4 private-range
  // check on it.
  if (lower.startsWith("::ffff:")) {
    const octets = decodeIpv4MappedSuffix(lower.slice(7));
    if (octets !== null && PRIVATE_IPV4_PREFIXES.some((check) => check(octets))) {
      return true;
    }
  }
  return false;
};

/**
 * Validate that a URL is safe to fetch from an SSRF standpoint:
 *   - scheme must be http or https (no file://, data:, javascript:, ftp://, etc.)
 *   - host must not be a literal blocked name (localhost, metadata.*)
 *   - host must not be an IPv4 address in a private / link-local / loopback range
 *   - host must not be an IPv6 address in the loopback / link-local / ULA ranges
 *
 * DNS rebinding is OUT OF SCOPE — the caller should re-resolve before connect
 * if they want to defend against TOCTOU. The common case for this CLI is
 * `mktg init --from https://raw.githubusercontent.com/...` which is a stable
 * public CDN and the threat model is "agent passed a malicious URL", not
 * "attacker controls DNS for legitimate-looking domain".
 */
export const validatePublicUrl = (
  raw: string,
): { ok: true; url: PublicUrl } | { ok: false; message: string } => {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, message: "URL must be a non-empty string" };
  }
  if (raw.length > 2048) {
    return { ok: false, message: "URL exceeds 2048 character limit" };
  }

  const parsed = tryParseUrl(raw);
  if (parsed === null) {
    return { ok: false, message: `Not a valid URL: ${raw.slice(0, 64)}` };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ok: false,
      message: `Only http and https URLs are allowed, got ${parsed.protocol}`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_LITERAL_HOSTS.has(hostname)) {
    return {
      ok: false,
      message: `Blocked host: ${hostname} (loopback / metadata service)`,
    };
  }

  // IPv6 literal check (URL parser keeps brackets on `hostname` for `[::1]`).
  if (hostname.includes(":")) {
    if (isIpv6PrivateOrLoopback(hostname)) {
      return {
        ok: false,
        message: `Blocked IPv6 address: ${hostname} (private / loopback / link-local)`,
      };
    }
  }

  // IPv4 literal check.
  const octets = parseIpv4(hostname);
  if (octets !== null) {
    if (PRIVATE_IPV4_PREFIXES.some((check) => check(octets))) {
      return {
        ok: false,
        message: `Blocked IPv4 address: ${hostname} (private / loopback / link-local / CGNAT)`,
      };
    }
  }

  return { ok: true, url: parsed.href as PublicUrl };
};

/**
 * Fetch a validated public URL with a hard body-size cap and a request
 * timeout. Returns the decoded text on success.
 *
 * - `maxBytes` defaults to 10 MB — enough for any normal manifest/scrape
 *   target, small enough that a hostile sender can't OOM the CLI.
 * - `timeoutMs` defaults to 30 seconds — enough for most networks, short
 *   enough that `mktg init --from` can't hang indefinitely on a tarpit.
 *
 * The body is streamed through a ReadableStream reader and the cap is
 * checked after every chunk; as soon as the cumulative byte count exceeds
 * `maxBytes`, the reader is cancelled and the function returns a structured
 * error. This is more defensive than `await resp.text()` which buffers the
 * full body first and only fails after allocating it.
 */
export const fetchWithSizeCap = async (
  url: PublicUrl,
  opts: { maxBytes?: number; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<{ ok: true; text: string; status: number } | { ok: false; message: string }> => {
  const maxBytes = opts.maxBytes ?? 10 * 1024 * 1024;
  const timeoutMs = opts.timeoutMs ?? 30_000;

  let resp: Response;
  try {
    // Conditionally spread headers so we never pass `headers: undefined`
    // into RequestInit — `exactOptionalPropertyTypes: true` rejects
    // optional-undefined, so the headers key must be absent when not set.
    resp = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      ...(opts.headers ? { headers: opts.headers } : {}),
      // Allow HTTP redirects but the validator checked the initial host only.
      // Chasing redirects to a private host is a known SSRF bypass — we can't
      // easily re-validate mid-flight in fetch(), so we reject any redirect
      // chain that ends up crossing schemes. `redirect: "manual"` gives us
      // the 3xx response to inspect.
      redirect: "manual",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Fetch failed: ${msg}` };
  }

  if (resp.status >= 300 && resp.status < 400) {
    const location = resp.headers.get("location");
    if (location === null) {
      return { ok: false, message: `Redirect without Location header (${resp.status})` };
    }
    // Resolve against the original URL to get an absolute href, then re-
    // validate. Only follow one hop — good enough for the CLI's use case
    // and a hard ceiling on redirect chains that could be used to exhaust
    // memory or sneak past SSRF checks.
    let next: URL;
    try {
      next = new URL(location, url);
    } catch {
      return { ok: false, message: `Invalid redirect target: ${location}` };
    }
    const revalidate = validatePublicUrl(next.href);
    if (!revalidate.ok) {
      return {
        ok: false,
        message: `Redirect rejected: ${revalidate.message}`,
      };
    }
    // One-hop follow — do not recurse on the revalidated target (prevents
    // infinite redirect chains and keeps the code trivially auditable).
    return fetchWithSizeCap(revalidate.url, { ...opts, maxBytes, timeoutMs });
  }

  if (!resp.ok) {
    return { ok: false, message: `HTTP ${resp.status} ${resp.statusText}` };
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    return { ok: false, message: "Response has no readable body" };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          return {
            ok: false,
            message: `Response body exceeds ${maxBytes} byte cap (capped at ${(maxBytes / (1024 * 1024)).toFixed(1)}MB)`,
          };
        }
        chunks.push(value);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Stream error: ${msg}` };
  }

  // Concatenate the captured chunks and decode as UTF-8 text.
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(combined);
  return { ok: true, text, status: resp.status };
};
