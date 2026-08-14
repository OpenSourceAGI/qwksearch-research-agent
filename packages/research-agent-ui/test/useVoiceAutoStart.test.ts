/**
 * @fileoverview Unit tests for the `useVoiceAutoStart` hook.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoiceAutoStart } from '../src/hooks/voice/useVoiceAutoStart';
import { hasVoiceAutoStartTriggered, setVoiceAutoStartEnabled } from '../src/lib/voiceAutoStart';

beforeEach(() => {
    window.localStorage.clear();
});

describe('useVoiceAutoStart', () => {
    it('starts dictation and marks it triggered when the user opted in and speech is supported', () => {
        setVoiceAutoStartEnabled(true);
        const toggleSpeech = vi.fn().mockResolvedValue(undefined);

        renderHook(() =>
            useVoiceAutoStart({ isSpeechSupported: true, isListening: false, toggleSpeech })
        );

        expect(toggleSpeech).toHaveBeenCalledTimes(1);
        expect(hasVoiceAutoStartTriggered()).toBe(true);
    });

    it('does nothing when the user has not opted in', () => {
        const toggleSpeech = vi.fn().mockResolvedValue(undefined);

        renderHook(() =>
            useVoiceAutoStart({ isSpeechSupported: true, isListening: false, toggleSpeech })
        );

        expect(toggleSpeech).not.toHaveBeenCalled();
        expect(hasVoiceAutoStartTriggered()).toBe(false);
    });

    it('does not start when speech is unsupported', () => {
        setVoiceAutoStartEnabled(true);
        const toggleSpeech = vi.fn().mockResolvedValue(undefined);

        renderHook(() =>
            useVoiceAutoStart({ isSpeechSupported: false, isListening: false, toggleSpeech })
        );

        expect(toggleSpeech).not.toHaveBeenCalled();
    });

    it('does not start again on a second mount once already triggered', () => {
        setVoiceAutoStartEnabled(true);
        const toggleSpeech = vi.fn().mockResolvedValue(undefined);

        renderHook(() =>
            useVoiceAutoStart({ isSpeechSupported: true, isListening: false, toggleSpeech })
        );
        renderHook(() =>
            useVoiceAutoStart({ isSpeechSupported: true, isListening: false, toggleSpeech })
        );

        expect(toggleSpeech).toHaveBeenCalledTimes(1);
    });
});
