/**
 * § 2.1 of the LobeHub Migration To-Do — the old settings surface mapped onto
 * this engine — written as data instead of prose.
 *
 * Phase 2.4 deletes `apps/qwksearch-web/components/Settings/**`, its
 * `app/settings/[[...section]]` route and `app/api/config`. It may only do that
 * once every section of the old surface has somewhere to land, and the thing
 * that decides "somewhere to land" is this file: each entry names the legacy
 * section, what actually stores its values today, the engine tab that takes it
 * over, and — the part that matters — what is still missing before the legacy
 * section can be deleted.
 *
 * Why data and not a doc section. The map is only useful if it is still true
 * when 2.4 runs, and a prose map decays silently: upstream renames a tab, we
 * add a pane, someone adds a tenth section to `sections.json`, and the page
 * still reads as if it were current. `legacySettingsMap.contract.test.ts`
 * checks this file against both halves it describes — `sections.json` and
 * `search.json` on the QwkSearch side, `componentMap.ts` and the feature
 * directories on the engine side — so drift fails a test instead of misleading
 * a later run. It is the same mechanism the two panes' `contract.test.ts` use
 * for their routes, one level up.
 *
 * Nothing imports this at runtime. It is a migration artifact with a guard,
 * and it is deleted along with the surface it describes.
 */
import { SettingsTabs } from '@/store/global/initialState';

/**
 * How much of a legacy section the engine can serve today.
 *
 * - `covered` — the engine does everything the legacy section does. Nothing
 *   blocks deleting it.
 * - `partial` — an engine pane owns the same job, but something the legacy
 *   section does is missing or unverified. `gaps` says what.
 * - `gap` — the engine has no equivalent at all. `engineTabs` is empty.
 */
export type MigrationStatus = 'covered' | 'gap' | 'partial';

export interface LegacySection {
  /**
   * The engine feature directories, relative to `src/features/Settings/`, that
   * serve this section. Checked for existence by the contract test.
   */
  engineFeatures: string[];
  /**
   * The engine tabs that take this section over. Every one of these must be
   * registered in `../features/componentMap.ts`, or it is not reachable and
   * the contract test fails. Empty exactly when `status` is `gap`.
   */
  engineTabs: SettingsTabs[];
  /**
   * What must still be built, decided or verified before 2.4 may delete the
   * legacy section. Empty exactly when `status` is `covered`.
   */
  gaps: string[];
  /** `key` in `packages/research-agent-ui/src/settings/sections.json`. */
  key: string;
  /** The component that renders it today, repo-root-relative. */
  legacyComponent: string;
  /** `name` in `sections.json` — the label the old surface shows. */
  name: string;
  status: MigrationStatus;
  /** Where the legacy section's values actually live today. */
  stores: string;
}

/**
 * The nine sections of the old surface, in `sections.json` order.
 *
 * Read `stores` before `engineTabs`: most of the remaining work in Phase 2 is
 * not UI — both panes shipped in 2.2 — it is that the legacy values sit in
 * places the engine does not read. Three distinct stores appear here, and each
 * implies a different migration:
 *
 * - **`/api/config`** — one global D1 config row. Its writes are admin-only
 *   (`assertAdmin` in `app/api/config/route.ts`), so these were never per-user
 *   settings; on the engine they are Worker secrets. That is 2.3's "server env
 *   keys stay Worker secrets".
 * - **`localStorage`** — per-browser, no server copy, so there is nothing to
 *   migrate *from* on another device. That is 2.3's "announce a one-time
 *   re-entry; do not build a migrator", and it includes credentials.
 * - **Worker A tables** (`/api/user/*`, `/api/agent/*`) — real per-user rows in
 *   D1, and the only ones where a migrator would even be possible. The engine
 *   keeps its equivalents in Postgres.
 */
