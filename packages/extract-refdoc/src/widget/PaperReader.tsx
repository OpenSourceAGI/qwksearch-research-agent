/**
 * @fileoverview `<PaperReader>`: a converted paper with the Reader mode,
 * Underlining and Voice toolbar, as a React component. It renders the same
 * markup as the standalone HTML export (`html.ts`) and wires it with the same
 * runtime (`reader-runtime.ts`), so the widget and the exported page behave
 * identically. Mount it anywhere; it carries its own scoped stylesheet.
 *
 * @module widget/PaperReader
 */
import { useEffect, useMemo, useRef } from "react"
import { PAPER_READER_CSS, renderPaperReader } from "../html"
import { mountPaperReader, type PaperReaderRuntimeOptions } from "../reader-runtime"
import type { Paper } from "../types"

export interface PaperReaderProps {
  paper: Paper
  /** A better voice than the browser's (Kokoro, Cloudflare TTS…). */
  speak?: PaperReaderRuntimeOptions["speak"]
  cancelSpeech?: PaperReaderRuntimeOptions["cancelSpeech"]
  className?: string
}

/** The reader (see the module doc). */
export function PaperReader({ paper, speak, cancelSpeech, className }: PaperReaderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const markup = useMemo(() => renderPaperReader(paper), [paper])

  useEffect(() => {
    const root = ref.current?.querySelector(".ptw-paper")
    if (!root) return
    const handle = mountPaperReader(root, { speak, cancelSpeech })
    return () => handle.destroy()
  }, [markup, speak, cancelSpeech])

  return (
    <div className={className}>
      <style>{PAPER_READER_CSS}</style>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  )
}
