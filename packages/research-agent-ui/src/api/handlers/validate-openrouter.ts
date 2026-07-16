import type { ValidateOpenRouterDeps } from "../types";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let cachedValidation: { result: any; timestamp: number } | null = null;

export function createValidateOpenRouterHandler(
  deps: ValidateOpenRouterDeps,
) {
  const GET = async (_req: Request): Promise<Response> => {
    try {
      const now = Date.now();

      if (cachedValidation && now - cachedValidation.timestamp < CACHE_TTL) {
        return Response.json({
          ...cachedValidation.result,
          cached: true,
          cacheAge: now - cachedValidation.timestamp,
        });
      }

      const result = await deps.validateOpenRouterModels();
      cachedValidation = { result, timestamp: now };

      return Response.json({ ...result, cached: false });
    } catch (error: any) {
      console.error("[validate-openrouter] GET error:", error);
      return Response.json(
        { error: error.message || "Validation failed" },
        { status: 500 },
      );
    }
  };

  const POST = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json().catch(() => ({}));
      const { concurrency = 3, timeout = 15000 } = body;

      const result = await deps.validateOpenRouterModels(concurrency, timeout);
      cachedValidation = { result, timestamp: Date.now() };

      return Response.json({ ...result, cached: false });
    } catch (error: any) {
      console.error("[validate-openrouter] POST error:", error);
      return Response.json(
        { error: error.message || "Validation failed" },
        { status: 500 },
      );
    }
  };

  return { GET, POST };
}
