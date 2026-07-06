import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "../cloudflare-context";
import { oneTap, openAPI, magicLink, anonymous } from "better-auth/plugins";
import { getDB } from "../database";
import * as schema from "../database/schema";
import { APP_NAME, APP_EMAIL, NEXT_PUBLIC_BASE_URL } from "../config/site";
import { getEnv } from "../env";

async function authBuilder() {
  // CF context is only available inside a Worker/edge request — fall back gracefully in dev
  let cf: Record<string, unknown> = {};
  let kv: any | undefined;
  try {
    const ctx = getCloudflareContext();
    cf = (ctx.cf as Record<string, unknown>) ?? {};
    kv = (ctx.env as any)?.KV;
  } catch {}

  // Build social providers object only for configured providers
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

  const googleClientId = getEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  if (googleClientId && googleClientSecret &&
      googleClientId !== 'your-google-client-id.apps.googleusercontent.com' &&
      googleClientSecret !== 'your-google-client-secret') {
    socialProviders.google = { clientId: googleClientId, clientSecret: googleClientSecret };
  }

  const discordClientId = getEnv("AUTH_DISCORD_ID");
  const discordClientSecret = getEnv("AUTH_DISCORD_SECRET");
  if (discordClientId && discordClientSecret) {
    socialProviders.discord = { clientId: discordClientId, clientSecret: discordClientSecret };
  }

  const linkedinClientId = getEnv("AUTH_LINKEDIN_ID");
  const linkedinClientSecret = getEnv("AUTH_LINKEDIN_SECRET");
  if (linkedinClientId && linkedinClientSecret) {
    socialProviders.linkedin = { clientId: linkedinClientId, clientSecret: linkedinClientSecret };
  }

  return betterAuth(
    withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: true,
        cf,
        ...(kv && { kv }),
      },
      {
        baseURL: NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        database: drizzleAdapter(getDB(), {
          provider: "sqlite",
          schema,
        }),
        socialProviders,
        emailVerification: {
          sendOnSignUp: false,
          autoSignInAfterVerification: true,
        },
        plugins: [
          oneTap(),
          openAPI(),
          anonymous(),
          magicLink({
            sendMagicLink: async ({ email, url }) => {
              // Get Cloudflare context for email sending
              const ctx = getCloudflareContext();
              const env = ctx.env as any;

              // Use Cloudflare Email Service
              await fetch("https://api.mailchannels.net/tx/v1/send", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  personalizations: [
                    {
                      to: [{ email }],
                    },
                  ],
                  from: {
                    email: APP_EMAIL,
                    name: APP_NAME,
                  },
                  subject: `Sign in to ${APP_NAME}`,
                  content: [
                    {
                      type: "text/html",
                      value: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
                    },
                  ],
                }),
              });
            },
            expiresIn: 300,
            disableSignUp: false,
          }),
        ],
      },
    ),
  );
}

// Singleton — created on first request so CF context is available
let authInstance: Awaited<ReturnType<typeof authBuilder>> | null = null;

export async function initAuth() {
  if (!authInstance) {
    authInstance = await authBuilder();
  }
  return authInstance!;
}
