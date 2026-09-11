/**
 * BlockRun AI Client for PredictOS
 *
 * Provides access to 20+ LLM providers (OpenAI, Anthropic, xAI, Google, DeepSeek, etc.)
 * via x402 micropayments. No API keys required - wallet-based pay-per-request.
 *
 * Key benefits:
 * - No API key management: Users bring their own wallet
 * - Cost transparency: Pay exactly what you use with on-chain micropayments
 * - Privacy/self-custody: Keys never leave the user's machine
 *
 * @see https://blockrun.ai
 */

import { Wallet } from "ethers";
import type {
  BlockRunRequestPayload,
  BlockRunResponseResult,
  BlockRunPaymentRequirements,
} from "./types.js";
import { fetchWithTimeout, isRetryableError, sleep } from "./http.js";

// BlockRun API endpoint
const BLOCKRUN_API_URL = "https://blockrun.ai/api/v1/chat/completions";

// EIP-3009 TransferWithAuthorization types for EIP-712 signing
const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

// Supported BlockRun models - prefix with provider for clarity
export const BLOCKRUN_MODELS = {
  // OpenAI models
  "blockrun/gpt-4o": "openai/gpt-4o",
  "blockrun/gpt-4o-mini": "openai/gpt-4o-mini",
  "blockrun/gpt-4.1": "openai/gpt-4.1",
  "blockrun/gpt-5": "openai/gpt-5",
  "blockrun/o1": "openai/o1",
  "blockrun/o3-mini": "openai/o3-mini",
  // Anthropic models
  "blockrun/claude-sonnet-4": "anthropic/claude-sonnet-4",
  "blockrun/claude-opus-4": "anthropic/claude-opus-4",
  "blockrun/claude-haiku": "anthropic/claude-3-5-haiku-latest",
  // xAI models
  "blockrun/grok-3": "xai/grok-3",
  "blockrun/grok-3-fast": "xai/grok-3-fast",
  "blockrun/grok-3-mini": "xai/grok-3-mini",
  // Google models
  "blockrun/gemini-2.5-pro": "google/gemini-2.5-pro-preview-06-05",
  "blockrun/gemini-2.5-flash": "google/gemini-2.5-flash-preview-05-20",
  // DeepSeek models
  "blockrun/deepseek-chat": "deepseek/deepseek-chat",
  "blockrun/deepseek-reasoner": "deepseek/deepseek-reasoner",
  // Qwen models
  "blockrun/qwen-max": "qwen/qwen-max",
  "blockrun/qwen-plus": "qwen/qwen-plus",
} as const;

/** Options for {@link callBlockRunResponses}. */
export interface BlockRunCallOptions {
  /** Base-chain wallet private key; falls back to `process.env.BLOCKRUN_WALLET_KEY`. */
  walletKey?: string;
}

/**
 * Check if a model name is a BlockRun model
 */
export function isBlockRunModel(model: string): boolean {
  return model.startsWith("blockrun/") || model in BLOCKRUN_MODELS;
}

/**
 * Get the actual model ID for BlockRun API
 */
function getBlockRunModelId(model: string): string {
  // If it's an alias, resolve it
  if (model in BLOCKRUN_MODELS) {
    return BLOCKRUN_MODELS[model as keyof typeof BLOCKRUN_MODELS];
  }
  // If it already has provider prefix (e.g., "openai/gpt-4o"), use as-is
  if (model.includes("/")) {
    return model;
  }
  // Otherwise, try to infer provider or use as-is
  return model;
}

/**
 * Generate a random 32-byte nonce as hex string
 */
