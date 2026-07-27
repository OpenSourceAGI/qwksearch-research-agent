/**
 * Ambient module declaration providing types for the `tiptap-pagination-breaks` package. Lets TypeScript type-check the pagination extension import.
 */

declare module 'tiptap-pagination-breaks' {
  import type { Extension } from '@tiptap/core';

  export interface PaginationOptions {
    pageHeight: number;
    pageWidth: number;
    pageMargin: number;
    label: string;
    showPageNumber: boolean;
  }

  export const Pagination: Extension<PaginationOptions, any>;
}
