/**
 * Toolbar control (React) for the Pagination extension, which adds paginated page-break layout. Renders the button and dispatches the matching editor command when activated.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCurrentEditor } from '@tiptap/react';
import { Settings, ChevronDown } from 'lucide-react';

/** Gutter kept clear between the panel and the menu it opens from, and every viewport edge. */
const PANEL_GAP = 8;

interface PaginationOptions {
  pageHeight: number;
  pageWidth: number;
  pageGap: number;
  pageGapBorderSize: number;
  pageGapBorderColor: string;
  pageBreakBackground: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  contentMarginTop: number;
  contentMarginBottom: number;
  headerLeft: string;
  headerRight: string;
  footerLeft: string;
  footerRight: string;
}

const PRESET_SIZES = {
  a4: {
    name: 'A4',
    pageHeight: 1123,
    pageWidth: 794,
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
  },
  a3: {
    name: 'A3',
    pageHeight: 1591,
    pageWidth: 1123,
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
  },
  letter: {
    name: 'Letter',
    pageHeight: 1100,
    pageWidth: 850,
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
  },
  legal: {
    name: 'Legal',
    pageHeight: 1400,
    pageWidth: 850,
    marginTop: 72,
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
  },
};

export function RichTextPagination() {
  const { editor } = useCurrentEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'page' | 'spacing' | 'header-footer'>('page');
  const [options, setOptions] = useState<PaginationOptions>({
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
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
    top: 0,
    left: -9999,
    visibility: 'hidden',
  });

  // The panel is a portal of its own (see below), so a press inside it lands
  // outside `menuRef` and used to close the panel the moment anything in it
  // was touched — as did a press on a control that re-renders, because React
  // has already detached the pressed node by the time this handler runs.
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.isConnected) return;
      if (menuRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Place the panel beside the dropdown it was opened from rather than on top
  // of it: it is wider than the menu row that owns it, and an absolutely
  // positioned panel is also clipped by the menu's own scroll box.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const place = () => {
      const panel = panelRef.current;
      const trigger = menuRef.current;
      if (!panel || !trigger) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const triggerRect = trigger.getBoundingClientRect();
      // The toolbar dropdown this control is listed in, when there is one.
      const host = trigger.closest('.dropdown-portal')?.getBoundingClientRect() ?? triggerRect;
      const { offsetWidth: width, offsetHeight: height } = panel;

      let left = host.right + PANEL_GAP;
      if (left + width > vw - PANEL_GAP) left = host.left - width - PANEL_GAP;
      left = Math.max(PANEL_GAP, Math.min(left, vw - width - PANEL_GAP));

      const top = Math.max(PANEL_GAP, Math.min(triggerRect.top, vh - height - PANEL_GAP));

      setPanelStyle({ top, left, maxHeight: vh - top - PANEL_GAP });
    };

    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [isOpen, activeTab]);

  if (!editor) {
    return null;
  }

  const updatePaginationOptions = (partial: Partial<PaginationOptions>) => {
    const nextOptions = { ...options, ...partial };
    setOptions(nextOptions);

    if (partial.pageHeight) {
      (editor.commands as any).updatePageHeight?.(partial.pageHeight);
    }
    if (partial.pageWidth) {
      (editor.commands as any).updatePageWidth?.(partial.pageWidth);
    }
    if (partial.pageGap) {
      (editor.commands as any).updatePageGap?.(partial.pageGap);
    }
    if (partial.marginTop || partial.marginBottom || partial.marginLeft || partial.marginRight) {
      (editor.commands as any).updateMargins?.({
        top: partial.marginTop ?? options.marginTop,
        bottom: partial.marginBottom ?? options.marginBottom,
        left: partial.marginLeft ?? options.marginLeft,
        right: partial.marginRight ?? options.marginRight,
      });
    }
    if (partial.contentMarginTop || partial.contentMarginBottom) {
      (editor.commands as any).updateContentMargins?.({
        top: partial.contentMarginTop ?? options.contentMarginTop,
        bottom: partial.contentMarginBottom ?? options.contentMarginBottom,
      });
    }
    if (partial.headerLeft || partial.headerRight) {
      (editor.commands as any).updateHeaderContent?.(
        partial.headerLeft ?? options.headerLeft,
        partial.headerRight ?? options.headerRight
      );
    }
    if (partial.footerLeft || partial.footerRight) {
      (editor.commands as any).updateFooterContent?.(
        partial.footerLeft ?? options.footerLeft,
        partial.footerRight ?? options.footerRight
      );
    }
    if (partial.pageBreakBackground) {
      (editor.commands as any).updatePageBreakBackground?.(partial.pageBreakBackground);
    }
  };

  const applyPreset = (preset: typeof PRESET_SIZES[keyof typeof PRESET_SIZES]) => {
    updatePaginationOptions({
      pageHeight: preset.pageHeight,
      pageWidth: preset.pageWidth,
      marginTop: preset.marginTop,
      marginBottom: preset.marginBottom,
      marginLeft: preset.marginLeft,
      marginRight: preset.marginRight,
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        title="Page settings"
      >
        <Settings className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Portalled to <body> so the panel sits beside the dropdown it was
          opened from instead of on top of it, and is not clipped by that
          menu's scroll box. `dropdown-portal` marks it as part of the toolbar's
          own overlay stack, which is what keeps the menu underneath open while
          the panel is being used (see `toolbarOverlays.ts`). */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          data-richtext-portal
          className="dropdown-portal fixed flex flex-col overflow-hidden bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-2xl z-50 w-96 max-w-[calc(100vw-16px)]"
          style={panelStyle}
        >
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700 shrink-0">
            {['page', 'spacing', 'header-footer'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab === 'page' && 'Page'}
                {tab === 'spacing' && 'Spacing'}
                {tab === 'header-footer' && 'Header/Footer'}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto">
            {activeTab === 'page' && (
              <>
                {/* Presets */}
                <div>
                  <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Presets
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(PRESET_SIZES).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => applyPreset(preset)}
                        className="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Height */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Page Height (px)
                  </label>
                  <input
                    type="number"
                    value={options.pageHeight}
                    onChange={(e) =>
                      updatePaginationOptions({
                        pageHeight: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    min={400}
                    max={2000}
                  />
                </div>

                {/* Page Width */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Page Width (px)
                  </label>
                  <input
                    type="number"
                    value={options.pageWidth}
                    onChange={(e) =>
                      updatePaginationOptions({
                        pageWidth: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    min={400}
                    max={2000}
                  />
                </div>

                {/* Page Gap */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Page Gap (px)
                  </label>
                  <input
                    type="number"
                    value={options.pageGap}
                    onChange={(e) =>
                      updatePaginationOptions({
                        pageGap: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    min={0}
                    max={100}
                  />
                </div>

                {/* Page Gap Border Color */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Gap Border Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={options.pageGapBorderColor}
                      onChange={(e) =>
                        updatePaginationOptions({
                          pageGapBorderColor: e.target.value,
                        })
                      }
                      className="w-10 h-9 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={options.pageGapBorderColor}
                      onChange={(e) =>
                        updatePaginationOptions({
                          pageGapBorderColor: e.target.value,
                        })
                      }
                      className="flex-1 px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'spacing' && (
              <>
                {/* Margins Group */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Page Margins (px)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Top</label>
                      <input
                        type="number"
                        value={options.marginTop}
                        onChange={(e) =>
                          updatePaginationOptions({
                            marginTop: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        min={0}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bottom</label>
                      <input
                        type="number"
                        value={options.marginBottom}
                        onChange={(e) =>
                          updatePaginationOptions({
                            marginBottom: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        min={0}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Left</label>
                      <input
                        type="number"
                        value={options.marginLeft}
                        onChange={(e) =>
                          updatePaginationOptions({
                            marginLeft: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        min={0}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Right</label>
                      <input
                        type="number"
                        value={options.marginRight}
                        onChange={(e) =>
                          updatePaginationOptions({
                            marginRight: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        min={0}
                        max={200}
                      />
                    </div>
                  </div>
                </div>

                {/* Content Margins Group */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Content Margins (px)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Top</label>
                      <input
                        type="number"
                        value={options.contentMarginTop}
                        onChange={(e) =>
                          updatePaginationOptions({
                            contentMarginTop: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        min={0}
                        max={50}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bottom</label>
                      <input
                        type="number"
                        value={options.contentMarginBottom}
                        onChange={(e) =>
                          updatePaginationOptions({
                            contentMarginBottom: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        min={0}
                        max={50}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'header-footer' && (
              <>
                {/* Header Left */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Header Left (supports HTML)
                  </label>
                  <textarea
                    value={options.headerLeft}
                    onChange={(e) =>
                      updatePaginationOptions({
                        headerLeft: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
                    rows={3}
                    placeholder="e.g., <strong>Company Name</strong>"
                  />
                </div>

                {/* Header Right */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Header Right (use {'{page}'} for page number)
                  </label>
                  <textarea
                    value={options.headerRight}
                    onChange={(e) =>
                      updatePaginationOptions({
                        headerRight: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
                    rows={3}
                    placeholder="e.g., Page {page}"
                  />
                </div>

                {/* Footer Left */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Footer Left (supports HTML)
                  </label>
                  <textarea
                    value={options.footerLeft}
                    onChange={(e) =>
                      updatePaginationOptions({
                        footerLeft: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
                    rows={3}
                    placeholder="e.g., <em>Confidential</em>"
                  />
                </div>

                {/* Footer Right */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Footer Right (use {'{page}'} for page number)
                  </label>
                  <textarea
                    value={options.footerRight}
                    onChange={(e) =>
                      updatePaginationOptions({
                        footerRight: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
                    rows={3}
                    placeholder="e.g., Page {page} of {total}"
                  />
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
