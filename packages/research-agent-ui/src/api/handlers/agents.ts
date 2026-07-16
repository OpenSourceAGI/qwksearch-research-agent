import { eq } from "drizzle-orm";
import type { AgentsDeps } from "../types";

export function createAgentsHandler(deps: AgentsDeps) {
  const POST = async (req: Request): Promise<Response> => {
    let params: any;
    try {
      params = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON input" }, { status: 500 });
    }

    params.ip =
      (req as any).headers?.get?.("x-forwarded-for") ||
      (req as any).headers?.get?.("x-real-ip") ||
      "unknown";

    const db = deps.getDB();
    const userId = await deps.getUserId();
    let user = null;

    if (userId) {
      user = await db.query.user.findFirst({
        where: eq(deps.userSchema.id, userId),
      });
    }

    if (user) {
      params.apiKey = user.settings?.providerApiKeys?.find(
        (key: any) => key.provider == params.provider,
      )?.key;
    }

    if (!params.apiKey) {
      params.apiKey =
        params.provider == "groq" ? deps.getEnv("GROQ_API_KEY") : false;
    }

    if (!params.apiKey) {
      return Response.json({ error: "API key is required" }, { status: 500 });
    }

    return Response.json(
      {
        error:
          "Language generation endpoint is deprecated. Please use /api/agent/chat instead.",
      },
      { status: 501 },
    );
  };

  return { POST };
}
