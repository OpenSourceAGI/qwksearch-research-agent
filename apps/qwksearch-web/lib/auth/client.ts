import { createAuthClient } from "better-auth/react";
import {
  oneTapClient,
  magicLinkClient,
  anonymousClient,
} from "better-auth/client/plugins";
import { cloudflareClient } from "better-auth-cloudflare/client";
import {
  NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID,
} from "../config/site";

export const authClient = createAuthClient({
  baseURL: NEXT_PUBLIC_BASE_URL,
  plugins: [
    oneTapClient({
      clientId: NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      additionalOptions: {
        use_fedcm_for_prompt: false,
      },
    }),
    magicLinkClient(),
    cloudflareClient(),
    anonymousClient(),
  ],
});
