/**
 * The OpenAPI spec served at `/api/openapi` (and rendered at `/api`) is
 * hand-maintained in `packages/qwksearch-api-client/qwksearch-openapi.json`,
 * and the typed client is generated from it. Nothing else notices when a route
 * is added, removed or loses a method — the spec just quietly drifts, which is
 * how it ended up missing 43 operations. This test is that notice.
 *
 * It walks every `app/api/…/route.ts`, reads which HTTP methods each one exports,
 * and requires the spec to list exactly those (minus HEAD/OPTIONS). A route
 * that should stay out of the public reference goes in `UNDOCUMENTED` with the
 * reason.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import spec from '../../../../../packages/qwksearch-api-client/qwksearch-openapi.json'

const API_DIR = fileURLToPath(new URL('..', import.meta.url))
const HTTP = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

/** Routes deliberately left out of the public reference, by spec path. */
const UNDOCUMENTED: Record<string, string> = {
  '/': 'the Scalar viewer for this spec',
  '/docs': 'redirects to /api',
  '/openapi': 'serves this spec',
  '/auth/{all}': 'Better Auth catch-all; its own OpenAPI plugin documents it',
  '/collaboration/access': 'service-to-service for the Hocuspocus server (REASON_COLLAB_SECRET)',
  '/collaboration/session': 'service-to-service for the Hocuspocus server',
  '/agent/agents': 'deprecated: always answers 501 pointing at /agent/chat',
  '/speech/stt': 'placeholder: transcription is client-side; use /agent/transcript',
}

/** Route paths whose methods the spec splits across a literal sub-path. */
const SPLIT: Record<string, { method: string; specPath: string }[]> = {
  // `POST /learn/playlists/accept-invite` is served by the `[id]` route.
  '/learn/playlists/{id}': [{ method: 'POST', specPath: '/learn/playlists/accept-invite' }],
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (name === '__tests__' || name === 'node_modules') return []
    if (statSync(full).isDirectory()) return routeFiles(full)
    return name === 'route.ts' ? [full] : []
  })
}

/** `app/api/doc/documents/[id]/route.ts` → `/doc/documents/{id}`. */
function specPathFor(file: string): string {
  const dir = relative(API_DIR, file).split(sep).slice(0, -1).join('/')
  return ('/' + dir).replace(/\[\.\.\.(\w+)\]/g, '{$1}').replace(/\[(\w+)\]/g, '{$1}')
}

function exportedMethods(source: string): string[] {
  const found = new Set<string>()
  for (const m of source.matchAll(/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g)) found.add(m[1])
  for (const m of source.matchAll(/export (?:const )?\{([^}]*)\}/g)) {
    for (const name of m[1].split(',')) {
      const exported = name.split(/\s+as\s+/).pop()!.trim()
      if ((HTTP as readonly string[]).includes(exported)) found.add(exported)
    }
  }
  return [...found].sort()
}

function routeTable(): Map<string, string[]> {
  const table = new Map<string, string[]>()
  for (const file of routeFiles(API_DIR)) {
    const path = specPathFor(file)
    let methods = exportedMethods(readFileSync(file, 'utf8'))
    for (const { method, specPath } of SPLIT[path] ?? []) {
      methods = methods.filter((m) => m !== method)
      table.set(specPath, [...(table.get(specPath) ?? []), method].sort())
    }
    if (methods.length) table.set(path, methods)
  }
  return table
}

const specPaths = spec.paths as Record<string, Record<string, unknown>>
const specMethods = (path: string) =>
  Object.keys(specPaths[path] ?? {})
    .map((m) => m.toUpperCase())
    .filter((m) => (HTTP as readonly string[]).includes(m))
    .sort()

describe('OpenAPI spec ↔ app/api routes', () => {
  const routes = routeTable()

  it('documents every method of every public route', () => {
    const missing = [...routes]
      .filter(([path]) => !(path in UNDOCUMENTED))
      .flatMap(([path, methods]) => methods.filter((m) => !specMethods(path).includes(m)).map((m) => `${m} ${path}`))
    expect(missing).toEqual([])
  })

  it('lists no operation that has no route behind it', () => {
    const stale = Object.keys(specPaths).flatMap((path) =>
      specMethods(path)
        .filter((m) => !(routes.get(path) ?? []).includes(m))
        .map((m) => `${m} ${path}`),
    )
    expect(stale).toEqual([])
  })

  it('keeps the undocumented list honest', () => {
    // An entry here for a route that no longer exists would hide nothing and mislead.
    expect(Object.keys(UNDOCUMENTED).filter((path) => !routes.has(path))).toEqual([])
    expect(Object.keys(UNDOCUMENTED).filter((path) => path in specPaths)).toEqual([])
  })

  it('gives every operation a unique operationId, a summary and exactly one known tag', () => {
    const tags = new Set((spec.tags as { name: string }[]).map((t) => t.name))
    const ids = new Set<string>()
    for (const [path, item] of Object.entries(specPaths)) {
      for (const [method, op] of Object.entries(item) as [string, any][]) {
        if (!(HTTP as readonly string[]).includes(method.toUpperCase())) continue
        const where = `${method.toUpperCase()} ${path}`
        expect(op.operationId, where).toMatch(/^[a-z][A-Za-z0-9]*$/)
        expect(ids.has(op.operationId), `${where} reuses ${op.operationId}`).toBe(false)
        ids.add(op.operationId)
        expect(op.summary, where).toBeTruthy()
        expect(op.tags, where).toHaveLength(1)
        expect(tags.has(op.tags[0]), `${where} tag ${op.tags[0]}`).toBe(true)
      }
    }
  })

  it('names only security schemes it defines', () => {
    const schemes = new Set(Object.keys((spec.components as any).securitySchemes))
    const used = new Set<string>()
    const collect = (reqs: Record<string, unknown>[] | undefined) => reqs?.forEach((r) => Object.keys(r).forEach((k) => used.add(k)))
    collect(spec.security as Record<string, unknown>[])
    for (const item of Object.values(specPaths)) for (const op of Object.values(item) as any[]) collect(op.security)
    expect([...used].filter((name) => !schemes.has(name))).toEqual([])
  })

  it('puts every tag in exactly one tag group', () => {
    const grouped = (spec as any)['x-tagGroups'].flatMap((g: { tags: string[] }) => g.tags)
    expect([...grouped].sort()).toEqual((spec.tags as { name: string }[]).map((t) => t.name).sort())
  })
})
