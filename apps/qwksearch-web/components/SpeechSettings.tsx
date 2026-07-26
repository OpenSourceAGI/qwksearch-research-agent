'use client';

import { useCallback, useState } from 'react';
import { KOKORO_VOICES, DEEPGRAM_SPEAKERS, type KokoroVoice, type DeepgramSpeaker } from '../../../packages/use-voice-control/speech/types';
import { speakText } from '@/lib/speech';

interface SpeechSettingsProps {
  onChange?: (settings: SpeechSettings) => void;
}

export interface SpeechSettings {
  ttsEnabled: boolean;
  ttsProvider: 'kokoro' | 'deepgram';
  ttsVoice: string;
  sttEnabled: boolean;
}

export function SpeechSettings({ onChange }: SpeechSettingsProps) {
  const [settings, setSettings] = useState<SpeechSettings>({
    ttsEnabled: true,
    ttsProvider: 'kokoro',
    ttsVoice: 'af_heart',
    sttEnabled: true,
  });

  const [testSpeaking, setTestSpeaking] = useState(false);

  const handleSettingChange = useCallback(
    (key: keyof SpeechSettings, value: any) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      onChange?.(newSettings);
    },
    [settings, onChange]
  );

  const handleTestVoice = async () => {
    try {
      setTestSpeaking(true);
      await speakText(
        'Hello, this is a test of the text-to-speech voice.',
        settings.ttsProvider,
        settings.ttsVoice
      );
    } catch (error) {
      console.error('Test voice failed:', error);
    } finally {
      setTestSpeaking(false);
    }
  };

  const voices =
    settings.ttsProvider === 'kokoro'
      ? (KOKORO_VOICES as readonly string[])
      : (DEEPGRAM_SPEAKERS as readonly string[]);

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900">Speech Settings</h3>

      {/* STT Setting */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.sttEnabled}
            onChange={(e) =>
              handleSettingChange('sttEnabled', e.target.checked)
            }
            className="rounded"
          />
          <span className="text-sm text-gray-700">Enable Speech-to-Text</span>
        </label>
        <p className="text-xs text-gray-600">
          Allow microphone input for transcription using Moonshine
        </p>
      </div>

      {/* TTS Setting */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.ttsEnabled}
            onChange={(e) =>
              handleSettingChange('ttsEnabled', e.target.checked)
            }
            className="rounded"
          />
          <span className="text-sm text-gray-700">Enable Text-to-Speech</span>
        </label>
        <p className="text-xs text-gray-600">
          Automatically speak transcribed text
        </p>
      </div>

      {/* TTS Provider Selection */}
      {settings.ttsEnabled && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            TTS Provider
          </label>
          <select
            value={settings.ttsProvider}
            onChange={(e) =>
              handleSettingChange(
                'ttsProvider',
                e.target.value as 'kokoro' | 'deepgram'
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="kokoro">Kokoro (Fast, Natural)</option>
            <option value="deepgram">Deepgram Aura (Premium)</option>
          </select>
        </div>
      )}

      {/* Voice Selection */}
      {settings.ttsEnabled && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Voice
          </label>
          <select
            value={settings.ttsVoice}
            onChange={(e) =>
              handleSettingChange('ttsVoice', e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {voices.map((voice) => (
              <option key={voice} value={voice}>
                {voice}
              </option>
            ))}
          </select>

          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            disabled={testSpeaking}
            className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded-md transition-colors"
          >
            {testSpeaking ? 'Speaking...' : 'Test Voice'}
          </button>
        </div>
      )}
    </div>
  );
}
