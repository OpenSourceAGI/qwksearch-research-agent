'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getKokoro, getVoiceList, preloadKokoro, getLoadedBackend } from '../../lib/kokoro';

type SpeechStatus = 'idle' | 'loading' | 'generating' | 'playing' | 'error';

interface UseKokoroTTSOptions {
  autoPreload?: boolean;
}

export function useKokoroTTS(text: string, options?: UseKokoroTTSOptions) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [modelReady, setModelReady] = useState(false);
  const [voices, setVoices] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('af_heart');
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (options?.autoPreload && !modelReady) {
      warmupModel();
    }
  }, [options?.autoPreload, modelReady]);

  useEffect(() => {
    const savedVoice = localStorage.getItem('kokoroVoice');
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      abortRef.current?.abort();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const warmupModel = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);
      await preloadKokoro();
      const list = await getVoiceList();
      setVoices(list);
      if (list.length && !list.includes(selectedVoice)) {
        setSelectedVoice(list[0]);
      }
      setModelReady(true);
      setStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model';
      setError(message);
      setStatus('error');
      console.error('Failed to load Kokoro model:', err);
    }
  }, [selectedVoice]);

  const speak = useCallback(async () => {
    if (!text?.trim()) return;
    if (!modelReady) {
      setError('Model not loaded. Click "Preload Model" first.');
      return;
    }

    try {
      cleanup();
      setStatus('generating');
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const tts = await getKokoro();
      const audio = await tts.generate(text.slice(0, 5000), {
        voice: selectedVoice,
      });

      const wavBytes = audio.toWav();
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      const audioEl = new Audio(url);
      audioRef.current = audioEl;

      audioEl.onended = () => {
        setStatus('idle');
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audioEl.onerror = () => {
        setStatus('error');
        setError('Failed to play audio');
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      setStatus('playing');
      await audioEl.play();
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        const message = err instanceof Error ? err.message : 'Speech generation failed';
        setError(message);
        setStatus('error');
        console.error('Kokoro TTS error:', err);
      }
    }
  }, [text, selectedVoice, modelReady, cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setStatus('idle');
    setError(null);
  }, [cleanup]);

  const changeVoice = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('kokoroVoice', voice);
  }, []);

  return {
    status,
    modelReady,
    voices,
    selectedVoice,
    error,
    warmupModel,
    speak,
    stop,
    changeVoice,
    backend: getLoadedBackend(),
  };
}
