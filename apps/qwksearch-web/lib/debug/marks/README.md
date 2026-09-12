# Import-order markers

Each file here logs one `[ssr-trace]` line when it is evaluated, and does
nothing else. They exist because ES module bodies run *after* every import in
the file has been evaluated, so a breadcrumb written inside a module can never
report "I am about to import the heavy thing". A marker placed between two
`import` statements can: imports are evaluated in source order, so

```ts
import '@/lib/debug/marks/research-agent-ui-begin';
import { QwkSearchProviders } from 'research-agent-ui';
import '@/lib/debug/marks/research-agent-ui-end';
```

prints `begin`, then the whole `research-agent-ui` module graph evaluates, then
`end`. A `begin` with no matching `end` in the log means a module inside that
graph threw while being evaluated — the failure that answers the whole page
with a 500 before React has a boundary to fall back on (see `#440`, `#451`).

Delete these along with the rest of the tracing once the mystery 500 is closed.
