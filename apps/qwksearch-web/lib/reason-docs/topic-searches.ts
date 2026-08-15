/**
 * @fileoverview Client helper for the REASON editor's "search topics" sidebar feature.
 */
import grab from "grab-url";

/** Fetches short AI-generated suggested search queries related to a document's content. Returns an empty array on any failure. */
export const getTopicSearches = async (title: string, content: string): Promise<string[]> => {
  try {
    const data = await grab<{ topics: string[] }>("agent/topic-searches", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });

    return Array.isArray(data.topics) ? data.topics : [];
  } catch (e) {
    return [];
  }
};
