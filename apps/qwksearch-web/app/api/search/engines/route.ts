import { NextRequest, NextResponse } from "next/server";
import { ALL_ENGINES, CATEGORIES } from "search-web-api";

export const GET = async () => {
  try {
    const enginesByCategory: { [key: string]: any[] } = {};

    Object.keys(CATEGORIES).forEach((category) => {
      enginesByCategory[category] = [];
    });

    ALL_ENGINES.forEach((engine) => {
      engine.categories.forEach((category) => {
        if (!enginesByCategory[category]) {
          enginesByCategory[category] = [];
        }
        enginesByCategory[category].push({
          name: engine.name,
          categories: engine.categories,
        });
      });
    });

    return NextResponse.json({ engines: enginesByCategory });
  } catch (err) {
    console.error("Error fetching engines:", err);
    return NextResponse.json(
      { message: "Failed to fetch engines" },
      { status: 500 }
    );
  }
};
