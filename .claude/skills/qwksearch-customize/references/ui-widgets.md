# Standalone UI Widgets

Small, independently publishable components used across the apps. Good
candidates to reuse rather than reimplement when a task needs "a settings
panel," "a dock/launcher," "a weather widget," or "voice input."

## packages/shadcn-app-dock

macOS-style category dock: icon magnification on hover, built-in shadcn
theme switcher (light/dark via `next-themes`), animated with Framer Motion.
`src/shadcn-app-dock.tsx` (main component), `src/shadcn-app-dock-context.tsx`
(context/provider), `src/theme-menu.tsx`, `src/components/`. Prop-driven —
check `src/index.ts` for the exported API before assuming you need to fork
it; used by `qwksearch-web` for its category dock.

## packages/shadcn-settings

Generic settings-panel primitives (sections, forms) — `src/components/`,
`src/types.ts` for the shape settings sections must conform to. Note
`research-agent-ui` has its *own* `src/settings/` (JSON-driven, `search.json`
+ `sections.json`) — check whether a settings change belongs in this shared
package (reusable across apps) or in `research-agent-ui`'s app-specific
settings config before picking one.

## packages/react-weather-forecast

Self-contained weather widget with its own tiny backend: `src/components/`,
`src/hooks/`, `src/api/` (client calling a weather provider), `src/icons/`,
`src/weatherCodes.ts` (weather condition → icon/label mapping), plus a
`worker/` Cloudflare Worker proxy (scripts `worker:dev`/`worker:deploy`) —
the worker likely exists to hide an API key from the client bundle. Used
where the product shows weather info inline in search/answers.

## packages/use-voice-control

Speech/voice control hook, backed by `speech/` (check for
provider-specific code, e.g. Whisper/Web Speech API/Kokoro — `KOKORO_INTEGRATION.md`
in `research-agent-ui` references Kokoro TTS, and `research-agent-ui/src/lib/kokoro.ts`
+ `src/hooks/voice/` consume this hook). This is the shared hook;
`research-agent-ui`'s `VoiceSettings` component and `use-voice-control`
together form the full voice feature — check both when changing voice
input/output behavior.
