/**
 * Image-upload plumbing for the editor: a ProseMirror plugin that shows a
 * placeholder decoration while an image uploads, plus paste/drop handlers that
 * feed files into it.
 *
 * The implementation is Novel's — this module is the adapter layer over
 * `novel`'s `UploadImagesPlugin` / `createImageUpload` / `handleImagePaste` /
 * `handleImageDrop`, which this package previously carried as a fork. Sharing
 * Novel's plugin matters beyond deduplication: its decorations are keyed on a
 * `PluginKey` that lives inside the `novel` module, so a forked copy could
 * never find or clear placeholders created by Novel's own paste/drop helpers.
 *
 * The one thing kept from the fork is the calling convention. Novel's
 * `UploadFn` takes a single `File`; {@link createImageUpload} below accepts a
 * `File[]` and adds a `postUpload` hook, so existing callers keep working.
 */

import {
  UploadImagesPlugin as novelUploadImagesPlugin,
  createImageUpload as novelCreateImageUpload,
  handleImageDrop,
  handleImagePaste,
} from '@/novel';

import type { EditorView } from '@tiptap/pm/view';

export { handleImagePaste, handleImageDrop };

/** Class applied to the placeholder `<img>` shown while an upload is in flight. */
const PLACEHOLDER_IMAGE_CLASS = 'opacity-50';

/**
 * The placeholder-decoration plugin. Register it from an extension's
 * `addProseMirrorPlugins()` alongside the paste/drop handlers.
 */
export function UploadImagesPlugin(imageClass: string = PLACEHOLDER_IMAGE_CLASS) {
  return novelUploadImagesPlugin({ imageClass });
}

export interface ImageUploadOptions {
  /**
   * Return `false` to reject a file before anything is inserted (wrong type,
   * too large, …). Novel skips files with no validator at all, so omitting
   * this accepts everything.
   */
  validateFn?: (file: File) => boolean;
  /** Performs the upload. Resolve with the final image URL. */
  onUpload: (file: File) => Promise<string | object>;
  /** Optional post-processing of the returned URL (CDN rewrite, signing, …). */
  postUpload?: (src: string) => Promise<string>;
}

/** Multi-file upload handler, as used by the paste/drop props below. */
export type UploadFn = (files: File[], view: EditorView, pos: number) => void;

/**
 * Wraps Novel's single-file `createImageUpload` into this package's multi-file
 * signature and threads `postUpload` through the resolved URL.
 */
export function createImageUpload({ validateFn, onUpload, postUpload }: ImageUploadOptions): UploadFn {
  const uploadOne = novelCreateImageUpload({
    // Novel treats a falsy return as "reject", and skips the file entirely
    // when no validator is supplied — so always pass one.
    validateFn: ((file: File) => (validateFn ? validateFn(file) : true)) as any,
    onUpload: async (file: File) => {
      const src = await onUpload(file);
      if (postUpload && typeof src === 'string') return postUpload(src);
      return src;
    },
  });

  return (files, view, pos) => {
    for (const file of files) {
      uploadOne(file, view, pos);
    }
  };
}
