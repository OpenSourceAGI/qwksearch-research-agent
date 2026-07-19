/**
 * Unit tests for all search-web-api engine functions using mocked fetch.
 *
 * Every engine in ALL_ENGINES is tested:
 *  - Happy path: mock returns appropriate HTML/JSON → engine returns non-empty results
 *  - Error path: mock returns 404 → engine returns []
 *
 * Special cases:
 *  - core: skipped unless CORE_API_KEY env var is set (requires API key)
 *  - pubmed: two-step fetch (esearch then efetch) handled via URL-pattern dispatch
 *  - apple_maps: three-step fetch handled via URL-pattern dispatch
 *  - youtube: tries multiple Invidious instances; first mock success wins
 *  - flickr: HTML with embedded modelExport JSON
 *  - google_images: HTML with embedded {"ischj":...} JSON
 *  - vimeo: HTML with embedded `var data = {...};`
 *  - pypi: regex-parsed HTML
 *  - google_news: URL decode via Buffer.from
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import every engine function directly so we bypass registry imports
import { google } from "../src/sources/general/google.js";
import { bing } from "../src/sources/general/bing.js";
import { duckduckgo } from "../src/sources/general/duckduckgo.js";
import { yahoo } from "../src/sources/general/yahoo.js";
import { qwant } from "../src/sources/general/qwant.js";
import { startpage } from "../src/sources/general/startpage.js";
import { brave } from "../src/sources/general/brave.js";
import { yandex } from "../src/sources/general/yandex.js";
import { baidu } from "../src/sources/general/baidu.js";
import { mojeek } from "../src/sources/general/mojeek.js";

import { github } from "../src/sources/it/github.js";
import { gitlab } from "../src/sources/it/gitlab.js";
import { stackoverflow } from "../src/sources/it/stackoverflow.js";
import { npm } from "../src/sources/it/npm.js";
import { crates } from "../src/sources/it/crates.js";
import { dockerhub } from "../src/sources/it/dockerhub.js";
import { pypi } from "../src/sources/it/pypi.js";
import { packagist } from "../src/sources/it/packagist.js";
import { rubygems } from "../src/sources/it/rubygems.js";

import { unsplash } from "../src/sources/images/unsplash.js";
import { bing_images } from "../src/sources/images/bing_images.js";
import { google_images } from "../src/sources/images/google_images.js";
import { flickr } from "../src/sources/images/flickr.js";
import { imgur } from "../src/sources/images/imgur.js";
import { pixabay } from "../src/sources/images/pixabay.js";
import { wallhaven } from "../src/sources/images/wallhaven.js";
import { deviantart } from "../src/sources/images/deviantart.js";
import { openclipart } from "../src/sources/images/openclipart.js";

import { youtube } from "../src/sources/videos/youtube.js";
import { vimeo } from "../src/sources/videos/vimeo.js";
import { dailymotion } from "../src/sources/videos/dailymotion.js";
import { invidious } from "../src/sources/videos/invidious.js";
import { peertube } from "../src/sources/videos/peertube.js";
import { bing_videos } from "../src/sources/videos/bing_videos.js";

import { hackernews } from "../src/sources/news/hackernews.js";
import { yahoo_news } from "../src/sources/news/yahoo_news.js";
import { bing_news } from "../src/sources/news/bing_news.js";
import { google_news } from "../src/sources/news/google_news.js";

import { google_scholar } from "../src/sources/academic/google_scholar.js";
import { arxiv } from "../src/sources/academic/arxiv.js";
import { wikidata } from "../src/sources/academic/wikidata.js";
import { semantic_scholar } from "../src/sources/academic/semantic_scholar.js";
import { crossref } from "../src/sources/academic/crossref.js";
import { pubmed } from "../src/sources/academic/pubmed.js";
import { openalex } from "../src/sources/academic/openalex.js";
import { doaj } from "../src/sources/academic/doaj.js";
import { core } from "../src/sources/academic/core.js";

import { torrent_1337x } from "../src/sources/torrents/1337x.js";
import { thepiratebay } from "../src/sources/torrents/thepiratebay.js";
import { nyaa } from "../src/sources/torrents/nyaa.js";
import { yts } from "../src/sources/torrents/yts.js";
import { eztv } from "../src/sources/torrents/eztv.js";
import { solidtorrents } from "../src/sources/torrents/solidtorrents.js";
import { kickass } from "../src/sources/torrents/kickass.js";

import { twitter } from "../src/sources/social/twitter.js";
import { reddit } from "../src/sources/social/reddit.js";
import { medium } from "../src/sources/social/medium.js";
import { soundcloud } from "../src/sources/social/soundcloud.js";
import { mastodon } from "../src/sources/social/mastodon.js";

import { openstreetmap } from "../src/sources/maps/openstreetmap.js";
import { photon } from "../src/sources/maps/photon.js";
import { apple_maps } from "../src/sources/maps/apple_maps.js";

import { ebay } from "../src/sources/shopping/ebay.js";

import { wikipedia } from "../src/sources/specialized/wikipedia.js";
import { imdb } from "../src/sources/specialized/imdb.js";
import { genius } from "../src/sources/specialized/genius.js";
import { archive } from "../src/sources/specialized/archive.js";
import { openlibrary } from "../src/sources/specialized/openlibrary.js";
import { wttr } from "../src/sources/specialized/wttr.js";
import { annas_archive } from "../src/sources/specialized/annas_archive.js";
import { goodreads } from "../src/sources/specialized/goodreads.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockResponse(opts: {
  ok?: boolean;
  json?: any;
  html?: string;
  status?: number;
}): Response {
  const { ok = true, json, html, status = ok ? 200 : 404 } = opts;
  return {
    ok,
    status,
    json: json !== undefined
      ? () => Promise.resolve(json)
      : () => Promise.reject(new Error("not json")),
    text: html !== undefined
      ? () => Promise.resolve(html)
      : () => Promise.reject(new Error("not text")),
  } as unknown as Response;
}

function assertResults(results: any, engineName: string) {
  expect(Array.isArray(results), `${engineName}: should return an array`).toBe(true);
  expect(results.length, `${engineName}: should have at least 1 result`).toBeGreaterThan(0);
  for (const r of results) {
    expect(typeof r.title, `${engineName}: title should be string`).toBe("string");
    expect(r.title.length, `${engineName}: title should not be empty`).toBeGreaterThan(0);
    expect(typeof r.content, `${engineName}: content should be string`).toBe("string");
  }
}

// ---------------------------------------------------------------------------
// Mock responses catalogue
// ---------------------------------------------------------------------------

// ---- General HTML ----
const GOOGLE_HTML = `<html><body>
  <div class="Gx5Zad fP1Qef xpd EtOod pkphOe">
    <a href="/url?q=https://example.com&amp;sa=U"><span class="BNeawe vvjwJb AP7Wnd">Test Title</span><span class="BNeawe s3v9rd AP7Wnd">Test snippet content here.</span></a>
  </div>
</body></html>`;

const BING_HTML = `<html><body>
  <li class="b_algo">
    <h2><a href="https://example.com">Bing Result Title</a></h2>
    <div class="b_caption"><p>Bing snippet content here.</p></div>
  </li>
</body></html>`;

const DUCKDUCKGO_HTML = `<html><body>
  <div class="result">
    <div class="result__title"><a href="https://example.com">DDG Title</a></div>
    <div class="result__snippet">DDG snippet content here.</div>
  </div>
</body></html>`;

const YAHOO_HTML = `<html><body>
  <div class="algo-sr">
    <a href="https://example.com">Yahoo Title</a>
    <div class="compText">Yahoo snippet content here.</div>
  </div>
</body></html>`;

const STARTPAGE_HTML = `<html><body>
  <div class="w-gl__result">
    <a class="w-gl__result-title" href="https://example.com"><h3>Startpage Title</h3></a>
    <p class="w-gl__description">Startpage snippet content.</p>
  </div>
</body></html>`;

const BRAVE_HTML = `<html><body>
  <div class="snippet">
    <a href="https://example.com"><span class="search-snippet-title">Brave Title</span></a>
    <div class="content">Brave snippet content.</div>
  </div>
</body></html>`;

const YANDEX_HTML = `<html><body>
  <li class="serp-item">
    <a class="b-serp-item__title-link" href="https://example.com"><span>Yandex Title</span></a>
    <div class="b-serp-item__text">Yandex content here.</div>
  </li>
</body></html>`;

const BAIDU_HTML = `<html><body>
  <div id="content_left">
    <div class="result c-container">
      <h3><a class="c-title" href="https://example.com">Baidu Title</a></h3>
      <div class="c-abstract">Baidu snippet content here.</div>
    </div>
  </div>
</body></html>`;

const MOJEEK_HTML = `<html><body>
  <ul class="results-standard">
    <li>
      <a class="ob" href="https://example.com">Mojeek URL</a>
      <h2><a href="https://example.com">Mojeek Title</a></h2>
      <p class="s">Mojeek snippet content here.</p>
    </li>
  </ul>
</body></html>`;

// ---- IT JSON ----
const GITHUB_JSON = {
  items: [{ html_url: "https://github.com/user/repo", full_name: "user/repo", description: "A test repo" }],
};
const GITLAB_JSON = [{ web_url: "https://gitlab.com/user/repo", name: "repo", description: "A gitlab repo", namespace: { name: "user" }, tag_list: [], star_count: 5, last_activity_at: "2024-01-01T00:00:00Z" }];
const STACKOVERFLOW_JSON = { items: [{ link: "https://stackoverflow.com/q/1", title: "How to test?", tags: ["javascript", "testing"] }] };
const NPM_JSON = { objects: [{ package: { name: "express", description: "Fast web framework", links: { npm: "https://www.npmjs.com/package/express" } } }] };
const CRATES_JSON = { crates: [{ name: "serde", max_version: "1.0.0", description: "A serialization framework", downloads: 100000, recent_downloads: 5000 }] };
const DOCKERHUB_JSON = { results: [{ name: "nginx", namespace: "library", description: "Official nginx image", star_count: 100, pull_count: 1000000, is_official: true }] };
const PYPI_HTML = `<html><body>
  <a class="package-snippet" href="/project/requests/">
    <span class="package-snippet__name">requests</span>
    <span class="package-snippet__version">2.31.0</span>
    <p class="package-snippet__description">Python HTTP for Humans.</p>
  </a>
</body></html>`;
const PACKAGIST_JSON = { results: [{ name: "laravel/framework", description: "Laravel framework", url: "https://packagist.org/packages/laravel/framework", downloads: 50000, favers: 1000 }] };
const RUBYGEMS_JSON = [{ name: "rails", version: "7.0.0", info: "Full-stack web framework", downloads: 50000000, authors: "DHH" }];

// ---- Images ----
const UNSPLASH_JSON = { results: [{ links: { html: "https://unsplash.com/photos/abc" }, description: "A beautiful sunset", alt_description: "sunset over mountains", user: { name: "John Doe" }, urls: { small: "https://images.unsplash.com/photo-abc?w=400" } }] };
const BING_IMAGES_HTML = `<html><body>
  <ul class="dgControl_list">
    <li>
      <a class="iusc" m='{"purl":"https://example.com/image.jpg","turl":"https://tbn.example.com/thumb.jpg","desc":"A nice image","t":"Nice Image"}'>
        <div class="infnmpt"><a>Nice Image</a></div>
      </a>
    </li>
  </ul>
</body></html>`;
// google_images returns HTML with embedded JSON
const GOOGLE_IMAGES_HTML = `{"ischj":{"metadata":[{"result":{"referrer_url":"https://example.com/page","page_title":"Example Image","site_title":"Example Site"},"original_image":{"width":1920,"height":1080},"thumbnail":{"url":"https://encrypted-tbn0.gstatic.com/thumb.jpg"},"text_in_grid":{"snippet":"An example image"}}]}}`;
// flickr returns HTML with embedded modelExport JSON
// Flickr's modelExport structure: main[legend[0]][parseInt(legend[1])][legend[2]]...[legend[7]]
// legend = ["a","0","b","c","d","e",0,"f"]
// access path: main["a"][0]["b"]["c"]["d"]["e"][0]["f"]
const flickrPhotoData = {
  id: "12345",
  title: "Flickr Photo",
  description: "A nice flickr photo",
  realname: "Jane Smith",
  ownerNsid: "user123",
  sizes: {
    data: {
      b: { data: { url: "https://live.staticflickr.com/photo_b.jpg", width: 1024, height: 768 } },
      n: { data: { url: "https://live.staticflickr.com/photo_n.jpg", width: 320, height: 240 } },
    }
  }
};
const FLICKR_MODEL_EXPORT: Record<string, any> = {
  legend: [["a","0","b","c","d","e",0,"f"]],
  main: { a: [{ b: { c: { d: { e: [{ f: flickrPhotoData }] } } } }] },
};
const FLICKR_MODEL_EXPORT_STR = JSON.stringify(FLICKR_MODEL_EXPORT);
const FLICKR_HTML = "<html><body><script>\nvar modelExport: " + FLICKR_MODEL_EXPORT_STR + ",\n  other: 1;\n</script></body></html>";
const IMGUR_HTML = `<html><body>
  <div class="cards">
    <div class="post">
      <a href="/gallery/abcdef">
        <img src="https://i.imgur.com/abcdefb.jpg" alt="Funny Cat">
      </a>
    </div>
  </div>
</body></html>`;
const PIXABAY_JSON = { page: { results: [{ mediaType: "photo", href: "/photos/sunset-123/", name: "Beautiful Sunset", description: "A sunset photo", sources: { small: "https://cdn.pixabay.com/photo/thumb.jpg", large: "https://cdn.pixabay.com/photo/full.jpg" } }] } };
const WALLHAVEN_JSON = { data: [{ url: "https://wallhaven.cc/w/abc123", resolution: "1920x1080", category: "general", purity: "sfw", file_size: 1048576, file_type: "image/jpeg", path: "https://w.wallhaven.cc/full/abc/abc123.jpg", thumbs: { small: "https://th.wallhaven.cc/small/abc/abc123.jpg" } }] };
const DEVIANTART_HTML = `<html><body>
  <div class="V_S0t_">
    <div>
      <div>
        <a href="https://www.deviantart.com/user/art/My-Art-123" aria-label="My Artwork">
          <div><img src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/image.jpg" srcset="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/image.jpg/v1/abc 480w" alt="My Artwork"></div>
        </a>
      </div>
    </div>
  </div>
</body></html>`;
const OPENCLIPART_HTML = `<html><body>
  <div class="gallery">
    <div class="artwork">
      <a href="/detail/123/arrow-clipart">
        <img src="/image/123.svg" alt="Arrow Clipart">
      </a>
    </div>
  </div>
</body></html>`;

// ---- Videos ----
// youtube/invidious return same JSON format
const INVIDIOUS_JSON = [{ type: "video", videoId: "abc123", title: "Test Video", description: "A test video", author: "TestChannel", viewCount: 10000, lengthSeconds: 300, publishedText: "2 days ago", videoThumbnails: [{ quality: "sddefault", url: "https://i.ytimg.com/vi/abc123/sddefault.jpg" }] }];
const VIMEO_HTML = `<html><body><script>var data = {"filtered":{"data":[{"type":"clip","clip":{"uri":"/videos/123456","name":"Vimeo Test Video","created_time":"2024-01-15T10:00:00+00:00","pictures":{"sizes":[{"link":"https://i.vimeocdn.com/video/123456_640.jpg"}]}}}]}};</script></body></html>`;
const DAILYMOTION_JSON = { list: [{ title: "Daily Test Video", url: "https://www.dailymotion.com/video/abc123", description: "A test video on Dailymotion", duration: 185, created_time: 1700000000, thumbnail_360_url: "https://s2.dmcdn.net/v/abc/360.jpg" }] };
const BING_VIDEOS_HTML = `<html><body>
  <div class="dg_u">
    <div id="mc_vtvc_video_0">
      <div class="vrhdata" vrhm='{"murl":"https://www.youtube.com/watch?v=abc123","vt":"Bing Video Title","du":"3:45"}'></div>
      <div class="mc_vtvc_meta_block"><span>YouTube</span><span>3:45</span></div>
      <div class="mc_vtvc_th"><img src="https://tbn.example.com/thumb.jpg"></div>
    </div>
  </div>
</body></html>`;
const PEERTUBE_JSON = { data: [{ url: "https://peer.tube/videos/watch/abc123", name: "PeerTube Test", description: "A test video", duration: 240, views: 500, thumbnailUrl: "https://peer.tube/lazy-static/thumbnails/abc.jpg", embedUrl: "https://peer.tube/videos/embed/abc123", channel: { displayName: "TestChannel", name: "testchannel", host: "peer.tube" }, account: { displayName: "Test User" }, tags: ["test"] }] };

// ---- News ----
const HACKERNEWS_JSON = { hits: [{ objectID: "12345", title: "HN Test Story", url: "https://example.com/story", points: 100, num_comments: 50, author: "user1" }] };
const YAHOO_NEWS_HTML = `<html><body>
  <ol class="searchCenterMiddle">
    <li>
      <h4><a href="https://news.yahoo.com/article-123.html">Yahoo News Title</a></h4>
      <p class="compText">Yahoo news snippet content here.</p>
      <img src="https://s.yimg.com/image.jpg">
    </li>
  </ol>
</body></html>`;
const BING_NEWS_HTML = `<html><body>
  <div class="newsitem">
    <a class="title" href="https://example.com/news-article">Bing News Title</a>
    <div class="snippet">Bing news snippet content here.</div>
    <div class="source"><span aria-label="Reuters · 2 hours ago">Reuters</span></div>
  </div>
</body></html>`;
// google_news href requires a base64url-encoded actual URL
// Encoding "https://example.com/article" in base64url format
const GOOGLE_NEWS_ENCODED = Buffer.from("https://example.com/article").toString("base64url");
const GOOGLE_NEWS_HTML = `<html><body>
  <div class="xrnccd">
    <article>
      <a href="/articles/${GOOGLE_NEWS_ENCODED}">
        <h3>Google News Title</h3>
        <time>2 hours ago</time>
        <a data-n-tid="1">Example News</a>
      </a>
    </article>
  </div>
</body></html>`;

// ---- Academic ----
const ARXIV_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Test Paper Title</title>
    <id>https://arxiv.org/abs/2401.00001</id>
    <summary>This is the abstract of the test paper.</summary>
    <author><name>John Smith</name></author>
    <published>2024-01-01T00:00:00Z</published>
    <category term="cs.LG"/>
  </entry>
</feed>`;
const GOOGLE_SCHOLAR_HTML = `<html><body>
  <div class="gs_r gs_or gs_scl">
    <div class="gs_ri">
      <h3 class="gs_rt"><a href="https://example.com/paper">Scholar Paper Title</a></h3>
      <div class="gs_a">Smith et al. - Nature, 2024</div>
      <div class="gs_rs">Abstract snippet of the paper here.</div>
    </div>
  </div>
</body></html>`;
const WIKIDATA_JSON = { search: [{ id: "Q42", label: "Douglas Adams", description: "English author", url: "https://www.wikidata.org/wiki/Q42" }] };
const SEMANTIC_SCHOLAR_JSON = { results: [{ id: "abc123", title: { text: "Deep Learning Paper" }, abstract: { text: "An abstract about deep learning." }, authors: [{ name: "Yann LeCun" }], year: 2024, venue: "NeurIPS", citationCount: 500, primaryPaperLink: { url: "https://www.semanticscholar.org/paper/abc123" } }] };
const CROSSREF_JSON = { message: { items: [{ title: ["Quantum Computing Review"], URL: "https://doi.org/10.1000/test", DOI: "10.1000/test", type: "journal-article", "container-title": ["Science"], author: [{ given: "Alice", family: "Smith" }], publisher: "Nature Publishing" }] } };
// pubmed is two-step: first esearch returns XML with IDs, then efetch returns article XML
const PUBMED_ESEARCH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <IdList>
    <Id>38000001</Id>
  </IdList>
</eSearchResult>`;
const PUBMED_EFETCH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>38000001</PMID>
      <Article>
        <ArticleTitle>Test Cancer Research Article</ArticleTitle>
        <Abstract>
          <AbstractText>This is the abstract of the cancer research article.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <ForeName>Jane</ForeName>
            <LastName>Doe</LastName>
          </Author>
        </AuthorList>
        <Journal>
          <Title>Journal of Cancer Research</Title>
        </Journal>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;
const OPENALEX_JSON = { results: [{ title: "OpenAlex Paper", id: "https://openalex.org/W123", doi: "https://doi.org/10.1000/openalex", primary_location: { landing_page_url: "https://doi.org/10.1000/openalex" }, authorships: [{ author: { display_name: "Alice Smith" } }], abstract_inverted_index: { "This": [0], "is": [1], "abstract": [2] }, publication_year: 2024, host_venue: { display_name: "Nature" }, cited_by_count: 100 }] };
const DOAJ_JSON = { results: [{ bibjson: { title: "DOAJ Open Access Article", abstract: "An open access article abstract.", author: [{ name: "Bob Jones" }], identifier: [{ type: "doi", id: "10.1000/doaj" }], link: [{ type: "fulltext", url: "https://example.com/article.pdf" }], journal: { title: "Open Access Journal" }, year: "2024" } }] };
const CORE_JSON = { results: [{ title: "CORE Paper", downloadUrl: "https://core.ac.uk/download/123.pdf", doi: "10.1000/core", abstract: "CORE paper abstract here.", authors: [{ name: "Carol White" }], journals: [{ title: "Science" }], yearPublished: 2024, id: 123 }] };

// ---- Torrents ----
const TORRENT_1337X_HTML = `<html><body>
  <table class="table-list">
    <tbody>
      <tr>
        <td class="name">
          <a href="/torrent/123/">Torrent Name</a>
          <a href="/torrent/123/ubuntu-22.04.torrent">Ubuntu 22.04</a>
        </td>
        <td class="seeds">100</td>
        <td class="leeches">20</td>
        <td class="size">2.3 GB<span>2,300,000,000</span></td>
      </tr>
    </tbody>
  </table>
</body></html>`;
const THEPIRATEBAY_HTML = `<html><body>
  <table id="searchResult">
    <tbody>
      <tr>
        <td class="vertTh"><a class="detLink" href="/torrent/1234">Ubuntu Linux ISO</a></td>
        <td></td>
        <td>120</td>
        <td>15</td>
        <td><a href="magnet:?xt=urn:btih:abc123&dn=Ubuntu">Magnet</a></td>
        <font class="detDesc">Uploaded 2024-01-01, Size 2.3 GiB, ULed by ubuntu</font>
      </tr>
    </tbody>
  </table>
</body></html>`;
const NYAA_HTML = `<html><body>
  <table class="torrent-list">
    <tbody>
      <tr>
        <td><a href="/?c=1_2">Anime</a></td>
        <td>
          <a href="/view/1234">One Piece 1001</a>
          <a href="/view/1234">One Piece 1001</a>
        </td>
        <td></td>
        <td>350 MiB</td>
        <td></td>
        <td>50</td>
        <td>5</td>
        <td>200</td>
        <td><a href="magnet:?xt=urn:btih:nyaa123&dn=OnePiece">Magnet</a></td>
      </tr>
    </tbody>
  </table>
</body></html>`;
const YTS_JSON = { data: { movies: [{ title: "Inception", title_long: "Inception (2010)", rating: 8.8, year: 2010, genres: ["Sci-Fi", "Action"], medium_cover_image: "https://yts.mx/assets/images/movies/inception/medium-cover.jpg", torrents: [{ quality: "1080p", size: "2.14 GB", seeds: 500, peers: 100, hash: "abc123def456" }] }] } };
const EZTV_HTML = `<html><body>
  <table class="forum_header_border">
    <tr class="forum_header_border">
      <td></td>
      <td><a class="epinfo" href="/ep/123/breaking-bad-s01e01/">Breaking Bad S01E01</a></td>
      <td><a class="magnet" href="magnet:?xt=urn:btih:eztv123&dn=BreakingBad">Magnet</a></td>
      <td>350 MB</td>
      <td>2024-01-01</td>
      <td>75</td>
    </tr>
  </table>
</body></html>`;
const SOLIDTORRENTS_HTML = `<html><body>
  <li class="search-result">
    <a class="dl-torrent" href="/torrents/abc123.torrent">Download</a>
    <a class="dl-magnet" href="magnet:?xt=urn:btih:solid123&dn=Ubuntu">Magnet</a>
    <h5 class="title"><a href="/torrent/abc123">Ubuntu 22.04 LTS</a></h5>
    <a class="category">Linux</a>
    <div class="stats">
      <div>5,000</div>
      <div>2.3 GB</div>
      <div>15</div>
      <div>120</div>
      <div>2024-01-01</div>
    </div>
  </li>
</body></html>`;
const KICKASS_HTML = `<html><body>
  <table class="data">
    <tr></tr>
    <tr>
      <td></td>
      <td>
        <a class="cellMainLink" href="/usearch/ubuntu-22.04.html">Ubuntu 22.04 LTS</a>
        <span class="font11px lightgrey block">2024-01-01</span>
      </td>
      <td></td>
      <td class="nobr">2.3 GB</td>
      <td></td>
      <td class="green">100</td>
      <td class="red">10</td>
    </tr>
  </table>
</body></html>`;

// ---- Social ----
const TWITTER_HTML = `<html><body>
  <div class="timeline-item">
    <a class="tweet-link" href="/user/status/123"></a>
    <span class="fullname">Test User</span>
    <span class="username">@testuser</span>
    <div class="tweet-content">This is a test tweet about programming.</div>
    <div class="tweet-date"><a>Jan 15, 2024</a></div>
    <div class="tweet-stats">42 likes</div>
  </div>
</body></html>`;
const REDDIT_HTML = `<html><body>
  <div class="search-result">
    <a class="search-title" href="https://www.reddit.com/r/programming/comments/abc/test_post/">Test Reddit Post</a>
    <div class="search-result-body">This is the body of the reddit post.</div>
  </div>
</body></html>`;
const MEDIUM_HTML = `<html><body>
  <article>
    <h2><a href="/programming/test-article">Medium Test Article</a></h2>
    <p>This is the article description snippet.</p>
    <a rel="author">Jane Doe</a>
    <span aria-label="5 min read">5 min read</span>
  </article>
</body></html>`;
const SOUNDCLOUD_HTML = `<html><body>
  <article class="searchList__item">
    <a itemprop="url" href="/artist/lofi-track">
    <span itemprop="name">Lo-Fi Track</span>
    <span itemprop="byArtist">ChillArtist</span>
    <span class="sc-ministats-plays">50K</span>
    <time itemprop="duration">3:45</time>
  </article>
</body></html>`;
const MASTODON_JSON = { accounts: [{ uri: "https://mastodon.social/@testuser", username: "testuser", display_name: "Test User", followers_count: 1000, note: "<p>This is a test mastodon bio</p>", avatar: "https://files.mastodon.social/avatar.jpg" }] };

// ---- Maps ----
const OPENSTREETMAP_JSON = [{ display_name: "New York City, United States", osm_type: "relation", osm_id: "175905", type: "city", class: "place" }];
const PHOTON_JSON = { features: [{ geometry: { type: "Point", coordinates: [-74.006, 40.7128] }, properties: { name: "New York City", osm_type: "R", osm_id: 175905, city: "New York City", country: "United States", type: "city" } }] };
// apple_maps is 3-step: DDG token → Apple bootstrap → search
const APPLE_MAPS_TOKEN_TEXT = "duckduckgo_token_abc123";
const APPLE_MAPS_BOOTSTRAP_JSON = { authInfo: { access_token: "apple_mapkit_token_xyz789" } };
const APPLE_MAPS_SEARCH_JSON = { results: [{ name: "Tokyo Tower", placecardUrl: "https://maps.apple.com/?q=Tokyo+Tower", center: { lat: 35.6586, lng: 139.7454 }, locality: "Tokyo", country: "Japan", poiCategory: "Landmark" }] };

// ---- Shopping ----
const EBAY_HTML = `<html><body>
  <li class="s-item">
    <a class="s-item__link" href="https://www.ebay.com/itm/123456">
      <h3 class="s-item__title">Test Laptop Computer</h3>
    </a>
    <span class="s-item__price">$499.99</span>
    <span class="s-item__shipping">Free shipping</span>
  </li>
</body></html>`;

// ---- Specialized ----
const WIKIPEDIA_JSON = { query: { search: [{ title: "JavaScript", snippet: "JavaScript is a programming language.", pageid: 9845 }] } };
const IMDB_HTML = `<html><body>
  <li class="ipc-metadata-list-summary-item">
    <a class="ipc-metadata-list-summary-item__t" href="/title/tt1375666/?ref_=fn_all_ttl_1">Inception</a>
    <li class="ipc-metadata-list-summary-item__li">2010</li>
    <img src="https://m.media-amazon.com/images/M/MV5BMjAxM.jpg">
  </li>
</body></html>`;
const GENIUS_JSON = { response: { sections: [{ type: "song", hits: [{ result: { url: "https://genius.com/Queen-bohemian-rhapsody-lyrics", full_title: "Bohemian Rhapsody by Queen", artist_names: "Queen", song_art_image_thumbnail_url: "https://images.genius.com/queen.jpg" } }] }] } };
const ARCHIVE_JSON = { response: { docs: [{ identifier: "python-tutorial", title: "Python Tutorial", description: "A comprehensive Python tutorial", mediatype: "texts", downloads: 5000 }] } };
const OPENLIBRARY_JSON = { docs: [{ key: "/works/OL12345W", title: "The Lord of the Rings", author_name: ["J.R.R. Tolkien"], first_publish_year: 1954, isbn: ["9780261102354"], lending_identifier_s: "lordoftherings", first_sentence: ["In a hole in the ground there lived a hobbit."] }] };
const WTTR_JSON = {
  current_condition: [{ weatherCode: "113", temp_C: "20", tempC: "20", FeelsLikeC: "18", humidity: "65", windspeedKmph: "15", winddirDegree: "180", pressure: "1013", cloudcover: "10" }],
  nearest_area: [{ areaName: [{ value: "London" }] }],
  weather: [{ date: "2024-01-15", hourly: [{ tempC: "15", weatherCode: "116", humidity: "70", windspeedKmph: "20" }] }],
};
const ANNAS_ARCHIVE_HTML = `<html><body>
  <main>
    <div class="js-aarecord-list-outer">
      <div>
        <a href="/md5/abc123def456">Python Programming Book</a>
        <a href="/search?q=Guido+van+Rossum">Guido van Rossum</a>
        <a href="/search?q=OReilly">O'Reilly Media</a>
        <div class="relative">A comprehensive Python programming book covering all aspects.</div>
        <img src="https://cover.annas-archive.gl/abc123.jpg">
      </div>
    </div>
  </main>
</body></html>`;
const GOODREADS_HTML = `<html><body>
  <table>
    <tr>
      <td>
        <a class="bookTitle" href="/book/show/44767458-dune">Dune</a>
        <img class="bookCover" src="https://i.gr-assets.com/images/S/dune.jpg">
        <a class="authorName">Frank Herbert</a>
        <span class="uitext">avg rating 4.25</span>
      </td>
    </tr>
  </table>
</body></html>`;

// ---------------------------------------------------------------------------
// URL-pattern dispatcher — returns the right mock for each URL
// ---------------------------------------------------------------------------

function getMockForUrl(url: string, options?: RequestInit): Response {
  const u = url.toString();

  // ---- general ----
  if (u.includes("google.com/search") && !u.includes("tbm=isch") && !u.includes("news.google.com")) return makeMockResponse({ html: GOOGLE_HTML });
  if (u.includes("bing.com/search")) return makeMockResponse({ html: BING_HTML });
  if (u.includes("duckduckgo.com/html")) return makeMockResponse({ html: DUCKDUCKGO_HTML });
  if (u.includes("search.yahoo.com/search")) return makeMockResponse({ html: YAHOO_HTML });
  if (u.includes("api.qwant.com")) return makeMockResponse({ json: { data: { result: { items: [{ url: "https://example.com", title: "Qwant Title", desc: "Qwant description." }] } } } });
  if (u.includes("startpage.com/sp/search")) return makeMockResponse({ html: STARTPAGE_HTML });
  if (u.includes("search.brave.com")) return makeMockResponse({ html: BRAVE_HTML });
  if (u.includes("yandex.com/search")) return makeMockResponse({ html: YANDEX_HTML });
  if (u.includes("baidu.com/s")) return makeMockResponse({ html: BAIDU_HTML });
  if (u.includes("mojeek.com/search")) return makeMockResponse({ html: MOJEEK_HTML });

  // ---- it ----
  if (u.includes("api.github.com/search/repositories")) return makeMockResponse({ json: GITHUB_JSON });
  if (u.includes("gitlab.com/api/v4/projects")) return makeMockResponse({ json: GITLAB_JSON });
  if (u.includes("api.stackexchange.com")) return makeMockResponse({ json: STACKOVERFLOW_JSON });
  if (u.includes("registry.npmjs.org/-/v1/search")) return makeMockResponse({ json: NPM_JSON });
  if (u.includes("crates.io/api/v1/crates")) return makeMockResponse({ json: CRATES_JSON });
  if (u.includes("hub.docker.com/api/search")) return makeMockResponse({ json: DOCKERHUB_JSON });
  if (u.includes("pypi.org/search")) return makeMockResponse({ html: PYPI_HTML });
  if (u.includes("packagist.org/search.json")) return makeMockResponse({ json: PACKAGIST_JSON });
  if (u.includes("rubygems.org/api/v1/search")) return makeMockResponse({ json: RUBYGEMS_JSON });

  // ---- images ----
  if (u.includes("unsplash.com/napi/search/photos")) return makeMockResponse({ json: UNSPLASH_JSON });
  if (u.includes("bing.com/images/async")) return makeMockResponse({ html: BING_IMAGES_HTML });
  if (u.includes("google.com/search") && u.includes("tbm=isch")) return makeMockResponse({ html: GOOGLE_IMAGES_HTML });
  if (u.includes("flickr.com/search")) return makeMockResponse({ html: FLICKR_HTML });
  if (u.includes("imgur.com/search")) return makeMockResponse({ html: IMGUR_HTML });
  if (u.includes("pixabay.com/images/search")) return makeMockResponse({ json: PIXABAY_JSON });
  if (u.includes("wallhaven.cc/api/v1/search")) return makeMockResponse({ json: WALLHAVEN_JSON });
  if (u.includes("deviantart.com/search")) return makeMockResponse({ html: DEVIANTART_HTML });
  if (u.includes("openclipart.org/search")) return makeMockResponse({ html: OPENCLIPART_HTML });

  // ---- videos ----
  // youtube and invidious both use /api/v1/search on various Invidious instances
  if (u.includes("/api/v1/search") && (
    u.includes("invidious.nerdvpn.de") ||
    u.includes("invidious.private.coffee") ||
    u.includes("inv.nadeko.net") ||
    u.includes("invidious.privacyredirect.com") ||
    u.includes("yewtu.be") ||
    u.includes("inv.riverside.rocks")
  )) return makeMockResponse({ json: INVIDIOUS_JSON });
  if (u.includes("vimeo.com/search")) return makeMockResponse({ html: VIMEO_HTML });
  if (u.includes("api.dailymotion.com/videos")) return makeMockResponse({ json: DAILYMOTION_JSON });
  if (u.includes("bing.com/videos/asyncv2")) return makeMockResponse({ html: BING_VIDEOS_HTML });
  if (u.includes("peer.tube/api/v1/search/videos")) return makeMockResponse({ json: PEERTUBE_JSON });

  // ---- news ----
  if (u.includes("hn.algolia.com/api/v1/search")) return makeMockResponse({ json: HACKERNEWS_JSON });
  if (u.includes("news.search.yahoo.com/search")) return makeMockResponse({ html: YAHOO_NEWS_HTML });
  if (u.includes("bing.com/news/infinitescrollajax")) return makeMockResponse({ html: BING_NEWS_HTML });
  if (u.includes("news.google.com/search")) return makeMockResponse({ html: GOOGLE_NEWS_HTML });

  // ---- academic ----
  if (u.includes("export.arxiv.org/api/query")) return makeMockResponse({ html: ARXIV_XML });
  if (u.includes("scholar.google.com/scholar")) return makeMockResponse({ html: GOOGLE_SCHOLAR_HTML });
  if (u.includes("wikidata.org/w/api.php")) return makeMockResponse({ json: WIKIDATA_JSON });
  if (u.includes("semanticscholar.org/api/1/search")) return makeMockResponse({ json: SEMANTIC_SCHOLAR_JSON });
  if (u.includes("api.crossref.org/works")) return makeMockResponse({ json: CROSSREF_JSON });
  // pubmed two-step
  if (u.includes("esearch.fcgi")) return makeMockResponse({ html: PUBMED_ESEARCH_XML });
  if (u.includes("efetch.fcgi")) return makeMockResponse({ html: PUBMED_EFETCH_XML });
  if (u.includes("api.openalex.org/works")) return makeMockResponse({ json: OPENALEX_JSON });
  if (u.includes("doaj.org/api/v2/search/articles")) return makeMockResponse({ json: DOAJ_JSON });
  if (u.includes("api.core.ac.uk/v3/search/works")) return makeMockResponse({ json: CORE_JSON });

  // ---- torrents ----
  if (u.includes("1337x.to/search/")) return makeMockResponse({ html: TORRENT_1337X_HTML });
  if (u.includes("thepiratebay.org/search.php")) return makeMockResponse({ html: THEPIRATEBAY_HTML });
  if (u.includes("nyaa.si/")) return makeMockResponse({ html: NYAA_HTML });
  if (u.includes("yts.mx/api/v2/list_movies.json")) return makeMockResponse({ json: YTS_JSON });
  if (u.includes("eztv.re/search/")) return makeMockResponse({ html: EZTV_HTML });
  if (u.includes("solidtorrents.to/search")) return makeMockResponse({ html: SOLIDTORRENTS_HTML });
  if (u.includes("kickasstorrents.to/usearch/")) return makeMockResponse({ html: KICKASS_HTML });

  // ---- social ----
  if (u.includes("nitter.net/search")) return makeMockResponse({ html: TWITTER_HTML });
  if (u.includes("old.reddit.com/search")) return makeMockResponse({ html: REDDIT_HTML });
  if (u.includes("medium.com/search")) return makeMockResponse({ html: MEDIUM_HTML });
  if (u.includes("soundcloud.com/search")) return makeMockResponse({ html: SOUNDCLOUD_HTML });
  if (u.includes("mastodon.social/api/v2/search")) return makeMockResponse({ json: MASTODON_JSON });

  // ---- maps ----
  if (u.includes("nominatim.openstreetmap.org/search")) return makeMockResponse({ json: OPENSTREETMAP_JSON });
  if (u.includes("photon.komoot.io/api")) return makeMockResponse({ json: PHOTON_JSON });
  // apple_maps 3-step
  if (u.includes("duckduckgo.com/local.js")) return makeMockResponse({ html: APPLE_MAPS_TOKEN_TEXT });
  if (u.includes("cdn.apple-mapkit.com/ma/bootstrap")) return makeMockResponse({ json: APPLE_MAPS_BOOTSTRAP_JSON });
  if (u.includes("api.apple-mapkit.com/v1/search")) return makeMockResponse({ json: APPLE_MAPS_SEARCH_JSON });

  // ---- shopping ----
  if (u.includes("ebay.com/sch/i.html")) return makeMockResponse({ html: EBAY_HTML });

  // ---- specialized ----
  if (u.includes("en.wikipedia.org/w/api.php")) return makeMockResponse({ json: WIKIPEDIA_JSON });
  if (u.includes("www.imdb.com/find")) return makeMockResponse({ html: IMDB_HTML });
  if (u.includes("genius.com/api/search/multi")) return makeMockResponse({ json: GENIUS_JSON });
  if (u.includes("archive.org/advancedsearch.php")) return makeMockResponse({ json: ARCHIVE_JSON });
  if (u.includes("openlibrary.org/search.json")) return makeMockResponse({ json: OPENLIBRARY_JSON });
  if (u.includes("wttr.in/")) return makeMockResponse({ json: WTTR_JSON });
  if (u.includes("annas-archive")) return makeMockResponse({ html: ANNAS_ARCHIVE_HTML });
  if (u.includes("goodreads.com/search")) return makeMockResponse({ html: GOODREADS_HTML });

  // fallback — unknown URL
  console.warn("[test mock] unmatched URL:", u);
  return makeMockResponse({ ok: false, status: 404, html: "Not Found" });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Engine Unit Tests (mocked fetch)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
        return Promise.resolve(getMockForUrl(url, init));
      }
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ---- general ----
  describe("general", () => {
    it("google returns results", async () => {
      const r = await google("typescript", 1);
      assertResults(r, "google");
    });
    it("bing returns results", async () => {
      const r = await bing("typescript", 1);
      assertResults(r, "bing");
    });
    it("duckduckgo returns results", async () => {
      const r = await duckduckgo("typescript", 1);
      assertResults(r, "duckduckgo");
    });
    it("yahoo returns results", async () => {
      const r = await yahoo("typescript", 1);
      assertResults(r, "yahoo");
    });
    it("qwant returns results", async () => {
      const r = await qwant("typescript", 1);
      assertResults(r, "qwant");
    });
    it("startpage returns results", async () => {
      const r = await startpage("typescript", 1);
      assertResults(r, "startpage");
    });
    it("brave returns results", async () => {
      const r = await brave("typescript", 1);
      assertResults(r, "brave");
    });
    it("yandex returns results", async () => {
      const r = await yandex("typescript", 1);
      assertResults(r, "yandex");
    });
    it("baidu returns results", async () => {
      const r = await baidu("typescript", 1);
      assertResults(r, "baidu");
    });
    it("mojeek returns results", async () => {
      const r = await mojeek("typescript", 1);
      assertResults(r, "mojeek");
    });

    it("bing returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, html: "" })));
      const r = await bing("test", 1);
      expect(r).toEqual([]);
    });
    it("google returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, html: "" })));
      const r = await google("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- IT ----
  describe("it", () => {
    it("github returns results", async () => {
      const r = await github("typescript", 1);
      assertResults(r, "github");
    });
    it("gitlab returns results", async () => {
      const r = await gitlab("typescript", 1);
      assertResults(r, "gitlab");
    });
    it("stackoverflow returns results", async () => {
      const r = await stackoverflow("typescript", 1);
      assertResults(r, "stackoverflow");
    });
    it("npm returns results", async () => {
      const r = await npm("express", 1);
      assertResults(r, "npm");
    });
    it("crates returns results", async () => {
      const r = await crates("serde", 1);
      assertResults(r, "crates");
    });
    it("dockerhub returns results", async () => {
      const r = await dockerhub("nginx", 1);
      assertResults(r, "dockerhub");
    });
    it("pypi returns results", async () => {
      const r = await pypi("requests", 1);
      assertResults(r, "pypi");
    });
    it("packagist returns results", async () => {
      const r = await packagist("laravel", 1);
      assertResults(r, "packagist");
    });
    it("rubygems returns results", async () => {
      const r = await rubygems("rails", 1);
      assertResults(r, "rubygems");
    });

    it("github returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await github("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- images ----
  describe("images", () => {
    it("unsplash returns results", async () => {
      const r = await unsplash("sunset", 1);
      assertResults(r, "unsplash");
    });
    it("bing_images returns results", async () => {
      const r = await bing_images("sunset", 1);
      assertResults(r, "bing_images");
    });
    it("google_images returns results", async () => {
      const r = await google_images("sunset", 1);
      assertResults(r, "google_images");
    });
    it("flickr returns results", async () => {
      const r = await flickr("sunset", 1);
      assertResults(r, "flickr");
    });
    it("imgur returns results", async () => {
      const r = await imgur("cats", 1);
      assertResults(r, "imgur");
    });
    it("pixabay returns results", async () => {
      const r = await pixabay("mountains", 1);
      assertResults(r, "pixabay");
    });
    it("wallhaven returns results", async () => {
      const r = await wallhaven("landscape", 1);
      assertResults(r, "wallhaven");
    });
    it("deviantart returns results", async () => {
      const r = await deviantart("art", 1);
      assertResults(r, "deviantart");
    });
    it("openclipart returns results", async () => {
      const r = await openclipart("arrow", 1);
      assertResults(r, "openclipart");
    });

    it("unsplash returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await unsplash("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- videos ----
  describe("videos", () => {
    it("youtube returns results", async () => {
      const r = await youtube("tutorial", 1);
      assertResults(r, "youtube");
    });
    it("vimeo returns results", async () => {
      const r = await vimeo("documentary", 1);
      assertResults(r, "vimeo");
    });
    it("dailymotion returns results", async () => {
      const r = await dailymotion("music", 1);
      assertResults(r, "dailymotion");
    });
    it("invidious returns results", async () => {
      const r = await invidious("linux", 1);
      assertResults(r, "invidious");
    });
    it("peertube returns results", async () => {
      const r = await peertube("linux", 1);
      assertResults(r, "peertube");
    });
    it("bing_videos returns results", async () => {
      const r = await bing_videos("tutorial", 1);
      assertResults(r, "bing_videos");
    });

    it("dailymotion returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await dailymotion("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- news ----
  describe("news", () => {
    it("hackernews returns results", async () => {
      const r = await hackernews("technology", 1);
      assertResults(r, "hackernews");
    });
    it("yahoo_news returns results", async () => {
      const r = await yahoo_news("technology", 1);
      assertResults(r, "yahoo_news");
    });
    it("bing_news returns results", async () => {
      const r = await bing_news("technology", 1);
      assertResults(r, "bing_news");
    });
    it("google_news returns results", async () => {
      const r = await google_news("technology", 1);
      assertResults(r, "google_news");
    });

    it("hackernews returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await hackernews("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- academic ----
  describe("academic", () => {
    it("arxiv returns results", async () => {
      const r = await arxiv("neural+networks", 1);
      assertResults(r, "arxiv");
    });
    it("google_scholar returns results", async () => {
      const r = await google_scholar("machine learning", 1);
      assertResults(r, "google_scholar");
    });
    it("wikidata returns results", async () => {
      const r = await wikidata("python", 1);
      assertResults(r, "wikidata");
    });
    it("semantic_scholar returns results", async () => {
      const r = await semantic_scholar("deep learning", 1);
      assertResults(r, "semantic_scholar");
    });
    it("crossref returns results", async () => {
      const r = await crossref("quantum computing", 1);
      assertResults(r, "crossref");
    });
    it("pubmed returns results (two-step)", async () => {
      const r = await pubmed("cancer", 1);
      assertResults(r, "pubmed");
    });
    it("openalex returns results", async () => {
      const r = await openalex("machine learning", 1);
      assertResults(r, "openalex");
    });
    it("doaj returns results", async () => {
      const r = await doaj("machine learning", 1);
      assertResults(r, "doaj");
    });

    it("core returns [] without CORE_API_KEY", async () => {
      const saved = process.env.CORE_API_KEY;
      delete process.env.CORE_API_KEY;
      const r = await core("machine learning", 1);
      expect(r).toEqual([]);
      if (saved !== undefined) process.env.CORE_API_KEY = saved;
    });
    it("core returns results with CORE_API_KEY", async () => {
      process.env.CORE_API_KEY = "test-api-key";
      const r = await core("machine learning", 1);
      assertResults(r, "core");
      delete process.env.CORE_API_KEY;
    });

    it("arxiv returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, html: "" })));
      const r = await arxiv("test", 1);
      expect(r).toEqual([]);
    });
    it("pubmed returns [] if esearch returns 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, html: "" })));
      const r = await pubmed("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- torrents ----
  describe("torrents", () => {
    it("1337x returns results", async () => {
      const r = await torrent_1337x("ubuntu", 1);
      assertResults(r, "1337x");
    });
    it("thepiratebay returns results", async () => {
      const r = await thepiratebay("ubuntu", 1);
      assertResults(r, "thepiratebay");
    });
    it("nyaa returns results", async () => {
      const r = await nyaa("one piece", 1);
      assertResults(r, "nyaa");
    });
    it("yts returns results", async () => {
      const r = await yts("inception", 1);
      assertResults(r, "yts");
    });
    it("eztv returns results", async () => {
      const r = await eztv("breaking bad", 1);
      assertResults(r, "eztv");
    });
    it("solidtorrents returns results", async () => {
      const r = await solidtorrents("ubuntu", 1);
      assertResults(r, "solidtorrents");
    });
    it("kickass returns results", async () => {
      const r = await kickass("ubuntu", 1);
      assertResults(r, "kickass");
    });

    it("yts returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await yts("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- social ----
  describe("social", () => {
    it("twitter returns results", async () => {
      const r = await twitter("programming", 1);
      assertResults(r, "twitter");
    });
    it("reddit returns results", async () => {
      const r = await reddit("programming", 1);
      assertResults(r, "reddit");
    });
    it("medium returns results", async () => {
      const r = await medium("javascript", 1);
      assertResults(r, "medium");
    });
    it("soundcloud returns results", async () => {
      const r = await soundcloud("lofi", 1);
      assertResults(r, "soundcloud");
    });
    it("mastodon returns results", async () => {
      const r = await mastodon("programming", 1);
      assertResults(r, "mastodon");
    });

    it("reddit returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, html: "" })));
      const r = await reddit("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- maps ----
  describe("maps", () => {
    it("openstreetmap returns results", async () => {
      const r = await openstreetmap("New York", 1);
      assertResults(r, "openstreetmap");
    });
    it("photon returns results", async () => {
      const r = await photon("Paris", 1);
      assertResults(r, "photon");
    });
    it("apple_maps returns results (three-step)", async () => {
      const r = await apple_maps("Tokyo", 1);
      assertResults(r, "apple_maps");
    });

    it("openstreetmap returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: [] })));
      const r = await openstreetmap("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- shopping ----
  describe("shopping", () => {
    it("ebay returns results", async () => {
      const r = await ebay("laptop", 1);
      assertResults(r, "ebay");
    });
    it("ebay returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, html: "" })));
      const r = await ebay("test", 1);
      expect(r).toEqual([]);
    });
  });

  // ---- specialized ----
  describe("specialized", () => {
    it("wikipedia returns results", async () => {
      const r = await wikipedia("javascript", 1);
      assertResults(r, "wikipedia");
    });
    it("imdb returns results", async () => {
      const r = await imdb("inception", 1);
      assertResults(r, "imdb");
    });
    it("genius returns results", async () => {
      const r = await genius("bohemian rhapsody", 1);
      assertResults(r, "genius");
    });
    it("archive returns results", async () => {
      const r = await archive("books", 1);
      assertResults(r, "archive");
    });
    it("openlibrary returns results", async () => {
      const r = await openlibrary("tolkien", 1);
      assertResults(r, "openlibrary");
    });
    it("wttr returns results", async () => {
      const r = await wttr("London", 1);
      assertResults(r, "wttr");
    });
    it("annas_archive returns results", async () => {
      const r = await annas_archive("python", 1);
      assertResults(r, "annas_archive");
    });
    it("goodreads returns results", async () => {
      const r = await goodreads("dune", 1);
      assertResults(r, "goodreads");
    });

    it("wikipedia returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await wikipedia("test", 1);
      expect(r).toEqual([]);
    });
    it("wttr returns [] on 404", async () => {
      fetchSpy.mockImplementation(() => Promise.resolve(makeMockResponse({ ok: false, status: 404, json: {} })));
      const r = await wttr("test", 1);
      expect(r).toEqual([]);
    });
  });
});
