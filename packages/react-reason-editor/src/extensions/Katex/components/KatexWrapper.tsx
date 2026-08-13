/**
 * Supporting UI component for the Katex extension (KaTeX mathematical equations). Provides part of the in-editor interface for this feature.
 */

import { NodeViewWrapper } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';

import { loadKatex } from '@/utils/cdn-loader';
import { safeJSONParse } from '@/utils/json';

export function KatexNodeView({ node }: any) {
  const { text, macros } = node.attrs;
  const [katexLib, setKatexLib] = useState<any>(null);

  useEffect(() => {
    loadKatex().then(setKatexLib);
  }, []);

  const formatText = useMemo(() => {
    if (!katexLib) return text;
    try {
      return katexLib.renderToString(decodeURIComponent(text || ''), {
        macros: safeJSONParse(decodeURIComponent(macros || '')),
      });
    } catch {
      return text;
    }
  }, [text, macros, katexLib]);

  const content = useMemo(
    () =>
      !katexLib ? (
        <span contentEditable={false}>Loading...</span>
      ) : text.trim() ? (
        <span contentEditable={false} dangerouslySetInnerHTML={{ __html: formatText }}></span>
      ) : (
        <span contentEditable={false}>Not enter a formula</span>
      ),
    [text, formatText, katexLib]
  );

  return (
    <NodeViewWrapper
      as='span'
      style={{
        display: 'inline-block',
      }}
    >
      {content}
    </NodeViewWrapper>
  );
}
