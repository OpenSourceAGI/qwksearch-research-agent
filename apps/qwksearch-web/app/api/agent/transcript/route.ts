import { createTranscriptHandler } from "research-agent-ui/api";
import { getCloudflareContext } from "@/lib/cloudflare-context";

const handler = createTranscriptHandler({ getCloudflareContext });
export const { POST } = handler;
