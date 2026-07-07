/**
 * @fileoverview Single model provider operations. DELETE removes a provider
 * by ID. PATCH updates an existing provider's name and configuration.
 */
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { NextRequest } from "next/server";

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        {
          message: "Provider ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const registry = new ModelRegistry();
    await registry.removeProvider(id);

    return Response.json(
      {
        message: "Provider deleted successfully.",
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("An error occurred while deleting provider", err.message);
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

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const body = await req.json();
    const { config } = body;
    const { id } = await params;

    if (!id || !config) {
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

    const updatedProvider = await registry.updateProvider(id, config);

    return Response.json(
      {
        provider: updatedProvider,
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("An error occurred while updating provider", err.message);
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
