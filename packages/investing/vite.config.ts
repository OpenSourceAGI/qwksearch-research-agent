import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "terser",
    lib: {
      // Multi-entry: the barrel plus every subpath declared in the package's
      // `exports`. The `predictos/*` entries were their own package until the
      // PredictOS core was merged in here.
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "predictos/index": resolve(__dirname, "src/predictos/index.ts"),
        "predictos/ai/index": resolve(__dirname, "src/predictos/ai/index.ts"),
        "predictos/agents/index": resolve(
          __dirname,
          "src/predictos/agents/index.ts",
        ),
        "predictos/data/kalshi": resolve(
          __dirname,
          "src/predictos/data/kalshi.ts",
        ),
        "predictos/data/polymarket": resolve(
          __dirname,
          "src/predictos/data/polymarket.ts",
        ),
        "predictos/arbitrage": resolve(__dirname, "src/predictos/arbitrage.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "js"}`,
    },
    rollupOptions: {
      external: [
        "react", "react-dom", "next",
        "axios", "csv-parse", "date-fns", "dotenv", "drizzle-orm",
        "ethers", "indicatorts", "langchain", "nanoid",
        "sec-edgar-toolkit", "xgboost_node", "zod",
        "yahoo-finance2", "node-fetch",
        // Pulled in by the merged PredictOS core
        "@polymarket/clob-client",
        // Optional peer deps used only by the x402 Solana payment path
        // (imported dynamically via variable specifiers).
        "@solana/web3.js", "@solana/spl-token", "bs58",
      ],
    },
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
  },
});