function createNonce(): `0x${string}` {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `0x${Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Create and sign an x402 payment header for BlockRun (Base mainnet)
 */
async function createBlockRunPaymentHeader(
  privateKey: string,
  paymentRequirements: BlockRunPaymentRequirements,
  resourceUrl: string,
): Promise<string> {
  console.log("[BlockRun] Creating x402 payment header for Base mainnet...");

  const wallet = new Wallet(privateKey);
  const fromAddress = wallet.address;

  console.log("[BlockRun] Wallet address:", fromAddress);

  // Create authorization
  const nonce = createNonce();
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 600; // 10 minutes before
  const validBefore = now + (paymentRequirements.maxTimeoutSeconds || 300);

  const authorization = {
    from: fromAddress,
    to: paymentRequirements.payTo,
    value: paymentRequirements.amount || paymentRequirements.maxAmountRequired || "0",
    validAfter: validAfter.toString(),
    validBefore: validBefore.toString(),
    nonce,
  };

  // Get EIP-712 domain parameters from payment requirements
  const extra = paymentRequirements.extra || { name: "USD Coin", version: "2" };
  const chainId = 8453; // Base mainnet

  const domain = {
    name: extra.name || "USD Coin",
    version: extra.version || "2",
    chainId,
    verifyingContract: paymentRequirements.asset,
  };

  // Sign the authorization
  const signature = await wallet.signTypedData(
    domain,
    EIP712_TYPES,
    {
      from: fromAddress,
      to: paymentRequirements.payTo,
      value: BigInt(paymentRequirements.amount || paymentRequirements.maxAmountRequired || "0"),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    },
  );

  console.log("[BlockRun] Payment signature created");

  // Create payment payload (x402 v2 format)
  const paymentPayload = {
    x402Version: paymentRequirements.x402Version || 2,
    resource: {
      url: resourceUrl,
      description: "BlockRun AI Chat Completion",
      mimeType: "application/json",
    },
    accepted: {
      scheme: paymentRequirements.scheme || "exact",
      network: paymentRequirements.network,
      asset: paymentRequirements.asset,
      amount: paymentRequirements.amount || paymentRequirements.maxAmountRequired || "0",
      payTo: paymentRequirements.payTo,
      maxTimeoutSeconds: paymentRequirements.maxTimeoutSeconds || 300,
      extra: paymentRequirements.extra || {},
    },
    payload: {
      authorization,
      signature,
    },
  };

  // Base64 encode the payment header
  const paymentHeader = btoa(JSON.stringify(paymentPayload));

  return paymentHeader;
}

/**
 * Parse USDC amount from atomic units to human-readable
 */
function formatUsdcCost(atomicUnits: string): string {
  try {
    const amount = BigInt(atomicUnits);
    const dollars = Number(amount) / 1_000_000; // USDC has 6 decimals
    return `$${dollars.toFixed(6)}`;
  } catch {
    return "Unknown";
  }
}

/**
 * Call BlockRun AI with x402 micropayment.
 *
 * @param message User message to send
 * @param systemPrompt System prompt for the AI
 * @param responseFormat Response format type (e.g., "json_object")
 * @param model BlockRun model to use (e.g., "blockrun/gpt-4o", "blockrun/claude-sonnet-4")
 * @param maxRetries Maximum number of retries on failure
 * @param enableSearch Enable xAI Live Search (for Grok models only)
 * @param options Optional wallet key (falls back to `BLOCKRUN_WALLET_KEY`)
 * @returns BlockRun response result with usage and cost tracking
 */
export async function callBlockRunResponses(
  message: string,
  systemPrompt: string,
  responseFormat: string,
  model: string = "blockrun/gpt-4o",
  maxRetries: number = 3,
  enableSearch: boolean = false,
  options: BlockRunCallOptions = {},
): Promise<BlockRunResponseResult> {
  const walletKey = options.walletKey ?? process.env.BLOCKRUN_WALLET_KEY;
  if (!walletKey) {
    throw new Error(
      "BLOCKRUN_WALLET_KEY environment variable is not set. " +
      "BlockRun uses wallet-based micropayments instead of API keys. " +
      "Set your Base chain private key (0x-prefixed hex) to use BlockRun.",
    );
  }

  // Resolve model alias to actual model ID
  const actualModel = getBlockRunModelId(model);
  console.log("[BlockRun] Using model:", actualModel);

  // Build request payload (OpenAI-compatible format)
  const payload: BlockRunRequestPayload = {
    model: actualModel,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
    // Enable JSON mode if requested
    ...(responseFormat === "json_object" && {
      response_format: { type: "json_object" },
    }),
    // Enable xAI Live Search for Grok models
    ...(enableSearch && actualModel.startsWith("xai/") && {
      search: true,
    }),
  };

  let lastError: Error | null = null;
  let paymentCost: string | undefined;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Step 1: Make initial request to get 402 Payment Required
      console.log("[BlockRun] Making request (attempt", attempt + 1, ")...");

      const initialResponse = await fetchWithTimeout(
        BLOCKRUN_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        120000,
      );

      // If not 402, handle as regular response or error
      if (initialResponse.status !== 402) {
        if (initialResponse.ok) {
          // Free request or already paid (shouldn't happen with BlockRun)
          const rawResponse = (await initialResponse.json()) as Record<string, unknown>;
          return transformToResponseResult(rawResponse, paymentCost);
        }

        const errorText = await initialResponse.text();
        const error = new Error(
          `BlockRun API error: ${initialResponse.status} ${initialResponse.statusText} - ${errorText}`,
        );

        // Don't retry on client errors (4xx) except for 429 (rate limit)
        if (initialResponse.status >= 400 && initialResponse.status < 500 && initialResponse.status !== 429) {
          throw error;
        }

        lastError = error;
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`[BlockRun] Error (attempt ${attempt + 1}), retrying in ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        }
        throw error;
      }

      // Step 2: Parse payment requirements from 402 response
      const paymentRequiredHeader = initialResponse.headers.get("payment-required");
      if (!paymentRequiredHeader) {
        throw new Error("BlockRun returned 402 but no payment-required header found");
      }

      let paymentRequirements: BlockRunPaymentRequirements;
      try {
        const decoded = atob(paymentRequiredHeader);
        const parsed = JSON.parse(decoded);
        // Find Base network payment option
        const accepts = parsed.accepts || [parsed];
        const baseOption = accepts.find((a: BlockRunPaymentRequirements) =>
          a.network === "eip155:8453" || a.network === "base"
        );
        if (!baseOption) {
          throw new Error("BlockRun does not accept Base network payments");
        }
        paymentRequirements = baseOption;
        paymentRequirements.x402Version = parsed.x402Version || 2;
      } catch (parseError) {
        throw new Error(`Failed to parse payment requirements: ${parseError}`);
      }

      paymentCost = formatUsdcCost(
        paymentRequirements.amount || paymentRequirements.maxAmountRequired || "0"
      );
      console.log("[BlockRun] Payment required:", paymentCost);

      // Step 3: Create and sign payment
      const paymentHeader = await createBlockRunPaymentHeader(
        walletKey,
        paymentRequirements,
        BLOCKRUN_API_URL,
      );

      // Step 4: Retry request with payment signature
      console.log("[BlockRun] Making paid request...");

      const paidResponse = await fetchWithTimeout(
        BLOCKRUN_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "PAYMENT-SIGNATURE": paymentHeader,
          },
          body: JSON.stringify(payload),
        },
        120000,
      );

      if (!paidResponse.ok) {
        const errorText = await paidResponse.text();
        const error = new Error(
          `BlockRun payment failed: ${paidResponse.status} ${paidResponse.statusText} - ${errorText}`,
        );

        if (paidResponse.status >= 400 && paidResponse.status < 500 && paidResponse.status !== 429) {
          throw error;
        }

        lastError = error;
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`[BlockRun] Payment error (attempt ${attempt + 1}), retrying in ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        }
        throw error;
      }

      // Step 5: Parse successful response
      const rawResponse = (await paidResponse.json()) as Record<string, unknown>;
      console.log("[BlockRun] Request successful, cost:", paymentCost);

      return transformToResponseResult(rawResponse, paymentCost);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error) && attempt === 0) {
        throw lastError;
      }

      if (attempt >= maxRetries) {
        throw lastError;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.warn(
        `[BlockRun] Network error (attempt ${attempt + 1}): ${lastError.message}. Retrying in ${backoffMs}ms...`,
      );
      await sleep(backoffMs);
    }
  }

  throw lastError || new Error("Unknown error occurred");
}

/**
 * Transform OpenAI-compatible response to PredictOS format
 */
function transformToResponseResult(
  response: Record<string, unknown>,
  paymentCost?: string,
): BlockRunResponseResult {
  const choices = (response.choices as Array<{
    message?: { content?: string; role?: string };
    index?: number;
    finish_reason?: string;
  }>) || [];

  const usage = (response.usage as {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  }) || {};

  // Extract text from first choice
  const outputText = choices[0]?.message?.content || "";

  // Build response in PredictOS format (similar to OpenAI/Grok response structure)
  return {
    created_at: (response.created as number) || Math.floor(Date.now() / 1000),
    id: (response.id as string) || `blockrun-${Date.now()}`,
    model: (response.model as string) || "unknown",
    object: "response",
    output: [
      {
        content: [
          {
            type: "output_text",
            text: outputText,
          },
        ],
        id: `msg-${Date.now()}`,
        role: "assistant",
        type: "message",
        status: "completed",
      },
    ],
    temperature: null,
    top_p: null,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    },
    status: "completed",
    // BlockRun-specific fields
    blockrun: {
      paymentCost,
      citations: (response.citations as string[]) || undefined,
    },
  };
}

/**
 * List available BlockRun models.
 * This is a convenience function - actual model list from BlockRun API.
 */
export async function listBlockRunModels(): Promise<Array<{
  id: string;
  name: string;
  provider: string;
  description: string;
}>> {
  try {
    const response = await fetch("https://blockrun.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("[BlockRun] Failed to fetch models, using defaults");
      return getDefaultModelList();
    }

    const data = (await response.json()) as {
      data?: Record<string, unknown>[];
      models?: Record<string, unknown>[];
    };
    return (data.data || data.models || []).map((m: Record<string, unknown>) => ({
      id: `blockrun/${m.id}`,
      name: (m.name as string) || (m.id as string),
      provider: (m.provider as string) || "unknown",
      description: (m.description as string) || "",
    }));
  } catch {
    console.warn("[BlockRun] Error fetching models, using defaults");
    return getDefaultModelList();
  }
}

function getDefaultModelList() {
  return Object.entries(BLOCKRUN_MODELS).map(([alias, modelId]) => {
    const [provider, name] = modelId.split("/");
    return {
      id: alias,
      name: name,
      provider: provider,
      description: `${provider} ${name} via BlockRun x402`,
    };
  });
}
