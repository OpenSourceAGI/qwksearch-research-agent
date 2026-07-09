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
      // FedCM must stay enabled: with it opted out, Chrome's third-party
      // cookie blocking makes the gsi/status check fail (CORS), so the One
      // Tap prompt renders but Google never issues the ID-token credential.
      // The /one-tap/callback then never runs and no session cookie is set,
      // which is why sign-in appeared to work but didn't survive a refresh.
      additionalOptions: {
        use_fedcm_for_prompt: true,
      },
    }),
    magicLinkClient(),
    cloudflareClient(),
    anonymousClient(),
  ],
});
