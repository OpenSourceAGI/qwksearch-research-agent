/**
 * Checks for the image-upload adapter, which now delegates to Novel's plugin
 * instead of this package's former fork of it. What is verified here is the
 * adapter's own contract: the multi-file signature, the boolean `validateFn`
 * bridged onto Novel's, and the `postUpload` hook — none of which Novel's
 * single-file `UploadFn` provides on its own.
 */

import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { describe, expect, it, vi } from 'vitest';

import { UploadImagesPlugin, createImageUpload } from '@/plugins/image-upload';
import { buildBaseKit } from '@/editor-views/config/baseKit';
import { ColumnNode, MultipleColumnNode } from '@/extensions/Column';

const ImageWithUpload = Image.extend({
  addProseMirrorPlugins() {
    return [UploadImagesPlugin()];
  },
});

function createEditor() {
  return new Editor({
    element: document.createElement('div'),
    extensions: [...buildBaseKit(), MultipleColumnNode, ColumnNode, ImageWithUpload],
  });
}

function imageFile(name: string) {
  return new File(['x'], name, { type: 'image/png' });
}

describe('createImageUpload', () => {
  it('registers Novel\'s placeholder plugin on the editor', () => {
    const editor = createEditor();

    // Novel keys its decoration plugin "upload-image"; finding it proves the
    // shared plugin is live rather than a local re-implementation.
    const keys = editor.view.state.plugins.map((p) => (p as any).key as string);
    expect(keys.some((key) => key.startsWith('upload-image'))).toBe(true);

    editor.destroy();
  });

  it('uploads every file in the batch', async () => {
    const editor = createEditor();
    const onUpload = vi.fn(async (file: File) => `https://cdn.test/${file.name}`);

    const upload = createImageUpload({ onUpload });
    upload([imageFile('a.png'), imageFile('b.png')], editor.view, 1);
    await vi.waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));

    expect(onUpload.mock.calls.map(([file]) => file.name)).toEqual(['a.png', 'b.png']);

    editor.destroy();
  });

  it('skips files rejected by validateFn', async () => {
    const editor = createEditor();
    const onUpload = vi.fn(async () => 'https://cdn.test/ok.png');

    const upload = createImageUpload({
      validateFn: (file) => file.type.startsWith('image/'),
      onUpload,
    });
    upload(
      [imageFile('ok.png'), new File(['x'], 'notes.txt', { type: 'text/plain' })],
      editor.view,
      1,
    );
    await vi.waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));

    expect(onUpload.mock.calls[0]![0].name).toBe('ok.png');

    editor.destroy();
  });

  it('passes the uploaded URL through postUpload', async () => {
    const editor = createEditor();
    const postUpload = vi.fn(async (src: string) => `${src}?signed`);

    const upload = createImageUpload({
      onUpload: async (file) => `https://cdn.test/${file.name}`,
      postUpload,
    });
    upload([imageFile('a.png')], editor.view, 1);
    await vi.waitFor(() => expect(postUpload).toHaveBeenCalledTimes(1));

    expect(postUpload).toHaveBeenCalledWith('https://cdn.test/a.png');

    editor.destroy();
  });
});
