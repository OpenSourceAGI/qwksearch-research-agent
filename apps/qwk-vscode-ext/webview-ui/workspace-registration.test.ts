import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("webview-ui workspace registration", () => {
  it("is listed in the root package.json workspaces so `bun install` sets up its devDependencies", () => {
    const rootPackageJson = JSON.parse(
      readFileSync(resolve(repoRoot, "package.json"), "utf-8"),
    );

    expect(rootPackageJson.workspaces).toContain(
      "apps/qwk-vscode-ext/webview-ui",
    );
  });

  it("can resolve @vitejs/plugin-react, which vite.config.ts imports", () => {
    const require = createRequire(import.meta.url);

    expect(() => require.resolve("@vitejs/plugin-react")).not.toThrow();
  });
});
