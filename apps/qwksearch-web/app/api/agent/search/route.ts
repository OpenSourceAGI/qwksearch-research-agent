import { createSearchHandler } from "research-agent-ui/api";

const handler = createSearchHandler({ searxngDomain: "https://search.qwksearch.com" });
export const { GET } = handler;
