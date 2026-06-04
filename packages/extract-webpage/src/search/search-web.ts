/**
 * @fileoverview Core web searching utilities via SearXNG.
 * Handles metasearch execution, result parsing, and domain-based filtering.
 */
import { getDomainWithoutSuffix } from "tldts";
import { scrapeURL } from "./url-to-html";
import { parseDate } from "chrono-node";
import grab from "grab-url";

/**
 * Search Web via SearXNG metasearch of all major search engines.
 * Options are 10 search categories, recency, and how many
 * times to retry other domains if first time fails.
 * SearXNG is a free internet metasearch engine which aggregates results from
 *  more than [180+ search sources](https://docs.searxng.org/user/configured_engines.html).
 *
 * [Searxng Overview](https://medium.com/@elmo92/search-in-peace-with-searxng-an-alternative-search-engine-that-keeps-your-searches-private-accd8cddd6fc)
 * [Searxng Installation Guide](https://github.com/searxng/searxng-docker/tree/master)
 *
 * ![google_dead](https://i.imgur.com/6rRpaY1.png)
 * @param {string} query - The search query string.
 * @param {Object} [options]
 * @param {string} options.category default=general - ["general", "news", "videos", "images",
 *  "science","it", "files", "social+media",  "map", "music"]
 * @param {string} options.recency default=all - ["all", "day", "week", "month", "year"]
 * @param {string|boolean} options.privateSearxng default=null - Use your custom domain SearXNG
 * @param {number} options.maxRetries default=3 - Maximum number of retry attempts if the initial search fails.
 * @param {number} options.page default=1 - The page number to retrieve.
 * @param {boolean} options.safesearch default=false - Whether to block adult content.
 * @param {string} options.lang default="en-US" - The language to use for the search.
 * @param {string} options.proxy default=false - Use corsproxy.io to access in frontend JS
 * @returns {Promise<Array<{title: string, url: string, snippet: string, domain: string, favicon: string, path: string, engines: string[]}>>} An array of search result objects.
 * @example  const advancedResults = await searchWeb('Node.js', {
 *   category: 2,
 *   recency: 1,
 *   maxRetries: 5
 * });
 * @category Search
 * @author [vtempest (2025)](https://github.com/vtempest)
 * [Heiser, M., Tauber, A., Flament, A., et al. (2014-)](https://github.com/searxng/searxng/graphs/contributors)
 */
