/**
 * Search Engines Registry List — Defines the complete catalogue of all 75 search
 * engine adapters available in this package, organised by category. Each entry
 * maps an engine name to its async query function and one or more categories.
 * Also sets the global grab-url default User-Agent header so every engine
 * request appears as a standard browser request.
 *
 * Split from the main search module to keep the large import block and static
 * data separate from the query-execution logic.
 */

import { EngineFunction } from "../types/search-engine-interface";
import { EngineMetadata } from "../types/search-result-types";
import { engineDescriptions } from "../registry/search-engine-descriptions";
import grab from "grab-url";

// Set default browser User-Agent for all outgoing requests
grab("", {
  setDefaults: true,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});

// General search engines
import { google } from "../sources/general/google";
import { bing } from "../sources/general/bing";
import { duckduckgo } from "../sources/general/duckduckgo";
import { yahoo } from "../sources/general/yahoo";
import { qwant } from "../sources/general/qwant";
import { startpage } from "../sources/general/startpage";
import { brave } from "../sources/general/brave";
import { yandex } from "../sources/general/yandex";
import { baidu } from "../sources/general/baidu";
import { mojeek } from "../sources/general/mojeek";

// IT / Developer engines
import { github } from "../sources/it/github";
import { stackoverflow } from "../sources/it/stackoverflow";
import { npm } from "../sources/it/npm";
import { crates } from "../sources/it/crates";
import { dockerhub } from "../sources/it/dockerhub";
import { pypi } from "../sources/it/pypi";
import { packagist } from "../sources/it/packagist";
import { rubygems } from "../sources/it/rubygems";
import { gitlab } from "../sources/it/gitlab";

// Image engines
import { unsplash } from "../sources/images/unsplash";
import { bing_images } from "../sources/images/bing_images";
import { google_images } from "../sources/images/google_images";
import { flickr } from "../sources/images/flickr";
import { imgur } from "../sources/images/imgur";
import { pixabay } from "../sources/images/pixabay";
import { wallhaven } from "../sources/images/wallhaven";
import { deviantart } from "../sources/images/deviantart";
import { openclipart } from "../sources/images/openclipart";

// Video engines
import { youtube } from "../sources/videos/youtube";
import { vimeo } from "../sources/videos/vimeo";
import { dailymotion } from "../sources/videos/dailymotion";
import { invidious } from "../sources/videos/invidious";
import { peertube } from "../sources/videos/peertube";
import { bing_videos } from "../sources/videos/bing_videos";

// News engines
import { hackernews } from "../sources/news/hackernews";
import { yahoo_news } from "../sources/news/yahoo_news";
import { bing_news } from "../sources/news/bing_news";
import { google_news } from "../sources/news/google_news";

// Academic engines
import { google_scholar } from "../sources/academic/google_scholar";
import { arxiv } from "../sources/academic/arxiv";
import { wikidata } from "../sources/academic/wikidata";
import { semantic_scholar } from "../sources/academic/semantic_scholar";
import { crossref } from "../sources/academic/crossref";
import { pubmed } from "../sources/academic/pubmed";
import { openalex } from "../sources/academic/openalex";
import { doaj } from "../sources/academic/doaj";
import { core } from "../sources/academic/core";

// Torrent engines
import { torrent_1337x } from "../sources/torrents/1337x";
import { thepiratebay } from "../sources/torrents/thepiratebay";
import { nyaa } from "../sources/torrents/nyaa";
import { yts } from "../sources/torrents/yts";
import { eztv } from "../sources/torrents/eztv";
import { solidtorrents } from "../sources/torrents/solidtorrents";
import { kickass } from "../sources/torrents/kickass";

// Social media engines
import { twitter } from "../sources/social/twitter";
import { reddit } from "../sources/social/reddit";
import { medium } from "../sources/social/medium";
import { soundcloud } from "../sources/social/soundcloud";
import { mastodon } from "../sources/social/mastodon";

// Map engines
import { openstreetmap } from "../sources/maps/openstreetmap";
import { photon } from "../sources/maps/photon";
import { apple_maps } from "../sources/maps/apple_maps";

// Shopping engines
import { ebay } from "../sources/shopping/ebay";

// Specialised engines
import { wikipedia } from "../sources/specialized/wikipedia";
import { imdb } from "../sources/specialized/imdb";
import { genius } from "../sources/specialized/genius";
import { archive } from "../sources/specialized/archive";
import { openlibrary } from "../sources/specialized/openlibrary";
import { wttr } from "../sources/specialized/wttr";
import { annas_archive } from "../sources/specialized/annas_archive";
import { goodreads } from "../sources/specialized/goodreads";

export { engineDescriptions };

