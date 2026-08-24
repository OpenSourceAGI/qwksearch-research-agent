/**
 * Toolbar control (React) for the Zoom extension, which adds zooming the editor content. Renders the button and dispatches the matching editor command when activated.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useCurrentEditor } from '@tiptap/react';
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
  const { editor } = useCurrentEditor();
  const [scale, setScale] = useState(DEFAULT_ZOOM_SCALE);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
  };

  /**
   * Scales the editable area with the `zoom` property rather than a
   * `transform: scale()`. A transform is applied after layout, so the content
   * keeps the width it was laid out at and the enlarged text spills past the
   * right edge of its pane (and past the bottom of the scroll region) instead
   * of reflowing; `zoom` scales the layout itself, so the document still fills
   * exactly the space the host gave the editor at any zoom level.
   *
   * The element is taken from the editor this toolbar belongs to — a document
   * open in split view puts more than one `.ProseMirror` on the page, and a
   * global query would zoom whichever came first.
   */
  const applyZoom = useCallback((zoomLevel: number) => {
    const dom = (editor?.view?.dom as HTMLElement | undefined) ?? document.querySelector('.ProseMirror');
    if (!dom) return;
    const el = dom as HTMLElement;
    el.style.zoom = String(zoomLevel);
    // Clear the transform this control used to set, so a surface that was
    // zoomed before an update is not left scaled twice over.
    el.style.transform = '';
    el.style.transformOrigin = '';
  }, [editor]);

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

  useEffect(() => {
    applyZoom(scale);
  }, [applyZoom, scale]);

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
