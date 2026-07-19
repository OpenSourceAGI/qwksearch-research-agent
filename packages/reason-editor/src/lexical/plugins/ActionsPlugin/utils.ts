/**
 * @fileoverview Utility functions for import/export operations in the ActionsPlugin.
 */

import type { LexicalEditor } from 'lexical';
import {
  editorStateFromSerializedDocument,
  exportFile,
  SerializedDocument,
  serializedDocumentFromEditorState,
} from '@lexical/file';
import { $generateHtmlFromNodes } from '@lexical/html';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
} from 'lexical';

import grab from 'grab-url';
import { PLAYGROUND_TRANSFORMERS } from '../MarkdownTransformers';

/**
 * Sends the current editor state to a local server (usually for development/debugging).
 */
export async function sendEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  try {
    await grab('http://localhost:1235/setEditorState', {
      body: stringifiedEditorState,
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    // NO-OP
  }
}

/**
 * Validates the current editor state with a local server.
 */
export async function validateEditorState(editor: LexicalEditor): Promise<void> {
  const stringifiedEditorState = JSON.stringify(editor.getEditorState());
  try {
    await grab('http://localhost:1235/validateEditorState', {
      body: stringifiedEditorState,
      headers: {
        Accept: 'application/json',
        'Content-type': 'application/json',
      },
      method: 'POST',
    });
  } catch (error: any) {
    if (error.status === 403) {
      throw new Error(
        'Editor state validation failed! Server did not accept changes.',
      );
    }
  }
}

/**
 * Shares the document by encoding it as a URL hash and copying it to the clipboard.
 */
export async function shareDoc(doc: SerializedDocument): Promise<void> {
  const { docToHash } = await import('../../utils/docSerialization');
  const url = new URL(window.location.toString());
  url.hash = await docToHash(doc);
  const newUrl = url.toString();
  window.history.replaceState({}, '', newUrl);
  await window.navigator.clipboard.writeText(newUrl);
}


/**
 * Imports a markdown file into the editor.
 */
export async function importMarkdownFile(
  editor: LexicalEditor,
  file: File,
  shouldPreserveNewLines: boolean,
): Promise<void> {
  const text = await file.text();
  editor.update(() => {
    $convertFromMarkdownString(
      text,
      PLAYGROUND_TRANSFORMERS,
      undefined,
      shouldPreserveNewLines,
    );
  });
}

/**
 * Imports a JSON file into the editor.
 */
export async function importJsonFile(editor: LexicalEditor, file: File): Promise<void> {
  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result as string;
    try {
      const json = JSON.parse(content);
      const editorState = editorStateFromSerializedDocument(editor, json);
      editor.setEditorState(editorState);
    } catch (error) {
      console.error('Failed to import JSON:', error);
    }
  };
  reader.readAsText(file);
}

/**
 * Imports an HTML file into the editor.
 */
export async function importHtmlFile(editor: LexicalEditor, file: File): Promise<void> {
  const { $generateNodesFromDOM } = await import('@lexical/html');
  const html = await file.text();
  editor.update(() => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');
    const nodes = $generateNodesFromDOM(editor, dom);
    const root = $getRoot();
    root.clear();
    root.append(...nodes);
  });
}

/**
 * Imports a plain text file into the editor.
 */
export async function importPlainTextFile(editor: LexicalEditor, file: File): Promise<void> {
  const text = await file.text();
  editor.update(() => {
    const root = $getRoot();
    root.clear();
    text.split(/\n+/).forEach((line) => {
      const paragraph = $createParagraphNode();
      if (line.trim()) paragraph.append($createTextNode(line));
      root.append(paragraph);
    });
  });
}

/**
 * Prompts the user to select a file and imports it based on its extension.
 */
export async function importCustomFile(
  editor: LexicalEditor,
  shouldPreserveNewLines: boolean,
): Promise<void> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.markdown,.json,.html,.htm,.txt';

  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
      await importMarkdownFile(editor, file, shouldPreserveNewLines);
    } else if (fileName.endsWith('.json')) {
      await importJsonFile(editor, file);
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      await importHtmlFile(editor, file);
    } else if (fileName.endsWith('.txt')) {
      await importPlainTextFile(editor, file);
    }
  };

  input.click();
}

/**
 * Exports the editor content as plain text.
 */
export function exportAsPlainText(editor: LexicalEditor): void {
  editor.getEditorState().read(() => {
    const text = $getRoot().getTextContent();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Playground ${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Exports the editor content as JSON.
 */
export function exportAsJson(editor: LexicalEditor): void {
  exportFile(editor, {
    fileName: `Playground ${new Date().toISOString()}`,
    source: 'Playground',
  });
}

/**
 * Exports the editor content as Markdown.
 */
export function exportAsMarkdown(
  editor: LexicalEditor,
  shouldPreserveNewLines: boolean,
): void {
  editor.getEditorState().read(() => {
    const markdown = $convertToMarkdownString(
      PLAYGROUND_TRANSFORMERS,
      undefined,
      shouldPreserveNewLines,
    );
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Playground ${new Date().toISOString()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Exports the editor content as HTML.
 */
export function exportAsHtml(editor: LexicalEditor): void {
  editor.getEditorState().read(() => {
    const html = $generateHtmlFromNodes(editor, null);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Playground ${new Date().toISOString()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Exports the editor content as DOCX.
 */
export function exportAsDocx(editor: LexicalEditor): void {
  editor.getEditorState().read(() => {
    const html = $generateHtmlFromNodes(editor, null);
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Playground ${new Date().toISOString()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Copies editor content to clipboard for Google Docs.
 */
export function copyForGoogleDocs(
  editor: LexicalEditor,
  showFlashMessage: (message: string) => void,
): void {
  editor.getEditorState().read(() => {
    const html = $generateHtmlFromNodes(editor, null);
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html], { type: 'text/plain' }),
    });
    navigator.clipboard
      .write([clipboardItem])
      .then(() => showFlashMessage('Copied to clipboard'));
  });
}
