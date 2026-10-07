import { Container } from "@cloudflare/containers";

interface Env {
  SEARXNG: DurableObjectNamespace<SearxngContainer>;
  /** Optional shared secret; if set, requests must send `Authorization: Bearer <token>` or `?token=`. */
  API_TOKEN?: string;
}

/**
 * SearXNG Python container. Cold-starts on the first request and is stopped
 * after 1 minute without traffic, so you only pay for active time.
 */
export class SearxngContainer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "1m";
  envVars = { SEARXNG_BASE_URL: "http://localhost:8080" };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (env.API_TOKEN) {
      const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if ((bearer ?? url.searchParams.get("token")) !== env.API_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }
      url.searchParams.delete("token");
    }

    // Single shared instance: every request hits the same container.
    const container = env.SEARXNG.getByName("searxng");
    // startAndWaitForPorts is implicit in fetch(); retry once for slow cold starts.
    const proxied = new Request(url, request);
    try {
      return await container.fetch(proxied);
    } catch {
      await container.startAndWaitForPorts({ ports: 8080 });
      return container.fetch(new Request(url, request));
    }
  },
};
