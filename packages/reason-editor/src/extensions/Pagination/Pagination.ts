/**
 * Defines the Pagination Tiptap extension, which adds paginated page-break layout to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import { PaginationPlus } from 'tiptap-pagination-plus';
import type { GeneralOptions } from '@/types';
import type { Extension } from '@tiptap/core';

export interface PaginationOptions extends GeneralOptions<PaginationOptions> {
  pageHeight?: number;
  pageWidth?: number;
  pageGap?: number;
  pageGapBorderSize?: number;
  pageGapBorderColor?: string;
  pageBreakBackground?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  contentMarginTop?: number;
  contentMarginBottom?: number;
  headerLeft?: string;
  headerRight?: string;
  footerLeft?: string;
  footerRight?: string;
  customHeader?: Record<number, { headerLeft: string; headerRight: string }>;
  customFooter?: Record<number, { footerLeft: string; footerRight: string }>;
  onHeaderClick?: (params: { event: MouseEvent; pageNumber: number }) => void;
  onFooterClick?: (params: { event: MouseEvent; pageNumber: number }) => void;
}

export const Pagination = PaginationPlus.extend({
  //@ts-expect-error - this.parent typing from the extended pagination plugin
  addOptions() {
    return {
      ...this.parent?.(),
      pageHeight: 1056,
      pageWidth: 816,
      pageGap: 50,
      pageGapBorderSize: 1,
      pageGapBorderColor: '#e5e5e5',
      pageBreakBackground: '#ffffff',
      marginTop: 48,
      marginBottom: 48,
      marginLeft: 72,
      marginRight: 72,
      contentMarginTop: 10,
      contentMarginBottom: 10,
      headerLeft: '',
      headerRight: 'Page {page}',
      footerLeft: '',
      footerRight: '',
      customHeader: {},
      customFooter: {},
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-p': () => {
        console.log('Page settings can be opened here');
        return true;
      },
    };
  },
}) as Extension;
