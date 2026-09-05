/** `ws` shim: the platform WebSocket client is used; a server is not supported. */
export const WebSocket = globalThis.WebSocket;
export class WebSocketServer {
  constructor() {
    throw new Error('[lobehub-workers] ws.WebSocketServer is not available on Cloudflare Workers');
  }
}
export const Server = WebSocketServer;
export default WebSocket;