/** Complete list of all 75 registered search engine adapters. */
export const ALL_ENGINES: EngineMetadata[] = [
  // General (10)
  { name: "google",      fn: google,      categories: ["general"] },
  { name: "bing",        fn: bing,        categories: ["general"] },
  { name: "duckduckgo",  fn: duckduckgo,  categories: ["general"] },
  { name: "yahoo",       fn: yahoo,       categories: ["general"] },
  { name: "qwant",       fn: qwant,       categories: ["general"] },
  { name: "startpage",   fn: startpage,   categories: ["general"] },
  { name: "brave",       fn: brave,       categories: ["general"] },
  { name: "yandex",      fn: yandex,      categories: ["general"] },
  { name: "baidu",       fn: baidu,       categories: ["general"] },
  { name: "mojeek",      fn: mojeek,      categories: ["general"] },
  // IT / Developer (9)
  { name: "github",      fn: github,      categories: ["it"] },
  { name: "gitlab",      fn: gitlab,      categories: ["it"] },
  { name: "stackoverflow", fn: stackoverflow, categories: ["it"] },
  { name: "npm",         fn: npm,         categories: ["it"] },
  { name: "crates",      fn: crates,      categories: ["it"] },
  { name: "dockerhub",   fn: dockerhub,   categories: ["it"] },
  { name: "pypi",        fn: pypi,        categories: ["it"] },
  { name: "packagist",   fn: packagist,   categories: ["it"] },
  { name: "rubygems",    fn: rubygems,    categories: ["it"] },
  // Images (9)
  { name: "unsplash",    fn: unsplash,    categories: ["images"] },
  { name: "bing_images", fn: bing_images, categories: ["images"] },
  { name: "google_images", fn: google_images, categories: ["images"] },
  { name: "flickr",      fn: flickr,      categories: ["images"] },
  { name: "imgur",       fn: imgur,       categories: ["images"] },
  { name: "pixabay",     fn: pixabay,     categories: ["images"] },
  { name: "wallhaven",   fn: wallhaven,   categories: ["images"] },
  { name: "deviantart",  fn: deviantart,  categories: ["images"] },
  { name: "openclipart", fn: openclipart, categories: ["images"] },
  // Videos (6)
  { name: "youtube",     fn: youtube,     categories: ["videos"] },
  { name: "vimeo",       fn: vimeo,       categories: ["videos"] },
  { name: "dailymotion", fn: dailymotion, categories: ["videos"] },
  { name: "bing_videos", fn: bing_videos, categories: ["videos"] },
  { name: "invidious",   fn: invidious,   categories: ["videos"] },
  { name: "peertube",    fn: peertube,    categories: ["videos"] },
  // News (4)
  { name: "hackernews",  fn: hackernews,  categories: ["news"] },
  { name: "yahoo_news",  fn: yahoo_news,  categories: ["news"] },
  { name: "bing_news",   fn: bing_news,   categories: ["news"] },
  { name: "google_news", fn: google_news, categories: ["news"] },
  // Academic (9)
  { name: "google_scholar",  fn: google_scholar,  categories: ["academic"] },
  { name: "arxiv",           fn: arxiv,           categories: ["academic"] },
  { name: "wikidata",        fn: wikidata,        categories: ["academic"] },
  { name: "semantic_scholar", fn: semantic_scholar, categories: ["academic"] },
  { name: "crossref",        fn: crossref,        categories: ["academic"] },
  { name: "pubmed",          fn: pubmed,          categories: ["academic"] },
  { name: "openalex",        fn: openalex,        categories: ["academic"] },
  { name: "doaj",            fn: doaj,            categories: ["academic"] },
  { name: "core",            fn: core,            categories: ["academic"] },
  // Torrents (7)
  { name: "1337x",        fn: torrent_1337x, categories: ["torrents"] },
  { name: "thepiratebay", fn: thepiratebay,  categories: ["torrents"] },
  { name: "nyaa",         fn: nyaa,          categories: ["torrents"] },
  { name: "yts",          fn: yts,           categories: ["torrents"] },
  { name: "eztv",         fn: eztv,          categories: ["torrents"] },
  { name: "solidtorrents", fn: solidtorrents, categories: ["torrents"] },
  { name: "kickass",      fn: kickass,       categories: ["torrents"] },
  // Social (5)
  { name: "twitter",    fn: twitter,    categories: ["social"] },
  { name: "reddit",     fn: reddit,     categories: ["social"] },
  { name: "medium",     fn: medium,     categories: ["social"] },
  { name: "soundcloud", fn: soundcloud, categories: ["social"] },
  { name: "mastodon",   fn: mastodon,   categories: ["social"] },
  // Maps (3)
  { name: "openstreetmap", fn: openstreetmap, categories: ["maps"] },
  { name: "photon",        fn: photon,        categories: ["maps"] },
  { name: "apple_maps",    fn: apple_maps,    categories: ["maps"] },
  // Shopping (1)
  { name: "ebay", fn: ebay, categories: ["shopping"] },
  // Specialised (8)
  { name: "wikipedia",    fn: wikipedia,    categories: ["specialized"] },
  { name: "imdb",         fn: imdb,         categories: ["specialized"] },
  { name: "genius",       fn: genius,       categories: ["specialized"] },
  { name: "archive",      fn: archive,      categories: ["specialized"] },
  { name: "openlibrary",  fn: openlibrary,  categories: ["specialized"] },
  { name: "wttr",         fn: wttr,         categories: ["specialized"] },
  { name: "annas_archive", fn: annas_archive, categories: ["specialized"] },
  { name: "goodreads",    fn: goodreads,    categories: ["specialized"] },
];
