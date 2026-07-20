/**
 * OpenConnector Integration for OOMOL SaaS
 *
 * Multi-tenant connector platform for OAuth & credential management.
 * Allows users to link external accounts (Gmail, Slack, GitHub, Airtable, etc.)
 * securely managed by OOMOL Cloud.
 *
 * @module connectors
 * @see {@link https://connector.oomol.com}
 * @example
 * ```ts
 * import { ProjectConnector } from "chat-agent-toolkit/connectors";
 *
 * const project = new ProjectConnector({
 *   apiKey: process.env.OOMOL_PROJECT_API_KEY,
 * });
 *
 * const user = project.forUser(userId);
 * const oauth = await user.connect.oauth({
 *   service: "gmail",
 *   returnUri: "https://myapp.com/oauth-callback",
 * });
 * ```
 */

// Re-export OOMOL Connector SDK types and classes
export type {
  ConnectorError as OOMOLConnectorError,
  ProjectConnector as OOMOLProjectConnector,
} from "@oomol-lab/connector";
export { ConnectorError, ProjectConnector } from "@oomol-lab/connector";

// Catalog data: 900+ integrated providers with OAuth/API-key support
import catalogJson from "./catalog.json";
import providerIndexJson from "./openconnector-providers-index.json";

export type CatalogProvider = {
  service: string;
  displayName: string;
  categories: string[];
  authTypes: ("oauth2" | "api_key" | "custom_credential" | "no_auth")[];
  actionCount: number;
};

export type ProviderIndexEntry = CatalogProvider & {
  homepageUrl?: string;
  actions?: string[];
};

/**
 * Lightweight provider catalog (basic info: service, display name, auth types).
 * ~900 providers, fast catalog search and picker UI.
 */
export const catalog: CatalogProvider[] = catalogJson as CatalogProvider[];

/**
 * Detailed provider index with action lists and metadata.
 * Use for deep integration: listing available actions, mapping capabilities.
 */
export const providerIndex: ProviderIndexEntry[] =
  providerIndexJson as ProviderIndexEntry[];

/**
 * Search the catalog by service name or display name.
 * @param query Search term (case-insensitive)
 * @param limit Max results
 * @returns Matching providers
 */
export function searchCatalog(query: string, limit = 100): CatalogProvider[] {
  const q = query.toLowerCase();
  return catalog
    .filter(
      (p) =>
        p.service.toLowerCase().includes(q) ||
        p.displayName.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/**
 * Get a provider by service ID.
 * @param serviceId The provider's service identifier (e.g., "gmail", "slack")
 * @returns Provider info or undefined
 */
export function getCatalogProvider(serviceId: string): CatalogProvider | undefined {
  return catalog.find((p) => p.service === serviceId);
}

/**
 * Get detailed provider info including actions.
 * @param serviceId The provider's service identifier
 * @returns Detailed provider entry or undefined
 */
export function getProviderDetails(serviceId: string): ProviderIndexEntry | undefined {
  return providerIndex.find((p) => p.service === serviceId);
}

/**
 * Filter catalog by authentication type.
 * @param authType The auth type to filter by
 * @returns Providers supporting this auth type
 */
export function getCatalogByAuthType(
  authType: "oauth2" | "api_key" | "custom_credential" | "no_auth"
): CatalogProvider[] {
  return catalog.filter((p) => p.authTypes.includes(authType));
}

/**
 * Filter catalog by category.
 * @param category The category to filter by (e.g., "Communication", "Productivity")
 * @returns Providers in this category
 */
export function getCatalogByCategory(category: string): CatalogProvider[] {
  return catalog.filter((p) => p.categories.includes(category));
}

/**
 * Get all unique categories in the catalog.
 * @returns Sorted list of category names
 */
export function getCatalogCategories(): string[] {
  const categories = new Set<string>();
  catalog.forEach((p) => p.categories.forEach((c) => categories.add(c)));
  return Array.from(categories).sort();
}

export type { Express } from "express";
