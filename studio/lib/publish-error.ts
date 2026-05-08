// lib/publish-error.ts
//
// Lane 8 Wave B / neonpulse fix #4: the Publish surfaces (history, queue,
// calendar) used to share an identical error body: title "X unavailable",
// description "The studio server may be down." Three pages, one string,
// no next action. This helper inspects the SWR error thrown by
// `lib/fetcher.ts` (which attaches `status`, `code`, `fix`, and `message`
// to a regular Error) and returns a per-surface (title, description, hint)
// triple so each tab tells the user what specifically broke and what to
// do about it.

export type PublishSurface = "history" | "queue" | "calendar"

const SURFACE_TITLES: Record<PublishSurface, string> = {
  history: "Publish history unavailable",
  queue: "Scheduled queue unavailable",
  calendar: "Calendar unavailable",
}

interface SwrError {
  status?: number
  code?: string
  fix?: string
  message?: string
}

function asSwrError(err: unknown): SwrError {
  if (err && typeof err === "object") return err as SwrError
  return {}
}

export interface PublishErrorCopy {
  title: string
  description: string
  hint?: string
}

export function publishErrorCopy(err: unknown, surface: PublishSurface): PublishErrorCopy {
  const e = asSwrError(err)
  const title = SURFACE_TITLES[surface]
  const status = e.status
  const code = e.code
  const message = e.message ?? ""
  const fix = e.fix

  // Auth failures: tell the user how to re-pair the dashboard with the server.
  if (status === 401 || code === "UNAUTHORIZED") {
    return {
      title,
      description: "Session token rejected.",
      hint:
        fix ??
        "Reload the page; the launcher re-attaches the bearer token on every fresh nav.",
    }
  }

  // Network-level failure: server down or unreachable.
  // `fetch` rejections in Chrome surface as TypeError "Failed to fetch";
  // status === 0 covers other browsers / aborted connections.
  if (status === 0 || /failed to fetch|networkerror|load failed/i.test(message)) {
    return {
      title,
      description: "The studio server stopped responding on :3001.",
      hint: "Run `mktg studio` again to bring it back, then refresh.",
    }
  }

  // Server crash / unhandled error.
  if (status !== undefined && status >= 500) {
    return {
      title,
      description: `Server returned ${status}. Live data could not be loaded.`,
      hint:
        fix ??
        "Check the server log in the terminal that started `mktg studio`; this is usually a transient mktg CLI failure.",
    }
  }

  // Upstream / mktg CLI failure surfaced via the studio's degraded envelope.
  if (code === "UPSTREAM_FAILED" || code === "DEGRADED") {
    return {
      title,
      description: message || "Upstream provider is degraded.",
      hint:
        fix ??
        "Postiz or the configured adapter rejected the call. Check Settings -> Connected providers.",
    }
  }

  // Bad input: rare on read endpoints, but surface concretely if it happens.
  if (code === "BAD_INPUT") {
    return {
      title,
      description: message || "Studio rejected the request shape.",
      hint: fix,
    }
  }

  // Fallback: surface the studio's own message if we have one, otherwise a
  // generic line that is still better than the old shared placeholder.
  return {
    title,
    description: message || `Could not load ${surface}.`,
    hint: fix,
  }
}
