/**
 * Hook managing file attachment state: uploads supported document types (PDF, DOCX, TXT, MD, HTML)
 * to Cloudflare R2 via /api/doc/uploads, extracts typed-in / pasted URLs with extract-webpage,
 * enforces client-side file count and size limits, handles drag-and-drop events, and converts
 * large clipboard pastes into PastedContent cards.
 */
import { useState, useCallback } from "react";
import React from "react";
import { AttachedFile, PastedContent } from "../../types/research";
import type { ChatFile } from "../../types/chat";
import grab from "grab-url";

const SUPPORTED_EXTS = ["pdf", "docx", "txt", "md", "html", "htm"];

/** Max files attachable to a single message (mirrors the server limit). */
export const MAX_FILES_PER_MESSAGE = 10;
/** Max size of one uploaded file in bytes (mirrors the server limit). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const URL_ONLY_PATTERN = /^https?:\/\/\S+$/i;

/** True when the given text is a single URL (typed or pasted in). */
export function isLoneUrl(text: string): boolean {
  return URL_ONLY_PATTERN.test(text.trim());
}

interface UseFileHandlingOptions {
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  contextFiles: ChatFile[];
  contextFileIds: string[];
  setContextFiles: (files: ChatFile[]) => void;
  setContextFileIds: (ids: string[]) => void;
}

export function useFileHandling({
  setMessage,
  contextFiles,
  contextFileIds,
  setContextFiles,
  setContextFileIds,
}: UseFileHandlingOptions) {
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (newFilesList: FileList | File[]) => {
      let incoming = Array.from(newFilesList);

      // Enforce the per-message attachment limit
      const room = Math.max(0, MAX_FILES_PER_MESSAGE - files.length);
      if (incoming.length > room) {
        console.warn(
          `[uploads] attachment limit is ${MAX_FILES_PER_MESSAGE} files per message; ignoring ${incoming.length - room} file(s)`,
        );
        incoming = incoming.slice(0, room);
      }
      if (incoming.length === 0) return;

      const newFiles = incoming.map((file) => {
        const isImage =
          file.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const isUploadable = SUPPORTED_EXTS.includes(ext);
        const isTooLarge = file.size > MAX_FILE_SIZE_BYTES;
        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          type: isImage
            ? "image/unknown"
            : file.type || "application/octet-stream",
          preview: isImage ? URL.createObjectURL(file) : null,
          uploadStatus: isTooLarge
            ? "error"
            : isUploadable
              ? "uploading"
              : "pending",
          errorMessage: isTooLarge
            ? `File exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB limit`
            : undefined,
          _ext: ext,
          _tooLarge: isTooLarge,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);

      // Non-uploadable files (images, unsupported): just mark complete
      const nonUploadable = newFiles.filter(
        (f) => !SUPPORTED_EXTS.includes(f._ext) && !f._tooLarge,
      );
      nonUploadable.forEach((f) => {
        setTimeout(
          () => {
            setFiles((prev) =>
              prev.map((p) =>
                p.id === f.id ? { ...p, uploadStatus: "complete" } : p,
              ),
            );
          },
          600 + Math.random() * 600,
        );
      });

      // Supported documents within the size limit: upload to R2 via /api/doc/uploads
      const uploadable = newFiles.filter(
        (f) => SUPPORTED_EXTS.includes(f._ext) && !f._tooLarge,
      );
      if (uploadable.length === 0) return;

      try {
        const formData = new FormData();
        uploadable.forEach((f) => formData.append("files", f.file));

        const data: { files: ChatFile[]; message?: string } = await grab(
          "/api/doc/uploads",
          {
            method: "POST",
            body: formData,
          },
        );

        if (!data?.files?.length) {
          throw new Error(data?.message || "Upload failed");
        }

        setFiles((prev) =>
          prev.map((p) =>
            uploadable.some((u) => u.id === p.id)
              ? { ...p, uploadStatus: "complete" }
              : p,
          ),
        );

        setContextFiles([...contextFiles, ...data.files]);
        setContextFileIds([
          ...contextFileIds,
          ...data.files.map((f) => f.fileId),
        ]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((p) =>
            uploadable.some((u) => u.id === p.id)
              ? { ...p, uploadStatus: "error", errorMessage }
              : p,
          ),
        );
      }
    },
    [
      setMessage,
      files.length,
      contextFiles,
      contextFileIds,
      setContextFiles,
      setContextFileIds,
    ],
  );

  /**
   * Extracts a typed-in or pasted URL with extract-webpage on the server and
   * attaches the result as a context file (shown as an attachment card).
   */
  const attachUrl = useCallback(
    async (url: string) => {
      const trimmed = url.trim();
      if (!isLoneUrl(trimmed)) return;

      if (files.length >= MAX_FILES_PER_MESSAGE) {
        console.warn(
          `[uploads] attachment limit is ${MAX_FILES_PER_MESSAGE} files per message`,
        );
        return;
      }

      let host = trimmed;
      try {
        host = new URL(trimmed).hostname;
      } catch {
        // keep full url as label
      }

      const card = {
        id: Math.random().toString(36).substr(2, 9),
        file: new File([], `${host}.url`, { type: "text/uri-list" }),
        type: "text/uri-list",
        preview: null,
        uploadStatus: "uploading",
      } as AttachedFile;

      setFiles((prev) => [...prev, card]);

      try {
        const data: { files: ChatFile[]; message?: string } = await grab(
          "/api/doc/uploads",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          },
        );

        if (!data?.files?.length) {
          throw new Error(data?.message || "URL extraction failed");
        }

        const uploaded = data.files[0];
        setFiles((prev) =>
          prev.map((p) =>
            p.id === card.id
              ? {
                  ...p,
                  uploadStatus: "complete",
                  remoteSize: uploaded.size,
                  file: new File([], uploaded.fileName, {
                    type: "text/uri-list",
                  }),
                }
              : p,
          ),
        );

        setContextFiles([...contextFiles, ...data.files]);
        setContextFileIds([
          ...contextFileIds,
          ...data.files.map((f) => f.fileId),
        ]);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "URL extraction failed";
        setFiles((prev) =>
          prev.map((p) =>
            p.id === card.id
              ? { ...p, uploadStatus: "error", errorMessage }
              : p,
          ),
        );
      }
    },
    [files.length, contextFiles, contextFileIds, setContextFiles, setContextFileIds],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
      return;
    }

    const text = e.clipboardData.getData("text");

    // A pasted URL is extracted with extract-webpage and attached as context
    if (isLoneUrl(text)) {
      e.preventDefault();
      attachUrl(text);
      return;
    }

    if (text.length > 300) {
      e.preventDefault();
      const snippet = {
        id: Math.random().toString(36).substr(2, 9),
        content: text,
        timestamp: new Date(),
      };
      setPastedContent((prev) => [...prev, snippet]);
    }
  };

  const resetAttachments = () => {
    setFiles([]);
    setPastedContent([]);
    setContextFiles([]);
    setContextFileIds([]);
  };

  return {
    files,
    setFiles,
    pastedContent,
    setPastedContent,
    isDragging,
    handleFiles,
    attachUrl,
    onDragOver,
    onDragLeave,
    onDrop,
    handlePaste,
    resetAttachments,
  };
}
