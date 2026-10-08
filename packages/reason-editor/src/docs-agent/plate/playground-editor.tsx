/**
 * The Reason Editor with the Plate playground's toolbar.
 *
 * Same engine, same plugins, same collaboration room as `./editor.tsx` — a
 * Slate document written from one is a Slate document read by the other — but
 * the chrome is the playground's: a Google Docs-style menu bar
 * (`./ui/menu-bar.tsx`) over a fixed toolbar carrying every button the
 * registered plugin set supports (`./ui/fixed-toolbar-buttons.tsx`) and a
 * selection toolbar under the caret (`./ui/floating-toolbar-buttons.tsx`).
 *
 * It is deliberately a *different* component rather than a flag on the shared
 * one. `ReasonToolbar` is the product's declared toolbar contract — one schema,
 * rendered identically on Tiptap and Plate — and this surface answers a
 * different question: what the editor looks like with the whole of Plate
 * exposed. Keeping them apart means `./editor.tsx` and the Tiptap route can
 * still be compared button for button.
 *
 * The playground's buttons come out of the shadcn registry in shadcn's own
 * theme; `./ui/reason-toolbar-skin.ts` restyles them to `ReasonToolbar`'s row of
 * grey icons so the two toolbars read as the same product.
 */

'use client';

import * as React from 'react';

import { ReasonPlateEditor, type ReasonPlateEditorProps } from './editor';
import { FixedToolbar } from './ui/fixed-toolbar';
import { FixedToolbarButtons } from './ui/fixed-toolbar-buttons';
import { FloatingToolbar } from './ui/floating-toolbar';
import { FloatingToolbarButtons } from './ui/floating-toolbar-buttons';
import { MenuBar } from './ui/menu-bar';
import { REASON_TOOLBAR_SKIN } from './ui/reason-toolbar-skin';

export type ReasonPlaygroundEditorProps = Omit<
  ReasonPlateEditorProps,
  'overlays' | 'renderToolbar'
>;

export function ReasonPlaygroundEditor(props: ReasonPlaygroundEditorProps) {
  return (
    <ReasonPlateEditor
      {...props}
      overlays={
        <FloatingToolbar>
          <FloatingToolbarButtons />
        </FloatingToolbar>
      }
      renderToolbar={() => (
        <>
          <MenuBar />
          <FixedToolbar className={REASON_TOOLBAR_SKIN}>
            <FixedToolbarButtons />
          </FixedToolbar>
        </>
      )}
    />
  );
}

export default ReasonPlaygroundEditor;
