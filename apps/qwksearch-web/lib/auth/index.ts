import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oneTap, openAPI, magicLink, anonymous } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { Resend } from "resend";
import { APP_NAME, APP_EMAIL, NEXT_PUBLIC_BASE_URL } from "../constants";
import { env } from "../../env";

async function authBuilder() {
  return betterAuth({
    baseURL: NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
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
          const resend = new Resend(process.env.AUTH_RESEND_KEY);
          await resend.emails.send({
            from: `${APP_NAME} <${APP_EMAIL || "noreply@example.com"}>`,
            to: email,
            subject: `Sign in to ${APP_NAME}`,
            html: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
          });
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