export const LEGACY_SETTINGS_SECTIONS: readonly LegacySection[] = [
  {
    engineFeatures: ['profile', 'apikey', 'devices', 'appearance'],
    engineTabs: [
      SettingsTabs.Profile,
      SettingsTabs.APIKey,
      SettingsTabs.Devices,
      SettingsTabs.Appearance,
    ],
    gaps: [
      'API key: the legacy pane mints and rotates the key the Worker accepts on /api/agent/* (PATCH /api/user). The engine apikey pane issues LobeHub keys from its own table. Decide which key the Worker trusts before deleting — the two are not the same credential.',
      'Account deletion: DELETE /api/user has no row in the engine profile pane (AvatarRow, EmailRow, FullNameRow, UsernameRow, PasswordRow, InterestsRow, SSOProvidersList, Composio).',
      'Session revocation has no engine equivalent, despite the devices tab looking like one: the legacy pane lists browser sessions from /api/user/sessions and signs them out, while the engine devices pane manages CLI/desktop device connections and their shares (features/DeviceManager). Different objects, same word.',
      'Linking/unlinking an OAuth account: engine SSOProvidersList lists providers; unlink parity unverified.',
    ],
    key: 'account',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/Account.tsx',
    name: 'Account',
    status: 'partial',
    stores:
      'Worker A: /api/user, /api/user/accounts, /api/user/sessions, /api/user/password, better-auth client; theme via next-themes in localStorage',
  },
  {
    engineFeatures: ['provider', 'service-model'],
    engineTabs: [SettingsTabs.Provider, SettingsTabs.ServiceModel],
    gaps: [
      'Scope change, not a port: legacy provider keys and base URLs are one admin-only global config row, so every user shares them. The engine keeps provider credentials per user. Cutover means operator keys become Worker secrets and per-user keys are re-entered (2.3).',
      'The "Test models" round-trip (POST /api/agent/test-models, TestModelsButton.tsx) has no engine equivalent.',
    ],
    key: 'models',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/Models/Section.tsx',
    name: 'Language Models',
    status: 'partial',
    stores:
      'Worker A: GET /api/config (public) + POST /api/config (admin-only), one global D1 row; models resolved through chat-agent-toolkit ModelRegistry',
  },
  {
    engineFeatures: ['connector', 'skill'],
    engineTabs: [SettingsTabs.Connector, SettingsTabs.Skill],
    gaps: [
      'Servers configured in the legacy pane live in Worker A (/api/agent/mcpservers) and the engine reads its own MCP store. Nothing reads both, so this is a re-entry (2.3), not a migrator.',
      'The engine\'s connector tab is the skill pane in another view mode (ToolSettings viewMode="connector"); which of the two the legacy section maps onto per server type is unverified.',
    ],
    key: 'mcpservers',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/MCPServers/Section.tsx',
    name: 'Connectors',
    status: 'partial',
    stores: 'Worker A: /api/agent/mcpservers (list, add, update, delete, toggle)',
  },
  {
    engineFeatures: ['skill', 'memory'],
    engineTabs: [SettingsTabs.Skill, SettingsTabs.Memory],
    gaps: [
      'Memories are per-user rows in Worker A D1 (/api/user/memories) and the engine keeps memory in Postgres. This is the one section where a migrator is possible rather than a re-entry; whether to write one is undecided.',
      'The legacy skills list is a fixed catalogue of five built-ins toggled through /api/user/enabled-skills. The engine skill pane is a live registry (built-in, MCP, Composio, LobeHub, custom). Map the five onto it, or accept that the toggles do not survive.',
    ],
    key: 'skills-memory',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/SkillsAndMemory.tsx',
    name: 'Skills & Memory',
    status: 'partial',
    stores: 'Worker A: /api/user/enabled-skills, /api/user/memories (+ /usage)',
  },
  {
    engineFeatures: ['search'],
    engineTabs: [SettingsTabs.Search],
    gaps: [
      'The engine pane selects *categories*; the legacy pane selects *engines within a category* (75+ of them, with favicons and descriptions). No per-engine override exists in UserSearchOverrides.',
      'No engine equivalent for the live health check: GET /api/search/engines/status and POST /api/search/engines/test run a probe query per engine and disable the ones that fail.',
    ],
    key: 'searchEngines',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/SearchEngines.tsx',
    name: 'Search Sources',
    status: 'partial',
    stores: 'Worker A: /api/search/engines, /api/search/engines/status, /api/search/engines/test',
  },
  {
    engineFeatures: ['search', 'extraction'],
    engineTabs: [SettingsTabs.Search, SettingsTabs.Extraction],
    gaps: [
      'This section is 22 unrelated fields with four different destinations — see LEGACY_SEARCH_FIELDS, which maps each one. Only sourceScrapeTimeout lands on a shipped pane today.',
      'Nine of the 22 are homepage chrome (background art, orb glow, cursor trail, result glow) and homepage widgets (weather ×5, trending news ×4) belonging to a shell the engine replaces.',
      'Three are operator credentials on a global admin-only row (searxngURL, proxyURL, tavilyApiKey) and become Worker secrets (2.3).',
    ],
    key: 'search',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/Search.tsx',
    name: 'Search Settings',
    status: 'partial',
    stores:
      'Worker A /api/config for the six scope:"server" fields; localStorage for the other sixteen. Field list: packages/research-agent-ui/src/settings/search.json',
  },
  {
    engineFeatures: [],
    engineTabs: [],
    gaps: [
      'The engine has no file-source concept. Its storage tab manages the local database, not remote buckets, and its creds tab holds model-provider credentials.',
      'Blocking for 2.3: SSH/S3/R2/B2/Google Docs/Turso credentials sit in localStorage under REASON-file-sources with no server copy, so they cannot be migrated — only re-entered, and only once somewhere exists to enter them.',
      'Decide whether this belongs to the engine at all or to Phase 3 with the REASON editor and its file browser, which is the only consumer.',
    ],
    key: 'fileSources',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/FileSources.tsx',
    name: 'Cloud Storage',
    status: 'gap',
    stores:
      'localStorage: REASON-file-sources, REASON-active-file-source (packages/research-agent-ui/src/lib/file-sources.ts)',
  },
  {
    engineFeatures: [],
    engineTabs: [],
    gaps: [
      'Phase 3 work: rewrite modes are REASON editor prompts (write-language/rewrite-modes), and REASON is not inside the engine yet. There is no settings tab to map them onto until it is.',
      'Stored in localStorage, so the custom modes a user added do not survive a cutover unless they are exported first.',
    ],
    key: 'aiRewriteModes',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/AIRewriteModes.tsx',
    name: 'Rewrite Modes',
    status: 'gap',
    stores:
      'localStorage via write-language/rewrite-modes (getRewriteModes / saveRewriteModes / resetRewriteModes)',
  },
  {
    engineFeatures: ['service-model'],
    engineTabs: [SettingsTabs.ServiceModel],
    gaps: [
      "The engine's service-model tab configures STT (tts/features/OpenAI) and model assignments. It has no TTS voice picker: SettingsTabs.TTS is deprecated and redirects to ServiceModel, and src/features/Settings/tts/ has no index — only the STT sub-form service-model imports.",
      'So Kokoro.js on/off, the speaker choice and voice auto-start have no engine home. Decide adopt-or-port here and in 1.4, which tracks the same question for voice input.',
    ],
    key: 'voice',
    legacyComponent: 'apps/qwksearch-web/components/Settings/Sections/Voice.tsx',
    name: 'Voice Settings',
    status: 'partial',
    stores:
      'localStorage: useTTSKokoro, ttsSpeaker, voice auto-start (packages/research-agent-ui VoiceSettingsPanel)',
  },
];

