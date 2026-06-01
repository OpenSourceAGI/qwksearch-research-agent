// Workaround for https://github.com/better-auth/better-auth/issues/3945
// @better-auth/core@1.6.x exports ./instrumentation with a "workerd" condition
// pointing to pure.index.mjs, but that file is missing from the published package.
// opennext-cloudflare builds with the workerd esbuild condition, causing a build failure.
// This script creates the missing stub before opennext bundles the server.
import { existsSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const STUB =
  'const ATTR_DB_COLLECTION_NAME="db.collection.name";\n' +
  'const ATTR_DB_OPERATION_NAME="db.operation.name";\n' +
  'const ATTR_HTTP_RESPONSE_STATUS_CODE="http.response.status_code";\n' +
  'const ATTR_HTTP_ROUTE="http.route";\n' +
  'const ATTR_OPERATION_ID="better_auth.operation_id";\n' +
  'const ATTR_HOOK_TYPE="better_auth.hook.type";\n' +
  'const ATTR_CONTEXT="better_auth.context";\n' +
  "function withSpan(_name,_attributes,fn){return fn();}\n" +
  "export{ATTR_CONTEXT,ATTR_DB_COLLECTION_NAME,ATTR_DB_OPERATION_NAME,ATTR_HOOK_TYPE,ATTR_HTTP_RESPONSE_STATUS_CODE,ATTR_HTTP_ROUTE,ATTR_OPERATION_ID,withSpan};\n";

function patchDir(instrDir) {
  const target = join(instrDir, "pure.index.mjs");
  if (existsSync(instrDir) && !existsSync(target)) {
    writeFileSync(target, STUB);
    console.log("[patch-better-auth] created", target);
  }
}

// Patch bun content-addressable store entries in .next/standalone
const standaloneStore = join(process.cwd(), ".next/standalone/node_modules/.bun");
if (existsSync(standaloneStore)) {
  for (const entry of readdirSync(standaloneStore)) {
    if (!entry.startsWith("@better-auth+core@")) continue;
    patchDir(
      join(standaloneStore, entry, "node_modules/@better-auth/core/dist/instrumentation")
    );
  }
}

// Also patch the flat symlink target (covers cases where opennext uses node_modules directly)
patchDir(
  join(process.cwd(), "node_modules/@better-auth/core/dist/instrumentation")
);
