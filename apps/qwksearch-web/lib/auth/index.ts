import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { oneTap, openAPI, magicLink, anonymous } from "better-auth/plugins";
import { getDB } from "../database";
import * as schema from "../database/schema";
import { Resend } from "resend";
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
        socialProviders: {
          google: {
            clientId: getEnv("GOOGLE_CLIENT_ID")!,
            clientSecret: getEnv("GOOGLE_CLIENT_SECRET")!,
          },
          discord: {
            clientId: getEnv("AUTH_DISCORD_ID"),
            clientSecret: getEnv("AUTH_DISCORD_SECRET"),
          },
          linkedin: {
            clientId: getEnv("AUTH_LINKEDIN_ID"),
            clientSecret: getEnv("AUTH_LINKEDIN_SECRET"),
          },
        },
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
              const resend = new Resend(getEnv("AUTH_RESEND_KEY"));
              await resend.emails.send({
                from: `${APP_NAME} <${APP_EMAIL}>`,
                to: email,
                subject: `Sign in to ${APP_NAME}`,
                html: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
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
