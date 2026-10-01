import { createAutocompleteHandler } from "search-autocomplete/server";
import { withCors, corsPreflight } from "@/lib/cors";

const handler = createAutocompleteHandler();
export const GET = withCors(handler.GET);
export const OPTIONS = corsPreflight;
