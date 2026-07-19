import { JSDOM } from 'jsdom'

export interface ScraperOptions {
  headers?: Record<string, string>
  timeout?: number
}

export interface ScrapeResult {
  url: string
  title: string
  metaDescription: string
  html: string
  textContent: string
  links: Array<{ text: string; href: string }>
  scriptResult?: unknown
}

export interface ScrapeConfig {
  customScript?: string
  screenshot?: { width?: number; height?: number; path?: string }
  automation?: Array<{
    action: 'click' | 'type' | 'waitFor'
    selector: string
    text?: string
    timeout?: number
  }>
}

export class JSDomScraper {
  private headers: Record<string, string>
  private timeout: number

  constructor(options: ScraperOptions = {}) {
    this.headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      ...options.headers,
    }
    this.timeout = options.timeout || 30000
  }

  async click(dom: JSDOM, selector: string, options: Record<string, unknown> = {}) {
    const targetDoc = dom.window.document
    const el = targetDoc.querySelector(selector)
    if (!el) throw new Error(`No element found: ${selector}`)

    const event = new dom.window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...options,
    })
    el.dispatchEvent(event)
    await this.waitForUpdate(dom)
  }

  async type(dom: JSDOM, selector: string, text: string) {
    const el = dom.window.document.querySelector(selector) as HTMLInputElement | null
    if (!el) throw new Error(`No element found: ${selector}`)

    el.focus()
    el.value = text
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    el.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    await this.waitForUpdate(dom)
  }

  async waitForSelector(dom: JSDOM, selector: string, timeout = 5000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (dom.window.document.querySelector(selector)) return true
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error(`Timeout waiting for selector: ${selector}`)
  }

  async waitForUpdate(dom: JSDOM, timeout = 1000) {
    await new Promise((r) => setTimeout(r, timeout))
  }

  async scrape(url: string, config: ScrapeConfig = {}): Promise<ScrapeResult> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)

      let response: Response
      try {
        response = await fetch(url, {
          headers: this.headers,
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
      }

      let html = await response.text()

      // Create JSDOM instance
      const dom = new JSDOM(html, {
        url,
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
      })

      // Run automation steps
      if (config.automation && config.automation.length > 0) {
        for (const step of config.automation) {
          if (step.action === 'click') {
            await this.click(dom, step.selector)
          } else if (step.action === 'type') {
            await this.type(dom, step.selector, step.text || '')
          } else if (step.action === 'waitFor') {
            await this.waitForSelector(dom, step.selector, step.timeout)
          }
        }
      }

      // Execute custom script if provided
      let scriptResult = null
      if (config.customScript && config.customScript.trim()) {
        try {
          const scriptFn = new Function('document', 'window', config.customScript)
          scriptResult = scriptFn(dom.window.document, dom.window)
        } catch (scriptError) {
          scriptResult = { error: String(scriptError) }
        }
      }

      // Get the modified HTML
      const modifiedHtml = dom.serialize()

      // Extract useful data
      const document = dom.window.document
      const title = document.title || ''
      const metaDescription =
        document.querySelector('meta[name="description"]')?.getAttribute('content') || ''

      // Get all text content
      const textContent = document.body?.textContent?.trim().slice(0, 5000) || ''

      // Get all links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 50)
        .map((a) => ({
          text: (a as HTMLAnchorElement).textContent?.trim().slice(0, 100) || '',
          href: (a as HTMLAnchorElement).getAttribute('href') || '',
        }))

      dom.window.close()

      return {
        url,
        title,
        metaDescription,
        html: modifiedHtml,
        textContent,
        links,
        scriptResult,
      }
    } catch (error) {
      throw new Error(`Scraper error: ${String(error)}`)
    }
  }
}
