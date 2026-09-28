/**
 * @module FileManagerModal
 * @description Full-screen file manager modal with a two-pane layout:
 * folder tree on the left, file list with upload/delete on the right.
 */
"use client";

import { useCallback, useMemo, useRef } from "react";
import { Filemanager, Willow } from "@svar-ui/react-filemanager";
import type { IApi } from "@svar-ui/react-filemanager";
import "@svar-ui/react-filemanager/all.css";
import "./filemanager.css";
import {
  Dialog,
  DialogContent
} from "../app-ui/dialog";
import { getData, getPathToDocIdMap, getPathToNodeIdMap } from "./filemanager-data";
import { defaultDocuments } from "../documents/defaultDocuments";
import type { Document } from "../documents/DocumentTree";
import type { FileManagerCreateRequest } from "../layout/sidebar/types";

export type { FileManagerCreateRequest };

interface FileManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents?: Document[];
  onSelectDocument?: (docId: string) => void;
  /**
   * Persists a new file or folder. Without it "Add new" and "Upload file"
   * are inert: the file manager has no storage of its own, so nothing would
   * survive the next re-render.
   */
  onCreateFile?: (request: FileManagerCreateRequest) => void | Promise<void>;
}

export function FileManagerModal({
  open,
  onOpenChange,
  documents = defaultDocuments,
  onSelectDocument,
  onCreateFile,
}: FileManagerModalProps) {
  const data = useMemo(
    () =>
      getData(documents).map((item) => ({
        id: item.id,
        parent: item.parent,
        type: item.type,
        size: item.size ?? 0,
        date: item.date ?? new Date(),
      })),
    [documents],
  );

  const pathToDocId = useMemo(() => getPathToDocIdMap(documents), [documents]);
  const pathToNodeId = useMemo(() => getPathToNodeIdMap(documents), [documents]);

  // Keep handlers in refs so the init callback never needs to re-run.
  const pathToDocIdRef = useRef(pathToDocId);
  pathToDocIdRef.current = pathToDocId;
  const pathToNodeIdRef = useRef(pathToNodeId);
  pathToNodeIdRef.current = pathToNodeId;
  const onSelectDocumentRef = useRef(onSelectDocument);
  onSelectDocumentRef.current = onSelectDocument;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const onCreateFileRef = useRef(onCreateFile);
  onCreateFileRef.current = onCreateFile;

  const init = useCallback((api: IApi) => {
    api.on("open-file", ({ id }: { id: string }) => {
      const docId = pathToDocIdRef.current.get(id);
      if (docId && onSelectDocumentRef.current) {
        onSelectDocumentRef.current(docId);
        onOpenChangeRef.current(false);
      }
    });

    // Covers both "Add new" and "Upload file": SVAR turns the upload's
    // selected `File` into a `create-file` call too, so there is nothing
    // upload-specific left to handle here.
    api.on(
      "create-file",
      ({
        file,
        parent,
      }: {
        file: { name?: string; type?: string; file?: File };
        parent: string;
      }) => {
        const handler = onCreateFileRef.current;
        if (!handler) return;

        const parentId =
          !parent || parent === "0"
            ? null
            : pathToNodeIdRef.current.get(parent) ?? null;

        return handler({
          parentId,
          name: (file?.name || "").trim() || "Untitled",
          isFolder: file?.type === "folder",
          file: file?.file,
        });
      },
    );
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden sm:!max-w-[98vw] !duration-0 data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 data-[state=open]:!animate-none data-[state=closed]:!animate-none">
        <div className="qwk-filemanager-shell flex-1 min-h-0 overflow-hidden rounded-md">
          {open && (
            <Willow>
              <Filemanager data={data} mode="table" init={init} />
            </Willow>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
