/**
 * Build-time smoke test: verify the OOMOL SDK imports, client constructs, and routes register.
 * Run with: npm run build (from the connectors directory)
 */

import { ProjectConnector, ConnectorError } from "@oomol-lab/connector";

const p = new ProjectConnector({ apiKey: "oo_proj_smoke" });
const u = p.forUser("user_1");

// Verify ProjectConnector and UserConnector have expected methods
for (const [obj, keys] of [
  [
    p,
    [
      "connect",
      "getConnectionRequest",
      "waitForConnection",
      "execute",
      "executeRaw",
      "forUser",
    ],
  ],
  [u, ["connect", "execute", "executeRaw", "waitForConnection"]],
] as const) {
  for (const k of keys) {
    const val = (obj as any)[k];
    if (typeof val !== "function" && typeof val !== "object") {
      throw new Error(`missing ${k} on ${obj.constructor.name}`);
    }
  }
}

// Verify ConnectorError is exported
if (typeof ConnectorError !== "function") {
  throw new Error("missing ConnectorError class");
}

// Boot the server without a listener conflict, then exit.
process.env.PORT = "0";
await import("./server.js");

console.log("✓ OOMOL Connector smoke test passed");
setTimeout(() => process.exit(0), 300);
