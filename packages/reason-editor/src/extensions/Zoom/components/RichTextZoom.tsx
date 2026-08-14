/**
 * Toolbar control (React) for the Zoom extension, which adds zooming the editor content. Renders the button and dispatches the matching editor command when activated.
 */

import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { createPortal } from 'react-dom';

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

/** Default zoom applied to the editor content on mount. */
export const DEFAULT_ZOOM_SCALE = 1.25;

export function RichTextZoom() {
  const [scale, setScale] = useState(DEFAULT_ZOOM_SCALE);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.25, 2);
    setScale(newScale);
    applyZoom(newScale);
    showToast(`Zoom: ${Math.round(newScale * 100)}%`);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    applyZoom(newScale);
    showToast(`Zoom: ${Math.round(newScale * 100)}%`);
  };

  const applyZoom = (zoomLevel: number) => {
    const editor = document.querySelector('.ProseMirror');
    if (editor) {
      (editor as HTMLElement).style.transform = `scale(${zoomLevel})`;
      (editor as HTMLElement).style.transformOrigin = 'top left';
    }
  };

  useEffect(() => {
    applyZoom(DEFAULT_ZOOM_SCALE);
  }, []);

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
