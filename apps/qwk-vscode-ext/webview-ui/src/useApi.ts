import { useEffect, useRef } from "react";
import { bridge } from "./useExtensionMessages";
import type { InboundMessage } from "./protocol";

interface PendingRequest {
  onChunk?: (chunk: string) => void;
  resolve: (status: number) => void;
  reject: (error: Error) => void;
}

let nextId = 0;
const pending = new Map<string, PendingRequest>();

bridge.subscribe((message: InboundMessage) => {
  if (message.type !== "apiChunk" && message.type !== "apiDone" && message.type !== "apiError") {
    return;
  }
  const entry = pending.get(message.requestId);
  if (!entry) return;

  if (message.type === "apiChunk") {
    entry.onChunk?.(message.chunk);
  } else if (message.type === "apiDone") {
    pending.delete(message.requestId);
    entry.resolve(message.status);
  } else {
    pending.delete(message.requestId);
    entry.reject(new Error(message.error));
  }
});

/** Sends a request to the extension host, which proxies it to the QwkSearch API. */
export function apiRequest(
  method: string,
  path: string,
  body?: unknown,
  onChunk?: (chunk: string) => void,
): { requestId: string; done: Promise<number> } {
  const requestId = `req_${++nextId}`;
  const done = new Promise<number>((resolve, reject) => {
    pending.set(requestId, { onChunk, resolve, reject });
  });
  bridge.post({ type: "apiRequest", requestId, method, path, body });
  return { requestId, done };
}

export function cancelRequest(requestId: string): void {
  pending.delete(requestId);
  bridge.post({ type: "cancelRequest", requestId });
}

/** Convenience hook: cancels any in-flight request tracked by `requestIdRef` on unmount. */
export function useCancelOnUnmount(requestIdRef: React.MutableRefObject<string | null>): void {
  useEffect(
    () => () => {
      if (requestIdRef.current) cancelRequest(requestIdRef.current);
    },
    [],
  );
}
