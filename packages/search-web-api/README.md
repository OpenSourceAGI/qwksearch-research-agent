<p align="center">
    <img width="300px" src="https://i.imgur.com/BmaDQeR.png" />
<br /> 
    <a href="https://www.npmjs.com/package/search-web-api"><img src="https://img.shields.io/npm/dm/search-web-api.svg" alt="NPM Monthly Downloads"></a>
    <a href="https://www.npmjs.com/package/search-web-api"><img src="https://img.shields.io/npm/v/search-web-api.svg" alt="npm version"></a>
    <a href="https://discord.gg/SJdBqBz3tV">
        <img src="https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat"
            alt="Join Discord" />
    </a>  
     <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
     <img alt="GitHub Stars" src="https://img.shields.io/github/stars/vtempest/qwksearch-research-agent" /></a>
<br />
    <a href="https://github.com/vtempest/qwksearch-research-agent/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/qwksearch-research-agent" />
    </a>
    <a href="https://github.com/vtempest/qwksearch-research-agent/pulse" alt="Activity">
        <img src="https://img.shields.io/github/commit-activity/m/vtempest/qwksearch-research-agent" />
    </a>
    <img src="https://img.shields.io/github/last-commit/vtempest/qwksearch-research-agent.svg" alt="GitHub last commit" />
<br />
    <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/qwksearch-research-agent">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20" />
    </a>
</p>

    
# Meta-Search Web Sources API

- **Multi-engine aggregation**: 70+ major sites search sources across 10 categories
- **Smart result merging**: Intelligent deduplication and ranking
- **Weighted scoring**: Position-based algorithm with engine and category weights
- **Category-based search**: Filter by academic, news, images, videos, etc.
- **Autocomplete**: Query suggestions from 8 search engines

## Search Site Sources

### General Search

| Engine        | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| Google        | The world's most popular web search engine                          |
| Bing          | Microsoft's web search engine for the general web                   |
| Brave         | Privacy-focused web search integrated with the Brave browser        |
| DuckDuckGo    | Privacy-oriented search engine that does not track users            |
| Qwant         | European privacy-focused web search engine                          |
| Startpage     | Search engine that proxies Google results with enhanced privacy     |
| Yahoo         | Web portal providing search, email, and news                        |
| Ask           | Question-answering oriented web search engine                       |
| Wikipedia     | Free, community-edited online encyclopedia                          |
| Wikidata      | Structured, collaborative knowledge base from Wikimedia             |
| Wolfram Alpha | Computational knowledge engine for factual queries and calculations |

### News

| Engine          | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| DuckDuckGo News | Aggregated news search powered by DuckDuckGo                           |
| Mojeek News     | News search vertical from the independent Mojeek engine                |
| Bing News       | News aggregation and search from Microsoft Bing                        |
| Brave News      | Privacy-focused news search from Brave Search                          |
| Google News     | Google's personalized news aggregation and search service              |
| Qwant News      | News search and headlines from Qwant                                   |
| Yahoo News      | News portal and search from Yahoo                                      |
| Tagesschau (DE) | German-language news search for Tagesschau, a major public broadcaster |

### Videos

| Engine            | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| Bing Videos       | Video search vertical from Microsoft Bing                                    |
| Brave Videos      | Video search vertical of Brave Search                                        |
| DuckDuckGo Videos | Video search results from DuckDuckGo                                         |
| Google Videos     | Video-focused search results from Google                                     |
| Qwant Videos      | Video search vertical from Qwant                                             |
| Bilibili          | Chinese video sharing and streaming platform popular for animation and games |
| Dailymotion       | Global video-sharing and hosting platform                                    |
| Invidious         | Alternative, privacy-friendly front-end for YouTube content                  |
| Odysee            | Decentralized, blockchain-based video hosting platform                       |
| PeerTube          | Federated, open source video hosting network                                 |
| Piped             | Privacy-respecting alternative front-end for YouTube                         |
| Rumble            | Video sharing platform focusing on independent creators                      |
| Vimeo             | Ad-free video hosting platform used by filmmakers and businesses             |
| YouTube           | The largest global video sharing and streaming platform                      |

### Images

