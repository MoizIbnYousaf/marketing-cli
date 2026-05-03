export interface StudioErrorEnvelope {
  code?: string
  message?: string
  fix?: string
}

export type ErrorShape = StudioErrorEnvelope | string | null | undefined

export interface StudioErrorJson {
  ok?: boolean
  error?: ErrorShape
  [key: string]: unknown
}

export function extractErrorMessage(json: StudioErrorJson | unknown, fallback = "Request failed"): string {
  if (!json || typeof json !== "object") return fallback
  const error = (json as StudioErrorJson).error
  if (!error) return fallback
  if (typeof error === "string") return error
  if (typeof error === "object") {
    const msg = (error as StudioErrorEnvelope).message
    if (typeof msg === "string" && msg) return msg
  }
  return fallback
}

export function extractErrorFix(json: StudioErrorJson | unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined
  const error = (json as StudioErrorJson).error
  if (!error || typeof error === "string") return undefined
  const fix = (error as StudioErrorEnvelope).fix
  return typeof fix === "string" && fix ? fix : undefined
}

export function extractErrorCode(json: StudioErrorJson | unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined
  const error = (json as StudioErrorJson).error
  if (!error || typeof error === "string") return undefined
  const code = (error as StudioErrorEnvelope).code
  return typeof code === "string" && code ? code : undefined
}
