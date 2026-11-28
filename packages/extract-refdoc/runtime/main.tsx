/**
 * @fileoverview The refdoc runtime, built to `dist/refdoc.js` and served
 * from the CDN. A `.refdoc.html` file loads it with one script tag; it reads
 * the pages out of that file (`readRefdocFromDocument`) and boots Fumadocs
 * UI around them, entirely client-side:
 *
 * - sidebar from the pages (parts become separators), breadcrumb and
 *   previous/next, table of contents with scroll-spy, light/dark switch;
 * - ⌘K / Ctrl+K search over every page, heading and paragraph;
 * - the Reader mode / Underlining / Voice bar from `reader-runtime.ts`, and
 *   its Info button (`page-info.tsx`): page stats and readability from
 *   paper-metrics;
 * - numeric citations linked to the references page, with the reference as
 *   a tooltip;
 * - the card-text status button on each citation card: full and partial
 *   toggle the card text, the red X (missing) opens a "suggest the full text"
 *   dialog that posts to the file's `submitEndpoint`.
 *
 * Routing is by `#id`, where the id is a page slug or any element id on a
 * page (heading ids are prefixed with their page slug, so they are unique),
 * so links work from `file://` and the same links work in the plain file
 * when the runtime does not load.
 *
 * @module runtime
 */
