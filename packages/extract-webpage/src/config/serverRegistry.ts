import configManager from "./index";
import type { ConfigModelProvider } from "./types";

export const getConfiguredModelProviders = (): ConfigModelProvider[] => {
  return configManager.getConfig("modelProviders", []);
};

export const getConfiguredModelProviderById = (
  id: string,
): ConfigModelProvider | undefined => {
  return getConfiguredModelProviders().find((p) => p.id === id) ?? undefined;
};

export const getSearxngURL = () =>
  configManager.getConfig("search.searxngURL", "");

export const getTavilyApiKey = () =>
  configManager.getConfig("search.tavilyApiKey", "");

export const getSourceScrapeCount = (): number =>
  parseInt(configManager.getConfig("search.sourceScrapeCount", "3"), 10) || 3;

export const getSourceScrapeTimeout = (): number =>
  parseInt(configManager.getConfig("search.sourceScrapeTimeout", "5"), 10) || 5;
