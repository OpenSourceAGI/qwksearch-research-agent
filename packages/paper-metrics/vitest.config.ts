import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "paper-metrics",
    root: import.meta.dirname,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
