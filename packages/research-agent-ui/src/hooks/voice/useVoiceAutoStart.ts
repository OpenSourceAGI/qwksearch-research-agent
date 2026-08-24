/**
 * @fileoverview Auto-starts dictation once per browser when the user has
 * opted in via `VoiceSettingsPanel`'s "start talking automatically" setting.
 *
 * Fires at most once per browser (tracked in localStorage), so the composer
 * remounting on navigation doesn't reopen the mic repeatedly.
 */
"use client";

import { useEffect } from "react";
import {
  hasVoiceAutoStartTriggered,
  isVoiceAutoStartEnabled,
  markVoiceAutoStartTriggered,
  shouldAutoStartVoice,
} from "../../lib/voiceAutoStart";

export interface UseVoiceAutoStartOptions {
  isSpeechSupported: boolean;
  isListening: boolean;
  toggleSpeech: () => Promise<void>;
}

export function useVoiceAutoStart({
  isSpeechSupported,
  isListening,
  toggleSpeech,
}: UseVoiceAutoStartOptions): void {
  useEffect(() => {
    if (
      shouldAutoStartVoice(
        { enabled: isVoiceAutoStartEnabled(), isSpeechSupported, isListening },
        hasVoiceAutoStartTriggered(),
      )
    ) {
      markVoiceAutoStartTriggered();
      void toggleSpeech();
    }
    // Only ever meant to run once, when speech support is first known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeechSupported]);
}
