/**
 * @fileoverview Module aliases that let qwksearch-web import the LobeChat
 * engine's own source from `apps/qwk-in-lobe` (built-in tools, prompts, MCP
 * client) instead of keeping copies of it.
 *
 * Shared by `vite.config.ts` and `vitest.config.ts`, so it may only use Node
 * built-ins.
 *
 * - `qwk-in-lobe/*` points into the app's source tree.
 * - `@lobechat/prompts` points at the search prompts only: the package index
 *   pulls in every prompt LobeChat has, along with its database types.
 * - `@lobechat/types` points at the one module whose values (`BaseExecutor`)
 *   the imported tools use at runtime; every other import from it is a type.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const lobeRoot = resolve(appRoot, "../qwk-in-lobe");

export const lobeAliases: Record<string, string> = {
  "qwk-in-lobe": lobeRoot,
  "@lobechat/prompts": resolve(lobeRoot, "packages/prompts/src/prompts/search/index.ts"),
  "@lobechat/types": resolve(lobeRoot, "packages/types/src/tool/builtin.ts"),
};

/** Third-party packages the imported lobe source needs, resolved from this app. */
export const lobeDedupe = [
  "@modelcontextprotocol/sdk",
  "@thi.ng/base-n",
  "dayjs",
  "debug",
  "lucide-react",
  "mathjs",
  "nerdamer-prime",
  "zod",
];
