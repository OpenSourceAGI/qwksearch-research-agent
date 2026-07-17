import { NextResponse } from "next/server";
import spec from "qwksearch-api-client/openapi.json";

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
