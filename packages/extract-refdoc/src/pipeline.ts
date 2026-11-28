/**
 * @fileoverview The one call the CLI, the server and the widget share:
 * input → `Paper`, in either mode.
 *
 * - `"paper"`: extract the source and lay it out in the paper format, with
 *   summaries and underlining from the AI pass when a model is given, else
 *   from the offline pass.
 * - `"outline"`: with a model, write a fresh outline in the paper format
 *   from the source (or from a bare topic); without one, cut the extracted
 *   paper down to its Section Summaries and underlined words.
 *
 * @module pipeline
 */
import { enhancePaperWithAi, generateOutline, type TextGenerator } from "./ai"
import { finishPaper, readOnlyUnderlined } from "./finish"
import { loadPaper, isLinkInput, type Extractor } from "./source"
import type { Paper } from "./types"

export type ConvertMode = "paper" | "outline"

export interface ConvertOptions {
  mode?: ConvertMode
  /** A model for summaries, underlining and outlines. Offline heuristics without one. */
  generate?: TextGenerator
  /** File name of a binary input. */
  fileName?: string
  /** Replace the extractor. */
  extract?: Extractor
  /** Outline focus (an angle, resolution or side). */
  focus?: string
  onProgress?: (message: string) => void
}

/** Convert any input (see the module doc). */
export async function convertToPaper(input: string | Uint8Array, options: ConvertOptions = {}): Promise<Paper> {
  const { mode = "paper", generate, onProgress } = options
  const isText = typeof input === "string" && !isLinkInput(input)

  if (mode === "outline" && generate && isText) {
    onProgress?.("Writing the outline…")
    return generateOutline(input as string, generate, { focus: options.focus })
  }

  onProgress?.(isText ? "Reading the text…" : "Extracting the paper…")
  const loaded = await loadPaper(input, { extract: options.extract, fileName: options.fileName })

  if (mode === "outline") {
    if (generate) {
      onProgress?.("Writing the outline…")
      return generateOutline(loaded, generate, { focus: options.focus })
    }
    return readOnlyUnderlined(finishPaper(loaded))
  }
  if (generate) {
    onProgress?.(`Summarizing and underlining ${loaded.sections.length} sections…`)
    return enhancePaperWithAi(loaded, generate, {
      onProgress: (done, total) => onProgress?.(`Summarized ${done} of ${total} sections`),
    })
  }
  return finishPaper(loaded)
}
