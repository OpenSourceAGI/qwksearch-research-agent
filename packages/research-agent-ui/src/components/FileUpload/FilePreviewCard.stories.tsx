/**
 * @fileoverview Storybook stories for `FilePreviewCard`.
 *
 * Covers a non-image PDF attachment, an image attachment with a generated preview, and the uploading state.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FilePreviewCard } from './FilePreviewCard';
import type { AttachedFile } from '../../types/research';

/**
 * `FilePreviewCard` is the thumbnail shown for each file attached to a message —
 * an image preview or a file-type icon with name and size, plus upload status.
 */
const meta: Meta<typeof FilePreviewCard> = {
  title: 'FileUpload/FilePreviewCard',
  component: FilePreviewCard,
  args: {
    onRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FilePreviewCard>;

// A tiny inline SVG data URI stands in for a generated image preview.
const previewDataUri =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
           <stop offset="0%" stop-color="#6366f1"/>
           <stop offset="100%" stop-color="#ec4899"/>
         </linearGradient>
       </defs>
       <rect width="200" height="200" fill="url(#g)"/>
     </svg>`,
  );

const pdfFile: AttachedFile = {
  id: 'file-pdf',
  file: new File(['%PDF-1.4 mock'], 'battery-research-2026.pdf', {
    type: 'application/pdf',
  }),
  type: 'application/pdf',
  preview: null,
  uploadStatus: 'done',
};

const imageFile: AttachedFile = {
  id: 'file-img',
  file: new File(['mock-bytes'], 'cell-diagram.png', { type: 'image/png' }),
  type: 'image/png',
  preview: previewDataUri,
  uploadStatus: 'done',
};

/** Non-image file: shows the file-type icon, name, and size. */
export const Document: Story = {
  args: { file: pdfFile },
};

/** Image file: shows the generated preview with a size badge. */
export const Image: Story = {
  args: { file: imageFile },
};

/** Upload in progress. */
export const Uploading: Story = {
  args: { file: { ...pdfFile, uploadStatus: 'uploading' } },
};