export async function searchWeb(query, options = {} as any) {
  const {
    category = "general",
    recency,
    privateSearxng = null,
    maxRetries = 3,
    page = 1,
    safesearch = false,
    lang = "en-US",
    proxy = null,
  } = options;

  const CATEGORY_LIST = [
    "general",
    "news",
    "videos",
    "images",
    "science",
    "it",
    "files",
    "social+media",
  ];
  const RECENCY_ALLOWED_LIST = ["day", "week", "month", "year"];

  const SEARX_DOMAINS = [
    "baresearch.org",
    "copp.gg",
    "darmarit.org",
    "etsi.me",
    "fairsuch.net",
    "nogoo.me",
    "northboot.xyz",
    "nyc1.sx.ggtyler.dev",
    "ooglester.com",
    "opnxng.com",
    "paulgo.io",
    "priv.au",
    "s.trung.fun",
    "search.blitzw.in",
    "search.charliewhiskey.net",
    "search.citw.lgbt",
    "search.darkness.services",
    "search.datura.network",
    "search.dotone.nl",
    "search.gcomm.ch",
    "search.hbubli.cc",
    "search.im-in.space",
    "search.incogniweb.net",
    "search.inetol.net",
    "search.leptons.xyz",
    "search.nadeko.net",
    "search.ngn.tf",
    "search.ononoki.org",
    "search.privacyredirect.com",
    "search.sapti.me",
    "search.rowie.at",
    "search.projectsegfau.lt",
    "search.tommy-tran.com",
    "searx.aleteoryx.me",
    "searx.ankha.ac",
    "searx.be",
    "searx.colbster937.dev",
    "searx.daetalytica.io",
    "searx.dresden.network",
    "searx.foss.family",
    "searx.hu",
    "searx.juancord.xyz",
    "searx.lunar.icu",
    "searx.mxchange.org",
    "searx.namejeff.xyz",
    "searx.oakleycord.dev",
    "searx.ro",
    "searx.sev.monster",
    "searx.thefloatinglab.world",
    "searx.tiekoetter.com",
    "searx.tuxcloud.net",
    "searx.work",
    "searx.zhenyapav.com",
    "searxng.hweeren.com",
    "searxng.online",
    "searxng.shreven.org",
    "searxng.site",
    "skyrimhater.com",
    "sx.ca.zorby.top",
    "sx.catgirl.cloud",
    "sx.thatxtreme.dev",
    "sx.zorby.top",
    "xo.wtf",
  ];

  //select a random domain if none is provided
  const searchDomain =
    privateSearxng ||
    "https://" +
      SEARX_DOMAINS[Math.floor(Math.random() * SEARX_DOMAINS.length)];

  const categoryName =
    typeof category === "number" ? CATEGORY_LIST[category] : category; // Using the first category as default

  var url =
    `${searchDomain}/search?q=${encodeURIComponent(query)}` +
    `&category_${categoryName}=1&language=${lang}` +
    `${
      recency in RECENCY_ALLOWED_LIST ? "&time_range=" + recency : ""
    }&safesearch=${safesearch ? "1" : "0"}&pageno=${page}`;

  if (privateSearxng) url += "&format=json";

  let resultHTML: string = "";
  try {
    resultHTML = await grab(url, {
      headers: {
        "accept-language": lang + ",en;q=0.9",
      },
      responseType: "text",
    }) as string;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[searchWeb] Failed to fetch from SearXNG domain "${searchDomain}": ${errorMsg}`);
    if (maxRetries > 0) {
      console.log(`[searchWeb] Retrying with another instance... (${maxRetries} retries left)`);
      return await searchWeb(query, {
        ...options,
        maxRetries: maxRetries - 1,
      });
    }
    console.error(`[searchWeb] All retries exhausted. Returning empty results.`);
    return [];
  }

  if (privateSearxng) {
    if (!resultHTML.startsWith("{"))
      return { error: "Private SearXNG instance did not return valid JSON" };
    //todo use public

    var { results, suggestions, infoboxes } = JSON.parse(resultHTML);

    results = results.map((result) => {
      var title = result.title.replace(/<\/?[^>]+(>|$)/g, "");

      // Clean and normalize the title
      const TITLE_SPLITTERS_RE = /( [|\-\/:\u00bb] )|( - )|(\|)/;

      // Handle split titles
      if (TITLE_SPLITTERS_RE.test(title)) {
        const splitTitle = title.split(TITLE_SPLITTERS_RE);

        // Handle breadcrumbed titles
        if (splitTitle.length >= 2) {
          const longestPart = splitTitle.reduce(
            (acc, part) => (part?.length > acc?.length ? part : acc),
            "",
          );
          if (longestPart.length > 10) {
            title = longestPart;
          }
        }
      }

      title = convertURLSafeHTMLToHTML(title);
      var url = result.url.replace(/&amp;/g, "&");
      var snippet = result.content?.replace(/<\/?[^>]+(>|$)/g, "");
      var score = Math.round(result.score * 100) / 100;
      // Parse metadata into date and source

      var domain = result.url
        ?.replace(/(http:\/\/|https:\/\/|www.)/gi, "")
        .split("/")[0];

      let date = null,
        source = null;
      if (typeof result.metadata === "string") {
        const [datePart, sourcePart] = result.metadata
          .split("|")
          .map((s) => s.trim());
        date =
          parseDate(result.metadata)?.toISOString().split("T")[0] || undefined;
        source = sourcePart || null;
      }

      if (!source) {
        source = getDomainWithoutSuffix(domain).replace(/\b\w/g, (l) =>
          l.toUpperCase(),
        );
        // for small source names like CNN
        if (source.length < 5) source = source.toUpperCase();
      }

      var favicon =
        "https://www.google.com/s2/favicons?domain=" +
        result.url.match(
          /^(?:https?:\/\/)?(?:www\.)?([^/:?\s]+)(?:[/:?]|$)/i,
        )?.[0] +
        "&sz=16";

      return {
        title,
        url,
        snippet,
        score,
        ...(date ? { date } : {}),
        ...(source ? { source } : {}),
        domain,
        favicon,
      };
    });
    return { results, suggestions, infoboxes };
  }

  results = [];
  const resultRegex = /<article class="result[^>]*>[\s\S]*?<\/article>/g;
  const titleUrlRegex = /<h3><a href="([^"]*)"[^>]*>(.*?)<\/a><\/h3>/;
  const snippetRegex = /<p class="content">\s*(.*?)\s*<\/p>/;
  const enginesRegex = /<span>(bing|duckduckgo|yahoo|google)<\/span>/g;
  const linksRegex =
    /<a href="([^"]*)" class="(cache_link|proxyfied_link)"[^>]*>(cached|proxied)<\/a>/g;

  let match;
  while ((match = resultRegex.exec(resultHTML)) !== null) {
    const resultHtml = match[0];
    const titleUrlMatch = titleUrlRegex.exec(resultHtml);
    const snippetMatch = snippetRegex.exec(resultHtml);

    if (titleUrlMatch && titleUrlMatch[1] && titleUrlMatch[2]) {
      const url = convertURLSafeHTMLToHTML(titleUrlMatch[1]);
      let title = titleUrlMatch[2].replace(/<\/?[^>]+(>|$)/g, "");
      let snippet = snippetMatch
        ? snippetMatch[1].replace(/<\/?[^>]+(>|$)/g, "")
        : "";

      let engines = [];
      let engineMatch;
      while ((engineMatch = enginesRegex.exec(resultHtml)) !== null) {
        engines.push(engineMatch[1]);
      }

      let cached = null;
      let linkMatch;
      // while ((linkMatch = linksRegex.exec(resultHtml)) !== null) {
      //   cached = linkMatch[1];
      // }

      title = convertURLSafeHTMLToHTML(title);
      snippet = convertURLSafeHTMLToHTML(snippet);
      // if (!url.includes(".de/"))
      results.push({ title, url, snippet });
    }
  }

  if (results.length === 0 && maxRetries > 0) {
    results = await searchWeb(query, {
      ...options,
      maxRetries: maxRetries - 1,
      useProxy: true,
    });
  }

  //filter out url that end with .de
  // results = results.filter((result) => !result.url.includes(".de/"));

  results = results.map((result) => {
    var favicon =
      "https://www.google.com/s2/favicons?domain=" +
      result.url.match(
        /^(?:https?:\/\/)?(?:www\.)?([^/:?\s]+)(?:[/:?]|$)/i,
      )?.[0];

    var domain = result.url
      ?.replace(/(http:\/\/|https:\/\/|www.)/gi, "")
      .split("/")[0];

    let source = getDomainWithoutSuffix(domain).replace(/\b\w/g, (l) =>
      l.toUpperCase(),
    );
    // for small source names like CNN
    if (source.length < 5) source = source.toUpperCase();

    return {
      ...result,
      domain,
      favicon,
      source,
    };
  });
  return results;
  // } catch (error) {
  //   console.error(`Error fetching search results: ${error.message}`);
  //   return [];
  // }
}

/**
 * Converts URL-safe escaped HTML codes like &"'`&rsquo; & to standard HTML or in reverse.
 * @param {string} str - The string to process.
 * @param {boolean} toStandardHTML  default=true - If true, converts url-safe codes
 * to standard HTML. If false, converts standard HTML to url-safe codes.
 * @return {string} The processed string.
 * @category HTML Utilities
 * @example
 * var normalHTML = convertURLSafeHTMLToHTML('&lt;p&gt;This &amp; that &copy; 2023 '+
 * '&quot;Quotes&quot;&#39;Apostrophes&#39; &euro;100 &#x263A;&lt;/p&gt;', true)
 * console.log(normalHTML) // "<p>This & that \u00a9 2023 "Quotes" 'Apostrophes' \u20ac100 \u263a</p>"
 */
function convertURLSafeHTMLToHTML(str, toStandardHTML = true) {
  const entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    " ": "&nbsp;",
    "'": "&#39;",
    "`": "&#96;",
    "\u00a2": "&cent;",
    "\u00a3": "&pound;",
    "\u00a5": "&yen;",
    "\u20ac": "&euro;",
    "\u00a9": "&copy;",
    "\u00ae": "&reg;",
    "\u2122": "&trade;",
  };

  // Add numeric character references for Latin-1 Supplement characters
  for (let i = 160; i <= 255; i++) {
    entityMap[String.fromCharCode(i)] = `&#${i};`;
  }

  if (toStandardHTML) {
    // Create a reverse mapping for unescaping
    const reverseEntityMap = Object.fromEntries(
      Object.entries(entityMap).map(([k, v]) => [v, k]),
    );

    // Add alternative representations
    reverseEntityMap["&apos;"] = "'";
    reverseEntityMap["&laquo;"] = "\u00ab";
    reverseEntityMap["&raquo;"] = "\u00bb";

    // Regex to match all types of HTML entities
    const entityRegex = new RegExp(
      Object.keys(reverseEntityMap).join("|") + "|&#[0-9]+;|&#x[0-9a-fA-F]+;",
      "g",
    );

    str = str.replace(entityRegex, (entity) => {
      if (entity.startsWith("&#x")) {
        // Convert hexadecimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
      } else if (entity.startsWith("&#")) {
        // Convert decimal numeric character reference
        return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
      }
      // Convert named entity
      return reverseEntityMap[entity] || entity;
    });

    str = str.replace(/[\u0300-\u036f]/g, ""); //special chars

    return str;
  } else {
    // Regex to match all characters that need to be escaped
    const charRegex = new RegExp(`[${Object.keys(entityMap).join("")}]`, "g");
    return str.replace(charRegex, (char) => entityMap[char]);
  }
}

var sources = [
  ["google", "go", "The world's most popular search engine."],
  ["bing", "bi", "Microsoft's web search engine."],
  [
    "brave",
    "br",
    "Privacy-focused web browser with built-in search functionality.",
  ],
  [
    "duckduckgo",
    "ddg",
    "Privacy-oriented search engine that doesn't track users.",
  ],
  ["mojeek", "mjk", "Independent search engine that builds its own index."],
  [
    "presearch",
    "ps",
    "Decentralized search engine using blockchain technology.",
  ],
  ["presearch videos", "psvid", "Video search feature of Presearch."],
  ["qwant", "qw", "European privacy-focused search engine."],
  [
    "startpage",
    "sp",
    "Search engine that provides Google results with enhanced privacy.",
  ],
  ["wiby", "wib", "Search engine for older-style, minimal HTML websites."],
  [
    "yahoo",
    "yh",
    "Web services provider known for its search engine and email service.",
  ],
  [
    "naver (KO)",
    "nvr",
    "Major South Korean search engine and online platform.",
  ],
  ["wikibooks", "wb", "Wikimedia project for free textbooks and manuals."],
  ["wikiquote", "wq", "Wikimedia project collecting quotations."],
  ["wikisource", "ws", "Wikimedia library of source texts."],
  ["wikispecies", "wsp", "Wikimedia project cataloging species."],
  [
    "wikiversity",
    "wv",
    "Wikimedia project dedicated to learning resources and activities.",
  ],
  ["wikivoyage", "wy", "Wikimedia project for travel guides."],
  ["ask", "ask", "Question-answering search engine."],
  ["cloudflareai", "cfai", "AI services provided by Cloudflare."],
  ["crowdview", "cv", "Likely a crowdsourced information or review platform."],
  ["curlie", "cl", "Web directory maintained by volunteer editors."],
  ["dictzone", "dc", "Online dictionary and translation service."],
  ["libretranslate", "lt", "Open-source machine translation tool."],
  [
    "mymemory translated",
    "tl",
    "Translation memory service combining human and machine translations.",
  ],
  ["currency", "cc", "Currency conversion tool."],
  ["ddg definitions", "ddd", "Definition search using DuckDuckGo."],
  ["encyclosearch", "es", "Specialized search for encyclopedic content."],
  ["searchmysite", "sms", "Custom site search service."],
  ["stract", "str", "Likely a specialized or alternative search engine."],
  ["tineye", "tin", "Reverse image search engine."],
  ["wikidata", "wd", "Wikimedia's collaborative knowledge base."],
  ["wikipedia", "wp", "Free online encyclopedia."],
  ["wolframalpha", "wa", "Computational knowledge engine."],
  ["tagesschau (DE)", "ts", "Search for German news from Tagesschau."],
  ["wikimini (FR)", "wkmn", "French-language wiki encyclopedia for children."],
  ["bing images", "bii", "Image search by Microsoft's Bing."],
  ["brave.images", "brimg", "Image search feature of Brave browser."],
  ["duckduckgo images", "ddi", "Image search by DuckDuckGo."],
  ["google images", "goi", "Google's image search service."],
  ["mojeek images", "mjkimg", "Image search by Mojeek."],
  ["presearch images", "psimg", "Image search feature of Presearch."],
  ["qwant images", "qwi", "Image search by Qwant."],
  ["1x", "1x", "Curated photography platform."],
  ["artic", "arc", "Art Institute of Chicago's collection search."],
  ["deviantart", "da", "Online art community and platform."],
  ["findthatmeme", "ftm", "Meme search engine."],
  ["flickr", "fl", "Image and video hosting platform."],
  ["frinkiac", "frk", "Search engine for The Simpsons screenshots and quotes."],
  ["imgur", "img", "Image hosting and sharing platform."],
  ["library of congress", "loc", "Search for Library of Congress resources."],
  ["material icons", "mi", "Google's Material Design icon search."],
  ["openverse", "opv", "Search engine for openly licensed media."],
  ["pinterest", "pin", "Image sharing and social media platform."],
  ["svgrepo", "svg", "SVG file and icon repository."],
  ["unsplash", "us", "Platform for freely usable images."],
  ["wallhaven", "wh", "Wallpaper search engine and community."],
  ["wikicommons.images", "wc", "Wikimedia Commons image search."],
  ["yacy images", "yai", "Image search using the YaCy network."],
  ["yep images", "yepi", "Image search feature of Yep."],
  ["seekr images (EN)", "seimg", "Image search by Seekr."],
  ["bing videos", "biv", "Video search by Microsoft's Bing."],
  ["brave.videos", "brvid", "Video search feature of Brave browser."],
  ["duckduckgo videos", "ddv", "Video search by DuckDuckGo."],
  ["google videos", "gov", "Google's video search service."],
  ["qwant videos", "qwv", "Video search by Qwant."],
  ["bilibili", "bil", "Chinese video sharing website."],
  ["dailymotion", "dm", "Video-sharing platform."],
  ["google play movies", "gpm", "Google's movie and TV show service."],
  ["invidious", "iv", "Alternative front-end for YouTube."],
  ["livespace", "ls", "Likely a live streaming platform."],
  [
    "media.ccc.de",
    "c3tv",
    "Video platform for Chaos Computer Club conferences.",
  ],
  ["odysee", "od", "Blockchain-based video platform."],
  ["peertube", "ptb", "Decentralized video hosting network."],
  ["piped", "ppd", "Alternative privacy-friendly YouTube frontend."],
  ["rumble", "ru", "Video sharing platform."],
  ["sepiasearch", "sep", "Search engine for PeerTube videos."],
  ["vimeo", "vm", "Video hosting and sharing platform."],
  ["wikicommons.videos", "wcv", "Wikimedia Commons video search."],
  ["youtube", "yt", "Popular video sharing platform."],
  ["mediathekviewweb (DE)", "mvw", "German public television archive search."],
  ["seekr videos (EN)", "sevid", "Video search by Seekr."],
  ["ina (FR)", "in", "French National Audiovisual Institute archive search."],
  ["duckduckgo news", "ddn", "News search by DuckDuckGo."],
  ["mojeek news", "mjknews", "News search by Mojeek."],
  ["presearch news", "psnews", "News search feature of Presearch."],
  ["wikinews", "wn", "Wikimedia's collaborative news source."],
  ["bing news", "bin", "News search by Microsoft's Bing."],
  ["brave.news", "brnews", "News search feature of Brave browser."],
  ["google news", "gon", "Google's news aggregation service."],
  ["qwant news", "qwn", "News search by Qwant."],
  ["yahoo news", "yhn", "Yahoo's news service."],
  ["yep news", "yepn", "News search feature of Yep."],
  ["tagesschau (DE)", "ts", "German news from Tagesschau."],
  ["seekr news (EN)", "senews", "News search by Seekr."],
  ["apple maps", "apm", "Apple's mapping service."],
  ["openstreetmap", "osm", "Collaborative, open-source map."],
  ["photon", "ph", "Search engine for OpenStreetMap."],
  ["genius", "gen", "Song lyrics and annotation platform."],
  ["radio browser", "rb", "Search engine for radio stations."],
  ["bandcamp", "bc", "Music platform for independent artists."],
  ["deezer", "dz", "Music streaming service."],
  [
    "invidious",
    "iv",
    "Alternative front-end for YouTube, including music videos.",
  ],
  ["mixcloud", "mc", "Audio streaming platform for DJs and radio shows."],
  [
    "piped.music",
    "ppdm",
    "Music-focused feature of Piped (YouTube alternative).",
  ],
  ["soundcloud", "sc", "Audio distribution and music sharing platform."],
  ["wikicommons.audio", "wca", "Wikimedia Commons audio search."],
  ["youtube", "yt", "Video sharing platform, often used for music."],
  ["alpine linux packages", "alp", "Package search for Alpine Linux."],
  ["crates.io", "crates", "Registry of Rust packages."],
  ["docker hub", "dh", "Repository for Docker container images."],
  ["hex", "hex", "Package manager for the Erlang ecosystem."],
  ["hoogle", "ho", "Haskell API search engine."],
  ["lib.rs", "lrs", "Alternative crates.io front-end and Rust package index."],
  ["metacpan", "cpan", "Search engine for Perl modules."],
  ["npm", "npm", "Package manager for JavaScript."],
  ["packagist", "pack", "Package repository for PHP's Composer."],
  ["pkg.go.dev", "pgo", "Go package documentation."],
  ["pub.dev", "pd", "Package repository for Dart and Flutter."],
  ["pypi", "pypi", "Python Package Index."],
  ["rubygems", "rbg", "Package manager for Ruby."],
  ["voidlinux", "void", "Package search for Void Linux."],
  ["askubuntu", "ubuntu", "Q&A site for Ubuntu users."],
  ["caddy.community", "caddy", "Community forum for Caddy web server."],
  ["discuss.python", "dpy", "Official Python community discussion forum."],
  [
    "pi-hole.community",
    "pi",
    "Community forum for Pi-hole ad-blocking software.",
  ],
  ["stackoverflow", "st", "Q&A site for programmers."],
  ["superuser", "su", "Q&A site for computer enthusiasts and power users."],
  ["bitbucket", "bb", "Web-based version control repository hosting service."],
  ["codeberg", "cb", "Open-source code hosting platform."],
  ["gitea.com", "gitea", "Self-hosted Git service."],
  ["github", "gh", "Web-based hosting service for version control using Git."],
  ["gitlab", "gl", "Web-based DevOps lifecycle tool."],
  ["sourcehut", "srht", "Suite of open source software development tools."],
  ["arch linux wiki", "al", "Comprehensive documentation for Arch Linux."],
  ["free software directory", "fsd", "Catalog of free software."],
  ["gentoo", "ge", "Wiki for Gentoo Linux distribution."],
  ["anaconda", "conda", "Package manager for scientific computing."],
  ["cppreference", "cpp", "Reference for the C++ programming language."],
  [
    "habrahabr",
    "habr",
    "Russian collaborative blog about IT and computer science.",
  ],
  [
    "hackernews",
    "hn",
    "Social news website focusing on computer science and entrepreneurship.",
  ],
  ["lobste.rs", "lo", "Technology-focused link-aggregation site."],
  ["mankier", "man", "Web-based man page viewer."],
  ["mdn", "mdn", "Mozilla Developer Network documentation."],
  ["searchcode code", "scc", "Source code search engine."],
  ["arxiv", "arx", "Repository of electronic preprints for scientific papers."],
  ["crossref", "cr", "Official Digital Object Identifier Registration Agency."],
  [
    "google scholar",
    "gos",
    "Google\'s search engine for scholarly literature.",
  ],
  [
    "internetarchivescholar",
    "ias",
    "Search engine for scholarly works in Internet Archive.",
  ],
  ["pubmed", "pub", "Search engine for biomedical literature."],
  [
    "semantic scholar",
    "se",
    "AI-powered research tool for scientific literature.",
  ],
  ["wikispecies", "wsp", "Wikimedia project cataloging species."],
  ["openairedatasets", "oad", "Search for open access datasets."],
  ["openairepublications", "oap", "Search for open access publications."],
  ["pdbe", "pdb", "Protein Data Bank in Europe."],
  ["apk mirror", "apkm", "Repository of Android APK files."],
  ["apple app store", "aps", "Official app store for iOS devices."],
  ["fdroid", "fd", "App store for Free and Open Source Software on Android."],
  ["google play apps", "gpa", "Official app store for Android devices."],
  ["9gag", "9g", "Social media platform for sharing humor content."],
  ["lemmy posts", "lepo", "Post search for Lemmy."],
  [
    "mastodon hashtags",
    "mah",
    "Hashtag search for the Mastodon social network.",
  ],
  ["reddit", "re", "Social news and discussion website."],
  [
    "tootfinder",
    "toot",
    "Search engine for Mastodon and other federated networks.",
  ],
];

var sources_copyleft = [
  ["1337x", "1337x", "Torrent search engine."],
  ["annas archive", "aa", "Search engine for shadow libraries."],
  ["bt4g", "bt4g", "Torrent search engine."],
  ["btdigg", "bt", "BitTorrent DHT search engine."],
  ["kickass", "kc", "Torrent search engine."],
  [
    "library genesis",
    "lg",
    "File-sharing site for scholarly journal articles and books.",
  ],
  ["nyaa", "nt", "BitTorrent site focused on East Asian media."],
  ["openrepos", "or", "Repository for mobile apps."],
  ["piratebay", "tpb", "Well-known torrent site."],
  ["solidtorrents", "solid", "Decentralized torrent search engine."],
  ["tokyotoshokan", "tt", "BitTorrent site focused on Asian media."],
  ["wikicommons.files", "wcf", "File search on Wikimedia Commons."],
  ["z-library", "zlib", "Shadow library for books and articles."],
];
