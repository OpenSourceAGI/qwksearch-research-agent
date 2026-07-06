#!/usr/bin/env tsx

/**
 * CLI script to validate NVIDIA cloud free models
 *
 * Usage:
 *   tsx apps/qwksearch-web/scripts/validate-nvidia-models.ts
 *   tsx apps/qwksearch-web/scripts/validate-nvidia-models.ts --concurrency 5 --timeout 20000
 *
 * Options:
 *   --concurrency <number>  Number of concurrent tests (default: 3)
 *   --timeout <number>      Timeout per model in ms (default: 15000)
 *   --json                  Output results as JSON
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validateNvidiaModels } from "../lib/utils/validate-nvidia-models";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });

interface CliOptions {
  concurrency: number;
  timeout: number;
  json: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    concurrency: 3,
    timeout: 15000,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--concurrency" && args[i + 1]) {
      options.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--timeout" && args[i + 1]) {
      options.timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--json") {
      options.json = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log("=== NVIDIA Cloud Free Models Validator ===\n");

  // Debug: Check if the API key is loaded
  console.log(`Environment check: NVIDIA_API_KEY is ${process.env.NVIDIA_API_KEY ? 'present' : 'missing'}`);

  if (!process.env.NVIDIA_API_KEY) {
    console.error("ERROR: NVIDIA_API_KEY not found in environment");
    console.error(
      "Please add your NVIDIA API key to apps/qwksearch-web/.env"
    );
    console.error("Get your free API key at: https://build.nvidia.com/settings/api-keys");
    process.exit(1);
  }

  console.log(`Testing with concurrency: ${options.concurrency}`);
  console.log(`Timeout per model: ${options.timeout}ms\n`);

  const progressBar = !options.json;

  const result = await validateNvidiaModels(
    options.concurrency,
    options.timeout,
    progressBar
      ? (current, total, modelName) => {
          // Progress is logged in the function itself
        }
      : undefined
  );

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\n=== Validated Models for Guest/New User Access ===");
    console.log(
      "\nThese models should be included in the guest-accessible list:"
    );
    result.availableModels.forEach((m) => {
      console.log(`  "${m.modelId}",  // ${m.modelName}`);
    });

    if (result.unavailableModels.length > 0) {
      console.log(
        "\n⚠️  These models are currently NOT working and should be excluded:"
      );
      result.unavailableModels.forEach((m) => {
        console.log(`  "${m.modelId}",  // ${m.modelName} - ${m.error}`);
      });
    }

    console.log(
      `\n✓ Validation complete in ${(result.testDuration / 1000).toFixed(2)}s`
    );
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
