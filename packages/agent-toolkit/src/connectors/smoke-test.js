// Build-time smoke test: verify the SDK imports, client constructs, and routes register.
import { ProjectConnector, ConnectorError } from "@oomol-lab/connector";
const p = new ProjectConnector({ apiKey: "oo_proj_smoke" });
const u = p.forUser("user_1");
for (const [obj, keys] of [
  [p, ["connect", "getConnectionRequest", "waitForConnection", "execute", "executeRaw", "forUser"]],
  [u, ["connect", "execute", "executeRaw", "waitForConnection"]],
]) for (const k of keys) if (typeof obj[k] !== "function" && typeof obj[k] !== "object") throw new Error(`missing ${k}`);
if (typeof ConnectorError !== "function") throw new Error("missing ConnectorError");
// Boot the server without a listener conflict, then exit.
process.env.PORT = "0";
await import("./server.js");
console.log("smoke test passed");
setTimeout(() => process.exit(0), 300);
