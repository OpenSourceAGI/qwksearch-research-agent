/**
 * @fileoverview Utility functions for creating Yjs Websocket providers for collaboration.
 * Handles document mapping and provider initialization.
 */

import { Provider } from "@lexical/yjs";
import { WebsocketProvider } from "y-websocket";
import { Doc } from "yjs";

const isBrowser = typeof window !== 'undefined';
const url = isBrowser ? new URL(window.location.href) : null;
const params = url ? new URLSearchParams(url.search) : null;
const WEBSOCKET_ENDPOINT =
  params?.get("collabEndpoint") || "ws://localhost:1234";
const WEBSOCKET_SLUG = "playground";
const WEBSOCKET_ID = params?.get("collabId") || "0";

// parent dom -> child doc
/**
 * Creates a Websocket provider for a specific document ID.
 * @param {string} id - The document identifier.
 * @param {Map<string, Doc>} yjsDocMap - Map of document IDs to Yjs Doc instances.
 * @returns {Provider} The initialized Yjs provider.
 */
export function createWebsocketProvider(
  id: string,
  yjsDocMap: Map<string, Doc>,
): Provider {
  let doc = yjsDocMap.get(id);

  if (doc === undefined) {
    doc = new Doc();
    yjsDocMap.set(id, doc);
  } else {
    doc.load();
  }

  return createWebsocketProviderWithDoc(id, doc);
}

export function createWebsocketProviderWithDoc(id: string, doc: Doc): Provider {
  // @ts-expect-error
  return new WebsocketProvider(
    WEBSOCKET_ENDPOINT,
    WEBSOCKET_SLUG + "/" + WEBSOCKET_ID + "/" + id,
    doc,
    {
      connect: false,
    },
  );
}
