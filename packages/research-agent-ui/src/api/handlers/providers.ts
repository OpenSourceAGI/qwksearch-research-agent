/**
 * @fileoverview CRUD handlers for AI providers and their models.
 *
 * Exposes createProvidersHandler (list active providers filtered for
 * guest/authenticated access, add a provider), createProviderByIdHandler
 * (update/delete a provider), and createProviderModelsHandler (add/remove a
 * model on a provider) via ModelRegistry.
 */
import ModelRegistry from "chat-agent-toolkit/models/registry";
import type { Model } from "chat-agent-toolkit/config/config-types";
import type { ProvidersDeps } from "../types";

export function createProvidersHandler(deps: ProvidersDeps) {
  const GET = async (req: Request): Promise<Response> => {
    try {
      const registry = new ModelRegistry();

      const url = new URL(req.url);
      const guestParam = url.searchParams.get("guest");
      let isGuest = guestParam === "true";

      if (guestParam === null) {
        const session = await deps.getSession();
        isGuest = !session;
      }

      const activeProviders = await registry.getActiveProviders(isGuest);

      const filteredProviders = activeProviders.filter((p: any) => {
        return !p.chatModels.some((m: any) => m.key === "error");
      });

      if (filteredProviders.length === 0) {
        return Response.json(
          {
            providers: [],
            error: isGuest
              ? "No guest-safe AI providers available. Please sign in for more options."
              : "No AI providers configured. Please add OPENROUTER_API_KEY to your environment variables or configure your own API keys in Settings.",
          },
          { status: 200 },
        );
      }

      return Response.json({ providers: filteredProviders, isGuest }, { status: 200 });
    } catch (err) {
      console.error("An error occurred while fetching providers", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const POST = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { type, config } = body;

      if (!type || !config) {
        return Response.json({ message: "Missing required fields." }, { status: 400 });
      }

      const registry = new ModelRegistry();
      const newProvider = await registry.addProvider(type, config);

      return Response.json({ provider: newProvider }, { status: 200 });
    } catch (err) {
      console.error("An error occurred while creating provider", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { GET, POST };
}

export function createProviderByIdHandler() {
  const DELETE = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const { id } = await params;

      if (!id) {
        return Response.json({ message: "Provider ID is required." }, { status: 400 });
      }

      const registry = new ModelRegistry();
      await registry.removeProvider(id);

      return Response.json({ message: "Provider deleted successfully." }, { status: 200 });
    } catch (err: any) {
      console.error("An error occurred while deleting provider", err.message);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const PATCH = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const body = await req.json();
      const { config } = body;
      const { id } = await params;

      if (!id || !config) {
        return Response.json({ message: "Missing required fields." }, { status: 400 });
      }

      const registry = new ModelRegistry();
      const updatedProvider = await registry.updateProvider(id, config);

      return Response.json({ provider: updatedProvider }, { status: 200 });
    } catch (err: any) {
      console.error("An error occurred while updating provider", err.message);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { DELETE, PATCH };
}

export function createProviderModelsHandler() {
  const POST = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const { id } = await params;
      const body: Partial<Model> & { type: "chat" } = await req.json();

      if (!body.key || !body.name) {
        return Response.json({ message: "Key and name must be provided" }, { status: 400 });
      }

      const registry = new ModelRegistry();
      await registry.addProviderModel(id, body.type, body);

      return Response.json({ message: "Model added successfully" }, { status: 200 });
    } catch (err) {
      console.error("An error occurred while adding provider model", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const DELETE = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const { id } = await params;
      const body: { key: string; type: "chat" } = await req.json();

      if (!body.key) {
        return Response.json({ message: "Key and name must be provided" }, { status: 400 });
      }

      const registry = new ModelRegistry();
      await registry.removeProviderModel(id, body.type, body.key);

      return Response.json({ message: "Model added successfully" }, { status: 200 });
    } catch (err) {
      console.error("An error occurred while deleting provider model", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { POST, DELETE };
}
