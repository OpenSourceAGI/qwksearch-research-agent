"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Globe, Code, Eye, FileText, Link2, Terminal, AlertTriangle, AlertCircle } from "lucide-react"

interface ScrapeResult {
  success: boolean
  url: string
  title: string
  metaDescription: string
  html: string
  textContent: string
  links: { text: string; href: string }[]
  scriptResult: unknown
  scriptError: string | null
  waitUntilError: string | null
  error?: string
}

export default function ScraperPage() {
  const [url, setUrl] = useState("")
  const [customScript, setCustomScript] = useState(
    `// Example: Extract all headings\nconst headings = document.querySelectorAll('h1, h2, h3');\nreturn Array.from(headings).map(h => h.textContent);`
  )
  const [timeout, setTimeout_] = useState("10000")
  const [waitUntil, setWaitUntil] = useState("")
  const [delayAfterLoad, setDelayAfterLoad] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScrape = async () => {
    if (!url) {
      setError("Please enter a URL")
      return
    }

    const timeoutNum = Number(timeout)
    if (isNaN(timeoutNum) || timeoutNum < 1000 || timeoutNum > 60000) {
      setError("Timeout must be between 1000ms and 60000ms")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, customScript, timeout: timeoutNum, waitUntil, delayAfterLoad }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to scrape URL")
        return
      }

      setResult(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const hasWarnings = result && (result.scriptError || result.waitUntilError)

  return (
    <main className="max-h-screen overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl">
            <header className="mb-8">
              <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
                <Globe className="h-8 w-8" />
                Web Scraper
              </h1>
              <p className="mt-2 text-muted-foreground">
                Fetch any URL, run custom scripts, and preview the rendered HTML
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Input Panel */}
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Terminal className="h-5 w-5" />
                    Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="url">Target URL</FieldLabel>
                      <input
                        id="url"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                        placeholder="https://example.com"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="timeout">Timeout (ms)</FieldLabel>
                        <input
                          id="timeout"
                          type="number"
                          min={1000}
                          max={60000}
                          step={1000}
                          value={timeout}
                          onChange={(e) => setTimeout_(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">1000 – 60000ms</p>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="waitUntil">Wait Until (selector)</FieldLabel>
                        <input
                          id="waitUntil"
                          type="text"
                          value={waitUntil}
                          onChange={(e) => setWaitUntil(e.target.value)}
                          placeholder="#content, .loaded"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">CSS selector to await</p>
                      </Field>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-muted/30 p-3 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="delayAfterLoad"
                        checked={delayAfterLoad}
                        onChange={(e) => setDelayAfterLoad(e.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                      />
                      <div>
                        <span className="text-sm font-medium text-foreground">Delay 4s after DOM load</span>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Wait an additional 4 seconds after the DOM is ready before capturing the HTML. Useful for pages with deferred content.
                        </p>
                      </div>
                    </label>

                    <Field>
                      <FieldLabel htmlFor="script">Custom Script (optional)</FieldLabel>
                      <textarea
                        id="script"
                        value={customScript}
                        onChange={(e) => setCustomScript(e.target.value)}
                        rows={8}
                        placeholder="// Your JavaScript code here..."
                        className="flex w-full rounded-md border border-input bg-muted/50 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Access{" "}
                        <code className="rounded bg-muted px-1">document</code> and{" "}
                        <code className="rounded bg-muted px-1">window</code>. Use{" "}
                        <code className="rounded bg-muted px-1">return</code> to output data.
                      </p>
                    </Field>

                    <Button onClick={handleScrape} disabled={loading} className="w-full">
                      {loading ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <Globe className="mr-2 h-4 w-4" />
                          Scrape URL
                        </>
                      )}
                    </Button>

                    {error && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>

              {/* Results Panel */}
              <Card className="border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5" />
                    Results
                    {result && (
                      <span className="ml-auto text-sm font-normal text-muted-foreground truncate max-w-[200px]">
                        {result.title || result.url}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!result ? (
                    <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border">
                      <p className="text-muted-foreground">Enter a URL and click Scrape to see results</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Warnings */}
                      {hasWarnings && (
                        <div className="flex flex-col gap-2">
                          {result.waitUntilError && (
                            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                <span className="font-medium">Wait Until: </span>
                                {result.waitUntilError}
                              </span>
                            </div>
                          )}
                          {result.scriptError && (
                            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                <span className="font-medium">Script Error: </span>
                                {result.scriptError}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <Tabs defaultValue="preview" className="w-full">
                        <TabsList className="w-full grid grid-cols-4">
                          <TabsTrigger value="preview" className="flex items-center gap-1.5">
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Preview</span>
                          </TabsTrigger>
                          <TabsTrigger value="html" className="flex items-center gap-1.5">
                            <Code className="h-4 w-4" />
                            <span className="hidden sm:inline">HTML</span>
                          </TabsTrigger>
                          <TabsTrigger value="text" className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Text</span>
                          </TabsTrigger>
                          <TabsTrigger value="links" className="flex items-center gap-1.5">
                            <Link2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Links</span>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="preview" className="mt-4">
                          <div className="overflow-hidden rounded-md border border-border">
                            <iframe
                              srcDoc={result.html}
                              className="h-96 w-full bg-white"
                              sandbox="allow-same-origin"
                              title="Scraped page preview"
                            />
                          </div>
                          {result.scriptResult !== null && result.scriptResult !== undefined && !result.scriptError && (
                            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">Script Output:</p>
                              <pre className="overflow-auto font-mono text-sm text-foreground">
                                {JSON.stringify(result.scriptResult, null, 2)}
                              </pre>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="html" className="mt-4">
                          <div className="h-96 overflow-auto rounded-md border border-border bg-muted/50 p-3">
                            <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                              {result.html}
                            </pre>
                          </div>
                        </TabsContent>

                        <TabsContent value="text" className="mt-4">
                          <div className="h-96 overflow-auto rounded-md border border-border bg-muted/50 p-3">
                            <p className="whitespace-pre-wrap text-sm text-foreground">
                              {result.textContent || "No text content found"}
                            </p>
                          </div>
                        </TabsContent>

                        <TabsContent value="links" className="mt-4">
                          <div className="h-96 overflow-auto rounded-md border border-border p-3">
                            {result.links.length > 0 ? (
                              <ul className="space-y-2">
                                {result.links.map((link, i) => (
                                  <li key={i} className="text-sm">
                                    <span className="text-foreground">{link.text || "(no text)"}</span>
                                    <br />
                                    <span className="break-all text-xs text-muted-foreground">
                                      {link.href}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground">No links found</p>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
        </div>
      </div>
    </main>
  )
}