import { FrameworkProvider, type Framework } from "fumadocs-core/framework"
import type * as PageTree from "fumadocs-core/page-tree"
import type { TOCItemType } from "fumadocs-core/toc"
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SearchItemType,
} from "fumadocs-ui/components/dialog/search"
import type { SharedProps } from "fumadocs-ui/contexts/search"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page"
import { RootProvider } from "fumadocs-ui/provider/base"
import { type ComponentProps, type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { createRoot } from "react-dom/client"
import { isSubmitEndpoint } from "../src/card-text-submission"
import { mountPaperReader } from "../src/reader-runtime"
import { readRefdocFromDocument, type RefdocDocument, type RefdocPage } from "../src/refdoc-read"
import { PageInfoButton } from "./page-info"

const OVERVIEW_ID = "overview"

// ── Routing ────────────────────────────────────────────────────────────────

interface Route {
  page: RefdocPage
  /** Element to scroll to, if the hash named one inside the page. */
  anchor?: string
}

function pageUrl(page: RefdocPage): string {
  return `/${page.slug}`
}

/** `#id` → page (+ anchor). Unknown ids fall back to the overview. */
function createResolver(doc: RefdocDocument) {
  const bySlug = new Map<string, RefdocPage>()
  const byAnchor = new Map<string, RefdocPage>()
  const container = window.document.createElement("div")
  for (const page of doc.pages) {
    bySlug.set(page.slug, page)
    container.innerHTML = page.html
    for (const el of Array.from(container.querySelectorAll("[id]"))) byAnchor.set(el.id, page)
  }
  const first = bySlug.get("") ?? doc.pages[0]
  return (hash: string): Route => {
    const id = decodeURIComponent(hash.replace(/^#\/?/, ""))
    if (!id || id === OVERVIEW_ID) return { page: first }
    const page = bySlug.get(id)
    if (page) return { page }
    const holder = byAnchor.get(id)
    if (holder) return { page: holder, anchor: id }
    return { page: first }
  }
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}
const getHash = () => window.location.hash

/** Internal URL ("/slug" or "/slug#id") → the hash that routes to it. */
function hrefToHash(href: string): string {
  const [path, anchor] = href.split("#")
  if (anchor) return `#${anchor}`
  const slug = path.replace(/^\/+/, "")
  return slug ? `#${slug}` : "#"
}

const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")

function RefdocLink({ href = "", prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) {
  if (isExternal(href) || href.startsWith("#")) return <a href={href} {...props} />
  return <a href={hrefToHash(href)} {...props} />
}

function navigate(url: string) {
  const hash = isExternal(url) ? null : url.startsWith("#") ? url : hrefToHash(url)
  if (hash === null) {
    window.open(url, "_blank", "noopener")
    return
  }
  if (hash === "#") {
    history.pushState(null, "", window.location.pathname + window.location.search)
    window.dispatchEvent(new HashChangeEvent("hashchange"))
  } else {
    window.location.hash = hash
  }
}

// ── Page tree and search index ─────────────────────────────────────────────

function buildTree(doc: RefdocDocument): PageTree.Root {
  const children: PageTree.Node[] = []
  for (const page of doc.pages) {
    if (page.part) children.push({ type: "separator", name: page.part })
    children.push({ type: "page", name: page.slug === "" ? "Overview" : page.title, url: pageUrl(page) })
  }
  return { name: doc.title, children }
}

interface IndexEntry {
  id: string
  type: "page" | "heading" | "text"
  text: string
  lower: string
  url: string
  page: RefdocPage
}

function buildIndex(doc: RefdocDocument): IndexEntry[] {
  const entries: IndexEntry[] = []
  const container = window.document.createElement("div")
  for (const page of doc.pages) {
    const base = pageUrl(page)
    const title = page.slug === "" ? doc.title : page.title
    entries.push({ id: `p:${page.slug}`, type: "page", text: title, lower: title.toLowerCase(), url: base, page })
    container.innerHTML = page.html
    let anchor = ""
    let n = 0
    for (const el of Array.from(container.querySelectorAll("h2, h3, h4, p, li, blockquote, figcaption"))) {
      if (/^H\d$/.test(el.tagName)) {
        if (el.id) anchor = el.id
        const text = (el.textContent || "").trim()
        if (text) entries.push({ id: `h:${el.id || n++}`, type: "heading", text, lower: text.toLowerCase(), url: el.id ? `${base}#${el.id}` : base, page })
        continue
      }
      // Lists that hold paragraphs are indexed through their paragraphs.
      if (el.tagName === "LI" && el.querySelector("p")) continue
      const text = (el.textContent || "").replace(/\s+/g, " ").trim()
      if (text.length < 3) continue
      const url = el.id ? `${base}#${el.id}` : anchor ? `${base}#${anchor}` : base
      entries.push({ id: `t:${page.slug}:${n++}`, type: "text", text, lower: text.toLowerCase(), url, page })
    }
  }
  return entries
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlight(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) return text
  const parts = text.split(new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi"))
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
}

/** A window of `text` around the first match, so long paragraphs show the hit. */
function excerpt(text: string, lower: string, term: string): string {
  const at = lower.indexOf(term)
  if (text.length <= 160 || at < 60) return text.length > 160 ? `${text.slice(0, 157)}…` : text
  const start = Math.max(0, at - 60)
  return `…${text.slice(start, start + 157)}${start + 157 < text.length ? "…" : ""}`
}

function searchIndex(index: IndexEntry[], query: string, doc: RefdocDocument): SearchItemType[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  const rank = { page: 0, heading: 1, text: 2 }
  const hits = index.filter((entry) => terms.every((term) => entry.lower.includes(term) || (entry.type !== "page" && entry.page.title.toLowerCase().includes(term) && entry.lower.includes(terms[0]))))
  hits.sort((a, b) => rank[a.type] - rank[b.type])
  return hits.slice(0, 40).map((entry) => ({
    id: entry.id,
    type: entry.type,
    url: entry.url,
    content: highlight(entry.type === "text" ? excerpt(entry.text, entry.lower, terms[0]) : entry.text, terms),
    breadcrumbs: entry.type === "page" ? undefined : [entry.page.slug === "" ? doc.title : entry.page.title],
  }))
}

function createSearchDialog(doc: RefdocDocument, index: IndexEntry[]) {
  const defaults: SearchItemType[] = doc.pages.map((page) => ({
    id: `d:${page.slug}`,
    type: "page",
    url: pageUrl(page),
    content: page.slug === "" ? "Overview" : page.title,
  }))
  return function RefdocSearchDialog(props: SharedProps) {
    const [search, setSearch] = useState("")
    const items = useMemo(() => (search.trim() ? searchIndex(index, search, doc) : defaults), [search])
    return (
      <SearchDialog search={search} onSearchChange={setSearch} {...props}>
        <SearchDialogOverlay />
        <SearchDialogContent>
          <SearchDialogHeader>
            <SearchDialogIcon />
            <SearchDialogInput />
            <SearchDialogClose />
          </SearchDialogHeader>
          <SearchDialogList items={items} />
        </SearchDialogContent>
      </SearchDialog>
    )
  }
}

// ── Pages ──────────────────────────────────────────────────────────────────

function ReaderToolbar({ getContent, lastUpdated }: { getContent: () => Element | null; lastUpdated?: string }) {
  return (
    <div className="ptw-toolbar refdoc-toolbar" role="toolbar" aria-label="Reading options">
      <button type="button" data-ptw="reader" aria-pressed="false">
        <span aria-hidden="true">📖</span> <span data-ptw-label>Reader mode off</span>
      </button>
      <button type="button" data-ptw="underline" aria-pressed="true">
        <span aria-hidden="true" className="ptw-u">U</span> <span data-ptw-label>Underlining on</span>
      </button>
      <button type="button" data-ptw="voice" aria-pressed="false">
        <span aria-hidden="true">🔊</span> <span data-ptw-label>Voice</span>
      </button>
      <label className="ptw-rate">
        Speed{" "}
        <select data-ptw="rate" defaultValue="1.2">
          <option value="1">1×</option>
          <option value="1.2">1.2×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </label>
      <PageInfoButton getContent={getContent} lastUpdated={lastUpdated} />
    </div>
  )
}

/** The submit endpoint: a `data-submit-endpoint` on the runtime's script tag wins over the one written into the file. */
function submitEndpointOf(doc: RefdocDocument): string | null {
  const fromScript = window.document.querySelector("script[data-submit-endpoint]")?.getAttribute("data-submit-endpoint")
  const endpoint = fromScript || doc.submitEndpoint
  return isSubmitEndpoint(endpoint) ? endpoint.trim() : null
}

function PageView({ doc, route }: { doc: RefdocDocument; route: Route }) {
  const { page, anchor } = route
  const root = useRef<HTMLDivElement>(null)
  const endpoint = useMemo(() => submitEndpointOf(doc), [doc])
  const [suggest, setSuggest] = useState<SuggestTarget | null>(null)

  useEffect(() => setSuggest(null), [page])

  const onBodyClick = (event: MouseEvent<HTMLDivElement>) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button.refdoc-text-status")
    if (!button) return
    const card = button.closest("li.refdoc-ref")
    const status = button.getAttribute("data-text-status")
    if (status === "missing") {
      if (!endpoint) return
      const author = card?.querySelector(".refdoc-ref-author")?.textContent?.trim()
      const citation = card?.querySelector(".refdoc-ref-citation")?.textContent?.trim()
      setSuggest({ key: button.getAttribute("data-ref-key") || card?.id || "", label: [author, citation].filter(Boolean).join(" — ").slice(0, 300) })
      return
    }
    const details = card?.querySelector("details")
    if (details) details.open = !details.open
  }
  const toc = useMemo<TOCItemType[]>(() => page.headings.map((h) => ({ title: h.title, url: `#${h.id}`, depth: h.depth })), [page])
  const hasUnderlining = useMemo(() => page.html.includes("debate-hl"), [page])

  // The reader bar is plain DOM wiring; remount it for each page.
  useEffect(() => {
    if (!root.current) return
    const handle = mountPaperReader(root.current, { storageKey: "refdoc", autoMarkPhrases: autoUnderlinePhrases })
    return () => handle.destroy()
  }, [page])

  useLayoutEffect(() => {
    if (anchor) window.document.getElementById(anchor)?.scrollIntoView({ block: "start" })
    else window.scrollTo(0, 0)
  }, [page, anchor])

  useEffect(() => {
    window.document.title = page.slug === "" ? doc.title : `${page.title} · ${doc.title}`
  }, [page])

  return (
    <DocsPage toc={toc} tableOfContent={{ style: "clerk" }}>
      <DocsTitle>{page.slug === "" ? doc.title : page.title}</DocsTitle>
      {page.description ? <DocsDescription>{page.description}</DocsDescription> : null}
      <div ref={root} className="refdoc-paper" data-underline="on" data-reader="off" data-has-underlining={hasUnderlining ? "" : undefined}>
        <ReaderToolbar key={page.slug} getContent={() => root.current?.querySelector(".ptw-content") ?? null} lastUpdated={doc.date} />
        <DocsBody className="ptw-content">
          <div onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: page.html }} />
        </DocsBody>
        {suggest && endpoint ? <CardTextModal endpoint={endpoint} document={{ id: doc.sourceUrl || doc.title, title: doc.title }} target={suggest} onClose={() => setSuggest(null)} /> : null}
      </div>
    </DocsPage>
  )
}

function App({ doc }: { doc: RefdocDocument }) {
  const resolve = useMemo(() => createResolver(doc), [doc])
  const hash = useSyncExternalStore(subscribeHash, getHash, getHash)
  const route = useMemo(() => resolve(hash), [resolve, hash])
  const tree = useMemo(() => buildTree(doc), [doc])
  const SearchDialogComponent = useMemo(() => createSearchDialog(doc, buildIndex(doc)), [doc])

  const framework = useMemo<Framework>(
    () => ({
      usePathname: () => pageUrl(resolve(useSyncExternalStore(subscribeHash, getHash, getHash)).page),
      useParams: () => ({}),
      useRouter: () => ({ push: navigate, refresh: () => {} }),
      Link: RefdocLink,
    }),
    [resolve],
  )

  const links = doc.sourceUrl ? [{ text: "Source", url: doc.sourceUrl, external: true }] : []

  return (
    <FrameworkProvider {...framework}>
      <RootProvider search={{ SearchDialog: SearchDialogComponent }} theme={{ attribute: "class", defaultTheme: "system", enableSystem: true }}>
        <DocsLayout tree={tree} nav={{ title: doc.title, url: "/" }} links={links}>
          <PageView doc={doc} route={route} />
        </DocsLayout>
      </RootProvider>
    </FrameworkProvider>
  )
}

// ── Boot ───────────────────────────────────────────────────────────────────

function boot() {
  const html = window.document.documentElement
  let doc: RefdocDocument
  try {
    doc = readRefdocFromDocument(window.document)
  } catch (error) {
    html.classList.remove("refdoc-booting")
    console.error("[refdoc]", error)
    return
  }
  if (doc.pages.length === 0) {
    html.classList.remove("refdoc-booting")
    return
  }
  const fallback = window.document.getElementById("refdoc-root")
  const mount = window.document.createElement("div")
  mount.id = "refdoc-app"
  window.document.body.insertBefore(mount, fallback)
  fallback?.remove()
  html.classList.add("refdoc-ready")
  createRoot(mount).render(<App doc={doc} />)
  html.classList.remove("refdoc-booting")
}

declare global {
  interface Window {
    refdoc?: { version: string; boot: () => void; read: typeof readRefdocFromDocument }
  }
}

window.refdoc = { version: "__REFDOC_VERSION__", boot, read: readRefdocFromDocument }
if (window.document.readyState === "loading") window.document.addEventListener("DOMContentLoaded", boot, { once: true })
else boot()
