// mktg — Postiz media upload helpers (AGPL firewall — NEVER import @postiz/node)

import { basename, extname, join } from "node:path";
import { validatePathInput } from "../../errors";
import { validatePublicUrl } from "../../url-validation";
import { type PublishItem } from "../types";
import { mapPostizError, postizFetch } from "./client";
import { type PostizMedia, type PostizResult } from "./types";

const imageMimeFromExtension = (filePath: string): string => {
  switch (extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".mp4":
      return "video/mp4";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
};

const isPostizMedia = (value: unknown): value is PostizMedia => {
  if (!value || typeof value !== "object") return false;
  const media = value as Record<string, unknown>;
  return typeof media.id === "string" && typeof media.path === "string";
};

const metadataStrings = (metadata: Readonly<Record<string, unknown>> | undefined, pluralKey: string, singularKey: string): readonly string[] => {
  const plural = metadata?.[pluralKey];
  if (Array.isArray(plural)) {
    return plural.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
  }
  const singular = metadata?.[singularKey];
  if (typeof singular === "string" && singular.trim().length > 0) return [singular.trim()];
  return [];
};

export const extractMediaInputs = (item: PublishItem): { readonly paths: readonly string[]; readonly urls: readonly string[] } => {
  const metadata = item.metadata;
  return {
    paths: metadataStrings(metadata, "mediaPaths", "mediaPath"),
    urls: metadataStrings(metadata, "mediaUrls", "mediaUrl"),
  };
};

const uploadPostizMediaPath = async (cwd: string, rawPath: string): Promise<PostizResult<PostizMedia>> => {
  const pathCheck = validatePathInput(cwd, rawPath);
  if (!pathCheck.ok) {
    return { ok: false, error: { kind: "bad-request", msg: pathCheck.message, status: 400 }, status: 400 };
  }

  const filePath = join(cwd, rawPath);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return { ok: false, error: { kind: "bad-request", msg: `Media file not found: ${rawPath}`, status: 400 }, status: 400 };
  }

  const form = new FormData();
  const blob = new Blob([await file.arrayBuffer()], { type: imageMimeFromExtension(filePath) });
  form.append("file", blob, basename(filePath));
  const result = await postizFetch<unknown>("/public/v1/upload", { method: "POST", body: form });
  if (!result.ok) return result;
  if (!isPostizMedia(result.data)) {
    return { ok: false, error: { kind: "bad-request", msg: "Postiz upload returned an invalid media object", status: result.status }, status: result.status };
  }
  return { ok: true, data: result.data, status: result.status };
};

const uploadPostizMediaUrl = async (rawUrl: string): Promise<PostizResult<PostizMedia>> => {
  const valid = validatePublicUrl(rawUrl);
  if (!valid.ok) {
    return { ok: false, error: { kind: "bad-request", msg: valid.message, status: 400 }, status: 400 };
  }

  const result = await postizFetch<unknown>("/public/v1/upload-from-url", {
    method: "POST",
    body: { url: valid.url },
  });
  if (!result.ok) return result;
  if (!isPostizMedia(result.data)) {
    return { ok: false, error: { kind: "bad-request", msg: "Postiz upload-from-url returned an invalid media object", status: result.status }, status: result.status };
  }
  return { ok: true, data: result.data, status: result.status };
};

export const uploadPostizMedia = async (
  item: PublishItem,
  cwd: string,
): Promise<{ ok: true; media: readonly PostizMedia[] } | { ok: false; detail: string; hardStop: boolean }> => {
  const inputs = extractMediaInputs(item);
  const media: PostizMedia[] = [];

  for (const path of inputs.paths) {
    const result = await uploadPostizMediaPath(cwd, path);
    if (!result.ok) {
      return {
        ok: false,
        detail: `Media upload failed for ${path}: ${mapPostizError(result.error)}`,
        hardStop: ["auth-missing", "auth-invalid", "subscription-required", "rate-limited"].includes(result.error.kind),
      };
    }
    media.push(result.data);
  }

  for (const url of inputs.urls) {
    const result = await uploadPostizMediaUrl(url);
    if (!result.ok) {
      return {
        ok: false,
        detail: `Media upload failed for ${url}: ${mapPostizError(result.error)}`,
        hardStop: ["auth-missing", "auth-invalid", "subscription-required", "rate-limited"].includes(result.error.kind),
      };
    }
    media.push(result.data);
  }

  return { ok: true, media };
};
