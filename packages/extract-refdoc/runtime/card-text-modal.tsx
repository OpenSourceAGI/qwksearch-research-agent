/**
 * @fileoverview The "suggest the full text" dialog opened by the red X on a
 * citation card whose quoted text is missing. Anyone can send a suggestion, no
 * sign-in: it posts JSON to the file's `submitEndpoint` (see
 * `src/card-text-submission.ts`) and shows sending, thanks, or the error.
 */
import { type FormEvent, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { buildSubmissionPayload, CARD_TEXT_MAX_LENGTH, validateCardTextSuggestion } from "../src/card-text-submission"

export interface SuggestTarget {
  /** "ref-3" */
  key: string
  /** "Galloway '20 — Galloway, Ryan. …" for the dialog heading and the reviewer. */
  label: string
}

interface Props {
  endpoint: string
  document: { id: string; title: string }
  target: SuggestTarget
  onClose: () => void
}

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string }

/** The error to show for a failed response: the server's own message when it sent one. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === "string" && body.error) return body.error
  } catch {
    // Not JSON: fall through to the generic message.
  }
  if (response.status === 429) return "Too many suggestions just now. Please try again later."
  return "Could not send your suggestion. Please try again."
}

export function CardTextModal({ endpoint, document: doc, target, onClose }: Props) {
  const [text, setText] = useState("")
  const [website, setWebsite] = useState("")
  const [state, setState] = useState<State>({ kind: "idle" })
  const [problem, setProblem] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    area.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (state.kind === "sending") return
    const invalid = validateCardTextSuggestion(text)
    setProblem(invalid)
    if (invalid) return
    setState({ kind: "sending" })
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSubmissionPayload({ document: doc.id, documentTitle: doc.title, reference: target.key, referenceLabel: target.label, text, website })),
      })
      if (!response.ok) {
        setState({ kind: "error", message: await errorMessage(response) })
        return
      }
      setState({ kind: "sent" })
    } catch {
      setState({ kind: "error", message: "Could not reach the server. Check your connection and try again." })
    }
  }

  const dialog = (
    <div className="refdoc-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="refdoc-modal" role="dialog" aria-modal="true" aria-labelledby="refdoc-modal-title">
        <h2 id="refdoc-modal-title">Suggest the full text</h2>
        <p className="refdoc-modal-card">{target.label}</p>
        {state.kind === "sent" ? (
          <>
            <p role="status" className="refdoc-modal-ok">Thank you. Your suggestion was sent and will be reviewed before it is used.</p>
            <div className="refdoc-modal-actions">
              <button type="button" onClick={onClose} autoFocus>Close</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <label htmlFor="refdoc-modal-text">Paste the card's full quoted text. No account needed.</label>
            <textarea
              id="refdoc-modal-text"
              ref={area}
              value={text}
              rows={10}
              maxLength={CARD_TEXT_MAX_LENGTH + 1000}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={problem ? true : undefined}
              aria-describedby="refdoc-modal-count"
            />
            <div id="refdoc-modal-count" className="refdoc-modal-count">{text.trim().length.toLocaleString("en-US")} / {CARD_TEXT_MAX_LENGTH.toLocaleString("en-US")}</div>
            <div className="refdoc-modal-trap" aria-hidden="true">
              <label>
                Leave this field empty
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </label>
            </div>
            {problem ? <p role="alert" className="refdoc-modal-error">{problem}</p> : null}
            {state.kind === "error" ? <p role="alert" className="refdoc-modal-error">{state.message}</p> : null}
            <div className="refdoc-modal-actions">
              <button type="button" onClick={onClose}>Cancel</button>
              <button type="submit" data-primary disabled={state.kind === "sending"}>{state.kind === "sending" ? "Sending…" : "Send suggestion"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
  return createPortal(dialog, window.document.body)
}
