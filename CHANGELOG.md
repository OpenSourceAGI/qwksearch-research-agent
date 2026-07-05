# Changelog

## July 2026

Major framework modernization with **Vinext 1.0.0-beta.0** and **Vite 8** (rolldown-based). Replaced **LangChain** with **Vercel AI SDK** across the chat pipeline. Enhanced session management with centralized stale-session guards. Improved error handling in model loading and database operations. Fixed Worker deployments, CommonJS/ESM compatibility, and frozen lockfile issues.

## June 2026

UI/UX overhaul with migration from **@opennextjs/cloudflare** to **Vinext**. Implemented **macOS-style category dock** with theme switching. Consolidated authentication with **better-auth 1.6.14** and **Web Crypto API**. Added responsive layouts, **dynamic island TOC** positioning, and font controls. Fixed vite-rolldown aliasing and turbopack build failures. Enhanced deployment scripts.

## May 2026

Editor and authentication enhancements. Integrated **Google One Tap** with FedCM and incognito mode. Added **Shiki code highlighting**, **Mermaid diagrams**, word count modals, and document export. Implemented file management with lazy initialization. Expanded settings with API key controls and sign-out. Added **reason-editor** module with new plugins. Refactored database schema for cross-environment compatibility. Updated **OpenNext Cloudflare** deployment with PWA assets.

## April 2026

**Major V2 rewrite** with fundamental restructuring. Optimized project structure and removed deprecated dependencies. Reorganized scraper infrastructure with rebuilt **Next.js** configuration. Implemented **XGBoost** statistical analysis, replacing neural utilities. Overhauled documentation and README. Refactored research agent components and migrated chat/article modules. Enhanced editor with font customization and menu improvements. Improved **Cloudflare Workers** configuration.

## December 2025

Release stabilization with versions **0.0.2 through 0.0.12**. Refined reading view UI with improved margins and responsive media styling. Integrated **Fumadocs theme** for documentation. Standardized package configuration across monorepo. Updated README and client docs for better onboarding.

## November 2025

Documentation modernization with **Fumadocs theme**. Enhanced README with better structure and examples. Focused on improving developer experience.

## September 2025

**Docker** containerization improvements. Fixed core search functionality with better **Docker Compose** configurations. Resolved Dockerfile reliability issues. Refactored read mode UI with improved styling and responsive media rendering. Focused on production readiness.

## August 2025

**Turborepo** reorganization with microservices architecture. Separated scraper and search-web into individual dockerfiles. Improved monorepo management with clearer separation of concerns. Laid foundation for scalability.

## May 2025

**Transformer.js** integration for on-device ML capabilities. Implemented **better-auth** for improved authentication. Added **Grab API** for enhanced data extraction. Expanded local ML processing and secure authentication.

## April 2025

Documentation and deployment automation. Configured **GitHub Pages** deployment at **airesearch.js.org**. Optimized homepage and folder structure. Refined workflow actions for automated deployments. Streamlined build processes.

## December 2024

**Beta V1 major release** with complete feature set. Comprehensive login and user management. Integrated editor with full capabilities. **Docusaurus** documentation with **OpenAPI** and **TypeDoc** support. Automatic API reference generation. First production-ready version.

## November 2024

Search infrastructure improvements. Enhanced **Docker-based** search system with better reliability. Fixed **YouTube** integration for video content. Added **DOCX** file format support. Fixed **USearch** vector accuracy issues. Enhanced content extraction capabilities.

## October 2024

Topic modeling and citations. Completed **SeekTopic** integration for topic extraction and analysis. Standardized citation formatting platform-wide. Improved README with better examples. Focused on academic and research features.

## September 2024

Core algorithm implementations. Built **VSEARCH** (Vector Similarity Embedding Approximation) as custom vector search. Added category systems for organization. Introduced **Tardigrade web crawler** for distributed crawling. Expanded documentation with categories. Enhanced main UI. Established algorithmic foundations.

## August 2024

Content extraction and NLP. Ported **Trafilatura.js** from Python (33 files) for article extraction. Enhanced **Readability2** accuracy. Added **UMAP** dimensionality reduction. Implemented **HNSW** vector search with demos. Modularized extractors (Readability, Postlight). Adopted "code as art" philosophy. Implemented **TypeDoc** documentation. Added **YouTube embed API** with transcript optimization. Enhanced extension with CORS support.

## July 2024

Search algorithms and autocomplete. Implemented **DSEEK** keyphrase extraction with **TextRank**, **WikiIDF**, and noun edge-grams. Added query autocomplete with live demo. Introduced new compression formats. Integrated **OpenEnglishWordnet** and 35k Wikipedia pages. Added **RAG** use case. Implemented **Wiki BM25** with 1M/2M datasets. Published results demo. Enhanced search quality and linguistic capabilities.
