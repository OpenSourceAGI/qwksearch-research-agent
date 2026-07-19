/**
 * @fileoverview A resizable sidebar wrapper for the Table of Contents.
 * Provides drag-to-resize functionality with a visual grip handle.
 */

import type { JSX, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './ResizableSidebar.css';

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 280;

interface ResizableSidebarProps {
  children: ReactNode;
}

/**
 * A resizable sidebar component with drag handle.
 */
export function ResizableSidebar({ children }: ResizableSidebarProps): JSX.Element {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      const sidebar = sidebarRef.current;
      const rect = sidebar.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={sidebarRef}
      className="resizable-sidebar"
      style={{ width: `${width}px` }}
    >
      <div
        className={`resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
      >
        <div className="resize-grip">
          <div className="resize-grip-line" />
          <div className="resize-grip-line" />
          <div className="resize-grip-line" />
        </div>
      </div>
      <div className="resizable-sidebar-content">
        {children}
      </div>
    </div>
  );
}
