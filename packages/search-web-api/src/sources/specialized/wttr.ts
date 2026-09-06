/**
 * @fileoverview Engine adapter that queries wttr.in for weather data, mapping WWO condition codes to human-readable descriptions.
 */
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

// Weather condition mapping
const WWO_TO_CONDITION: Record<string, string> = {
  "113": "clear sky",
  "116": "partly cloudy",
  "119": "cloudy",
  "122": "fair",
  "143": "fair",
  "176": "light rain showers",
  "179": "light snow showers",
  "248": "fog",
  "260": "fog",
  "263": "light rain showers",
  "296": "light rain",
  "302": "rain",
  "308": "heavy rain",
  "323": "light snow showers",
  "332": "heavy snow",
  "386": "rain showers and thunder",
};

export const wttr: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    format: "j1",
    lang: "en",
  });
  const response = await fetch(`https://wttr.in/${query}?${params}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) return [];
  const data = await response.json();
  const results: EngineResult[] = [];

  if (!data || !data.current_condition) {
    return results;
  }

  const current = data.current_condition[0];
  const weatherCode = current.weatherCode || "";
  const condition = WWO_TO_CONDITION[weatherCode] || "unknown";

  const content = [
    `Temperature: ${current.temp_C || current.tempC}°C (Feels like: ${current.FeelsLikeC}°C)`,
    `Condition: ${condition}`,
    `Humidity: ${current.humidity}%`,
    `Wind: ${current.windspeedKmph} km/h from ${current.winddirDegree}°`,
    `Pressure: ${current.pressure} hPa`,
    `Cloud cover: ${current.cloudcover}%`,
  ]
    .filter(Boolean)
    .join("\n");

  // Add current weather
  results.push({
    url: `https://wttr.in/${data.nearest_area?.[0]?.areaName?.[0]?.value || "weather"}`,
    title: `Weather in ${data.nearest_area?.[0]?.areaName?.[0]?.value || "Unknown Location"}`,
    content,
    engine: "wttr",
  });

  // Add forecast
  if (data.weather && Array.isArray(data.weather)) {
    for (const day of data.weather.slice(0, 3)) {
      // Only next 3 days
      const date = day.date;
      const hourly = day.hourly || [];

      if (hourly.length > 0) {
        const forecast = hourly[Math.floor(hourly.length / 2)]; // Middle of day
        const forecastCondition =
          WWO_TO_CONDITION[forecast.weatherCode] || "unknown";

        const forecastContent = [
          `Temperature: ${forecast.tempC}°C`,
          `Condition: ${forecastCondition}`,
          `Humidity: ${forecast.humidity}%`,
          `Wind: ${forecast.windspeedKmph} km/h`,
        ].join(" | ");

        results.push({
          url: `https://wttr.in/${data.nearest_area?.[0]?.areaName?.[0]?.value || "weather"}`,
          title: `Forecast for ${date}`,
          content: forecastContent,
          engine: "wttr",
        });
      }
    }
  }

  return results;
};
