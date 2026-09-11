/**
 * x402 seller agent.
 *
 * Provides several actions:
 * 1. list     - List available PayAI sellers from the bazaar
 * 2. call     - Call a PayAI seller with a query (requires payment)
 * 3. health   - Check the x402 bazaar discovery health
 * 4. networks - List supported networks
 *
 * Supports both Solana and EVM (Base) networks.
 *
 * Refactored from the PredictOS `x402-seller` Supabase edge function into a
 * plain async function.
 */

import {
  listBazaarSellers,
  callX402Seller,
  checkX402Health,
  NETWORKS,
} from "../clients/x402.js";
import type {
  ListSellersRequest,
  ListSellersResponse,
  X402CallSellerRequest,
  X402CallSellerResponse,
} from "../clients/x402.js";

/** Supported actions for the x402 seller agent. */
export type X402SellerAction = "list" | "call" | "health" | "networks";

/**
 * Input for the x402 seller agent. The relevant fields depend on `action`.
 */
export interface X402SellerRequest {
  /** Which operation to perform */
  action: X402SellerAction | string;
  // list
  /** Filter by network (list) */
  network?: string;
  /** Protocol type filter (list) */
  type?: string;
  /** Pagination limit (list) */
  limit?: number;
  /** Pagination offset (list) */
  offset?: number;
  // call
  /** The seller's resource URL (call) */
  resourceUrl?: string;
  /** Query/input to send to the seller (call) */
  query?: string;
  /** Optional specific method (call) */
  method?: string;
}

/** Generic response envelope for the health/networks/error actions. */
export interface X402SellerGenericResponse {
  success: boolean;
  [key: string]: unknown;
}

/**
 * Run an x402 seller action (list, call, health, networks).
 */
export async function runX402Seller(
  input: X402SellerRequest,
): Promise<ListSellersResponse | X402CallSellerResponse | X402SellerGenericResponse> {
  const startTime = Date.now();

  const requestBody = input;
  console.log("[x402-seller] Action:", requestBody.action);

  const { action } = requestBody;

  try {
    // Route to appropriate handler
    switch (action) {
      case "health": {
        const isHealthy = await checkX402Health();

        // Include config debug info
        const discoveryUrl = process.env.X402_DISCOVERY_URL;
        const preferredNetwork = process.env.X402_PREFERRED_NETWORK;

        return {
          success: true,
          healthy: isHealthy,
          config: {
            discoveryUrl,
            preferredNetwork,
          },
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      case "list": {
        const listRequest = requestBody as ListSellersRequest & { action: string };

        try {
          const sellers = await listBazaarSellers({
            network: listRequest.network,
            type: listRequest.type || "http",
            limit: listRequest.limit,
            offset: listRequest.offset,
          });

          const response: ListSellersResponse = {
            success: true,
            sellers,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              total: sellers.length,
            },
          };

          return response;
        } catch (error) {
          console.error("[x402-seller] Error listing sellers:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to list sellers",
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              total: 0,
            },
          };
        }
      }

      case "call": {
        const callRequest = requestBody as X402CallSellerRequest & { action: string };

        // Validate required parameters
        if (!callRequest.resourceUrl) {
          return {
            success: false,
            error: "Missing required parameter: 'resourceUrl'",
          };
        }

        if (!callRequest.query) {
          return {
            success: false,
            error: "Missing required parameter: 'query'",
          };
        }

        // Default to Solana mainnet if not specified
        const network = callRequest.network || NETWORKS.SOLANA_MAINNET;

        try {
          const result = await callX402Seller(
            callRequest.resourceUrl,
            callRequest.query,
            network
          );

          const response: X402CallSellerResponse = {
            success: result.success,
            data: result.data,
            error: result.error,
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              paymentTxId: result.paymentInfo?.txId,
              costUsdc: result.paymentInfo?.cost,
              network,
            },
          };

          return response;
        } catch (error) {
          console.error("[x402-seller] Error calling seller:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to call seller",
            metadata: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              processingTimeMs: Date.now() - startTime,
              network,
            },
          };
        }
      }

      case "networks": {
        // Return available networks. Some testnet identifiers are not defined
        // on the mainnet-only NETWORKS map and therefore resolve to undefined,
        // matching the original behavior.
        const N = NETWORKS as Record<string, string | undefined>;
        return {
          success: true,
          networks: [
            { id: N.SOLANA_MAINNET, name: "Solana Mainnet", type: "solana" },
            { id: N.SOLANA_DEVNET, name: "Solana Devnet", type: "solana" },
            { id: N.BASE_MAINNET, name: "Base Mainnet", type: "evm" },
            { id: N.BASE_SEPOLIA, name: "Base Sepolia", type: "evm" },
          ],
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: '${action}'. Valid actions: 'list', 'call', 'health', 'networks'`,
        };
    }
  } catch (error) {
    console.error("[x402-seller] Unhandled error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}
