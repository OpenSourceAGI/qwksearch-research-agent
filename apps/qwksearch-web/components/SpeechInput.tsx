'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import { speakText } from 'use-voice-control/api-client';

interface SpeechInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
  enableTTS?: boolean;
  ttsProvider?: 'kokoro' | 'deepgram';
  ttsVoice?: string;
}

export function SpeechInput({
  onTranscription,
  disabled = false,
  enableTTS = false,
  ttsProvider = 'kokoro',
  ttsVoice = 'af_heart',
}: SpeechInputProps) {
  const transcriberRef = useRef<any>(null);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!navigator.mediaDevices);
  }, []);

  const handleTranscriptionCommitted = useCallback(
    (text: string) => {
      onTranscription(text);
      setPartial('');

      // Auto-play TTS if enabled
      if (enableTTS) {
        playTranscriptionFeedback(text);
      }
    },
    [onTranscription, enableTTS]
  );

  const playTranscriptionFeedback = async (text: string) => {
    if (!enableTTS) return;

    try {
      setSpeaking(true);
      await speakText(text, ttsProvider, ttsVoice);
    } catch (error) {
      console.error('TTS playback failed:', error);
    } finally {
      setSpeaking(false);
    }
  };

  async function start() {
    if (loading || listening || !supported || disabled) return;

    setLoading(true);

    try {
      const Moonshine = await import('@moonshine-ai/moonshine-js');

      const transcriber = new Moonshine.MicrophoneTranscriber(
        'model/small',
        {
          onTranscriptionUpdated(text: string) {
            setPartial(text);
          },
          onTranscriptionCommitted: handleTranscriptionCommitted,
        },
        false // streaming mode
      );

      transcriberRef.current = transcriber;
      await transcriber.start();
      setListening(true);
    } catch (error) {
      console.error('Failed to start transcription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function stop() {
    if (!listening) return;

    try {
      await transcriberRef.current?.stop?.();
    } catch (error) {
      console.error('Failed to stop transcription:', error);
    }

    setListening(false);
  }

  const handleClick = listening ? stop : start;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={!supported || disabled || loading || speaking}
        className={`p-2 rounded-full transition-colors ${
          listening
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : loading || speaking
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : disabled || !supported
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        title={
          !supported
            ? 'Microphone not supported'
            : listening
              ? 'Stop recording'
              : loading
                ? 'Loading model...'
                : 'Start recording'
        }
        aria-label={listening ? 'Stop recording' : 'Start recording'}
      >
        {listening ? <Square size={20} /> : <Mic size={20} />}
      </button>

      {partial && (
        <span className="text-sm text-gray-600 italic animate-pulse">
          {partial}
        </span>
      )}

      {speaking && (
        <span className="flex items-center gap-1 text-sm text-blue-600 animate-pulse">
          <Volume2 size={16} />
          Speaking...
        </span>
      )}
    </div>
  );
}
