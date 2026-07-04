![predict_word_logo](https://i.imgur.com/QvZHBwV.png)

# Transformer Language Model Training with Tinygrad

A from-scratch GPT-style transformer implementation on [Tinygrad](https://github.com/tinygrad/tinygrad), with three ways to run it depending on scale:

| Mode | What it does | Where |
|---|---|---|
| **Demos** | tiny synthetic-data transformer training | `src/training/train_next_word_prediction.py` |
| **Full Wikipedia pipeline** | aria2c download -> dumpster-dive -> MongoDB -> tokenizer -> training, at real Wikipedia scale | `src/training/wikipedia/` package, `docker/Dockerfile.wikipedia` |
| **HTTP control API** | FastAPI server that starts/stops/monitors the jobs above over HTTP/SSE — the same process Cloudflare Containers runs | `src/services/server.py`, `Dockerfile`, `wrangler.jsonc` |
| **Web UI** | Next.js dashboard that talks to the control API to kick off/monitor jobs, and to refine draft answers via a bring-your-own-key hosted model | `webui/` |

This package downloads the real English Wikipedia XML dump and trains a GPT-style transformer on it end to end — there's no pre-trained model or external API key required for training itself. The dashboard's "Improve" panel is optional: it lets you compare the small local model's draft answers against a hosted provider's (OpenRouter/OpenAI/Anthropic/Gemini) refined version, using an API key you supply per-request — see `src/training/improve.py`.

## Quick Start

### 1. Local demos (no dependencies beyond tinygrad/numpy)

```bash
pip install -r config/requirements.txt
python src/training/train_next_word_prediction.py # synthetic-data GPT-style transformer demo
```

### 2. Full Wikipedia training (Docker Compose)

Downloads the ~20GB English Wikipedia dump with `aria2c` (16 parallel connections, resumable), processes it through [dumpster-dive](https://github.com/notconfusing/dumpster-dive) into MongoDB, then trains the transformer. See [SETUP.md](SETUP.md) for the full walkthrough.

```bash
cd docker
docker compose --profile wikipedia up wikipedia   # demo-mode sample text by default
USE_DEMO_MODE=false docker compose --profile wikipedia up wikipedia  # real Wikipedia corpus
```

### 3. HTTP control API (local Docker or Cloudflare Containers)

`src/services/server.py` is a small FastAPI app that wraps the demos and the Wikipedia pipeline as background jobs you start/stop/stream over HTTP — this is what the container's `CMD` runs by default, and what a Cloudflare Worker proxies to.

```bash
# Local:
docker compose -f docker/compose.yml up api
curl localhost:8080/health

# Cloudflare Containers (requires Docker running locally for `wrangler dev`):
bun install
bunx wrangler dev      # local
bunx wrangler deploy   # deploy
```

See **Cloudflare Containers** below for capacity caveats before deploying the Wikipedia pipeline there.

### 4. Web UI (local dashboard)

`webui/` is a Next.js dashboard for starting/monitoring training jobs against the control API in your browser instead of curl. Run it alongside the API from step 3:

```bash
# Both services together (api on :8080, webui on :3000):
docker compose -f docker/compose.yml up api webui

# Or standalone, against an API you already have running:
cd webui
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your API
npm install
npm run dev   # http://localhost:3000
```

## What You'll Learn

- **How language models work**: converting words into high-dimensional vectors and using transformer architecture to capture relationships like "king/queen" and "Paris/France ↔ Tokyo/Japan"
- **Self-attention**: how each word creates Query, Key, and Value representations to dynamically focus on relevant context
- **Transformer architecture**: decoder-only stack with multi-head attention, feed-forward networks, and residual connections (`src/training/wikipedia/model.py`)
- **BPE tokenization**: learning subword merges from a real corpus (`src/training/wikipedia/tokenizer.py`)
- **Production training concerns**: gradient accumulation, LR warmup + cosine decay, gradient clipping, checkpointing (`src/training/wikipedia/trainer.py`)
- **Sampling strategies**: temperature, top-k, and nucleus (top-p) generation (`src/training/wikipedia/generation.py`)

## The `wikipedia` Package

`src/training/wikipedia/` is organized by concern, each module independently testable:

- `config.py` — `WikipediaConfig` dataclass; `WikipediaConfig.from_env()` overlays environment variables for container/Cloudflare use
- `download.py` — `WikipediaDownloader`: aria2c-based parallel download + decompression of the XML dump
- `dumpster_dive.py` — `DumpsterDiveIntegration`: runs the `dumpster` CLI, queries the resulting MongoDB collection
- `tokenizer.py` — `WikipediaTokenizer`: BPE vocabulary learning, encode/decode, save/load
- `dataset.py` — `WikipediaDataset`: tokenizes articles, packs into fixed-length sequences, serves shifted batches
- `model.py` — `GPTStyleTransformer` and its building blocks (attention, FFN, decoder block, positional embeddings)
- `scheduler.py` — `LearningRateScheduler`: linear warmup + cosine decay
- `trainer.py` — `WikipediaTrainer`: training loop, gradient clipping/accumulation, checkpointing, sample generation
- `generation.py` — top-k / nucleus sampling helpers
- `analysis.py` — training dynamics, vocabulary, and Wikipedia corpus statistics
- `pipeline.py` — orchestrates all of the above; `python -m wikipedia.pipeline` or `wikipedia_transformer.py` is the entry point

## Cloudflare Containers

`Dockerfile` (package root), `wrangler.jsonc`, and `worker/index.ts` let this package run as a [Cloudflare Container](https://developers.cloudflare.com/containers/) behind a Worker. The Worker (`worker/index.ts`) just proxies HTTP requests to a `TrainingContainer` Durable Object, which Cloudflare backs with the Docker image — the container's default process is the FastAPI control API (`src/services/server.py`) on `$PORT`.

**What fits**: health/status checks and kicking off short demo-mode jobs through the control API.

**What doesn't fit**: the full Wikipedia pipeline. A `dev`/`standard` Container instance has on the order of a few GB of RAM and disk — nowhere near the ~20GB compressed / ~100GB uncompressed dump, the MongoDB instance dumpster-dive needs, or the many-hours runtime a full training pass takes. Run that path with `docker compose --profile wikipedia` on a VM or bare metal instead (see SETUP.md), and only use the Cloudflare Container to expose a control surface or serve a trained, already-small model.

```bash
bun install
bunx wrangler dev       # local; needs Docker running
bunx wrangler deploy    # deploy to your Cloudflare account
```

## Architecture Overview

- **BPE Tokenizer**: byte-pair encoding with a configurable vocabulary size (32K by default)
- **Positional Embeddings**: learned position encodings
- **Multi-Head Attention**: causal self-attention, 8 heads by default
- **Transformer Blocks**: pre-norm decoder blocks with residual connections, 6 layers by default
- **Language Modeling Head**: next-word prediction over the vocabulary

## Troubleshooting

- **`ImportError: No module named 'tinygrad'`** — `pip install -r config/requirements.txt`
- **`aria2c not found`** — `apt install aria2` / `brew install aria2`, or use the provided Docker images, which bundle it
- **`dumpster-dive`/MongoDB errors** — see [SETUP.md](SETUP.md); the pipeline automatically falls back to small demo text if these aren't available
- **Out of memory** — reduce `BATCH_SIZE`, increase `GRADIENT_ACCUMULATION_STEPS`, or set `USE_DEMO_MODE=true`

## Learning Resources

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [The Illustrated GPT-2](https://jalammar.github.io/illustrated-gpt2/)
- [Hugging Face Course](https://huggingface.co/learn)
- [Tinygrad Documentation](https://docs.tinygrad.org/)
- [Cloudflare Containers docs](https://developers.cloudflare.com/containers/)
