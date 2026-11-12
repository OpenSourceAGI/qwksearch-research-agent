import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@debate-ai/paper-to-web",
    root: import.meta.dirname,
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
