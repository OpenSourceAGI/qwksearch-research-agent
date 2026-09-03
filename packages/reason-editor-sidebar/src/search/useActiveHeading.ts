/**
 * @module useActiveHeading
 * @description Scroll-spy: tracks which heading is currently "active" (in
 * view) as the user scrolls the editor, for highlighting in a table-of-
 * contents / outline sidebar. Mirrors the scroll-spy logic already used by
 * {@link DynamicIslandTOC}, factored out so other TOC-style views (like the
 * sidebar outline) can reuse it instead of re-deriving it.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { TocEntry } from '../app-types/toc';

/** Minimal shape this hook needs from an editor ref — matches `TiptapEditorHandle`. */
export interface ActiveHeadingEditorHandle {
  getElementByKey: (key: string) => HTMLElement | null;
}

interface HeadingTop {
  key: string;
  /** Heading element's top offset relative to the scroll container's top. */
  top: number;
}

/**
 * Given each visible heading's top offset (relative to the scroll
 * container) and a threshold distance from the container's top, returns the
 * key of the last heading whose top is at or above the threshold — i.e. the
 * heading the reader has scrolled past most recently. Falls back to the
 * first heading when none qualify (e.g. the reader is above the first
 * heading), and to `null` when there are no headings at all.
 */
export function computeActiveHeadingKey(headings: HeadingTop[], threshold: number): string | null {
  let current: string | null = null;
  for (const { key, top } of headings) {
    if (top <= threshold) {
      current = key;
    } else {
      break;
    }
  }
  if (!current && headings.length > 0) {
    current = headings[0].key;
  }
  return current;
}

/**
 * Tracks the currently active heading key while the document scrolls.
 * Resolves heading DOM elements via `editorRef.current.getElementByKey`, so
 * it stays in sync with whatever container the editor actually scrolls in
 * (found by walking up from the first heading to its nearest scrollable
 * ancestor, falling back to `window`).
 *
 * Returns `null` when there is no `editorRef`/no headings, or before the
 * first scroll-position measurement.
 */
export function useActiveHeading(
  headings: TocEntry[],
  editorRef?: RefObject<ActiveHeadingEditorHandle | null>,
): string | null {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editorRef?.current || headings.length === 0) {
      setActiveKey(null);
      return;
    }

    const getEl = (key: string): HTMLElement | null => editorRef.current?.getElementByKey(key) ?? null;

    const firstEl = getEl(headings[0][0]);
    scrollContainerRef.current = null;
    if (firstEl) {
      let parent = firstEl.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollContainerRef.current = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      const viewportHeight = container ? container.clientHeight : window.innerHeight;
      const containerTop = container ? container.getBoundingClientRect().top : 0;
      const threshold = viewportHeight * 0.3;

      const tops: HeadingTop[] = [];
      for (const [key] of headings) {
        const el = getEl(key);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        tops.push({ key, top: rect.top - containerTop });
      }

      setActiveKey(computeActiveHeadingKey(tops, threshold));
    };

    const target: HTMLElement | Window = scrollContainerRef.current ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener('scroll', handleScroll);
  }, [headings, editorRef]);

  return activeKey;
}
