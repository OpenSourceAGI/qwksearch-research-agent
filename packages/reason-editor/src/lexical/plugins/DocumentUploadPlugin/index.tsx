/**
 * @fileoverview Document upload dialog for importing documents from Google Docs or local files
 * Supports MD and PDF file formats
 */

import { LexicalEditor } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';
import { $insertNodes, $getRoot } from 'lexical';
import React, { useState } from 'react';
import Icon from '../../ui/Icon';

export interface DocumentUploadDialogProps {
  activeEditor: LexicalEditor;
  onClose: () => void;
}

/**
 * Dialog component for uploading documents
 */
export function DocumentUploadDialog({
  activeEditor,
  onClose,
}: DocumentUploadDialogProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let htmlContent = '';

      switch (fileExtension) {
        case 'md':
          htmlContent = await convertMarkdownToHtml(file);
          break;
        case 'pdf':
          htmlContent = await convertPdfToHtml(file);
          break;
        default:
          throw new Error('Unsupported file format. Please upload MD or PDF files.');
      }

      // Insert the HTML content into the editor
      activeEditor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlContent, 'text/html');
        const nodes = $generateNodesFromDOM(activeEditor, dom);
        $insertNodes(nodes);
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleDocsImport = async () => {
    if (!googleDocsUrl.trim()) {
      setError('Please enter a Google Docs URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const htmlContent = await importFromGoogleDocs(googleDocsUrl);

      // Insert the HTML content into the editor
      activeEditor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(htmlContent, 'text/html');
        const nodes = $generateNodesFromDOM(activeEditor, dom);
        $insertNodes(nodes);
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from Google Docs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Import Document</h3>

        {/* Google Docs Import Section */}
        <div className="border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="file-text" />
            <span className="font-medium">Import from Google Docs</span>
          </div>
          <input
            type="text"
            placeholder="Paste Google Docs URL..."
            value={googleDocsUrl}
            onChange={(e) => setGoogleDocsUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleGoogleDocsImport}
            disabled={isLoading || !googleDocsUrl.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Importing...' : 'Import from Google Docs'}
          </button>
        </div>

        {/* File Upload Section */}
        <div className="border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Icon name="upload" />
            <span className="font-medium">Upload from Computer</span>
          </div>
          <div className="text-sm text-gray-600">
            Supported formats: Markdown (.md), PDF
          </div>
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".md,.pdf"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="px-4 py-2 border-2 border-dashed rounded-md text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
              {isLoading ? 'Uploading...' : 'Click to select file or drag and drop'}
            </div>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Convert Markdown file to HTML
 */
async function convertMarkdownToHtml(file: File): Promise<string> {
  const text = await file.text();
  const { marked } = await import('marked');
  const html = await marked.parse(text);
  return html;
}


/**
 * Convert PDF file to HTML (basic text extraction)
 */
async function convertPdfToHtml(file: File): Promise<string> {
  // For PDF conversion, we'll need a PDF parsing library
  // This is a placeholder that will need a proper PDF library
  throw new Error('PDF conversion requires additional setup. Please install a PDF parsing library like pdf-parse or pdfjs-dist.');
}

/**
 * Import document from Google Docs
 */
async function importFromGoogleDocs(url: string): Promise<string> {
  // Extract document ID from Google Docs URL
  const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!docIdMatch) {
    throw new Error('Invalid Google Docs URL. Please provide a valid document URL.');
  }

  const docId = docIdMatch[1];

  // Export the Google Doc as HTML
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Docs content. Make sure the document is publicly accessible or you are logged in.');
    }

    const html = await response.text();
    return html;
  } catch (err) {
    throw new Error('Failed to import from Google Docs. Make sure the document is publicly accessible.');
  }
}

export default DocumentUploadDialog;
