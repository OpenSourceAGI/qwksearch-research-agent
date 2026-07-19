/**
 * @fileoverview Export/Import dropdown component for importing and exporting editor content in various formats.
 */

import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';
import {
  FileText,
  FileJson,
  FileCode,
  FileType,
  FileIcon,
  Upload,
  Calculator,
  Copy,
} from 'lucide-react';
import DropDown, { DropDownItem, DropDownLabel, DropDownSeparator } from '../../ui/DropDown';
import {
  exportAsJson,
  exportAsMarkdown,
  exportAsHtml,
  exportAsDocx,
  exportAsPlainText,
  copyForGoogleDocs,
  importCustomFile,
} from './utils';
import WordCountModal from './WordCountModal';

interface ExportDropdownProps {
  editor: LexicalEditor;
  shouldPreserveNewLinesInMarkdown: boolean;
  showFlashMessage: (message: string) => void;
  showModal: (
    title: string,
    getContent: (onClose: () => void) => JSX.Element,
    closeOnClickOutside?: boolean,
  ) => void;
}

/**
 * Dropdown menu for importing and exporting editor content.
 */
export default function ExportDropdown({
  editor,
  shouldPreserveNewLinesInMarkdown,
  showFlashMessage,
  showModal,
}: ExportDropdownProps): JSX.Element {
  return (
    <DropDown
      buttonClassName="action-button export"
      buttonAriaLabel="Import/Export"
      buttonIcon={<FileIcon size={18} />}
      hideChevron={true}
      stopCloseOnClickSelf={true}
      tooltip="Import or export files">
      <DropDownLabel>Import</DropDownLabel>
      <DropDownItem
        onClick={() => importCustomFile(editor, shouldPreserveNewLinesInMarkdown)}
        className="item">
        <Upload size={16} />
        <span>Import File</span>
      </DropDownItem>

      <DropDownSeparator />
      <DropDownLabel>Export</DropDownLabel>

      <DropDownItem
        onClick={() => exportAsMarkdown(editor, shouldPreserveNewLinesInMarkdown)}
        className="item">
        <FileText size={16} />
        <span>Export Markdown</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => exportAsHtml(editor)}
        className="item">
        <FileCode size={16} />
        <span>Export HTML</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => exportAsDocx(editor)}
        className="item">
        <FileType size={16} />
        <span>Export DOCX</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => exportAsPlainText(editor)}
        className="item">
        <FileText size={16} />
        <span>Export Plain Text</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => exportAsJson(editor)}
        className="item">
        <FileJson size={16} />
        <span>Export JSON</span>
      </DropDownItem>

      <DropDownItem
        onClick={() => copyForGoogleDocs(editor, showFlashMessage)}
        className="item">
        <Copy size={16} />
        <span>Copy for Google Docs</span>
      </DropDownItem>

      <DropDownSeparator />
      <DropDownLabel>Tools</DropDownLabel>

      <DropDownItem
        onClick={() =>
          showModal('Word Count', () => <WordCountModal editor={editor} />, true)
        }
        className="item">
        <Calculator size={16} />
        <span>Word Count</span>
      </DropDownItem>
    </DropDown>
  );
}
