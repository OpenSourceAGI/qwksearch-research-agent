/**
 * React node view for the Drawio extension (draw.io / diagrams.net diagram embeds). Renders the interactive in-document UI that Tiptap mounts in place of the node.
 */

import { NodeViewWrapper } from '@tiptap/react';
import clsx from 'clsx';
import { Resizable } from 're-resizable';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ActionButton } from '@/components/ActionButton';
import { Drawio } from '@/extensions/Drawio/Drawio';
import { useEditableEditor } from '@/store/store';
import { clamp } from '@/utils/utils';

import styles from './index.module.scss';

const MIN_ZOOM = 10;
const MAX_ZOOM = 200;
const ZOOM_STEP = 15;

const INHERIT_SIZE_STYLE = { width: '100%', height: '100%', maxWidth: '100%' };

function NodeViewDrawio({ editor, node, updateAttributes }: any) {
  const iframeRef: any = useRef(null);
  const isEditable = useEditableEditor();
  const isActive = editor.isActive(Drawio.name);
  const { data, width, height } = node.attrs;
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, toggleLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [zoom, setZoomState] = useState(100);

  const setZoom = useCallback((type: 'minus' | 'plus') => {
    return () => {
      setZoomState((currentZoom) =>
        clamp(
          type === 'minus' ? currentZoom - ZOOM_STEP : currentZoom + ZOOM_STEP,
          MIN_ZOOM,
          MAX_ZOOM
        )
      );
    };
  }, []);

  useEffect(() => {
    if (!data?.xml) {
      toggleLoading(false);
      return;
    }

    toggleLoading(true);
    setError(null);

    const iframe = document.createElement('iframe');
    iframe.src = 'https://embed.diagrams.net/?embed=1&ui=minimal&spin=1&proto=json';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // embed.diagrams.net only responds with 'init' once ready; with proto=json every
    // message crossing the iframe boundary is a JSON string keyed by `event`/`action`.
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || typeof event.data !== 'string') return;

      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.event === 'init') {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ action: 'export', format: 'xmlsvg', xml: data.xml }),
          '*'
        );
      } else if (message.event === 'export') {
        if (message.data) {
          setSvg(message.data);
        } else {
          setError(new Error('Unable to render diagram preview'));
        }
        toggleLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    const timeout = window.setTimeout(() => {
      setError(new Error('Timed out loading diagram preview'));
      toggleLoading(false);
    }, 15000);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      document.body.removeChild(iframe);
    };
  }, [data]);

  const onResize = (size: any) => {
    updateAttributes({ width: size.width, height: size.height });
  };

  return (
    <NodeViewWrapper
      className={clsx(styles.wrap, {
        [styles.active]: isActive,
        [styles.disabled]: !isEditable,
      })}
    >
      <Resizable
        size={{
          width: Number.parseInt(width),
          height: Number.parseInt(height),
        }}
        onResizeStop={(e, direction, ref, d) => {
          onResize({
            width: Number.parseInt(width) + d.width,
            height: Number.parseInt(height) + d.height,
          });
        }}
      >
        <div
          className={clsx(styles.renderWrap, 'render-wrapper')}
          style={{ ...INHERIT_SIZE_STYLE, overflow: 'hidden' }}
        >
          {error && (
            <div style={INHERIT_SIZE_STYLE}>
              <p>{error.message || error}</p>
            </div>
          )}

          {loading && <p>Loading diagram...</p>}

          {!loading && !error && svg && (
            <div
              style={{
                height: '100%',
                maxHeight: '100%',
                padding: 24,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `scale(${zoom / 100})`,
                transition: 'all ease-in-out .3s',
              }}
            >
              <img
                alt='Diagram preview'
                src={svg}
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          )}

          {!loading && !error && !svg && data?.xml && (
            <div style={INHERIT_SIZE_STYLE}>
              <p>Diagram data present but unable to render preview</p>
            </div>
          )}

          <div className={styles.handlerWrap}>
            <ActionButton
              action={setZoom('minus')}
              disabled={!isEditable}
              icon='ZoomOut'
              tooltip='Zoom Out'
            />

            <ActionButton
              action={setZoom('plus')}
              disabled={!isEditable}
              icon='ZoomIn'
              tooltip='Zoom In'
            />
          </div>
        </div>
      </Resizable>
    </NodeViewWrapper>
  );
}

export default NodeViewDrawio;