| Engine            | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| Bing Images       | Image search engine by Microsoft Bing                          |
| Brave Images      | Image search vertical of Brave Search                          |
| DuckDuckGo Images | Image search results from DuckDuckGo                           |
| Google Images     | Google's dedicated image search service                        |
| Qwant Images      | Image search vertical from Qwant                               |
| DeviantArt        | Online community and gallery for digital art and illustrations |
| Flickr            | Image and short video hosting platform for photographers       |
| Imgur             | Image hosting and sharing site popular for memes and galleries |
| Pinterest         | Visual discovery and bookmarking platform centered on images   |
| Unsplash          | Library of freely usable, high-resolution photos               |
| Wallhaven         | Community-driven wallpaper and background image repository     |
| Wikimedia Commons | Image search across media stored on Wikimedia Commons          |

### Science & Academic

| Engine                   | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| arXiv                    | Repository of preprint research papers in physics, math, CS and more     |
| Crossref                 | Infrastructure service providing DOIs and metadata for scholarly content |
| Google Scholar           | Google's search engine for scholarly literature and citations            |
| Internet Archive Scholar | Internet Archive search for digitized scholarly works                    |
| PubMed                   | Database of biomedical and life sciences literature from NCBI            |
| Semantic Scholar         | AI-powered literature search and discovery tool for research papers      |

### IT & Development

| Engine                | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| Alpine Linux Packages | Search index for Alpine Linux software packages                       |
| Crates.io             | Official package registry for Rust crates                             |
| Docker Hub            | Central repository of Docker container images                         |
| Hex                   | Package manager and repository for the Erlang and Elixir ecosystem    |
| Hoogle                | API search engine for Haskell libraries and functions                 |
| Lib.rs                | Alternative index and front-end for Rust crates                       |
| MetaCPAN              | Search engine for Perl modules hosted on CPAN                         |
| npm                   | Package registry and manager for JavaScript and Node.js               |
| Packagist             | Primary package repository for PHP Composer                           |
| pkg.go.dev            | Documentation and discovery service for Go modules                    |
| pub.dev               | Package repository for Dart and Flutter packages                      |
| PyPI                  | Python Package Index, the main repository for Python packages         |
| RubyGems              | Package manager and repository for Ruby gems                          |
| Void Linux            | Package search for the Void Linux distribution                        |
| Ask Ubuntu            | Q&A site focused on Ubuntu usage and troubleshooting                  |
| Stack Overflow        | Question-and-answer site for programmers and software development     |
| Super User            | Q&A site for advanced computer users and system administration        |
| Bitbucket             | Git-based source code hosting and collaboration platform by Atlassian |
| Codeberg              | Non-profit, open source Git hosting platform                          |
| Gitea                 | Hosted instance of the lightweight Gitea Git service                  |
| GitHub                | Popular Git-based code hosting and collaboration platform             |
| GitLab                | DevOps platform offering Git hosting, CI/CD, and project management   |
| SourceHut             | Minimalist suite of tools for software development and mailing lists  |
| Arch Linux Wiki       | Extensive documentation wiki for Arch Linux and related tools         |
| Gentoo                | Documentation wiki for the Gentoo Linux distribution                  |
| MDN                   | Mozilla Developer Network documentation for web technologies          |
| SearchCode            | Search engine indexing source code across public repositories         |

### Files & Archives

| Engine                   | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| Library of Congress      | Catalog and digital collections from the U.S. Library of Congress |
| Wikibooks                | Wikimedia project hosting free textbooks and manuals              |
| Wikisource               | Wikimedia digital library of source texts and documents           |
| Wikiversity              | Wikimedia project for educational resources and courses           |
| Wikivoyage               | Free, community-created travel guide from Wikimedia               |
| Google Play Movies       | Google's store for purchasing and renting movies and TV series    |
| MediathekViewWeb (DE)    | Web interface to German public TV media libraries                 |
| INA (FR)                 | French National Audiovisual Institute archive search              |
| Wikimedia Commons Videos | Search for video media stored on Wikimedia Commons                |
| Wikimedia Commons Audio  | Search for audio files stored on Wikimedia Commons                |
| APK Mirror               | Repository for Android APK files outside official app stores      |
| Apple App Store          | Official iOS and iPadOS app distribution platform                 |
| F-Droid                  | Catalog of free and open source Android applications              |
| Google Play Apps         | Official Android app store operated by Google                     |

