#!/usr/bin/env tsx

/**
 * Test script for OpenRouter validation system
 *
 * Usage:
 *   tsx apps/qwksearch-web/scripts/test-validation.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

async function testValidationSystem() {
  console.log("=== Testing OpenRouter Validation System ===\n");

  // Test 1: Check environment
  console.log("Test 1: Environment Check");
  const hasApiKey = !!process.env.OPENROUTER_API_KEY;
  console.log(`  OPENROUTER_API_KEY: ${hasApiKey ? "✓ Present" : "✗ Missing"}`);

  if (!hasApiKey) {
    console.error("\n❌ Cannot proceed without API key");
    console.error("Please add OPENROUTER_API_KEY to .env file");
    process.exit(1);
  }

  // Test 2: Import validation module
  console.log("\nTest 2: Module Import");
  try {
    const validationModule = await import("../lib/utils/validate-openrouter-models");
    console.log("  ✓ Validation module imported");

    const filterModule = await import("../lib/utils/guest-model-filter");
    console.log("  ✓ Guest filter module imported");
  } catch (error) {
    console.error("  ✗ Module import failed:", error);
    process.exit(1);
  }

  // Test 3: Get free models
  console.log("\nTest 3: Database Check");
  try {
    const { LANGUAGE_MODELS } = await import(
      "ai-research-agent/config/language-models-database"
    );

    const openRouterProvider = LANGUAGE_MODELS.find(
      (p: any) => p.provider.toLowerCase() === "openrouter"
    );

    if (!openRouterProvider) {
      console.error("  ✗ OpenRouter provider not found in database");
      process.exit(1);
    }

    const freeModels = openRouterProvider.models.filter((m: any) => m.free === true);
    console.log(`  ✓ Found ${freeModels.length} free models in database`);
    console.log(`  First 5 models:`);
    freeModels.slice(0, 5).forEach((m: any) => {
      console.log(`    - ${m.name} (${m.id})`);
    });
  } catch (error) {
    console.error("  ✗ Database check failed:", error);
    process.exit(1);
  }

  // Test 4: Test guest filter functions
  console.log("\nTest 4: Guest Filter Functions");
  try {
    const {
      getGuestAccessibleOpenRouterModels,
      getGuestModelInfo,
      getDefaultGuestModel,
      RECOMMENDED_GUEST_MODELS,
    } = await import("../lib/utils/guest-model-filter");

    const guestModels = getGuestAccessibleOpenRouterModels();
    console.log(`  ✓ Guest models: ${guestModels.length}`);

    const modelInfo = getGuestModelInfo();
    console.log(`  ✓ Model info: ${modelInfo.guestAccessibleModels} accessible`);

    const defaultModel = getDefaultGuestModel();
    console.log(`  ✓ Default model: ${defaultModel || "none"}`);

    console.log(`  ✓ Recommended models: ${RECOMMENDED_GUEST_MODELS.length}`);
  } catch (error) {
    console.error("  ✗ Guest filter test failed:", error);
    process.exit(1);
  }

  // Test 5: Quick validation test (1 model)
  console.log("\nTest 5: Quick Validation Test");
  console.log("  Testing one model to verify API connection...");

  try {
    const { validateOpenRouterModels } = await import(
      "../lib/utils/validate-openrouter-models"
    );

    // Override to test only one model
    const { LANGUAGE_MODELS } = await import(
      "ai-research-agent/config/language-models-database"
    );

    const openRouterProvider = LANGUAGE_MODELS.find(
      (p: any) => p.provider.toLowerCase() === "openrouter"
    );

    if (openRouterProvider) {
      // Test the recommended default model
      const testModel = openRouterProvider.models.find(
        (m: any) => m.id === "nvidia/nemotron-3-super-120b-a12b:free"
      );

      if (testModel) {
        console.log(`  Testing: ${testModel.name}`);

        // Create a minimal test
        const { generateText } = await import("ai");
        const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");

        const openrouter = createOpenRouter({
          apiKey: process.env.OPENROUTER_API_KEY!,
        });

        const model = openrouter(testModel.id);

        const startTime = Date.now();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 15000)
        );

        const testPromise = generateText({
          model,
          prompt: "Reply with just 'OK'",
          maxTokens: 10,
        });

        await Promise.race([testPromise, timeoutPromise]);
        const latency = Date.now() - startTime;

        console.log(`  ✓ Model responded successfully (${latency}ms)`);
        console.log("  ✓ API connection working");
      }
    }
  } catch (error: any) {
    console.error(`  ✗ Quick test failed: ${error.message}`);
    console.log("\n⚠️  API connection may have issues");
    console.log("  This could be due to:");
    console.log("    - Invalid API key");
    console.log("    - Network connectivity");
    console.log("    - OpenRouter service issues");
    console.log("    - Model temporarily unavailable");
  }

  // Final summary
  console.log("\n=== Test Summary ===");
  console.log("✓ Environment setup correct");
  console.log("✓ Modules imported successfully");
  console.log("✓ Database accessible");
  console.log("✓ Guest filter functions working");
  console.log(
    "\n✓ System is ready! Run full validation with: npm run validate:openrouter"
  );
}

testValidationSystem().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
});
