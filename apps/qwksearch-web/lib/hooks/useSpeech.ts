/**
 * @fileoverview React hook for speech functionality
 * Provides unified interface for STT and TTS
 */
'use client';

import { useCallback, useState } from 'react';
import { speakText, generateSpeechFromText, checkSTTAPI } from 'use-voice-control/api-client';

export interface UseSpeechOptions {
  autoPlayFeedback?: boolean;
  ttsProvider?: 'kokoro' | 'deepgram';
  ttsVoice?: string;
}

export interface UseSpeechReturn {
  isListening: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  partialText: string;
  error: Error | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  generateAudio: (text: string) => Promise<Blob>;
  reset: () => void;
}

/**
 * React hook for speech input/output
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
  const {
    autoPlayFeedback = false,
    ttsProvider = 'kokoro',
    ttsVoice = 'af_heart',
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(
    typeof window !== 'undefined' && !!navigator.mediaDevices
  );
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<Error | null>(null);

  const speak = useCallback(
    async (text: string) => {
      try {
        setIsSpeaking(true);
        setError(null);
        await speakText(text, ttsProvider, ttsVoice);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsSpeaking(false);
      }
    },
    [ttsProvider, ttsVoice]
  );

  const generateAudio = useCallback(
    async (text: string) => {
      try {
        setError(null);
        return await generateSpeechFromText(text, ttsProvider, ttsVoice);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [ttsProvider, ttsVoice]
  );

  const startListening = useCallback(async () => {
    if (!isSupported || isListening || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const Moonshine = await import('@moonshine-ai/moonshine-js');

      const transcriber = new Moonshine.MicrophoneTranscriber(
        'model/small',
        {
          onTranscriptionUpdated(text: string) {
            setPartialText(text);
          },
          async onTranscriptionCommitted(text: string) {
            setPartialText('');

            if (autoPlayFeedback) {
              try {
                await speak(text);
              } catch (err) {
                console.error('Auto-feedback TTS failed:', err);
              }
            }
          },
        },
        false // streaming mode
      );

      // Store transcriber instance for stopping
      (window as any).__moonshineTranscriber = transcriber;
      await transcriber.start();
      setIsListening(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, isListening, isLoading, autoPlayFeedback, speak]);

  const stopListening = useCallback(async () => {
    try {
      const transcriber = (window as any).__moonshineTranscriber;
      if (transcriber?.stop) {
        await transcriber.stop();
      }
      setIsListening(false);
      setPartialText('');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  }, []);

  const reset = useCallback(() => {
    setPartialText('');
    setError(null);
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isLoading,
    isSpeaking,
    isSupported,
    partialText,
    error,
    startListening,
    stopListening,
    speak,
    generateAudio,
    reset,
  };
}
