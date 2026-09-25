
import { initialState, text } from './model.js';
import { endpointOrigin } from './integrations.js';

// Explicit allowlist shared by Settings and portable backups. Credentials never enter state.
export function sanitizeSettings(input = {}, base = initialState().settings) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Can\'t read these saved settings');
  const next = { ...base };
  delete next.organisation;
  delete next.aiNaming;
  delete next.obsidianVault;
  delete next.captureWebStore;
  for (const [key, values] of Object.entries({
    theme: ['system', 'light', 'dark'],
    tabSort: ['recent', 'position', 'reverse', 'title', 'domain'],
    view: ['board', 'list'],
    provider: ['openai', 'claude', 'gemini', 'deepseek', 'compatible'],
  }))
    if (values.includes(input[key])) next[key] = input[key];
  for (const key of ['previewCapture', 'currentWindowOnly', 'closeAfterStash', 'autoGroup', 'autoUpdateDefault', 'regroupExisting'])
    if (typeof input[key] === 'boolean') next[key] = input[key];
  for (const key of ['model', 'notionParent'])
    if (input[key] !== undefined) next[key] = text(input[key], 200);
  if (input.aiEndpoint !== undefined) {
    if (input.aiEndpoint) endpointOrigin(input.aiEndpoint);
    next.aiEndpoint = text(input.aiEndpoint, 1000);
  }
  next.rules = initialState().settings.rules;
  next.websiteGrouping = true;
  return next;
}
export function portableSettings(settings) {
  const clean = sanitizeSettings(settings),
    keys = Object.keys(initialState().settings);
  return Object.fromEntries(keys.map((key) => [key, clean[key]]));
}