/**
 * Where one of the legacy `search` section's fields ends up.
 *
 * - `covered` — a shipped engine pane already has this control.
 * - `operator` — an operator credential or host. It stops being a user setting
 *   and becomes a Worker secret; the panes report only whether it is
 *   configured, never its value.
 * - `gap` — the engine needs it and does not have it.
 * - `shell` — chrome of the old shell (its homepage, its result cards). The
 *   engine renders its own; nothing migrates unless the feature is ported.
 */
export type FieldDestinationKind = 'covered' | 'gap' | 'operator' | 'shell';

export interface LegacySearchField {
  /** The engine destination, named precisely enough to act on. */
  destination: string;
  /** `key` in `packages/research-agent-ui/src/settings/search.json`. */
  key: string;
  kind: FieldDestinationKind;
}

/**
 * All 22 fields of `search.json`, which the legacy "Search Settings" section
 * renders as one flat list.
 *
 * The list is flat because the old surface had nowhere else to put things: it
 * mixes an operator's SearXNG host with a homepage animation toggle and the
 * agent's system prompt. Mapping it section-by-section is what made 2.1 look
 * finished when it was not — the section maps onto two panes, and eighteen of
 * its fields land somewhere else entirely.
 */
export const LEGACY_SEARCH_FIELDS: readonly LegacySearchField[] = [
  {
    destination: 'QwkSearch homepage background art. The engine has its own homepage.',
    key: 'showBackgroundArt',
    kind: 'shell',
  },
  { destination: 'QwkSearch homepage orb animation.', key: 'orbHoverGlow', kind: 'shell' },
  { destination: 'QwkSearch homepage cursor trail.', key: 'cursorGlowTrail', kind: 'shell' },
  {
    destination:
      "QwkSearch search-result source cards. The engine renders the web-browsing tool's own results.",
    key: 'searchResultGlow',
    kind: 'shell',
  },
  {
    destination: 'Voice: no engine TTS voice picker (see the voice section).',
    key: 'ttsSpeaker',
    kind: 'gap',
  },
  {
    destination:
      "Agent system role — ChatSettingsTabs.Prompt in the engine's agent settings, which is per-agent rather than one global string.",
    key: 'systemInstructions',
    kind: 'covered',
  },
  {
    destination:
      'Follow-up suggestions. Parity item 1.4 — verify the engine reads QwkSearch results before deciding whether a count control is needed.',
    key: 'maxFollowupQuestions',
    kind: 'gap',
  },
  {
    destination:
      'Follow-up suggestion prompt. Engine equivalent lives in its own prompt, not a user setting (1.4).',
    key: 'followUpQuestionsPrompt',
    kind: 'gap',
  },
  {
    destination:
      'Query expansion prompt, used by the search retriever. No engine control; see packages/builtin-tool-web-browsing (1.4).',
    key: 'queryExpansionPrompt',
    kind: 'gap',
  },
  {
    destination:
      'Worker secret QWKSEARCH_SEARCH_URL / SEARXNG_API_URL. The search pane deliberately drops an endpoint sent by a user.',
    key: 'searxngURL',
    kind: 'operator',
  },
  {
    destination:
      'Worker secret. Surfaced to the extraction pane only as effective.configured.proxy — a proxy URL can carry credentials in its userinfo.',
    key: 'proxyURL',
    kind: 'operator',
  },
  {
    destination:
      'Worker secret. Surfaced to the extraction pane only as effective.configured.tavilyApiKey.',
    key: 'tavilyApiKey',
    kind: 'operator',
  },
  {
    destination:
      'Extraction pane, timeoutSeconds (UserExtractionOverrides) — the same knob, per user instead of global.',
    key: 'sourceScrapeTimeout',
    kind: 'covered',
  },
  { destination: 'QwkSearch homepage weather widget.', key: 'showWeatherWidget', kind: 'shell' },
  { destination: 'QwkSearch homepage weather widget.', key: 'weatherLocations', kind: 'shell' },
  { destination: 'QwkSearch homepage weather widget.', key: 'weatherForecastDays', kind: 'shell' },
  { destination: 'QwkSearch homepage weather widget.', key: 'weatherForecastHours', kind: 'shell' },
  {
    destination: 'QwkSearch homepage weather widget.',
    key: 'weatherTemperatureUnit',
    kind: 'shell',
  },
  {
    destination: 'QwkSearch homepage trending-news widget.',
    key: 'showTrendingNewsWidget',
    kind: 'shell',
  },
  {
    destination: 'QwkSearch homepage trending-news widget.',
    key: 'trendingNewsApiUrl',
    kind: 'shell',
  },
  {
    destination: 'QwkSearch homepage trending-news widget.',
    key: 'trendingNewsMaxTopics',
    kind: 'shell',
  },
  {
    destination: 'QwkSearch homepage trending-news widget.',
    key: 'trendingNewsShowImages',
    kind: 'shell',
  },
];

/**
 * The sections 2.4 may not delete yet, and why.
 *
 * This is the whole point of the file: "can the old settings surface be
 * deleted?" is `retirementBlockers().length === 0`, and it is answerable from
 * code rather than from a reading of a doc page.
 */
export const retirementBlockers = (): readonly LegacySection[] =>
  LEGACY_SETTINGS_SECTIONS.filter((section) => section.status !== 'covered');

/** Every engine tab the old surface maps onto, deduped, in first-use order. */
export const engineTabsInUse = (): SettingsTabs[] => [
  ...new Set(LEGACY_SETTINGS_SECTIONS.flatMap((section) => section.engineTabs)),
];
