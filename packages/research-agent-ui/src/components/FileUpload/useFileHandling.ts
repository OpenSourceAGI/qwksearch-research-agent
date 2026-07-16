/**
 * Hook managing file attachment state: uploads supported document types (PDF, DOCX, TXT, MD, HTML) to the server,
 * extracts typed-in URLs as attachable context, handles drag-and-drop events, validates file count/size limits,
 * and converts large clipboard pastes into PastedContent cards.
 */
import { useState, useCallback } from "react";
import React from "react";
import { toast } from "sonner";
import { AttachedFile, PastedContent } from "../../types/research";
import type { ChatFile } from "../../types/chat";
import grab from "grab-url";

const SUPPORTED_EXTS = ["pdf", "docx", "txt", "md", "html", "htm"];

/** Server-enforced limits, mirrored client-side for immediate feedback. */
const MAX_FILES_PER_REQUEST = 10;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

interface UseFileHandlingOptions {
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  contextFiles: ChatFile[];
  contextFileIds: string[];
  setContextFiles: (files: ChatFile[]) => void;
  setContextFileIds: (ids: string[]) => void;
}

/** Extracts a human-readable message from a failed upload response. */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object") {
    const message =
      (error as any).message ?? (error as any).error ?? (error as any).data?.message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  if (typeof error === "string" && error.length > 0) return error;
  return fallback;
};

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
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);

  const handleFiles = useCallback(
    async (newFilesList: FileList | File[]) => {
      let incoming = Array.from(newFilesList);

      // Client-side validation mirroring the server's limits.
      if (incoming.length > MAX_FILES_PER_REQUEST) {
        toast.error(
          `You can attach up to ${MAX_FILES_PER_REQUEST} files at a time.`,
        );
        incoming = incoming.slice(0, MAX_FILES_PER_REQUEST);
      }
      const oversized = incoming.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
      if (oversized.length > 0) {
        toast.error(
          `${oversized.map((f) => f.name).join(", ")} exceed${oversized.length === 1 ? "s" : ""} the 50 MB per-file limit.`,
        );
        incoming = incoming.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);
      }
      if (incoming.length === 0) return;

      const newFiles = incoming.map((file) => {
        const isImage =
          file.type.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const isUploadable = SUPPORTED_EXTS.includes(ext);
        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          type: isImage
            ? "image/unknown"
            : file.type || "application/octet-stream",
          preview: isImage ? URL.createObjectURL(file) : null,
          uploadStatus: isUploadable ? "uploading" : "pending",
          _ext: ext,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);

      // Non-uploadable files (images, unsupported): just mark complete
      const nonUploadable = newFiles.filter(
        (f) => !SUPPORTED_EXTS.includes(f._ext),
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

      // Supported documents: upload to R2 via /api/doc/uploads
      const uploadable = newFiles.filter((f) =>
        SUPPORTED_EXTS.includes(f._ext),
      );
      if (uploadable.length === 0) return;

      try {
        const formData = new FormData();
        uploadable.forEach((f) => formData.append("files", f.file));

        const data: { files?: ChatFile[]; message?: string } = await grab(
          "/api/doc/uploads",
          {
            method: "POST",
            body: formData,
          },
        );

        if (!data?.files) {
          throw new Error(getErrorMessage(data, "Upload failed."));
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
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to upload files."));
        setFiles((prev) =>
          prev.map((p) =>
            uploadable.some((u) => u.id === p.id)
              ? { ...p, uploadStatus: "error" }
              : p,
          ),
        );
      }
    },
    [
      setMessage,
      contextFiles,
      contextFileIds,
      setContextFiles,
      setContextFileIds,
    ],
  );

  /**
   * Extracts a typed-in URL server-side (via extract-webpage) and attaches
   * the resulting content as a context file.
   */
  const extractUrl = useCallback(
    async (url: string): Promise<boolean> => {
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        toast.error("Enter a valid http(s) URL.");
        return false;
      }

      setIsExtractingUrl(true);
      try {
        const data: { files?: ChatFile[]; message?: string } = await grab(
          "/api/doc/uploads",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: trimmed }),
          },
        );

        if (!data?.files || data.files.length === 0) {
          throw new Error(
            getErrorMessage(data, `Could not extract content from ${trimmed}`),
          );
        }

        setContextFiles([...contextFiles, ...data.files]);
        setContextFileIds([
          ...contextFileIds,
          ...data.files.map((f) => f.fileId),
        ]);
        toast.success(`Added "${data.files[0].fileName}" as context.`);
        return true;
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to extract URL."));
        return false;
      } finally {
        setIsExtractingUrl(false);
      }
    },
    [contextFiles, contextFileIds, setContextFiles, setContextFileIds],
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
    isExtractingUrl,
    handleFiles,
    extractUrl,
    onDragOver,
    onDragLeave,
    onDrop,
    handlePaste,
    resetAttachments,
  };
}
