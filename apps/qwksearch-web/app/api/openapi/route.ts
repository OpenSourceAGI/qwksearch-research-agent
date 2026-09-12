import { NextResponse } from "next/server";
import spec from "qwksearch-api-client/openapi.json";
import { withCors, corsPreflight } from "@/lib/cors";

async function getOpenApiSpec() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export const GET = withCors(getOpenApiSpec, { skipApiKeyCheck: true });
export const OPTIONS = corsPreflight;
