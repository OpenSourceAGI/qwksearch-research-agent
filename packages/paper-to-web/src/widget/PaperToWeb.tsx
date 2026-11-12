/**
 * @fileoverview `<PaperToWeb>`: the converter as a self-contained React
 * widget. Paste a link, DOI, topic or text (or pick a PDF / `.docx`), choose
 * Paper sections or Outline, and read the result in `<PaperReader>` with
 * downloads for the `.mdx`, `.html` and JSON.
 *
 * It talks to a `createPaperToWebHandler` endpoint (`server.ts`), because
 * scraping arbitrary pages needs a server; pass `endpoint` to point it at
 * one (default `/api/convert`).
 *
 * @module widget/PaperToWeb
 */
import { useState, type FormEvent } from "react"
import type { ConvertResponse } from "../server"
import { PaperReader } from "./PaperReader"

export interface PaperToWebProps {
  /** The convert endpoint (default "/api/convert"). */
  endpoint?: string
  /** Offer the "Use AI" box (the server needs a model configured). */
  allowAi?: boolean
  className?: string
}

function save(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File-name stem from a title. */
export function fileStem(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "paper"
}

/** The converter widget (see the module doc). */
export function PaperToWeb({ endpoint = "/api/convert", allowAi = true, className }: PaperToWebProps) {
  const [result, setResult] = useState<ConvertResponse | null>(null)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setStatus("Converting… scraping and extracting can take a minute.")
    try {
      const response = await fetch(endpoint, { method: "POST", body: new FormData(event.currentTarget) })
      const body = (await response.json()) as ConvertResponse & { error?: string }
      if (!response.ok || body.error) throw new Error(body.error ?? `HTTP ${response.status}`)
      setResult(body)
      setStatus(`${body.paper.sections.length} sections`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus("")
    } finally {
      setBusy(false)
    }
  }

  const stem = result ? fileStem(result.paper.title) : "paper"
  return (
    <div className={className}>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <textarea
          name="input"
          rows={4}
          placeholder="Paste a link (arXiv, DOI, archive.org, any article or PDF URL), a topic, or the text itself"
          style={{ width: "100%", boxSizing: "border-box", font: "inherit", padding: "0.6rem" }}
        />
        <label>
          or a file <input type="file" name="file" accept=".pdf,.docx,.md,.txt,.html" />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <label>
            <input type="radio" name="mode" value="paper" defaultChecked /> Paper sections
          </label>
          <label>
            <input type="radio" name="mode" value="outline" /> Outline
          </label>
          {allowAi && (
            <label>
              <input type="checkbox" name="ai" value="on" /> Use AI
            </label>
          )}
          <input type="text" name="focus" placeholder="Outline focus (optional)" style={{ flex: 1, minWidth: "12rem", font: "inherit" }} />
          <button type="submit" disabled={busy}>
            {busy ? "Converting…" : "Convert"}
          </button>
        </div>
        <div role="status" style={{ color: error ? "#dc2626" : undefined }}>
          {error || status}
        </div>
      </form>
      {result && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "1rem 0" }}>
            <button type="button" onClick={() => save(`${stem}.mdx`, result.mdx, "text/markdown")}>
              Download .mdx
            </button>
            <button type="button" onClick={() => save(`${stem}.html`, result.html, "text/html")}>
              Download .html
            </button>
            <button type="button" onClick={() => save(`${stem}.json`, JSON.stringify(result.paper, null, 2), "application/json")}>
              Download .json
            </button>
            {Object.entries(result.files).map(([name, text]) => (
              <button key={name} type="button" onClick={() => save(name, text, "text/plain")}>
                {name}
              </button>
            ))}
          </div>
          <PaperReader paper={result.paper} />
        </>
      )}
    </div>
  )
}
