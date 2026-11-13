/**
 * @fileoverview The homepage mascot widget: the QwkSearch character beside a
 * time-of-day greeting, in the same glass card as the Learn, news and weather
 * widgets. It can be closed from its own ✕ or from the "Show Mascot Widget"
 * setting, which share the `showMascotWidget` localStorage key.
 */
'use client';
import { useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { getGreeting } from './background-art';

export interface MascotWidgetProps {
  /** The artwork URL (`researchAgentUIConfig.homepageMascotUrl`). */
  src: string;
  /** Called after the reader closes the widget from its ✕. */
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
}

export default function MascotWidget({ src, onDismiss, className, style }: MascotWidgetProps) {
  // Picked once: the greeting is random, and must not change on every render.
  const [greeting] = useState(getGreeting);

  return (
    <div
      className={`relative flex items-center gap-3 overflow-hidden px-3 py-2 ${className ?? ''}`}
      style={style}
      data-testid="mascot-widget"
    >
      <img
        src={src}
        alt=""
        aria-hidden
        decoding="async"
        loading="lazy"
        className="h-16 w-14 shrink-0 object-contain object-bottom"
      />
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold leading-tight">{greeting}!</p>
        <p className="mt-0.5 text-xs leading-snug opacity-75">
          Ask me anything: I search 100+ sites, read the sources and cite every one.
        </p>
      </div>
      <button
        type="button"
        aria-label="Hide mascot widget"
        className="absolute top-1.5 right-1.5 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
        onClick={() => {
          try {
            localStorage.setItem('showMascotWidget', 'false');
          } catch {
            // Storage blocked: the widget still closes for this visit.
          }
          onDismiss?.();
        }}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
