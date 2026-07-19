/**
 * Read-only shared document view that fetches a document by share ID
 * and renders it in the Lexical editor with an outline sidebar.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LexicalEditorWrapper } from './LexicalEditorWrapper';
import { OutlineView } from '../search/OutlineView';
import { Loader2 } from 'lucide-react';
import grab from 'grab-url';

interface Document {
  id: string;
  title: string;
  content: string;
}

export default function ShareView() {
  const { shareId } = useParams<{ shareId: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedDocument() {
      if (!shareId) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const data = await grab(`doc/share/${shareId}`);

        if (!data.success) {
          setError(data.error || 'Failed to load document');
          setLoading(false);
          return;
        }

        setDocument(data.data);

        // Set document title in HTML head
        if (data.data.title) {
          document.title = data.data.title;
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    fetchSharedDocument();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Document not found</h1>
          <p className="text-muted-foreground">{error || 'This document may have been deleted or the share link is invalid.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with outline */}
      <div className="w-64 border-r bg-muted/10 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold mb-4 text-muted-foreground">Outline</h2>
          <OutlineView
            headings={[]}
            searchQuery=""
            onNavigate={() => { }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <LexicalEditorWrapper
            content={document.content}
            onChange={() => { }} // No-op for read-only
            title={document.title}
            onTitleChange={() => { }} // No-op for read-only
            readOnly={true}
          />
        </div>
      </div>
    </div>
  );
}
