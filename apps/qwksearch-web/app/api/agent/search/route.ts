import { createSearchHandler } from "research-agent-ui/api";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createSearchHandler({ searxngDomain: "https://search.qwksearch.com" });
export const GET = withCors(handler.GET);
export const OPTIONS = corsPreflight;
