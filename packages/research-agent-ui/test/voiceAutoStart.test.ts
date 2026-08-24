/**
 * @fileoverview Unit tests for the "start talking automatically" voice setting.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
    hasVoiceAutoStartTriggered,
    isVoiceAutoStartEnabled,
    markVoiceAutoStartTriggered,
    setVoiceAutoStartEnabled,
    shouldAutoStartVoice,
} from '../src/lib/voiceAutoStart';

beforeEach(() => {
    window.localStorage.clear();
});

describe('isVoiceAutoStartEnabled / setVoiceAutoStartEnabled', () => {
    it('defaults to disabled when nothing is stored', () => {
        expect(isVoiceAutoStartEnabled()).toBe(false);
    });

    it('persists an enabled preference', () => {
        setVoiceAutoStartEnabled(true);

        expect(isVoiceAutoStartEnabled()).toBe(true);
    });

    it('persists a disabled preference after being enabled', () => {
        setVoiceAutoStartEnabled(true);
        setVoiceAutoStartEnabled(false);

        expect(isVoiceAutoStartEnabled()).toBe(false);
    });
});

describe('markVoiceAutoStartTriggered / hasVoiceAutoStartTriggered', () => {
    it('defaults to not triggered', () => {
        expect(hasVoiceAutoStartTriggered()).toBe(false);
    });

    it('records that auto-start already fired', () => {
        markVoiceAutoStartTriggered();

        expect(hasVoiceAutoStartTriggered()).toBe(true);
    });
});

describe('shouldAutoStartVoice', () => {
    const base = { enabled: true, isSpeechSupported: true, isListening: false };

    it('starts when enabled, supported, idle, and not yet triggered', () => {
        expect(shouldAutoStartVoice(base, false)).toBe(true);
    });

    it('does not start when the user has not opted in', () => {
        expect(shouldAutoStartVoice({ ...base, enabled: false }, false)).toBe(false);
    });

    it('does not start when speech input is unsupported', () => {
        expect(shouldAutoStartVoice({ ...base, isSpeechSupported: false }, false)).toBe(false);
    });

    it('does not start when already listening', () => {
        expect(shouldAutoStartVoice({ ...base, isListening: true }, false)).toBe(false);
    });

    it('does not start when it already triggered once in this browser', () => {
        expect(shouldAutoStartVoice(base, true)).toBe(false);
    });
});
