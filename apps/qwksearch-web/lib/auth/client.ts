import { createAuthClient } from "better-auth/react";
import {
  oneTapClient,
  magicLinkClient,
  anonymousClient,
} from "better-auth/client/plugins";
import {
  NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID,
} from "../config/site";

// Use the current browser origin so auth requests are always same-origin.
// The app ships its own /api/auth routes on every deployment (qwksearch.com,
// beta.qwksearch.com, preview builds, localhost), so hardcoding a single
// baseURL made requests from any other host go cross-origin and fail the CORS
// preflight (no Access-Control-Allow-Origin header). Fall back to the
// configured base URL during SSR, where `window` is undefined.
const baseURL =
  typeof window !== "undefined" ? window.location.origin : NEXT_PUBLIC_BASE_URL;

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    oneTapClient({
      clientId: NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      additionalOptions: {
        use_fedcm_for_prompt: false,
      },
    }),
    magicLinkClient(),
    anonymousClient(),
  ],
});
