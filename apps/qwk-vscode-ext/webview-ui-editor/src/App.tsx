import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import {
  RichTextProvider,
  RichTextToolbar,
  BubbleMenus,
  buildExtensions,
  createDefaultConfig,
  debounce,
} from "react-reason-editor/editor-kit";
import "react-reason-editor/style.css";
import { bridge, useExtensionMessages } from "./useExtensionMessages";
import { markdownToHtml, htmlToMarkdown } from "./markdown";
import { docxBase64ToHtml, htmlToDocxBase64 } from "./docx";
import type { DocFormat } from "./protocol";

// A single shared extension set (toolbar, tables, images, katex, word
// import/export, etc.) — the same default plugin registry ReasonDocs mounts.
const EXTENSIONS = buildExtensions(createDefaultConfig());

interface DocState {
  format: DocFormat;
  revision: number;
  html: string;
}

interface EditorSurfaceProps {
  html: string;
  theme: "light" | "dark";
  onChange: (html: string) => void;
  onAskQwkSearch: (text: string) => void;
}

/** Remounted (via the `key` at the call site) whenever a new revision arrives from disk. */
function EditorSurface({ html, theme, onChange, onAskQwkSearch }: EditorSurfaceProps) {
  const editor = useEditor({
    content: html,
    extensions: EXTENSIONS,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const askAboutSelection = () => {
    const selected = window.getSelection()?.toString().trim();
    const text = selected && selected.length > 0 ? selected : editor.getText();
    if (text.trim()) onAskQwkSearch(text);
  };

  return (
    <RichTextProvider editor={editor} dark={theme === "dark"}>
      <div className="reason-editor-shell">
        <div className="reason-editor-topbar">
          <div className="reason-editor-toolbar-scroll">
            <RichTextToolbar theme={theme} setTheme={() => {}} />
          </div>
          <button
            className="icon-button ask-qwksearch"
            onClick={askAboutSelection}
            title="Send the current selection (or whole document) to the QwkSearch sidebar"
          >
            Ask QwkSearch
          </button>
        </div>
        <div className="reason-editor-body">
          <EditorContent editor={editor} />
        </div>
        <BubbleMenus />
      </div>
    </RichTextProvider>
  );
}

export default function App() {
  const [doc, setDoc] = useState<DocState>();
  const [error, setError] = useState<string>();
  const docRef = useRef<DocState | undefined>(undefined);
  const lastEmittedHtml = useRef<string | undefined>(undefined);
  const theme = useColorTheme();

  useEffect(() => {
    bridge.post({ type: "ready" });
  }, []);

  const applyInit = useCallback(
    async (format: DocFormat, revision: number, text?: string, base64?: string) => {
      try {
        const html =
          format === "markdown" ? markdownToHtml(text ?? "") : await docxBase64ToHtml(base64 ?? "");
        lastEmittedHtml.current = html;
        setError(undefined);
        const next = { format, revision, html };
        docRef.current = next;
        setDoc(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  useExtensionMessages((message) => {
    if (message.type === "init") void applyInit(message.format, message.revision, message.text, message.base64);
  });

  const handleChange = useCallback(
    debounce(async (html: string) => {
      const current = docRef.current;
      if (!current || html === lastEmittedHtml.current) return;
      lastEmittedHtml.current = html;

      if (current.format === "markdown") {
        bridge.post({ type: "change", text: htmlToMarkdown(html) });
      } else {
        bridge.post({ type: "change", base64: await htmlToDocxBase64(html) });
      }
    }, 400),
    [],
  );

  if (error) {
    return <div className="empty-state">Couldn't open this file in the reason editor: {error}</div>;
  }

  if (!doc) {
    return <div className="empty-state">Loading…</div>;
  }

  return (
    <EditorSurface
      key={doc.revision}
      html={doc.html}
      theme={theme}
      onChange={handleChange}
      onAskQwkSearch={(text) => bridge.post({ type: "askQwkSearch", text })}
    />
  );
}

/** Tracks VS Code's active color theme via the `body` class VS Code sets on it. */
function useColorTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(
    document.body.classList.contains("vscode-dark") || document.body.classList.contains("vscode-high-contrast")
      ? "dark"
      : "light",
  );

  useEffect(() => {
    const target = document.body;
    const observer = new MutationObserver(() => {
      setTheme(target.classList.contains("vscode-dark") || target.classList.contains("vscode-high-contrast") ? "dark" : "light");
    });
    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
