/**
 * Hook managing file attachment state: uploads supported document types (PDF, DOCX, TXT, HTML) to the server,
 * handles drag-and-drop events, and converts large clipboard pastes into PastedContent cards.
 */
import { useState, useCallback } from "react";
import React from "react";
import { AttachedFile, PastedContent } from "../../types/research";
import type { ChatFile } from "../../types/chat";
import grab from "grab-url";

const SUPPORTED_EXTS = ["pdf", "docx", "txt", "html", "htm"];

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
      const newFiles = Array.from(newFilesList).map((file) => {
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

        const data: { files: ChatFile[] } = await grab("/api/doc/uploads", {
          method: "POST",
          body: formData,
        });

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
      } catch {
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
    handleFiles,
    onDragOver,
    onDragLeave,
    onDrop,
    handlePaste,
    resetAttachments,
  };
}
