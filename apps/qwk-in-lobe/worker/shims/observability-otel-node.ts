/**
 * Workers replacement for `@lobechat/observability-otel/node`.
 *
 * The real module boots the OpenTelemetry Node SDK (auto-instrumentations,
 * OTLP exporters, resource detectors) which touches Node-only APIs during
 * import and generates random ids in global scope — both disallowed on
 * workerd. Trace context propagation via `@opentelemetry/api` keeps working
 * through the `/api` subpath; this stub only removes the SDK bootstrap.
 */
/** Mirrors `DiagLogLevel` from `@opentelemetry/api` without importing the package from the shim. */
export enum DiagLogLevel {
  NONE = 0,
  ERROR = 30,
  WARN = 50,
  INFO = 60,
  DEBUG = 70,
  VERBOSE = 80,
  ALL = 9999,
}

export type DetectedResourceAttributes = Record<string, string | number | boolean | undefined>;

export interface RegisterOptions {
  [key: string]: unknown;
  attributes?: DetectedResourceAttributes;
  serviceName?: string;
}

export interface NodeSDKLike {
  shutdown: () => Promise<void>;
  start: () => void;
}

export function attributesForVercel(): DetectedResourceAttributes {
  return {};
}

export function attributesForNodejs(): DetectedResourceAttributes {
  return { 'process.runtime.name': 'workerd' };
}

export function attributesForEnv(): DetectedResourceAttributes {
  return {};
}

export function attributesCommon(): DetectedResourceAttributes {
  return { 'cloud.provider': 'cloudflare', 'cloud.platform': 'cloudflare_workers' };
}

const noopSdk: NodeSDKLike = {
  shutdown: async () => undefined,
  start: () => undefined,
};

/** No-op on Workers: returns an inert SDK handle so callers can still `shutdown()`. */
export function register(_options?: RegisterOptions): NodeSDKLike {
  return noopSdk;
}

export const shutdownSafely = async (sdk: Pick<NodeSDKLike, 'shutdown'>): Promise<void> => {
  try {
    await sdk.shutdown();
  } catch {
    // ignore
  }
};
