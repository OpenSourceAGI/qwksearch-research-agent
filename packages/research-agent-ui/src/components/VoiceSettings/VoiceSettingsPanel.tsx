'use client';

import React, { useState } from 'react';
import { useTextToSpeech } from '../../hooks/voice/useTextToVoice';
import KokoroVoiceSelector from './KokoroVoiceSelector';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import { Volume2, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function VoiceSettingsPanel() {
  const [showSettings, setShowSettings] = useState(false);
  const [useTTSKokoro, setUseTTSKokoro] = useState(() =>
    localStorage.getItem('useTTSKokoro') !== 'false'
  );
  const [ttsSpeaker, setTtsSpeaker] = useState(() =>
    localStorage.getItem('ttsSpeaker') || 'angus'
  );

  const { start: previewStart, speechStatus } = useTextToSpeech(
    'This is a preview of the selected voice.',
    { enableInterrupt: false }
  );

  const handleToggleKokoro = (enabled: boolean) => {
    setUseTTSKokoro(enabled);
    localStorage.setItem('useTTSKokoro', String(enabled));
  };

  const handleSpeakerChange = (speaker: string) => {
    setTtsSpeaker(speaker);
    localStorage.setItem('ttsSpeaker', speaker);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 size={18} />
          <h3 className="font-semibold">Voice Settings</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs px-3 py-1 rounded-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 transition"
        >
          {showSettings ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {showSettings && (
        <div className="space-y-4 p-4 rounded-lg bg-white/5 dark:bg-black/5 border border-white/10 dark:border-black/10">
          {/* Kokoro.js Option */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useTTSKokoro}
                onChange={(e) => handleToggleKokoro(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium text-sm">Use Kokoro.js (Local TTS)</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  Runs locally in your browser. No server requests, lower latency, and multiple voice options.
                </TooltipContent>
              </Tooltip>
            </label>
            {useTTSKokoro && <KokoroVoiceSelector preloadOnMount={false} />}
          </div>

          {/* Cloudflare Fallback Option */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!useTTSKokoro}
                onChange={(e) => handleToggleKokoro(!e.target.checked)}
                className="rounded"
              />
              <span className="font-medium text-sm">Use Cloudflare TTS (Fallback)</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">ⓘ</span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  Uses Cloudflare Workers AI. Slightly higher latency but can be a fallback.
                </TooltipContent>
              </Tooltip>
            </label>

            {!useTTSKokoro && (
              <div className="space-y-2">
                <select
                  value={ttsSpeaker}
                  onChange={(e) => handleSpeakerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 text-sm"
                >
                  <option value="angus">Angus</option>
                  <option value="flora">Flora</option>
                  <option value="james">James</option>
                  <option value="natalie">Natalie</option>
                </select>
                <button
                  onClick={() => previewStart()}
                  disabled={speechStatus === 'started'}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition',
                    speechStatus === 'started'
                      ? 'bg-gray-500/20 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30'
                  )}
                >
                  <Volume2 size={16} />
                  {speechStatus === 'started' ? 'Playing...' : 'Preview'}
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t border-white/10 dark:border-black/10">
            <p>
              <strong>Tip:</strong> Kokoro.js loads once and runs locally. The first model load may take a few
              seconds, but subsequent TTS generation is very fast.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
