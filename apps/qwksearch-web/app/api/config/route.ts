/**
 * @fileoverview Application configuration API. GET returns current config
 * values, UI field definitions, and active model providers. POST updates
 * a single config key-value pair.
 */
import configManager from "@/lib/config";
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { NextRequest, NextResponse } from "next/server";
import { ConfigModelProvider } from "@/lib/config/types";
import { getEnv } from "@/lib/config/env";
import { assertAdmin } from "@/lib/auth/admin";

type SaveConfigBody = {
  key: string;
  value: string;
};

export const GET = async (req: NextRequest) => {
  try {
    const values = configManager.getCurrentConfig();
    const fields = configManager.getUIConfigSections();

    const modelRegistry = new ModelRegistry();
    const modelProviders = await modelRegistry.getActiveProviders();

    values.modelProviders = values.modelProviders.map(
      (mp: ConfigModelProvider) => {
        const activeProvider = modelProviders.find((p) => p.id === mp.id);

        return {
          ...mp,
          chatModels: activeProvider?.chatModels ?? mp.chatModels,
        };
      },
    );

    // Don't expose the site-default Tavily key — users should only see their own override
    const envTavilyKey = getEnv("TAVILY_API_KEY") || '';
    if (values.search?.tavilyApiKey === envTavilyKey) {
      values.search = { ...values.search, tavilyApiKey: '' };
    }

    return NextResponse.json({
      values,
      fields,
    });
  } catch (err) {
    console.error("Error in getting config: ", err);
    return Response.json(
      { message: "An error has occurred." },
      { status: 500 },
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    // Site-wide config writes are admin-only (the read side stays public —
    // the regular Settings UI needs it).
    const guard = await assertAdmin();
    if (guard) return guard;

    const body: SaveConfigBody = await req.json();

    if (!body.key || !body.value) {
      return Response.json(
        {
          message: "Key and value are required.",
        },
        {
          status: 400,
        },
      );
    }

    configManager.updateConfig(body.key, body.value);

    return Response.json(
      {
        message: "Config updated successfully.",
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error("Error in getting config: ", err);
    return Response.json(
      { message: "An error has occurred." },
      { status: 500 },
    );
  }
};
