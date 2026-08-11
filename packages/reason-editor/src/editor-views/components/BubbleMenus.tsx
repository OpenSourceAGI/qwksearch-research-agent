/**
 * Aggregates all bubble-menu components into a single element for the example editor. Renders the appropriate contextual menu based on the current selection.
 */

import {
  RichTextBubbleCallout,
  RichTextBubbleColumns,
  RichTextBubbleDrawer,
  RichTextBubbleKatex,
  RichTextBubbleLink,
  RichTextBubbleImage,
  RichTextBubbleVideo,
  RichTextBubbleImageGif,
  RichTextBubbleMermaid,
  RichTextBubbleTable,
  RichTextBubbleText,
  RichTextBubbleTwitter,
  RichTextBubbleMenuDragHandle,
  RichTextBubbleCodeBlock,
} from 'react-reason-editor/bubble';
import { SlashCommandList } from 'react-reason-editor/slashcommand';

import { AiMenu } from '@/extensions/Ai';

export const BubbleMenus = () => {
  return (
    <>
      <RichTextBubbleCallout />
      <RichTextBubbleColumns />
      <RichTextBubbleDrawer />
      <RichTextBubbleKatex />
      <RichTextBubbleLink />
      <RichTextBubbleImage />
      <RichTextBubbleVideo />
      <RichTextBubbleImageGif />
      <RichTextBubbleMermaid />
      <RichTextBubbleTable />
      <RichTextBubbleText />
      <RichTextBubbleTwitter />
      <RichTextBubbleCodeBlock />
      <RichTextBubbleMenuDragHandle />
      <SlashCommandList />
      <AiMenu />
    </>
  );
};
