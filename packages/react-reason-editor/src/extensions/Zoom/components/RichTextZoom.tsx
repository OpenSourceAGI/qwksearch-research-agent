/**
 * Toolbar control (React) for the Zoom extension, which adds zooming the editor content. Renders the button and dispatches the matching editor command when activated.
 */

import React, { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocalStorage } from '../../../app-hooks/useLocalStorage';

/** Zoom applied to the editor content the first time a session opens it. */
export const DEFAULT_ZOOM = 1.25;
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STORAGE_KEY = 'REASON-zoom';

/** Clamps `scale` to the [MIN_ZOOM, MAX_ZOOM] range supported by the zoom controls. */
export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Returns the zoom level after zooming in one step from `scale`. */
export function zoomIn(scale: number): number {
  return clampZoom(scale + ZOOM_STEP);
}

/** Returns the zoom level after zooming out one step from `scale`. */
export function zoomOut(scale: number): number {
  return clampZoom(scale - ZOOM_STEP);
}

function Toast({ message }: { message: string }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return createPortal(
    <div className='fixed bottom-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-2'>
      <div className='bg-gray-900 dark:bg-gray-800 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium'>
        {message}
      </div>
    </div>,
    document.body
  );
}

export function RichTextZoom() {
  const [scale, setScale] = useLocalStorage(ZOOM_STORAGE_KEY, DEFAULT_ZOOM);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
  };

  const applyZoom = (zoomLevel: number) => {
    const editor = document.querySelector('.ProseMirror');
    if (editor) {
      (editor as HTMLElement).style.transform = `scale(${zoomLevel})`;
      (editor as HTMLElement).style.transformOrigin = 'top left';
    }
  };

  // Re-apply the persisted (or default) zoom to the editor on mount, since
  // it's a DOM style rather than something React renders declaratively.
  useEffect(() => {
    applyZoom(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleZoomIn = () => {
    const newScale = zoomIn(scale);
    setScale(newScale);
    applyZoom(newScale);
    showToast(`Zoom: ${Math.round(newScale * 100)}%`);
  };

  const handleZoomOut = () => {
    const newScale = zoomOut(scale);
    setScale(newScale);
    applyZoom(newScale);
    showToast(`Zoom: ${Math.round(newScale * 100)}%`);
  };

  return (
    <>
      <div className='richtext-flex richtext-items-center richtext-gap-0.5'>
        <button
          onClick={handleZoomOut}
          title={`Zoom Out (${Math.round(scale * 100)}%)`}
          className='richtext-p-1 richtext-h-8 richtext-flex richtext-items-center richtext-justify-center richtext-rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors'
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={handleZoomIn}
          title={`Zoom In (${Math.round(scale * 100)}%)`}
          className='richtext-p-1 richtext-h-8 richtext-flex richtext-items-center richtext-justify-center richtext-rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors'
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {toast && <Toast message={toast} />}
    </>
  );
}
