/**
 * @fileoverview Mastra Telemetry & Instance Factory
 *
 * Creates configured Mastra instances with OpenTelemetry-compatible
 * tracing, logging, and agent registration.
 */

import { Mastra } from "@mastra/core";

export interface TelemetryConfig {
  serviceName: string;
  enabled?: boolean;
  sampling?: number;
  exporterUrl?: string;
}

export interface MastraInstanceConfig {
  agents?: Record<string, any>;
  workflows?: Record<string, any>;
  telemetry?: TelemetryConfig;
  storage?: any;
}

/**
 * Create a fully configured Mastra instance with agents, workflows,
 * and telemetry. Central entry point for Mastra framework setup.
 *
 * @example
 * ```ts
 * import { createMastraInstance } from "chat-agent-toolkit/mastra";
 *
 * const mastra = createMastraInstance({
 *   agents: { assistant, researcher },
 *   workflows: { researchWorkflow },
 *   telemetry: {
 *     serviceName: "my-app",
 *     enabled: true,
 *   },
 * });
 *
 * const agent = mastra.getAgent("assistant");
 * const result = await agent.generate("Hello");
 * ```
 */
export function createMastraInstance(config: MastraInstanceConfig): Mastra {
  const mastraConfig: any = {};

  if (config.agents) {
    mastraConfig.agents = config.agents;
  }

  if (config.workflows) {
    mastraConfig.workflows = config.workflows;
  }

  if (config.telemetry) {
    mastraConfig.telemetry = {
      serviceName: config.telemetry.serviceName,
      enabled: config.telemetry.enabled ?? true,
      sampling: {
        default: config.telemetry.sampling ?? 1.0,
      },
    };
  }

  if (config.storage) {
    mastraConfig.storage = config.storage;
  }

  return new Mastra(mastraConfig);
}
