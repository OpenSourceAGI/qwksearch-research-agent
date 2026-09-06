import { NextRequest, NextResponse } from "next/server";
import { ALL_ENGINES, engineDescriptions } from "search-web-api/search/search-engines-registry-list";
import { CATEGORIES } from "search-web-api/registry/search-engine-category-registry.js";

/** Map engine name to a best-guess domain for favicon lookup. */
const ENGINE_DOMAINS: Record<string, string> = {
  google: "google.com",
  bing: "bing.com",
  duckduckgo: "duckduckgo.com",
  yahoo: "yahoo.com",
  qwant: "qwant.com",
  startpage: "startpage.com",
  brave: "search.brave.com",
  yandex: "yandex.com",
  baidu: "baidu.com",
  mojeek: "mojeek.com",
  github: "github.com",
  gitlab: "gitlab.com",
  stackoverflow: "stackoverflow.com",
  npm: "npmjs.com",
  crates: "crates.io",
  dockerhub: "hub.docker.com",
  pypi: "pypi.org",
  packagist: "packagist.org",
  rubygems: "rubygems.org",
  unsplash: "unsplash.com",
  bing_images: "bing.com",
  google_images: "google.com",
  flickr: "flickr.com",
  imgur: "imgur.com",
  pixabay: "pixabay.com",
  wallhaven: "wallhaven.cc",
  deviantart: "deviantart.com",
  openclipart: "openclipart.org",
  youtube: "youtube.com",
  vimeo: "vimeo.com",
  dailymotion: "dailymotion.com",
  bing_videos: "bing.com",
  invidious: "invidious.io",
  peertube: "joinpeertube.org",
  hackernews: "news.ycombinator.com",
  yahoo_news: "yahoo.com",
  bing_news: "bing.com",
  google_news: "news.google.com",
  google_scholar: "scholar.google.com",
  arxiv: "arxiv.org",
  wikidata: "wikidata.org",
  semantic_scholar: "semanticscholar.org",
  crossref: "crossref.org",
  pubmed: "pubmed.ncbi.nlm.nih.gov",
  openalex: "openalex.org",
  doaj: "doaj.org",
  core: "core.ac.uk",
  torrent_1337x: "1337x.to",
  thepiratebay: "thepiratebay.org",
  nyaa: "nyaa.si",
  yts: "yts.mx",
  eztv: "eztv.re",
  solidtorrents: "solidtorrents.to",
  kickass: "kickasstorrents.to",
  twitter: "twitter.com",
  reddit: "reddit.com",
  medium: "medium.com",
  soundcloud: "soundcloud.com",
  mastodon: "mastodon.social",
  openstreetmap: "openstreetmap.org",
  photon: "photon.komoot.io",
  apple_maps: "maps.apple.com",
  ebay: "ebay.com",
  wikipedia: "wikipedia.org",
  imdb: "imdb.com",
  genius: "genius.com",
  archive: "archive.org",
  openlibrary: "openlibrary.org",
  wttr: "wttr.in",
  annas_archive: "annas-archive.org",
  goodreads: "goodreads.com",
};

export const GET = async () => {
  try {
    const enginesByCategory: { [key: string]: any[] } = {};

    Object.keys(CATEGORIES).forEach((category) => {
      enginesByCategory[category] = [];
    });

    ALL_ENGINES.forEach((engine) => {
      const domain = ENGINE_DOMAINS[engine.name] || null;
      const description = engineDescriptions[engine.name] || null;
      engine.categories.forEach((category) => {
        if (!enginesByCategory[category]) {
          enginesByCategory[category] = [];
        }
        enginesByCategory[category].push({
          name: engine.name,
          categories: engine.categories,
          description,
          domain,
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
