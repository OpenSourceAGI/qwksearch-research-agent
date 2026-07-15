/**
 * @fileoverview AI model provider management. GET lists all active providers
 * and their available chat models. POST registers a new provider with its
 * type, name, and API configuration.
 *
 * Query params:
 * - guest: "true" to return only guest-safe models (tested working models)
 */
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

export const GET = async (req: NextRequest) => {
  try {
    const registry = new ModelRegistry();

    // Determine if guest mode: URL param overrides auth check
    const url = new URL(req.url);
    const guestParam = url.searchParams.get("guest");
    let isGuest = guestParam === "true";

    // If not explicitly set, check actual auth status
    if (guestParam === null) {
      const session = await getSession();
      isGuest = !session;
    }

    const activeProviders = await registry.getActiveProviders(isGuest);

    const filteredProviders = activeProviders.filter((p) => {
      return !p.chatModels.some((m) => m.key === "error");
    });

    // Check if no providers are available
    if (filteredProviders.length === 0) {
      return Response.json(
        {
          providers: [],
          error: isGuest
            ? "No guest-safe AI providers available. Please sign in for more options."
            : "No AI providers configured. Please add OPENROUTER_API_KEY to your environment variables or configure your own API keys in Settings.",
        },
        {
          status: 200, // Return 200 so client can display the error message
        },
      );
    }

    return Response.json(
      {
        providers: filteredProviders,
        isGuest,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error("An error occurred while fetching providers", err);
    return Response.json(
      {
        message: "An error has occurred.",
      },
      {
        status: 500,
      },
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { type, config } = body;

    if (!type || !config) {
      return Response.json(
        {
          message: "Missing required fields.",
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    const newProvider = await registry.addProvider(type, config);

    return Response.json(
      {
        provider: newProvider,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error("An error occurred while creating provider", err);
    return Response.json(
      {
        message: "An error has occurred.",
      },
      {
        status: 500,
      },
    );
  }
};
