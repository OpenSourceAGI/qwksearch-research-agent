'use client';

import React, { useEffect, useState } from 'react';
import { useKokoroTTS } from '../../hooks/voice/useKokoroTTS';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip';
import { Volume2, Download, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KokoroVoiceSelectorProps {
  preloadOnMount?: boolean;
}

const VOICE_DESCRIPTIONS: Record<string, string> = {
  'af_heart': 'American Female - Heart',
  'af_bella': 'American Female - Bella',
  'af_nicole': 'American Female - Nicole',
  'af_sarah': 'American Female - Sarah',
  'am_adam': 'American Male - Adam',
  'am_michael': 'American Male - Michael',
  'am_tony': 'American Male - Tony',
  'bf_emma': 'British Female - Emma',
  'bm_george': 'British Male - George',
  'bm_thomas': 'British Male - Thomas',
};

export default function KokoroVoiceSelector({ preloadOnMount = false }: KokoroVoiceSelectorProps) {
  const { status, modelReady, voices, selectedVoice, error, warmupModel, changeVoice, backend } = useKokoroTTS('', { autoPreload: preloadOnMount });
  const [showFullPanel, setShowFullPanel] = useState(false);

  const isLoading = status === 'loading';
  const isError = status === 'error';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={warmupModel}
              disabled={isLoading || modelReady}
              className={cn(
                'p-2 rounded-full transition duration-200',
                modelReady
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-white/10 dark:bg-black/10 text-muted-foreground hover:bg-white/20 dark:hover:bg-black/20',
                isLoading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isLoading ? 'Loading Kokoro model...' : modelReady ? 'Model ready' : 'Preload Kokoro.js model'}
          </TooltipContent>
        </Tooltip>

        {modelReady && backend && (
          <span className="text-xs text-muted-foreground">
            {backend} • {voices.length} voices
          </span>
        )}

        {isError && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle size={18} className="text-red-500" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {error}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {modelReady && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowFullPanel(!showFullPanel)}
            className="w-full text-left px-3 py-2 rounded-md bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <Volume2 size={16} />
              {VOICE_DESCRIPTIONS[selectedVoice] || selectedVoice}
            </div>
          </button>

          {showFullPanel && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-white/5 dark:bg-black/5 rounded-md max-h-64 overflow-y-auto">
              {voices.map((voice) => (
                <button
                  key={voice}
                  onClick={() => {
                    changeVoice(voice);
                    setShowFullPanel(false);
                  }}
                  className={cn(
                    'p-2 text-left text-sm rounded transition duration-200',
                    selectedVoice === voice
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'bg-white/5 dark:bg-black/5 text-foreground hover:bg-white/10 dark:hover:bg-black/10'
                  )}
                >
                  {VOICE_DESCRIPTIONS[voice] || voice}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
