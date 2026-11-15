import { defineConfig } from "vite";
import { builtinModules } from "module";
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
      // `exports`.
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        // Narrower entries for the subpaths declared in `exports`, so a
        // consumer that only needs quotes or Polymarket does not load the
        // whole barrel. `./constants` and `./utils` have no source yet.
        "alpaca/index": resolve(__dirname, "src/alpaca/client.ts"),
        // Fetch-only Alpaca client: safe to bundle for Cloudflare Workers.
        "alpaca/rest": resolve(__dirname, "src/alpaca/rest.ts"),
        "stocks/index": resolve(__dirname, "src/stocks/index.ts"),
        "prediction/index": resolve(__dirname, "src/prediction/index.ts"),
        "trading-agents/index": resolve(
          __dirname,
          "src/trading-agents/index.ts",
        ),
        "prediction-agent/index": resolve(__dirname, "src/prediction-agent/index.ts"),
        "prediction-agent/ai/index": resolve(__dirname, "src/prediction-agent/ai/index.ts"),
        "prediction-agent/agents/index": resolve(
          __dirname,
          "src/prediction-agent/agents/index.ts",
        ),
        "prediction-agent/data/kalshi": resolve(
          __dirname,
          "src/prediction-agent/data/kalshi.ts",
        ),
        "prediction-agent/data/polymarket": resolve(
          __dirname,
          "src/prediction-agent/data/polymarket.ts",
        ),
        "prediction-agent/arbitrage": resolve(__dirname, "src/prediction-agent/arbitrage.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "js"}`,
    },
    rollupOptions: {
      external: [
        // Node built-ins stay real imports. Without this Vite swaps `fs` and
        // `path` for empty browser shims, and module-scope calls such as
        // tv-scraper's `path.join(process.cwd(), …)` crash on import.
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        "react", "react-dom", "next",
        "axios", "csv-parse", "date-fns", "dotenv", "drizzle-orm",
        "ethers", "indicatorts", "langchain", "nanoid",
        "sec-edgar-toolkit", "xgboost_node", "zod",
        "yahoo-finance2", "node-fetch",
        // Pulled in by the merged PredictionAgent core
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
