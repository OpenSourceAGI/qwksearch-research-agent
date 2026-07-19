import configManager from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export const GET = async () => {
  try {
    const enabledEngines = configManager.getConfig(
      "search.enabledEngines",
      []
    );

    return NextResponse.json({ enabledEngines });
  } catch (err) {
    console.error("Error fetching engine status:", err);
    return NextResponse.json(
      { message: "Failed to fetch engine status" },
      { status: 500 }
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { enabledEngines } = body;

    if (!Array.isArray(enabledEngines)) {
      return NextResponse.json(
        { message: "enabledEngines must be an array" },
        { status: 400 }
      );
    }

    configManager.updateConfig("search.enabledEngines", enabledEngines);

    return NextResponse.json(
      { message: "Engine status updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating engine status:", err);
    return NextResponse.json(
      { message: "Failed to update engine status" },
      { status: 500 }
    );
  }
};
