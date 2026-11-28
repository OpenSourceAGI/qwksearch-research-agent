/**
 * @fileoverview The reader bar's Info button: a popover of page stats
 * (words, reading time, characters, sentences, paragraphs, figures,
 * citations, highlights, last updated), then the readability score out of
 * 100 with the grade-level formulas folded below it. The numbers come from
 * `refdocPageInfo` (paper-metrics) and the labels from paper-metrics'
 * `pageInfoRows` / `readabilityRows`, worked out when the popover opens.
 */
import {
  CaseSensitive,
  Clock,
  Heading,
  Highlighter,
  History,
  Image,
  Info,
  Layers,
  Link,
  Pilcrow,
  Quote,
  Table,
  Code,
  TextAlignStart,
  Type,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import {
  formatReadability,
  NOT_ENOUGH_TEXT,
  pageInfoRows,
  READABILITY_COLORS,
  readabilityRows,
  SMOG_NOTE,
  type PageInfoLabel,
} from "paper-metrics"
import { refdocPageInfo } from "../src/page-info"

const ROW_ICONS: Record<PageInfoLabel, LucideIcon> = {
  Words: Type,
  "Reading time": Clock,
  Characters: CaseSensitive,
  Sentences: TextAlignStart,
  Sections: Layers,
  Headings: Heading,
  Paragraphs: Pilcrow,
  Links: Link,
  Figures: Image,
  Tables: Table,
  "Code blocks": Code,
  Citations: Quote,
  Highlights: Highlighter,
  "Last updated": History,
}

function PageInfoPanel({ content, lastUpdated }: { content: Element; lastUpdated?: string }) {
  const { stats, metrics, showHighlights } = useMemo(() => refdocPageInfo(content), [content])
  const labelId = useId()
  const score = metrics.readabilityScore
  return (
    <>
      <p className="refdoc-info-title">Page stats</p>
      <dl className="refdoc-info-rows">
        {pageInfoRows({ stats, lastUpdated, showHighlights }).map(([label, value]) => {
          const Icon = ROW_ICONS[label]
          return (
            <div key={label} className="refdoc-info-row" data-stat={label}>
              <dt>
                <Icon aria-hidden="true" />
                {label}
              </dt>
              <dd>{value}</dd>
            </div>
          )
        })}
      </dl>
      <div className="refdoc-info-readability" data-testid="readability">
        <div className="refdoc-info-score">
          <span id={labelId}>Readability</span>
          <strong>{formatReadability(metrics)}</strong>
        </div>
        {score == null || !metrics.readabilityLabel ? (
          <p className="refdoc-info-note">{NOT_ENOUGH_TEXT}</p>
        ) : (
          <div
            role="progressbar"
            aria-labelledby={labelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            aria-valuetext={`${score} out of 100, ${metrics.readabilityLabel}`}
            className="refdoc-info-bar"
          >
            <div style={{ width: `${score}%`, background: READABILITY_COLORS[metrics.readabilityLabel] }} />
          </div>
        )}
        <details className="refdoc-info-grades">
          <summary>Grade levels</summary>
          <dl>
            {readabilityRows(metrics).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {metrics.smogIndex == null && score != null && <p className="refdoc-info-note">{SMOG_NOTE}</p>}
        </details>
      </div>
    </>
  )
}

/** The Info button and its Page stats popover, for the page content `getContent()` returns. */
export function PageInfoButton({ getContent, lastUpdated }: { getContent: () => Element | null; lastUpdated?: string }) {
  const [content, setContent] = useState<Element | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const open = content !== null

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setContent(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContent(null)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={wrapper} className="refdoc-info">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-pressed={open}
        title="Stats for this page: words, reading time, sentences, readability and more"
        onClick={() => setContent(open ? null : getContent())}
      >
        <Info aria-hidden="true" className="refdoc-info-icon" /> <span>Info</span>
      </button>
      {content && (
        <div role="dialog" aria-label="Page stats" className="refdoc-info-popover">
          <PageInfoPanel content={content} lastUpdated={lastUpdated} />
        </div>
      )}
    </div>
  )
}
