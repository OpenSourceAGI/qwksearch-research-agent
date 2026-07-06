/**
 * @fileoverview Returns list of configured OAuth providers
 * Used by client to show/hide provider buttons
 */
import { getEnv } from "@/lib/env";

export async function GET() {
  const providers: string[] = [];

  // Check Google
  const googleClientId = getEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  if (
    googleClientId &&
    googleClientSecret &&
    googleClientId !== "your-google-client-id.apps.googleusercontent.com" &&
    googleClientSecret !== "your-google-client-secret"
  ) {
    providers.push("google");
  }

  // Check Discord
  const discordClientId = getEnv("AUTH_DISCORD_ID");
  const discordClientSecret = getEnv("AUTH_DISCORD_SECRET");
  if (discordClientId && discordClientSecret) {
    providers.push("discord");
  }

  // Check LinkedIn
  const linkedinClientId = getEnv("AUTH_LINKEDIN_ID");
  const linkedinClientSecret = getEnv("AUTH_LINKEDIN_SECRET");
  if (linkedinClientId && linkedinClientSecret) {
    providers.push("linkedin");
  }

  return Response.json({ providers });
}
