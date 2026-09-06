/**
 * @fileoverview Engine adapter that queries the Photon (Komoot) geocoding API for place search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const photon: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    limit: "10",
    lang: "en",
  });
  const response = await fetch(
    `https://photon.komoot.io/api/?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X1; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const json = await response.json();
  const features = json?.features || [];

  return features
    .map((feature: any) => {
      const properties = feature.properties;

      if (!properties) {
        return null;
      }

      const name = properties.name || "";
      const osmType = properties.osm_type;

      // Map OSM type to string
      let osmTypeStr = "";
      if (osmType === "N") osmTypeStr = "node";
      else if (osmType === "W") osmTypeStr = "way";
      else if (osmType === "R") osmTypeStr = "relation";
      else return null;

      const osmId = properties.osm_id;
      const url = `https://openstreetmap.org/${osmTypeStr}/${osmId}`;

      // Build address
      const addressParts: string[] = [];
      if (properties.street) addressParts.push(properties.street);
      if (properties.housenumber)
        addressParts.push(properties.housenumber);
      if (properties.city) addressParts.push(properties.city);
      if (properties.postcode) addressParts.push(properties.postcode);
      if (properties.country) addressParts.push(properties.country);

      // Get coordinates
      const geometry = feature.geometry;
      const coordinates = geometry?.coordinates || [];
      const lon = coordinates[0];
      const lat = coordinates[1];

      const content = [
        addressParts.join(", "),
        properties.type ? `Type: ${properties.type}` : "",
        coordinates.length === 2 ? `Coordinates: ${lat}, ${lon}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        url,
        title: name,
        content,
        engine: "photon",
      };
    })
    .filter(Boolean);
};