### Social Media

| Engine    | Description                                                             |
| --------- | ----------------------------------------------------------------------- |
| Pinterest | Visual discovery, bookmarking, and inspiration social platform          |
| Reddit    | Social news aggregation and discussion website organized by communities |
| 9GAG      | Humor-focused social media site for sharing memes and short posts       |
| Lemmy     | Post search across Lemmy, a federated link-aggregation platform         |

### Maps & Navigation

| Engine        | Description                                            |
| ------------- | ------------------------------------------------------ |
| Apple Maps    | Apple's mapping and navigation service for its devices |
| OpenStreetMap | Collaborative, open data world map project             |

### Music

| Engine        | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| Genius        | Platform for song lyrics, annotations, and music commentary        |
| Radio Browser | Directory and search engine for online radio stations              |
| Bandcamp      | Music platform for independent artists to sell and stream releases |
| Deezer        | On-demand music streaming service                                  |
| Mixcloud      | Streaming platform for DJ mixes, radio shows, and podcasts         |
| SoundCloud    | Audio distribution and music sharing platform for creators         |
| YouTube       | Video platform heavily used for streaming music and music videos   |

## API Usage

### Basic Search

Search across all engines:

```bash
curl "http://localhost:3000?q=artificial+intelligence"
```

Search specific engines:

```bash
curl "http://localhost:3000?q=machine+learning&engines=google,duckduckgo,bing"
```

Search by category:

```bash
curl "http://localhost:3000?q=quantum+computing&categories=science"
```

### Autocomplete

Get suggestions from a single backend:

```bash
curl "http://localhost:3000/autocomplete?q=python&backend=google"
```

Get suggestions from multiple backends:

```bash
curl "http://localhost:3000/autocomplete/multi?q=javascript&backends=google,duckduckgo,wikipedia"
```

List available autocomplete backends:

```bash
curl "http://localhost:3000/autocomplete/backends"
```

### API Documentation

Interactive API documentation is available at:

- Scalar UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Architecture

### Technology Stack

- **Runtime**: Bun (high-performance JavaScript runtime)
- **Framework**: Hono (fast, lightweight web framework)
- **HTTP Client**: grab-url (for all engine requests)
- **HTML Parser**: linkedom (DOM parsing for scrapers)
- **Language**: TypeScript

### Ranking Algorithm

Results are scored using SearXNG's proven algorithm:

```
score = Σ (engine_weight × category_weight × occurrences / position)
```

**Variables:**

- `engine_weight`: Configurable per-engine multiplier (default: 1.0)
- `category_weight`: Category importance multiplier (e.g., academic: 1.3)
- `occurrences`: Number of engines that found this result
- `position`: Result position in original engine results

Customize engine importance in `app/lib/search.ts`:
Configure in `app/lib/category-registry.ts`:

**Features:**

- Deduplication by URL normalization
- Multi-engine result merging
- Category-based grouping
- Priority levels (low, normal, high)

### Project Structure

```
app/
├── engines/          # Search engine implementations
│   ├── general/      # Google, Bing, DuckDuckGo, etc.
│   ├── academic/     # arXiv, Google Scholar, PubMed
│   ├── images/       # Unsplash, Flickr, Imgur
│   ├── videos/       # YouTube, Vimeo, Dailymotion
│   ├── news/         # HackerNews, Google News, Bing News
│   ├── it/           # GitHub, npm, PyPI, Stack Overflow
│   ├── social/       # Reddit, Twitter, Medium
│   ├── maps/         # OpenStreetMap, Apple Maps
│   ├── shopping/     # eBay
│   ├── torrents/     # 1337x, PirateBay, Nyaa
│   └── specialized/  # Wikipedia, IMDb, Genius
├── lib/              # Core search logic
│   ├── search.ts           # Main search orchestrator
│   ├── result-container.ts # Result merging & ranking
│   ├── category-registry.ts # Category management
│   ├── engine.ts           # Engine interface
│   └── autocomplete.ts     # Autocomplete backends
├── routes/           # API routes
│   ├── search.ts
│   └── autocomplete.ts
├── data/             # Static data
│   └── engine-descriptions.ts
└── index.ts          # Main entry point
```
