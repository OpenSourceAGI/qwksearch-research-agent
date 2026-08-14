/**
 * @fileoverview localStorage-backed "start talking automatically" voice setting.
 *
 * Two flags: whether the user opted in (persists across visits, toggled from
 * `VoiceSettingsPanel`), and whether auto-start has already fired once in
 * this browser (so it starts dictation on first visit only, not on every
 * mount/navigation while the composer remounts).
 */
const ENABLED_KEY = "voiceAutoStart";
const TRIGGERED_KEY = "voiceAutoStartTriggered";

const isBrowser = typeof window !== "undefined";

/** Whether the user has opted in to auto-starting dictation. */
export function isVoiceAutoStartEnabled(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(ENABLED_KEY) === "true";
}

/** Persists the user's auto-start preference. */
export function setVoiceAutoStartEnabled(enabled: boolean): void {
  if (!isBrowser) return;
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

/** Marks auto-start as already fired in this browser. */
export function markVoiceAutoStartTriggered(): void {
  if (!isBrowser) return;
  localStorage.setItem(TRIGGERED_KEY, "true");
}

export interface ShouldAutoStartVoiceOptions {
  /** Whether the user opted in via `isVoiceAutoStartEnabled()`. */
  enabled: boolean;
  /** Whether the browser/environment can actually run speech input. */
  isSpeechSupported: boolean;
  /** Whether dictation is already listening. */
  isListening: boolean;
}

/**
 * Pure decision of whether to auto-start dictation right now. Does not read
 * or write localStorage itself so it stays trivially testable; callers read
 * the "already triggered" flag and call `markVoiceAutoStartTriggered()`.
 */
export function shouldAutoStartVoice(
  { enabled, isSpeechSupported, isListening }: ShouldAutoStartVoiceOptions,
  alreadyTriggered: boolean,
): boolean {
  return enabled && isSpeechSupported && !isListening && !alreadyTriggered;
}

/** Whether auto-start has already fired in this browser. */
export function hasVoiceAutoStartTriggered(): boolean {
  if (!isBrowser) return false;
  return localStorage.getItem(TRIGGERED_KEY) === "true";
}
