/**
 * The Plate plugin set, assembled from the Plate starter's own kits.
 *
 * `./kits/*` and `./ui/*` are the Plate shadcn registry's generated components,
 * copied in verbatim (only their `@/registry/*` import aliases were rewritten).
 * Treating the starter as the canonical source keeps plugin setup, render
 * elements and popovers matching upstream, so upgrading Plate is a re-run of the
 * generator rather than a re-derivation.
 *
 * Feature groups are ordered to mirror the Reason Editor's toolbar:
 *   1. basic text, headings, inline marks
 *   2. lists, quote, code blocks, horizontal rule
 *   3. links, colours/highlighting, alignment, indentation
 *   4. tables
 *   5. images/media
 *   6. slash menu, autoformat, emoji/mentions, floating controls
 */

import { CaptionPlugin } from '@platejs/caption/react';
import {
  AudioPlugin,
  FilePlugin,
  ImagePlugin,
  MediaEmbedPlugin,
  PlaceholderPlugin,
  VideoPlugin,
} from '@platejs/media/react';
import { KEYS } from 'platejs';

import { AlignKit } from './kits/align-kit';
import { AutoformatKit } from './kits/autoformat-kit';
import { BasicNodesKit } from './kits/basic-nodes-kit';
import { BlockPlaceholderKit } from './kits/block-placeholder-kit';
import { CalloutKit } from './kits/callout-kit';
import { CodeBlockKit } from './kits/code-block-kit';
import { ColumnKit } from './kits/column-kit';
import { EmojiKit } from './kits/emoji-kit';
import { ExitBreakKit } from './kits/exit-break-kit';
import { FontKit } from './kits/font-kit';
import { IndentKit } from './kits/indent-kit';
import { LineHeightKit } from './kits/line-height-kit';
import { LinkKit } from './kits/link-kit';
import { ListKit } from './kits/list-kit';
import { MarkdownKit } from './kits/markdown-kit';
import { MathKit } from './kits/math-kit';
import { MentionKit } from './kits/mention-kit';
import { SlashKit } from './kits/slash-kit';
import { TableKit } from './kits/table-kit';
import { TocKit } from './kits/toc-kit';
import { ToggleKit } from './kits/toggle-kit';
import { AudioElement } from './ui/media-audio-node';
import { MediaEmbedElement } from './ui/media-embed-node';
import { FileElement } from './ui/media-file-node';
import { ImageElement } from './ui/media-image-node';
import { VideoElement } from './ui/media-video-node';

/**
 * Media/uploads. Assembled here rather than pulled from the registry's
 * `media-kit`, whose upload toast and placeholder wiring is bound to
 * UploadThing; the node components and plugins are the starter's.
 */
export const MediaKit = [
  ImagePlugin.withComponent(ImageElement),
  VideoPlugin.withComponent(VideoElement),
  AudioPlugin.withComponent(AudioElement),
  FilePlugin.withComponent(FileElement),
  MediaEmbedPlugin.withComponent(MediaEmbedElement),
  CaptionPlugin.configure({
    options: {
      query: {
        allow: [KEYS.img, KEYS.video, KEYS.audio, KEYS.file, KEYS.mediaEmbed],
      },
    },
  }),
  PlaceholderPlugin,
];

/** Everything except collaboration, which is layered on per document. */
export const platePlugins = [
  // 1. Basic text, headings, inline marks.
  ...BasicNodesKit,

  // 2. Lists, quote, code blocks, horizontal rule (blockquote/hr come from
  //    BasicNodesKit).
  ...ListKit,
  ...CodeBlockKit,

  // 3. Links, colours/highlighting, alignment, indentation, line height.
  ...LinkKit,
  ...FontKit,
  ...AlignKit,
  ...IndentKit,
  ...LineHeightKit,

  // 4. Tables and their submenu actions.
  ...TableKit,

  // 5. Images/media and uploads.
  ...MediaKit,

  // 6. Structured blocks matching the Reason Editor's Insert menu.
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...ToggleKit,
  ...TocKit,

  // 7. Editing affordances: slash menu, autoformat, emoji, mentions.
  ...SlashKit,
  ...AutoformatKit,
  ...EmojiKit,
  ...MentionKit,
  ...ExitBreakKit,
  ...BlockPlaceholderKit,
  ...MarkdownKit,
];

/** A single empty paragraph — what a brand-new document starts from. */
export const EMPTY_PLATE_VALUE = [{ type: KEYS.p, children: [{ text: '' }] }];
