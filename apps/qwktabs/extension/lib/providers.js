
export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    model: 'gpt-5.6-luna',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  claude: {
    name: 'Claude (Anthropic)',
    model: 'claude-sonnet-5',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  gemini: {
    name: 'Gemini (Google)',
    model: 'gemini-3.8-flash',
    endpoint: 'https://generativelanguage.googleapis.com',
  },
  deepseek: {
    name: 'DeepSeek',
    model: 'deepseek-v4-flash',
    endpoint: 'https://api.deepseek.com/chat/completions',
  },
  compatible: { name: 'Other / OpenAI-compatible', model: '', endpoint: '' },
};
export function providerEndpoint(settings) {
  const provider = PROVIDERS[settings.provider];
  if (!provider) throw Error('Select an AI provider in Settings');
  return settings.provider === 'compatible' ? settings.aiEndpoint : provider.endpoint;
}
export function aiConnectionId(settings) {
  return settings.provider === 'compatible'
    ? 'compatible:' + settings.aiEndpoint
    : settings.provider;
}
export async function readAIKeys(storage, settings) {
  const saved = await storage.get(['aiKeys', 'aiKey']);
  if (saved.aiKeys) {
    if (saved.aiKey !== undefined) await storage.remove('aiKey');
    return saved.aiKeys;
  }
  const keys = saved.aiKey ? { [aiConnectionId(settings)]: saved.aiKey } : {};
  await storage.set({ aiKeys: keys });
  if (saved.aiKey !== undefined) await storage.remove('aiKey');
  return keys;
}

// Upgrade the previous shipped defaults once; preserve custom choices and later overrides.
export const MODEL_DEFAULTS_VERSION = 1;
export function migrateModelDefaults(settings = {}) {
  if (settings.modelDefaultsVersion >= MODEL_DEFAULTS_VERSION) return settings;
  const previous = {openai: 'gpt-5-mini', gemini: 'gemini-2.5-flash'};
  const provider = settings.provider || 'gemini';
  return {...settings, modelDefaultsVersion: MODEL_DEFAULTS_VERSION,
    ...(!settings.model || settings.model === previous[provider]
      ? {model: PROVIDERS[provider]?.model || settings.model || ''} : {})};
}
// Verified provider-specific controls; unknown/custom models receive no guessed fields.
export function minimalReasoning(settings) {
  const {provider, model = ''} = settings;
  if (provider === 'gemini' && /^gemini-3\.8-flash(?:-|$)/.test(model))
    return {thinkingConfig: {thinkingLevel: 'low'}};
  if (provider === 'claude' && /^claude-sonnet-5(?:-|$)/.test(model))
    return {thinking: {type: 'disabled'}};
  if (provider === 'deepseek' && /^deepseek-v4-(?:flash|pro)(?:-|$)/.test(model))
    return {thinking: {type: 'disabled'}};
  if (provider === 'openai' && /^gpt-5\.6(?:-(?:luna|terra|sol))?(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
    return {reasoning_effort: 'none'};
  if (provider === 'openai' && /^gpt-5(?:-mini|-nano)?(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
    return {reasoning_effort: 'minimal'};
  return {};
}
