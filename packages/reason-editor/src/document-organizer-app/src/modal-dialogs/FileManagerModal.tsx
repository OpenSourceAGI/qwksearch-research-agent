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
import {
  Dialog,
  DialogContent
} from "../shared-components/dialog";
import { getData, getPathToDocIdMap } from "./filemanager-data";
import { defaultDocuments } from "../document-management/defaultDocuments";
import type { Document } from "../document-management/DocumentTree";

interface FileManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents?: Document[];
  onSelectDocument?: (docId: string) => void;
}

export function FileManagerModal({
  open,
  onOpenChange,
  documents = defaultDocuments,
  onSelectDocument,
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

  // Keep handlers in refs so the init callback never needs to re-run.
  const pathToDocIdRef = useRef(pathToDocId);
  pathToDocIdRef.current = pathToDocId;
  const onSelectDocumentRef = useRef(onSelectDocument);
  onSelectDocumentRef.current = onSelectDocument;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const init = useCallback((api: IApi) => {
    api.on("open-file", ({ id }: { id: string }) => {
      const docId = pathToDocIdRef.current.get(id);
      if (docId && onSelectDocumentRef.current) {
        onSelectDocumentRef.current(docId);
        onOpenChangeRef.current(false);
      }
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] w-[98vw] h-[95vh] max-h-[95vh] p-0 flex flex-col overflow-hidden sm:!max-w-[98vw] !duration-0 data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 data-[state=open]:!animate-none data-[state=closed]:!animate-none">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="h-[92vh] min-h-[300px] rounded-md overflow-hidden">
            {open && (
              <Willow>
                <Filemanager data={data} mode="table" init={init} />
              </Willow>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
