/**
 * @fileoverview Engine adapter that queries the Apple Maps API for place search results, with automatic access-token caching/renewal.
 */
import { EngineFunction } from "../../types/search-engine-interface";

// Token management for Apple Maps API
let tokenCache = {
  value: "",
  lastUpdated: 0,
};

async function obtainToken(): Promise<string> {
  const now = Date.now();

  // Token expires every 30 minutes (1800 seconds)
  if (tokenCache.value && now - tokenCache.lastUpdated < 1800000) {
    return tokenCache.value;
  }

  try {
    // Get DuckDuckGo's MapKit token
    const tokenResponse = await fetch(
      "https://duckduckgo.com/local.js?get_mk_token=1"
    );
    const tokenText = await tokenResponse.text();

    // Exchange for actual Apple Maps token
    const actualTokenResponse = await fetch(
      "https://cdn.apple-mapkit.com/ma/bootstrap?apiVersion=2&mkjsVersion=5.72.53&poi=1",
      {
        headers: {
          Authorization: `Bearer ${tokenText}`,
        },
      }
    );
    const actualTokenData = await actualTokenResponse.json();

    tokenCache.value = actualTokenData.authInfo.access_token;
    tokenCache.lastUpdated = now;
    return tokenCache.value;
  } catch (err) {
    return "";
  }
}

export const apple_maps: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const token = await obtainToken();

  if (!token) {
    throw new Error("Failed to obtain Apple Maps API token");
  }

  const params = new URLSearchParams({
    q: query,
    lang: "en",
    mkjsVersion: "5.72.53",
  });
  const response = await fetch(
    `https://api.apple-mapkit.com/v1/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const json = await response.json();

  if (!json || !json.results) {
    return [];
  }

  return json.results.map((result: any) => {
    const lat = result.center?.lat;
    const lng = result.center?.lng;

    const addressParts = [
      result.subThoroughfare,
      result.thoroughfare,
      result.locality,
      result.postCode,
      result.country,
    ].filter(Boolean);

    const content = [
      addressParts.join(", "),
      result.poiCategory ? `Type: ${result.poiCategory}` : "",
      lat && lng ? `Coordinates: ${lat}, ${lng}` : "",
      result.telephone ? `Phone: ${result.telephone}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      url: result.placecardUrl || result.urls?.[0] || "",
      title: result.name,
      content,
      engine: "apple_maps",
      latitude: lat,
      longitude: lng,
    };
  });
};
