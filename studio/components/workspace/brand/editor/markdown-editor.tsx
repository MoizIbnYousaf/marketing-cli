"use client"

import { useEffect, useRef } from "react"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onSaveShortcut: () => void
  placeholder?: string
}

/**
 * Raw markdown document editor.
 *
 * Brand files are source-of-truth memory for agents, so the most honest view
 * is the actual markdown on disk. Preview belongs in Content/Assets surfaces,
 * not beside every brand doc.
 */
export function MarkdownEditor({
  value,
  onChange,
  onSaveShortcut,
  placeholder,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Cmd+S / Ctrl+S while the textarea has focus: save.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        onSaveShortcut()
      }
    }
    el.addEventListener("keydown", onKeyDown)
    return () => el.removeEventListener("keydown", onKeyDown)
  }, [onSaveShortcut])

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(205,255,38,0.04),transparent_34%)]">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-5 pb-5 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Markdown source
          </p>
          <p className="text-[11px] text-muted-foreground">
            Raw file on disk · autosaves as you type
          </p>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Write your brand doc in markdown…"}
          spellCheck
          className="min-h-0 flex-1 resize-none rounded-2xl border border-border/70 bg-background/72 p-7 font-mono text-[15px] leading-8 text-foreground shadow-sm outline-none selection:bg-accent/30 placeholder:text-muted-foreground/50 lg:p-9 lg:text-[16px]"
        />
      </div>
    </div>
  )
}
