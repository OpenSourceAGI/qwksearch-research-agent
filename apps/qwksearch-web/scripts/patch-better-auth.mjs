// Workaround for https://github.com/better-auth/better-auth/issues/3945
// @better-auth/core@1.6.x exports ./instrumentation with a "workerd" condition
// pointing to pure.index.mjs, but that file is missing from the published package.
// opennext-cloudflare builds with the workerd esbuild condition, causing a build failure.
// Run this AFTER opennextjs-cloudflare build so the .open-next tree exists to patch.
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
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
  if (!existsSync(instrDir)) {
    mkdirSync(instrDir, { recursive: true });
  }
  if (!existsSync(target)) {
    writeFileSync(target, STUB);
    console.log("[patch-better-auth] created", target);
  }
}

function patchBunStore(bunStoreDir) {
  if (!existsSync(bunStoreDir)) return;
  for (const entry of readdirSync(bunStoreDir)) {
    if (!entry.startsWith("@better-auth+core@")) continue;
    patchDir(
      join(bunStoreDir, entry, "node_modules/@better-auth/core/dist/instrumentation")
    );
  }
}

// Patch bun store in .next/standalone (Next.js output)
patchBunStore(join(process.cwd(), ".next/standalone/node_modules/.bun"));

// Patch bun store in .open-next (opennextjs-cloudflare output — must run after the build)
patchBunStore(join(process.cwd(), ".open-next/server-functions/default/node_modules/.bun"));

// Also patch the flat node_modules path (covers direct resolution during esbuild)
patchDir(join(process.cwd(), "node_modules/@better-auth/core/dist/instrumentation"));
