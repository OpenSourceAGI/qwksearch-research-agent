import type { JSX } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { getDOMSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND } from 'lexical';
import { TooltipProvider } from '../../../../ui/tooltip';
import { getDOMRangeRect } from '../../../utils/getDOMRangeRect';
import { setFloatingElemPosition } from '../../../utils/setFloatingElemPosition';
import { BlockTypeDropdown } from './BlockTypeDropdown';
import { ClipboardActionsDropdown } from './ClipboardActionsDropdown';
import { HighlightButton } from './HighlightButton';
import { TextColorButton } from './TextColorButton';
import { FormatButtons } from './FormatButtons';
import type { TextFormatFloatingToolbarProps } from '../types';

/**
 * The floating toolbar component for text formatting.
 */
export function TextFormatFloatingToolbar({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isCode,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  isHighlighted,
  setIsLinkEditMode,
}: TextFormatFloatingToolbarProps): JSX.Element {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);

  function mouseMoveListener(e: MouseEvent) {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== 'none') {
        const x = e.clientX;
        const y = e.clientY;
        const elementUnderMouse = document.elementFromPoint(x, y);

        if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
          // Mouse is not over the target element => not a normal click, but probably a drag
          popupCharStylesEditorRef.current.style.pointerEvents = 'none';
        }
      }
    }
  }

  function mouseUpListener(e: MouseEvent) {
    if (popupCharStylesEditorRef?.current) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== 'auto') {
        popupCharStylesEditorRef.current.style.pointerEvents = 'auto';
      }
    }
  }

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener('mousemove', mouseMoveListener);
      document.addEventListener('mouseup', mouseUpListener);

      return () => {
        document.removeEventListener('mousemove', mouseMoveListener);
        document.removeEventListener('mouseup', mouseUpListener);
      };
    }
  }, [popupCharStylesEditorRef]);

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = editor.getEditorState().read(() => editor.getEditorState()._selection);

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = getDOMSelection(editor._window);

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

      setFloatingElemPosition(
        rangeRect,
        popupCharStylesEditorElem,
        anchorElem,
        isLink,
      );
    }
  }, [editor, anchorElem, isLink]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar();
      });
    };

    window.addEventListener('resize', update);
    if (scrollerElem) {
      scrollerElem.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (scrollerElem) {
        scrollerElem.removeEventListener('scroll', update);
      }
    };
  }, [editor, $updateTextFormatFloatingToolbar, anchorElem]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar();
    });
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateTextFormatFloatingToolbar();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateTextFormatFloatingToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, $updateTextFormatFloatingToolbar]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={popupCharStylesEditorRef}
        className="flex items-center gap-0.5 bg-popover border border-border text-popover-foreground p-1 absolute top-0 left-0 z-50 opacity-0 shadow-md rounded-xl transition-opacity duration-500 will-change-transform backdrop-blur-sm"
      >
        {editor.isEditable() && (
          <>
            <BlockTypeDropdown editor={editor} />
            <ClipboardActionsDropdown editor={editor} />
            <HighlightButton editor={editor} isHighlighted={isHighlighted} />
            {/* <TextColorButton editor={editor} /> */}
            <FormatButtons
              editor={editor}
              isBold={isBold}
              isItalic={isItalic}
              isUnderline={isUnderline}
              isLink={isLink}
              setIsLinkEditMode={setIsLinkEditMode}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
