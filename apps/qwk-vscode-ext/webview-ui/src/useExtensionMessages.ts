import { useEffect, useRef } from "react";
import { vscodeApi } from "./vscodeApi";
import type { InboundMessage, OutboundMessage } from "./protocol";

type Listener = (message: InboundMessage) => void;

/** Fan-out for messages coming from the extension host, plus a typed `post`. */
class ExtensionBridge {
  private listeners = new Set<Listener>();

  constructor() {
    window.addEventListener("message", (event: MessageEvent<InboundMessage>) => {
      for (const listener of this.listeners) listener(event.data);
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  post(message: OutboundMessage): void {
    vscodeApi.postMessage(message);
  }
}

export const bridge = new ExtensionBridge();

/** Subscribes a callback to inbound messages for the lifetime of the component. */
export function useExtensionMessages(onMessage: Listener): void {
  const ref = useRef(onMessage);
  ref.current = onMessage;
  useEffect(() => bridge.subscribe((m) => ref.current(m)), []);
}
