"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { extractErrorFix, extractErrorMessage } from "@/lib/api-error"

interface UseAsyncActionOptions<TResult> {
  successMessage?: string | ((result: TResult) => string)
  errorLabel?: string
  onSuccess?: (result: TResult) => void
}

interface UseAsyncActionReturn<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>
  pending: boolean
  error: unknown
}

/**
 * Wraps an async fn with `pending` state, toast.error on failure (parsing the
 * studio `{ok:false, error:{message,fix,code}}` envelope), and optional
 * toast.success on completion. Use it on mutating handlers so failures stop
 * being swallowed into `console.error`.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
): UseAsyncActionReturn<TArgs, TResult> {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    const opts = optionsRef.current
    setPending(true)
    setError(null)
    try {
      const result = await fnRef.current(...args)
      if (
        result &&
        typeof result === "object" &&
        "ok" in result &&
        (result as { ok: unknown }).ok === false
      ) {
        const message = extractErrorMessage(result, opts.errorLabel ?? "Request failed")
        const fix = extractErrorFix(result)
        toast.error(message, fix ? { description: fix } : undefined)
        setError(result)
        return undefined
      }
      if (opts.successMessage) {
        const msg =
          typeof opts.successMessage === "function" ? opts.successMessage(result) : opts.successMessage
        toast.success(msg)
      }
      opts.onSuccess?.(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : opts.errorLabel ?? "Request failed"
      toast.error(message)
      setError(err)
      return undefined
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error }
}
