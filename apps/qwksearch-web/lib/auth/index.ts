import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oneTap, openAPI, magicLink, anonymous } from "better-auth/plugins";
import { getDB } from "../database";
import * as schema from "../database/schema";
import { getCloudflareContext } from "../cloudflare/context";
import { detectVpnAndLocation } from "../cloudflare/ip-geolocation";
import { APP_NAME, APP_EMAIL, NEXT_PUBLIC_BASE_URL } from "../config/site";

export interface Env {
  EMAIL: {
    send: (message: {
      from: string;
      to: string | string[];
      subject: string;
      text?: string;
      html?: string;
    }) => Promise<{ id: string }>;
  };
}

async function authBuilder() {
  const db = getDB();

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
    socialProviders.discord = {
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    };
  }

  if (process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET) {
    socialProviders.linkedin = {
      clientId: process.env.AUTH_LINKEDIN_ID,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET,
    };
  }

  // Origins allowed to make authenticated requests. The app is served from
  // several hosts that all share the same auth backend (production apex, the
  // `beta.` subdomain, preview builds, and localhost during development).
  // Without listing them here, better-auth rejects cross-subdomain requests
  // and omits the CORS headers, which surfaced as a blocked preflight when
  // signing in from beta.qwksearch.com. Extra origins can be supplied via the
  // BETTER_AUTH_TRUSTED_ORIGINS env var (comma-separated).
  const trustedOrigins = Array.from(
    new Set(
      [
        NEXT_PUBLIC_BASE_URL,
        "https://qwksearch.com",
        "https://*.qwksearch.com",
        "http://localhost:3000",
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
      ]
        .map((origin) => origin?.trim())
        .filter((origin): origin is string => Boolean(origin)),
    ),
  );

  return betterAuth({
    baseURL: NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    // The `session` table carries two extra columns beyond better-auth's core
    // model (`city`, `is_vpn`) — see drizzle migration
    // 0005_add_session_location_vpn. Declaring them here lets better-auth
    // accept the values written by the databaseHook below. `input: false`
    // keeps them server-derived only (clients can't set them).
    session: {
      additionalFields: {
        city: {
          type: "string",
          required: false,
          input: false,
        },
        state: {
          type: "string",
          required: false,
          input: false,
        },
        isVpn: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    // Populate the geolocation columns from the request IP whenever a session
    // is created (any sign-in path: password, social, one-tap, magic link).
    // detectVpnAndLocation is fully fault-tolerant and returns a neutral
    // result on any failure, so this never blocks authentication.
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const { city, state, isVpn } = await detectVpnAndLocation(
              session.ipAddress,
            );
            return {
              data: {
                ...session,
                city: city ?? undefined,
                state: state ?? undefined,
                isVpn,
              },
            };
          },
        },
      },
    },
    socialProviders,
    user: {
      deleteUser: {
        enabled: true,
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
          try {
            const ctx = getCloudflareContext();
            const env = ctx.env as Env;

            if (!env.EMAIL) {
              throw new Error("EMAIL binding not configured");
            }

            await env.EMAIL.send({
              from: APP_EMAIL || "noreply@example.com",
              to: email,
              subject: `Sign in to ${APP_NAME}`,
              html: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
            });
          } catch (error) {
            console.error("[auth] Magic link send failed:", error);
            throw error;
          }
        },
        expiresIn: 300,
        disableSignUp: false,
      }),
    ],
  });
}

type AuthInstance = Awaited<ReturnType<typeof authBuilder>>;

let authInstance: AuthInstance | null = null;

export async function initAuth(): Promise<AuthInstance> {
  if (!authInstance) {
    authInstance = await authBuilder();
  }
  return authInstance;
}

// Lazy proxy — auth is not initialized at module load (safe for CF Workers).
// Supports auth.handler(req) and auth.api.method(...) call patterns.
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  has() { return true; },
  get(_, prop) {
    const key = prop as string;
    return new Proxy(
      async (...args: unknown[]) => {
        const instance = await initAuth();
        return (instance as any)[key](...args);
      },
      {
        has() { return true; },
        get(_, subProp) {
          const sub = subProp as string;
          if (sub === "then" || sub === "catch" || sub === "finally") return undefined;
          return async (...args: unknown[]) => {
            const instance = await initAuth();
            return (instance as any)[key][sub](...args);
          };
        },
      },
    );
  },
});

import { headers } from "next/headers";

export interface AuthSession {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

/**
 * Get current session from request headers
 * Returns null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const authInstance = await initAuth();
    const session = await authInstance.api.getSession({
      headers: await headers(),
    });

    return session;
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }
}

/**
 * Get session or throw 401 error
 * Use this in protected API routes
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Get user ID from session
 * Returns null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Require user ID or throw
 */
export async function requireUserId(): Promise<string> {
  const session = await requireSession();
  return session.user.id;
}
