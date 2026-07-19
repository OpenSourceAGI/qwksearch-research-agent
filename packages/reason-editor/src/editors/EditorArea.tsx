/**
 * @module EditorArea
 * @description Renders the main editing area, supporting both single-document
 * and split-view layouts with optional AI suggestion integration.
 */
import type { TableOfContentsEntry } from '@lexical/react/LexicalTableOfContentsPlugin';
import type { Document } from '../documents/DocumentTree';
import { LexicalEditorWrapper, type LexicalEditorHandle } from './LexicalEditorWrapper';
import { FileText, X } from 'lucide-react';
import { Button } from '../ui/button';
import { SplitPane, Pane } from 'react-split-pane';

/**
 * Props for the {@link EditorArea} component.
 */
interface EditorAreaProps {
  /** Currently active document, or undefined when none is selected. */
  activeDocument: Document | undefined;
  documents: Document[];
  splitViewDocId: string | null;
  activeDocId: string | null;
  isMobile: boolean;
  editorRef?: React.RefObject<LexicalEditorHandle | null>;
  onUpdateDocument: (id: string, updates: Partial<Document>) => void;
  onHeadingsChange?: (headings: TableOfContentsEntry[]) => void;
  onCloseSplitView: () => void;
  aiSuggestion?: {
    originalText: string;
    suggestedText: string;
    range: { from: number; to: number };
    mode?: string;
  } | null;
  isAiLoading?: boolean;
  onAiRewrite?: (customPrompt?: string, modeId?: string) => void;
  onAiApprove?: () => void;
  onAiReject?: () => void;
  onAiRegenerate?: (mode: any) => void;
  onInviteClick?: () => void;
  onShareClick?: () => void;
}

/**
 * Displays the active document editor.
 * - Shows a placeholder when no document is selected.
 * - Renders a split panel when `splitViewDocId` differs from `activeDocId`.
 * - Passes AI suggestion state through to the underlying `LexicalEditorWrapper`.
 */
export function EditorArea({
  activeDocument,
  documents,
  splitViewDocId,
  activeDocId,
  isMobile,
  editorRef,
  onUpdateDocument,
  onHeadingsChange,
  onCloseSplitView,
  aiSuggestion,
  isAiLoading,
  onAiRewrite,
  onAiApprove,
  onAiReject,
  onAiRegenerate,
  onInviteClick,
  onShareClick,
}: EditorAreaProps) {
  if (!activeDocument) {
    return (
      <div className="flex h-full items-center justify-center bg-editor-bg">
        <div className="text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
            No Note Selected
          </h2>
          <p className="text-muted-foreground">
            {isMobile ? 'Tap the menu to select a note' : 'Select a note from the sidebar or create a new one'}
          </p>
        </div>
      </div>
    );
  }

  if (splitViewDocId && splitViewDocId !== activeDocId) {
    const splitDoc = documents.find(d => d.id === splitViewDocId);

    return (
      <div className="flex-1 h-full">
        <SplitPane direction="horizontal">
          {/* Left editor */}
          <Pane minSize="300px">
            <div className="flex flex-col h-full border-r border-border">
              <div className="flex-1 min-h-0">
                <LexicalEditorWrapper
                  ref={editorRef}
                  contentKey={activeDocument.id}
                  content={activeDocument.content}
                  onChange={(content) => onUpdateDocument(activeDocument.id, { content })}
                  title={activeDocument.title}
                  onTitleChange={(title) => onUpdateDocument(activeDocument.id, { title })}
                  scrollToHeading={() => { }}
                  onHeadingsChange={onHeadingsChange}
                  aiSuggestion={aiSuggestion}
                  isAiLoading={isAiLoading}
                  onAiRewrite={onAiRewrite}
                  onAiApprove={onAiApprove}
                  onAiReject={onAiReject}
                  onAiRegenerate={onAiRegenerate}
                  onInviteClick={onInviteClick}
                  onShareClick={onShareClick}
                  documentId={activeDocument.id}
                />
              </div>
            </div>
          </Pane>

          {/* Right editor */}
          <Pane minSize="300px">
            <div className="flex flex-col h-full">
              {splitDoc ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                    <span className="text-sm font-medium">{splitDoc.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={onCloseSplitView}
                      title="Close split view"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <LexicalEditorWrapper
                      content={splitDoc.content}
                      onChange={(content) => onUpdateDocument(splitDoc.id, { content })}
                      title={splitDoc.title}
                      onTitleChange={(title) => onUpdateDocument(splitDoc.id, { title })}
                      scrollToHeading={() => { }}
                      onInviteClick={onInviteClick}
                      onShareClick={onShareClick}
                      documentId={splitDoc.id}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </Pane>
        </SplitPane>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <LexicalEditorWrapper
        ref={editorRef}
        contentKey={activeDocument.id}
        content={activeDocument.content}
        onChange={(content) => onUpdateDocument(activeDocument.id, { content })}
        title={activeDocument.title}
        onTitleChange={(title) => onUpdateDocument(activeDocument.id, { title })}
        scrollToHeading={() => { }}
        onHeadingsChange={onHeadingsChange}
        aiSuggestion={aiSuggestion}
        isAiLoading={isAiLoading}
        onAiRewrite={onAiRewrite}
        onAiApprove={onAiApprove}
        onAiReject={onAiReject}
        onAiRegenerate={onAiRegenerate}
        onInviteClick={onInviteClick}
        onShareClick={onShareClick}
        documentId={activeDocument.id}
      />
    </div>
  );
}
