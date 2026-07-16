import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function GET() {
  const specPath = resolve(
    process.cwd(),
    "../../packages/qwksearch-api-client/qwksearch-openapi.jsonc"
  );
  const spec = readFileSync(specPath, "utf-8");
  return new NextResponse(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
