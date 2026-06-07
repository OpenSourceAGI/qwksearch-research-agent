/**
 * @fileoverview AI model provider management. GET lists all active providers
 * and their available chat models. POST registers a new provider with its
 * type, name, and API configuration.
 */
import { ModelRegistry } from "chat-agent-toolkit";
import { NextRequest } from "next/server";

export const GET = async (req: Request) => {
  try {
    const registry = new ModelRegistry();

    const activeProviders = await registry.getActiveProviders();

    const filteredProviders = activeProviders.filter((p) => {
      return !p.chatModels.some((m) => m.key === "error");
    });

    return Response.json(
      {
        providers: filteredProviders,
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
