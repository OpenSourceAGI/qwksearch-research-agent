/**
 * @fileoverview Engine adapter that queries the YTS API for movie torrent search results.
 */
import { EngineFunction } from "../../types/search-engine-interface";

export const yts: EngineFunction = async (
  query: string,
  page: number | undefined
) => {
  const params = new URLSearchParams({
    query_term: query,
    page: String(page || 1),
    limit: "20",
  });
  const response = await fetch(
    `https://yts.mx/api/v2/list_movies.json?${params}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }
  );
  if (!response.ok) return [];
  const json = await response.json();
  const results: any[] = [];

  if (json && json.data && json.data.movies) {
    json.data.movies.forEach((movie: any) => {
      const title = movie.title_long || movie.title;
      const rating = movie.rating || "N/A";
      const year = movie.year || "";
      const genres = movie.genres ? movie.genres.join(", ") : "";

      // Create a result for each torrent quality
      if (movie.torrents && movie.torrents.length > 0) {
        movie.torrents.forEach((torrent: any) => {
          const quality = torrent.quality || "";
          const size = torrent.size || "";
          const seeds = torrent.seeds || 0;
          const peers = torrent.peers || 0;
          const magnetLink = `magnet:?xt=urn:btih:${torrent.hash}&dn=${encodeURIComponent(title)}&tr=udp://open.demonii.com:1337/announce&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://glotorrents.pw:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://torrent.gresille.org:80/announce&tr=udp://p4p.arenabg.com:1337&tr=udp://tracker.leechers-paradise.org:6969`;

          results.push({
            url: magnetLink,
            title: `${title} [${quality}]`,
            content: `Rating: ${rating}/10, Year: ${year}, Size: ${size}, Seeds: ${seeds}, Peers: ${peers}, Genres: ${genres}`,
            thumbnail: movie.medium_cover_image,
            engine: "yts",
          });
        });
      }
    });
  }

  return results;
};
