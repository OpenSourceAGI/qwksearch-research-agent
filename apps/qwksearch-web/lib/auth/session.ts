import { getSession as getAuthSession, requireSession as requireAuthSession, getUserId as getAuthUserId, requireUserId as requireAuthUserId } from "./index";
import type { AuthSession } from "./index";

export type { AuthSession };

/**
 * Get current session from request headers
 * Returns null if not authenticated
 */
export async function getSession(): Promise<AuthSession | null> {
  return getAuthSession();
}

/**
 * Get session or throw 401 error
 * Use this in protected API routes
 */
export async function requireSession(): Promise<AuthSession> {
  return requireAuthSession();
}

/**
 * Get user ID from session
 * Returns null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  return getAuthUserId();
}

/**
 * Require user ID or throw
 */
export async function requireUserId(): Promise<string> {
  return requireAuthUserId();
}
