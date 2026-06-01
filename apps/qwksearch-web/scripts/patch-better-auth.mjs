// Workaround for https://github.com/better-auth/better-auth/issues/3945
// @better-auth/core@1.6.x exports ./instrumentation with a "workerd" condition
// pointing to pure.index.mjs, but that file is missing from some published versions.
// opennext-cloudflare builds with the workerd esbuild condition, causing a build failure.
// Run this BEFORE opennextjs-cloudflare build so all copies are patched before esbuild.
import { existsSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const appDir = process.cwd();
// Monorepo root is two levels up from apps/qwksearch-web
const repoRoot = join(__dirname, "../../..");

// Patch all @better-auth/core installs in source node_modules BEFORE the build
// so that opennextjs-cloudflare copies the patched files into .open-next

// App-level bun store
patchBunStore(join(appDir, "node_modules/.bun"));
// Monorepo root bun store (where bun deduplicates packages)
patchBunStore(join(repoRoot, "node_modules/.bun"));

// Flat node_modules paths at both levels
patchDir(join(appDir, "node_modules/@better-auth/core/dist/instrumentation"));
patchDir(join(repoRoot, "node_modules/@better-auth/core/dist/instrumentation"));

// Nested install: better-auth ships its own copy of @better-auth/core in some versions
patchDir(join(appDir, "node_modules/better-auth/node_modules/@better-auth/core/dist/instrumentation"));
patchDir(join(repoRoot, "node_modules/better-auth/node_modules/@better-auth/core/dist/instrumentation"));

// Also patch any .open-next output from a previous build that may still be present
patchBunStore(join(appDir, ".next/standalone/node_modules/.bun"));
patchBunStore(join(appDir, ".open-next/server-functions/default/node_modules/.bun"));
patchDir(join(appDir, ".open-next/server-functions/default/node_modules/@better-auth/core/dist/instrumentation"));
patchDir(join(appDir, ".open-next/server-functions/default/apps/qwksearch-web/node_modules/better-auth/node_modules/@better-auth/core/dist/instrumentation"));
