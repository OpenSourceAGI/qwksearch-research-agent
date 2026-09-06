/**
 * @fileoverview Engine adapter that queries the Mastodon public API for post search results.
 */
import { EngineFunction, EngineResult } from "../../types/search-engine-interface";

export const mastodon: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    q: query,
    resolve: "false",
    type: "accounts",
    limit: "40",
  });
  const response = await fetch(
    `https://mastodon.social/api/v2/search?${params}`
  );
  if (!response.ok) return [];
  const data = await response.json();
  const results: EngineResult[] = [];
  const accounts = data.accounts || [];

  for (const account of accounts) {
    const url = account.uri || account.url;
    const username = account.username || "";
    const displayName = account.display_name || username;
    const followersCount = account.followers_count || 0;
    const note = account.note || "";

    // Strip HTML tags from note
    const cleanNote = note.replace(/<[^>]*>/g, "").trim();

    const title = `${displayName} (@${username})`;
    const content = `Followers: ${followersCount}\n${cleanNote}`;

    const thumbnail = account.avatar || account.avatar_static;

    results.push({
      url,
      title,
      content,
      thumbnail,
      engine: "mastodon",
    });
  }

  return results;
};
