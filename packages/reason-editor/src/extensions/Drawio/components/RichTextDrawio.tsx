/**
 * Toolbar control (React) for the Drawio extension, which adds draw.io / diagrams.net diagram embeds. Renders the button and dispatches the matching editor command when activated.
 */

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';

import { ActionButton } from '@/components/ActionButton';
import { useListener } from '@/components/ReactBus';
import { Button } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToggleActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';
import { useExtension } from '@/hooks/useExtension';
import { useEditorInstance } from '@/store/editor';
import { useExternalLibsMode } from '@/store/externalLibsMode';
import { EVENTS } from '@/utils/customEvents/events.constant';

import { Drawio as DrawioExtension } from '../Drawio';

const DRAWIO_EMBED_SRC =
  'https://embed.diagrams.net/?embed=1&ui=minimal&spin=1&modified=unsaved&noExitBtn=1&proto=json';
const DRAWIO_LOAD_TIMEOUT_MS = 15000;

export function RichTextDrawio() {
  const editor = useEditorInstance();

  const buttonProps = useButtonProps(DrawioExtension.name);

  const extension = useExtension(DrawioExtension.name);

  const { tooltipOptions = {}, isActive = undefined } = buttonProps?.componentProps ?? {};

  const { editorDisabled } = useToggleActive(isActive);

  const drawioOptions = useMemo(() => {
    return extension?.options || {};
  }, [extension]);

  const externalLibsMode = useExternalLibsMode();

  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);
  const [data, setData] = useState<string>('');
  const [visible, toggleVisible] = useState(false);
  const [loading, toggleLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const loadTimeoutRef = useRef<number | null>(null);

  const handleSave = useCallback(() => {
    if (!iframeRef) {
      toggleVisible(false);
      return;
    }

    try {
      iframeRef.contentWindow?.postMessage(
        JSON.stringify({ action: 'export', format: 'xml' }),
        '*'
      );
    } catch (err) {
      setError(err);
    }
  }, [iframeRef]);

  // With proto=json every message crossing the embed.diagrams.net iframe boundary
  // is a JSON string keyed by `event` (incoming) / `action` (outgoing), not a plain object.
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!iframeRef || event.source !== iframeRef.contentWindow || typeof event.data !== 'string') {
        return;
      }

      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.event === 'init') {
        if (loadTimeoutRef.current) {
          window.clearTimeout(loadTimeoutRef.current);
          loadTimeoutRef.current = null;
        }
        toggleLoading(false);
        if (data) {
          iframeRef.contentWindow?.postMessage(
            JSON.stringify({ action: 'load', xml: data, autosave: 1 }),
            '*'
          );
        }
      } else if (message.event === 'export') {
        const xml = message.xml || message.data;
        if (xml) {
          setData(xml);
          editor.chain().focus().setDrawio({ data: { xml } }).run();
          toggleVisible(false);
        } else {
          setError(new Error('Unable to export diagram'));
        }
      }
    },
    [editor, data, iframeRef]
  );

  const handler = (payload: any) => {
    toggleVisible(true);
    setError(null);
    if (payload?.data?.xml) {
      setData(payload.data.xml);
    } else {
      setData('');
    }
  };

  const EVENT_ID = EVENTS.DRAWIO?.((editor as any).id) || `drawio-${(editor as any).id}`;

  useListener(handler, [EVENT_ID]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  useEffect(() => {
    if (!visible) return;

    toggleLoading(true);
    setError(null);

    loadTimeoutRef.current = window.setTimeout(() => {
      setError(new Error('Timed out waiting for the Draw.io editor to load. Check your network connection and try again.'));
      toggleLoading(false);
    }, DRAWIO_LOAD_TIMEOUT_MS);

    return () => {
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, retryCount]);

  const retry = useCallback(() => {
    setError(null);
    setRetryCount((count) => count + 1);
  }, []);

  return (
    <Dialog onOpenChange={toggleVisible} open={visible}>
      <DialogTrigger asChild>
        <ActionButton
          disabled={editorDisabled}
          icon='Drawio'
          tooltip='Draw.io'
          tooltipOptions={tooltipOptions}
          action={() => {
            if (editorDisabled) return;
            toggleVisible(true);
          }}
        />
      </DialogTrigger>

      <DialogContent className='richtext-z-[99999] !richtext-max-w-[1400px]'>
        <DialogTitle>Draw.io Diagram</DialogTitle>

        <div style={{ height: '100%', borderWidth: 1 }}>
          {loading && <p>Loading editor...</p>}

          {error && (
            <div>
              <p>{(error && error.message) || 'Error loading editor'}</p>
              <Button onClick={retry} type='button'>
                Retry
              </Button>
            </div>
          )}

          {externalLibsMode === 'bundled' && (loading || error) && (
            <p style={{ opacity: 0.7, fontSize: 12 }}>
              Draw.io always loads diagrams.net in an embedded frame and needs
              network access, even with "Bundled (offline)" library loading
              enabled — that setting only applies to KaTeX and Mermaid.
            </p>
          )}

          {!error && (
            <iframe
              key={retryCount}
              ref={setIframeRef}
              src={DRAWIO_EMBED_SRC}
              style={{
                width: '100%',
                height: 600,
                border: 'none',
                display: loading ? 'none' : 'block',
              }}
              title='Draw.io Editor'
              sandbox='allow-same-origin allow-scripts allow-popups allow-forms allow-modals'
            />
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={loading}
            onClick={handleSave}
            type='button'
          >
            Save Diagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
