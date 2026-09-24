/**
 * @fileoverview The homepage news widget's public settings:
 * `GET /api/news/settings`.
 *
 * The widget renders in the browser and has to know, before it fetches
 * anything, whether the site has it switched off, how many topics to show and
 * whether the visitor's own topic list counts. Every field here is a display
 * decision the admin made for everyone — nothing user-specific and no secrets,
 * so it is public and cacheable. The News API key stays on the server, in
 * `/api/news/trending`.
 */
import { getNewsWidgetSettings } from "@/lib/news/settings";
import { withCors, corsPreflight } from "@/lib/cors";

export const GET = withCors(async () => {
  const settings = await getNewsWidgetSettings();

  return new Response(
    JSON.stringify({
      enabled: settings.enabled,
      allowUserTopics: settings.allowUserTopics,
      defaultTopics: settings.defaultTopics,
      maxTopics: settings.maxTopics,
      showImages: settings.showImages,
    }),
    {
      headers: {
        "content-type": "application/json",
        // Short: an admin switching the widget off should take effect in about
        // a minute, not after the news cache window.
        "Cache-Control": "public, max-age=60",
      },
    },
  );
});

export const OPTIONS = corsPreflight;
