/**
 * @module EditorArea
 * @description Renders the main editing area, supporting both single-document
 * and split-view layouts with optional AI suggestion integration.
 *
 * Both layouts mount whichever editor `engine` names, through the one contract
 * in `./editor-contract.ts`. The default is Plate; `'tiptap'` keeps the previous
 * engine reachable for the features not yet ported to it — today that is inline
 * comments (see the module comment in `./PlateEditorWrapper.tsx`).
 *
 * Both engines are loaded lazily. Each wrapper carries its whole editor stack
 * (Plate or Tiptap, KaTeX, the drawing canvas, the toolbars and the library
 * stylesheet), and `ReasonDocs` imports this module even when the host fills
 * the main area with its own `mainContent` and never shows an editor. A static
 * import would put all of that in the shell's chunk; behind `lazy` it is
 * fetched the first time a document is actually opened, and only for the
 * engine in use.
 */
import { forwardRef, lazy, Suspense } from 'react';
import type { TocEntry, Document } from 'react-reason-editor-sidebar';
import type { ReasonEditorHandle, ReasonEditorProps } from './editor-contract';
import { FileText, X } from 'lucide-react';
import { Button } from '../app-ui/button';
import { SplitPane, Pane } from 'react-split-pane';

/** The editors `EditorArea` can mount. */
export type ReasonEditorEngine = 'plate' | 'tiptap';

type EditorComponent = React.ForwardRefExoticComponent<
  ReasonEditorProps & React.RefAttributes<ReasonEditorHandle>
>;

/** Holds the editor's place while its chunk is in flight. */
function EditorLoading() {
  return (
    <div
      className="flex h-full items-center justify-center bg-editor-bg"
      aria-busy="true"
      aria-label="Loading the editor"
    >
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground/60" />
    </div>
  );
}

/**
 * An editor wrapper fetched on first render, behind its own Suspense boundary
 * so the tabs, sidebar and split-pane chrome around it stay on screen while
 * the chunk loads. The ref is forwarded, so `editorRef` still reaches the
 * engine's imperative handle once it mounts.
 */
function lazyEditor(load: () => Promise<EditorComponent>): EditorComponent {
  const Lazy = lazy(() => load().then((component) => ({ default: component })));
  const LazyEditor = forwardRef<ReasonEditorHandle, ReasonEditorProps>((props, ref) => (
    <Suspense fallback={<EditorLoading />}>
      <Lazy ref={ref} {...props} />
    </Suspense>
  ));
  return LazyEditor;
}

const EDITORS: Record<ReasonEditorEngine, EditorComponent> = {
  plate: lazyEditor(() => import('./PlateEditorWrapper').then((mod) => mod.PlateEditorWrapper)),
  tiptap: lazyEditor(() => import('./TiptapEditorWrapper').then((mod) => mod.TiptapEditorWrapper)),
};

/**
 * Props for the {@link EditorArea} component.
 */
interface EditorAreaProps {
  /** Currently active document, or undefined when none is selected. */
  activeDocument: Document | undefined;
  /** Which editor to mount. Defaults to Plate. */
  engine?: ReasonEditorEngine;
  documents: Document[];
  splitViewDocId: string | null;
  activeDocId: string | null;
  isMobile: boolean;
  editorRef?: React.RefObject<ReasonEditorHandle | null>;
  onUpdateDocument: (id: string, updates: Partial<Document>) => void;
  onHeadingsChange?: (headings: TocEntry[]) => void;
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
 * - Passes AI suggestion state through to the underlying editor wrapper.
 */
export function EditorArea({
  activeDocument,
  engine = 'plate',
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
  const EditorWrapper = EDITORS[engine] ?? EDITORS.plate;

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
                <EditorWrapper
                  ref={editorRef}
                  contentKey={activeDocument.id}
                  content={activeDocument.content}
                  onChange={(content: string) => onUpdateDocument(activeDocument.id, { content })}
                  title={activeDocument.title}
                  onTitleChange={(title: string) => onUpdateDocument(activeDocument.id, { title })}
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
                    <EditorWrapper
                      content={splitDoc.content}
                      onChange={(content: string) => onUpdateDocument(splitDoc.id, { content })}
                      title={splitDoc.title}
                      onTitleChange={(title: string) => onUpdateDocument(splitDoc.id, { title })}
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
      <EditorWrapper
        ref={editorRef}
        contentKey={activeDocument.id}
        content={activeDocument.content}
        onChange={(content: string) => onUpdateDocument(activeDocument.id, { content })}
        title={activeDocument.title}
        onTitleChange={(title: string) => onUpdateDocument(activeDocument.id, { title })}
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
