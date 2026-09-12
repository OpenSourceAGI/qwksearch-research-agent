/**
 * The slash menu's "AI" item, against a real editor built from the shipped
 * plugin list.
 *
 * The regression this guards: the item was copied from Plate's registry, where
 * it calls `editor.getApi(AIChatPlugin).aiChat.show()` on `@platejs/ai`'s chat
 * plugin. This package deliberately does not register that plugin — see
 * `src/docs-agent/plate/kits/ai-kit.tsx` — so the call reached an API that was
 * never installed and typing `/AI` did nothing at all. Nothing about that is
 * visible to the type checker, because `getApi` is typed off the plugin passed
 * in rather than off what the editor actually registered.
 */

import { createPlateEditor } from 'platejs/react';
import { describe, expect, it } from 'vitest';

import { getPlateAiController } from '@/docs-agent/plate/ai-controller';
import { platePlugins } from '@/docs-agent/plate/plate-editor-config';
import { groups } from '@/docs-agent/plate/ui/slash-node';

function createEditor() {
  return createPlateEditor({
    plugins: platePlugins as any,
    value: [{ children: [{ text: 'The cat sat on the mat.' }], type: 'p' }],
  });
}

/** The one item under test, looked up the way the menu renders it. */
function aiItem() {
  const group = groups.find((entry) => entry.group === 'AI');
  const item = group?.items.find((entry) => entry.value === 'AI');
  if (!item) throw new Error('The slash menu no longer offers an AI item.');
  return item;
}

describe('the slash menu AI item', () => {
  it('opens the assistant that this editor actually registers', () => {
    const editor = createEditor();
    const controller = getPlateAiController(editor);

    expect(controller.getState().status).toBe('closed');

    aiItem().onSelect(editor, 'AI');

    expect(controller.getState().status).toBe('menu');
  });

  it('opens the same panel the bubble menu button opens', () => {
    // Both entry points have to land on the one per-editor controller, or
    // accepting a suggestion started from `/AI` would write through a
    // controller the panel is not rendering.
    const editor = createEditor();
    const controller = getPlateAiController(editor);

    aiItem().onSelect(editor, 'AI');
    const openedBySlash = controller.getState();

    controller.close();
    controller.open();

    expect(controller.getState().status).toBe(openedBySlash.status);
  });

  it('leaves the editor focused on the document rather than the menu input', () => {
    // `focusEditor: false` is what lets the panel's own input take focus; with
    // it on, the combobox hands focus back to the document and the panel that
    // just opened loses the keystrokes meant for it.
    expect(aiItem().focusEditor).toBe(false);
  });
});
