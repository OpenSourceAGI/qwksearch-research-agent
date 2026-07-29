/**
 * @fileoverview CRUD handlers for configured MCP (Model Context Protocol) servers.
 *
 * Provides list/add (createMCPServersHandler), update/delete
 * (createMCPServerByIdHandler), and enable/disable
 * (createMCPServerToggleHandler) operations backed by deps.configManager.
 */
import type { MCPServersDeps } from "../types";

export function createMCPServersHandler(deps: MCPServersDeps) {
  const GET = async (_req: Request): Promise<Response> => {
    try {
      const servers = deps.getConfiguredMCPServers();
      return Response.json({ servers }, { status: 200 });
    } catch (err) {
      console.error("An error occurred while fetching MCP servers", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const POST = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { type, name, config } = body;

      if (!type || !name || !config) {
        return Response.json({ message: "Missing required fields." }, { status: 400 });
      }

      const newServer = deps.configManager.addMCPServer(type, name, config);
      return Response.json({ server: newServer }, { status: 200 });
    } catch (err) {
      console.error("An error occurred while creating MCP server", err);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { GET, POST };
}

export function createMCPServerByIdHandler(deps: MCPServersDeps) {
  const DELETE = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const { id } = await params;

      if (!id) {
        return Response.json({ message: "MCP Server ID is required." }, { status: 400 });
      }

      deps.configManager.removeMCPServer(id);
      return Response.json({ message: "MCP server deleted successfully." }, { status: 200 });
    } catch (err: any) {
      console.error("An error occurred while deleting MCP server", err.message);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  const PATCH = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const body = await req.json();
      const { name, config } = body;
      const { id } = await params;

      if (!id || !name || !config) {
        return Response.json({ message: "Missing required fields." }, { status: 400 });
      }

      const updatedServer = await deps.configManager.updateMCPServer(id, name, config);
      return Response.json({ server: updatedServer }, { status: 200 });
    } catch (err: any) {
      console.error("An error occurred while updating MCP server", err.message);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { DELETE, PATCH };
}

export function createMCPServerToggleHandler(deps: MCPServersDeps) {
  const POST = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    try {
      const body = await req.json();
      const { enabled } = body;
      const { id } = await params;

      if (!id || typeof enabled !== "boolean") {
        return Response.json({ message: "Missing required fields." }, { status: 400 });
      }

      const updatedServer = deps.configManager.toggleMCPServer(id, enabled);
      return Response.json({ server: updatedServer }, { status: 200 });
    } catch (err: any) {
      console.error("An error occurred while toggling MCP server", err.message);
      return Response.json({ message: "An error has occurred." }, { status: 500 });
    }
  };

  return { POST };
}
