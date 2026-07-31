/**
 * Toolbar control (React) for the Drawio extension, which adds draw.io / diagrams.net diagram embeds. Renders the button and dispatches the matching editor command when activated.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';

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
import { EVENTS } from '@/utils/customEvents/events.constant';

import { Drawio as DrawioExtension } from '../Drawio';

export function RichTextDrawio() {
  const editor = useEditorInstance();

  const buttonProps = useButtonProps(DrawioExtension.name);

  const extension = useExtension(DrawioExtension.name);

  const { tooltipOptions = {}, isActive = undefined } = buttonProps?.componentProps ?? {};

  const { editorDisabled } = useToggleActive(isActive);

  const drawioOptions = useMemo(() => {
    return extension?.options || {};
  }, [extension]);

  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);
  const [data, setData] = useState<string>('');
  const [visible, toggleVisible] = useState(false);
  const [loading, toggleLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const handleSave = useCallback(() => {
    if (!iframeRef) {
      toggleVisible(false);
      return;
    }

    const iframe = iframeRef as any;
    try {
      iframe.contentWindow.postMessage({ action: 'export' }, '*');
    } catch (err) {
      setError(err);
    }
  }, [iframeRef]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data && event.data.action === 'export') {
        const xml = event.data.xml;
        if (xml) {
          setData(xml);
          editor.chain().focus().setDrawio({ data: { xml } }).run();
          toggleVisible(false);
        }
      }
    },
    [editor]
  );

  const handler = (payload: any) => {
    toggleVisible(true);
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
    if (visible && iframeRef) {
      toggleLoading(true);
      const handleIframeLoad = () => {
        toggleLoading(false);
        if (data) {
          const iframe = iframeRef as any;
          iframe.contentWindow.postMessage(
            { action: 'load', xml: data },
            '*'
          );
        }
      };
      iframeRef.onload = handleIframeLoad;
    }
  }, [visible, iframeRef, data]);

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

          {error && <p>{(error && error.message) || 'Error loading editor'}</p>}

          {!error && (
            <iframe
              ref={setIframeRef}
              src='https://embed.diagrams.net/?embed=1&ui=minimal&spin=1&modified=unsaved&noExitBtn=1&proto=json'
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
