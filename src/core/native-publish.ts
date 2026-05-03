import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { rejectControlChars, validateResourceId } from "./errors";

const NATIVE_DIR = ".mktg/native-publish";
const ACCOUNT_FILE = "account.json";
const PROVIDERS_FILE = "providers.json";
const POSTS_FILE = "posts.json";

export const NATIVE_PUBLISH_SUPPORTED_IDENTIFIERS = [
  "x",
  "tiktok",
  "instagram",
  "reddit",
  "linkedin",
] as const;

const NATIVE_PUBLISH_SUPPORTED_IDENTIFIER_SET = new Set<string>(
  NATIVE_PUBLISH_SUPPORTED_IDENTIFIERS,
);

type NativeVersioned = { readonly version: 1 };

export type NativePublishAccount = NativeVersioned & {
  readonly id: string;
  readonly apiKey: string;
  readonly mode: "workspace";
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type NativePublishAccountSummary = {
  readonly adapter: "mktg-native";
  readonly account: {
    readonly id: string;
    readonly apiKey: string;
    readonly apiKeyPreview: string;
    readonly mode: "workspace";
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly providerCount: number;
  readonly postCount: number;
};

export type NativePublishProvider = {
  readonly id: string;
  readonly identifier: string;
  readonly name: string;
  readonly picture: string;
  readonly disabled: boolean;
  readonly profile: string;
  readonly connectionMethod: "manual";
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type NativePublishProviderInput = {
  readonly id?: string;
  readonly identifier: string;
  readonly name: string;
  readonly picture?: string;
  readonly profile: string;
  readonly disabled?: boolean;
};

export type NativePublishPost = {
  readonly id: string;
  readonly campaign: string;
  readonly type: "draft" | "schedule" | "now" | "update";
  readonly date: string;
  readonly shortLink: false;
  readonly status: "draft" | "scheduled" | "published" | "failed";
  readonly posts: readonly {
    readonly integration: { readonly id: string; readonly identifier: string };
    readonly value: readonly { readonly content: string; readonly mediaPaths?: readonly string[] }[];
  }[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

type NativePublishProvidersFile = NativeVersioned & {
  readonly providers: readonly NativePublishProvider[];
};

type NativePublishPostsFile = NativeVersioned & {
  readonly posts: readonly NativePublishPost[];
};

const accountPath = (cwd: string): string => join(cwd, NATIVE_DIR, ACCOUNT_FILE);
const providersPath = (cwd: string): string => join(cwd, NATIVE_DIR, PROVIDERS_FILE);
const postsPath = (cwd: string): string => join(cwd, NATIVE_DIR, POSTS_FILE);

const accountPreview = (apiKey: string): string =>
  apiKey.length <= 12
    ? apiKey
    : `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNativeAccount = (value: unknown): value is NativePublishAccount => {
  if (!isObject(value)) return false;
  return (
    value.version === 1 &&
    typeof value.id === "string" &&
    typeof value.apiKey === "string" &&
    value.mode === "workspace" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
};

const isNativeProvider = (value: unknown): value is NativePublishProvider => {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.identifier === "string" &&
    typeof value.name === "string" &&
    typeof value.picture === "string" &&
    typeof value.disabled === "boolean" &&
    typeof value.profile === "string" &&
    value.connectionMethod === "manual" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
};

const isNativeProvidersFile = (value: unknown): value is NativePublishProvidersFile =>
  isObject(value) &&
  value.version === 1 &&
  Array.isArray(value.providers) &&
  value.providers.every(isNativeProvider);

const isNativePost = (value: unknown): value is NativePublishPost => {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.campaign === "string" &&
    (value.type === "draft" || value.type === "schedule" || value.type === "now" || value.type === "update") &&
    typeof value.date === "string" &&
    value.shortLink === false &&
    (value.status === "draft" || value.status === "scheduled" || value.status === "published" || value.status === "failed") &&
    Array.isArray(value.posts) &&
    value.posts.every((entry) =>
      isObject(entry) &&
      isObject(entry.integration) &&
      typeof entry.integration.id === "string" &&
      typeof entry.integration.identifier === "string" &&
      Array.isArray(entry.value) &&
      entry.value.every((part) =>
        isObject(part) &&
        typeof part.content === "string" &&
        (
          part.mediaPaths === undefined ||
          (Array.isArray(part.mediaPaths) && part.mediaPaths.every((path) => typeof path === "string"))
        ),
      ),
    ) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
};

const isNativePostsFile = (value: unknown): value is NativePublishPostsFile =>
  isObject(value) &&
  value.version === 1 &&
  Array.isArray(value.posts) &&
  value.posts.every(isNativePost);

const ensureDir = async (cwd: string): Promise<void> => {
  await mkdir(join(cwd, NATIVE_DIR), { recursive: true });
};

const writeJsonAtomic = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n");
  await rename(tmp, path);
};

const readJson = async <T>(
  path: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): Promise<T> => {
  const file = Bun.file(path);
  if (!(await file.exists())) return fallback;
  try {
    const parsed = await file.json() as unknown;
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const emptyProviders = (): NativePublishProvidersFile => ({ version: 1, providers: [] });
const emptyPosts = (): NativePublishPostsFile => ({ version: 1, posts: [] });

export const ensureNativePublishAccount = async (cwd: string): Promise<NativePublishAccount> => {
  await ensureDir(cwd);

  const existing = await readJson(accountPath(cwd), isNativeAccount, null);
  if (existing) return existing;

  const now = new Date().toISOString();
  const account: NativePublishAccount = {
    version: 1,
    id: `mktg-native-${randomUUID()}`,
    apiKey: `mktg_live_${randomBytes(18).toString("hex")}`,
    mode: "workspace",
    createdAt: now,
    updatedAt: now,
  };

  await writeJsonAtomic(accountPath(cwd), account);
  return account;
};

export const getNativePublishAccountSummary = async (
  cwd: string,
): Promise<NativePublishAccountSummary> => {
  const account = await ensureNativePublishAccount(cwd);
  const [providersFile, postsFile] = await Promise.all([
    readJson(providersPath(cwd), isNativeProvidersFile, emptyProviders()),
    readJson(postsPath(cwd), isNativePostsFile, emptyPosts()),
  ]);

  return {
    adapter: "mktg-native",
    account: {
      id: account.id,
      apiKey: account.apiKey,
      apiKeyPreview: accountPreview(account.apiKey),
      mode: account.mode,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    },
    providerCount: providersFile.providers.length,
    postCount: postsFile.posts.length,
  };
};

export const listNativePublishProviders = async (
  cwd: string,
): Promise<readonly NativePublishProvider[]> => {
  await ensureNativePublishAccount(cwd);
  const file = await readJson(providersPath(cwd), isNativeProvidersFile, emptyProviders());
  return [...file.providers].sort((a, b) =>
    a.identifier === b.identifier
      ? a.profile.localeCompare(b.profile)
      : a.identifier.localeCompare(b.identifier),
  );
};

export const upsertNativePublishProvider = async (
  cwd: string,
  input: NativePublishProviderInput,
): Promise<NativePublishProvider> => {
  await ensureNativePublishAccount(cwd);

  const identifierCheck = validateResourceId(input.identifier, "provider");
  if (!identifierCheck.ok) throw new Error(identifierCheck.message);
  const normalizedIdentifier = input.identifier.toLowerCase();
  if (!NATIVE_PUBLISH_SUPPORTED_IDENTIFIER_SET.has(normalizedIdentifier)) {
    throw new Error(
      `Unsupported native provider '${normalizedIdentifier}'. Use one of: ${NATIVE_PUBLISH_SUPPORTED_IDENTIFIERS.join(", ")}`,
    );
  }
  const nameCheck = rejectControlChars(input.name, "provider name");
  if (!nameCheck.ok) throw new Error(nameCheck.message);
  const profileCheck = rejectControlChars(input.profile, "provider profile");
  if (!profileCheck.ok) throw new Error(profileCheck.message);
  const pictureCheck = rejectControlChars(input.picture ?? "", "provider picture");
  if (!pictureCheck.ok) throw new Error(pictureCheck.message);

  const file = await readJson(providersPath(cwd), isNativeProvidersFile, emptyProviders());
  const now = new Date().toISOString();
  const providers = [...file.providers];
  const index = providers.findIndex((provider) =>
    input.id
      ? provider.id === input.id
      : provider.identifier === normalizedIdentifier && provider.profile === input.profile.trim(),
  );

  const next: NativePublishProvider = {
    id: index >= 0 ? providers[index]!.id : `mktg-prov-${randomBytes(8).toString("hex")}`,
    identifier: normalizedIdentifier,
    name: input.name.trim(),
    picture: input.picture?.trim() ?? "",
    disabled: input.disabled ?? false,
    profile: input.profile.trim().replace(/^@/, ""),
    connectionMethod: "manual",
    createdAt: index >= 0 ? providers[index]!.createdAt : now,
    updatedAt: now,
  };

  if (index >= 0) providers[index] = next;
  else providers.push(next);

  await writeJsonAtomic(providersPath(cwd), { version: 1, providers });
  return next;
};

export const listNativePublishPosts = async (
  cwd: string,
): Promise<readonly NativePublishPost[]> => {
  await ensureNativePublishAccount(cwd);
  const file = await readJson(postsPath(cwd), isNativePostsFile, emptyPosts());
  return [...file.posts].sort((a, b) => b.date.localeCompare(a.date));
};

type NativeTargetResolution =
  | {
      readonly ok: true;
      readonly targets: readonly NativePublishProvider[];
    }
  | {
      readonly ok: false;
      readonly detail: string;
    };

export const resolveNativePublishTargets = async (
  cwd: string,
  metadata?: Readonly<Record<string, unknown>>,
): Promise<NativeTargetResolution> => {
  const providers = await listNativePublishProviders(cwd);
  const byId = new Map(providers.map((provider) => [provider.id, provider] as const));
  const byIdentifier = new Map(providers.map((provider) => [provider.identifier, provider] as const));

  if (metadata?.integrationId && typeof metadata.integrationId === "string") {
    const byExactId = byId.get(metadata.integrationId);
    if (!byExactId) {
      return { ok: false, detail: `Unknown native provider id '${metadata.integrationId}'. Add it in Studio first.` };
    }
    return { ok: true, targets: [byExactId] };
  }

  if (metadata?.providers && Array.isArray(metadata.providers) && metadata.providers.every((value) => typeof value === "string")) {
    const resolved = metadata.providers
      .map((identifier) => byIdentifier.get(String(identifier).toLowerCase()))
      .filter((value): value is NativePublishProvider => !!value);
    if (resolved.length === 0) {
      return {
        ok: false,
        detail: `No connected native providers matched [${metadata.providers.join(", ")}]. Add one in Studio first.`,
      };
    }
    return { ok: true, targets: resolved };
  }

  if (metadata?.integrationIdentifier && typeof metadata.integrationIdentifier === "string") {
    const byIdentifierHit = byIdentifier.get(metadata.integrationIdentifier.toLowerCase());
    if (!byIdentifierHit) {
      return {
        ok: false,
        detail: `Unknown native provider '${metadata.integrationIdentifier}'. Add it in Studio first.`,
      };
    }
    return { ok: true, targets: [byIdentifierHit] };
  }

  return {
    ok: false,
    detail: "Missing native provider target. Supply metadata.integrationId, metadata.integrationIdentifier, or metadata.providers[].",
  };
};

const postTypeFromMetadata = (
  metadata?: Readonly<Record<string, unknown>>,
): "draft" | "schedule" | "now" | "update" => {
  const postType = metadata?.postType;
  return postType === "schedule" || postType === "now" || postType === "update"
    ? postType
    : "draft";
};

const statusFromPostType = (
  postType: "draft" | "schedule" | "now" | "update",
): "draft" | "scheduled" | "published" | "failed" => {
  if (postType === "draft") return "draft";
  if (postType === "schedule") return "scheduled";
  return "published";
};

const mediaPathsFromMetadata = (
  metadata?: Readonly<Record<string, unknown>>,
): readonly string[] => {
  const mediaPaths = metadata?.mediaPaths;
  if (Array.isArray(mediaPaths)) {
    return mediaPaths.filter((path): path is string => typeof path === "string" && path.trim().length > 0);
  }

  const mediaPath = metadata?.mediaPath;
  if (typeof mediaPath === "string" && mediaPath.trim().length > 0) {
    return [mediaPath.trim()];
  }

  return [];
};

export const appendNativePublishPost = async (
  cwd: string,
  input: {
    readonly campaign: string;
    readonly content: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly targets: readonly NativePublishProvider[];
  },
): Promise<NativePublishPost> => {
  await ensureNativePublishAccount(cwd);
  const file = await readJson(postsPath(cwd), isNativePostsFile, emptyPosts());
  const now = new Date().toISOString();
  const postType = postTypeFromMetadata(input.metadata);
  const mediaPaths = mediaPathsFromMetadata(input.metadata);
  const date =
    typeof input.metadata?.date === "string" && !Number.isNaN(Date.parse(input.metadata.date))
      ? new Date(input.metadata.date).toISOString()
      : now;

  const post: NativePublishPost = {
    id: `mktg-post-${randomBytes(8).toString("hex")}`,
    campaign: input.campaign,
    type: postType,
    date,
    shortLink: false,
    status: statusFromPostType(postType),
    posts: input.targets.map((target) => ({
      integration: { id: target.id, identifier: target.identifier },
      value: [{
        content: input.content,
        ...(mediaPaths.length > 0 ? { mediaPaths } : {}),
      }],
    })),
    createdAt: now,
    updatedAt: now,
  };

  await writeJsonAtomic(postsPath(cwd), {
    version: 1,
    posts: [...file.posts, post],
  });

  return post;
};
