/**
 * @fileoverview Engine adapter that queries the OpenStreetMap Nominatim API for place search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const openstreetmap: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "10",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "HonoxSearX/1.0",
      },
    }
  );
  if (!response.ok) return [];
  const json = await response.json();

  if (!Array.isArray(json)) {
    return [];
  }

  return json.map((item: any) => ({
    url: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
    title: item.display_name,
    content: `Type: ${item.type}, Class: ${item.class}`,
    engine: "openstreetmap",
  }));
};
