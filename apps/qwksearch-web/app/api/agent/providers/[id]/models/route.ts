/**
 * @fileoverview Provider model management. POST adds a new chat model to
 * a provider. DELETE removes a specific model from a provider by key.
 */
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { Model } from "chat-agent-toolkit/models/types";
import { NextRequest } from "next/server";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const body: Partial<Model> & { type: "chat" } = await req.json();

    if (!body.key || !body.name) {
      return Response.json(
        {
          message: "Key and name must be provided",
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    await registry.addProviderModel(id, body.type, body);

    return Response.json(
      {
        message: "Model added successfully",
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error("An error occurred while adding provider model", err);
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

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    const body: { key: string; type: "chat" } = await req.json();

    if (!body.key) {
      return Response.json(
        {
          message: "Key and name must be provided",
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();

    await registry.removeProviderModel(id, body.type, body.key);

    return Response.json(
      {
        message: "Model added successfully",
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error("An error occurred while deleting provider model", err);
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
