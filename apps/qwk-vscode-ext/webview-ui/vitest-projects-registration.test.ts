import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("root vitest.config.mts project registration", () => {
  it("does not use the deprecated vitest.workspace.ts file", () => {
    // vitest.workspace.ts (defineWorkspace) is deprecated as of Vitest 3.2 in
    // favor of test.projects in a root vitest.config.ts/.mts. Keeping both
    // around risks the root cwd silently becoming an extra, unconfigured
    // implicit project that sweeps up test files from packages that were
    // never meant to run under the shared root config (missing aliases,
    // wrong environment, or even a different test runner like bun/jest).
    expect(existsSync(resolve(repoRoot, "vitest.workspace.ts"))).toBe(false);
  });

  it("only lists projects that exist and have their own vitest.config.ts", () => {
    const configSource = readFileSync(
      resolve(repoRoot, "vitest.config.mts"),
      "utf-8",
    );
    const projectPaths = [...configSource.matchAll(/^\s*'([^']+)',?$/gm)].map(
      (match) => match[1],
    );

    expect(projectPaths.length).toBeGreaterThan(0);

    for (const projectPath of projectPaths) {
      const projectDir = resolve(repoRoot, projectPath);
      expect(existsSync(projectDir), `${projectPath} does not exist`).toBe(
        true,
      );

      const hasOwnVitestConfig = ["vitest.config.ts", "vitest.config.mts", "vitest.config.js"].some(
        (fileName) => existsSync(resolve(projectDir, fileName)),
      );
      expect(
        hasOwnVitestConfig,
        `${projectPath} has no vitest.config.(ts|mts|js) of its own`,
      ).toBe(true);
    }
  });
});
