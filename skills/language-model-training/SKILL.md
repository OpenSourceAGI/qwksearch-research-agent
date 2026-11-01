---
name: ask-language-model-training
description: Guide to language-model-training (packages/language-model-training), the from-scratch GPT-on-Tinygrad training package — the three run modes (local demo, full Wikipedia pipeline via aria2c + dumpster-dive + MongoDB, FastAPI control API), the `wikipedia` package's core/ingestion/data/architecture/runtime/inference/analysis/orchestration modules, the Vast.ai GPU rental backend and its env vars, the Next.js dashboard, and the Cloudflare Containers capacity limits. Use when running or debugging training, when a job dies on memory or a missing tool, when wiring the dashboard to the control API, or when the README's paths don't match the tree.
---

# Working With language-model-training

`packages/language-model-training` is **Python**, not part of the JS workspace: no
`package.json`, its own `pyproject.toml` / `requirements.txt` / `pytest.ini`, and
deliberately absent from the root Vitest projects. A GPT-style decoder-only transformer
built on [Tinygrad](https://github.com/tinygrad/tinygrad), trained end to end on real
Wikipedia — no pre-trained weights and no API key needed for training itself.

## Four surfaces

| Mode | Entry | Scale |
| --- | --- | --- |
| Local demo | The README names `src/training/train_next_word_prediction.py`, which is **not in the tree** — use `src/training/wikipedia_transformer.py` with `USE_DEMO_MODE=true` | Synthetic/demo text, laptop |
| Full Wikipedia pipeline | `src/training/wikipedia/`, `docker/images/Dockerfile.wikipedia` | ~20 GB compressed dump, hours |
| HTTP control API | `src/services/server.py` (FastAPI) | Starts/stops/streams the jobs above |
| Dashboard | `webui/` (Next.js) | Talks to the control API |

```bash
pip install -r requirements.txt                             # not config/requirements.txt
docker compose -f docker/compose/compose.yml up api webui   # api :8080, webui :3000
curl localhost:8080/health
```

## The control API (`src/services/server.py`)

`GET /health`, `/api/health`, `/api/status`, `/api/sample-qa`; `POST /api/improve`;
per-job `POST /api/jobs/<name>/start`, `POST /api/jobs/<name>/stop`,
`GET /api/jobs/<name>`, and `GET /api/jobs/{name}/stream` (SSE log tail). Jobs are
`download-wikipedia` and `train`. Interactive reference at `/scalar`, spec at
`/openapi.json`. (`src/services/api.py` is a *separate* Q&A evaluation API — not the
one the dashboard drives.)

## The `wikipedia` package

Reorganised by concern, each module independently testable:

| Directory | Modules |
| --- | --- |
| `core/` | `config.py` — `WikipediaConfig`, `WikipediaConfig.from_env()` |
| `ingestion/` | `download.py` (`WikipediaDownloader`, aria2c parallel + resumable), `dumpster_dive.py` (the `dumpster` CLI into MongoDB) |
| `data/` | `tokenizer.py` (BPE, 32K default), `dataset.py` (packs articles into fixed-length shifted batches) |
| `architecture/` | `model.py` — `GPTStyleTransformer`: causal multi-head attention (8 heads), pre-norm decoder blocks (6 layers), learned positional embeddings |
| `runtime/` | `trainer.py` (gradient clipping/accumulation, checkpointing), `scheduler.py` (linear warmup + cosine decay) |
| `inference/` | `generation.py` — temperature, top-k, nucleus sampling |
| `analysis/` | `metrics.py` — training dynamics and corpus statistics |
| `orchestration/` | `pipeline.py` — wires it all together |

Entry point: `python -m wikipedia.pipeline`, or `src/training/wikipedia_transformer.py`.

## Vast.ai training backend

The dashboard's **Train transformer** button does not train inside the control API's
container: `src/services/vast_job.py` / `src/cloud/vast_utils.py` rent a marketplace
GPU, upload the package over SSH, run the pipeline there, and destroy the instance when
it finishes.

| Env var | Default | Meaning |
| --- | --- | --- |
| `VAST_API_KEY` | *(required)* | From your Vast.ai account |
| `VAST_SSH_KEY_PATH` | `~/.ssh/id_rsa` | Its **public** half must already be on your Vast.ai account — Vast has no API to push a one-off key |
| `VAST_GPU_NAME` / `VAST_NUM_GPUS` | `RTX_4090` / `1` | Offer search |
| `VAST_MAX_HOURLY` | `1.5` | $/hr cap; the best perf-per-dollar offer under it wins |
| `VAST_IMAGE` | `pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime` | |
| `VAST_DISK_GB` | `64` | |
| `VAST_TRAIN_CMD` | `pip install -r requirements.txt && python src/training/wikipedia_transformer.py` | |
| `VAST_DESTROY_ON_FINISH` | `true` | Destroy vs. stop |

`gpu_name`/`num_gpus`/`max_hourly`/`image`/`disk_gb`/`train_cmd` can also be overridden
per run in the `POST /api/jobs/train/start` body. `GET /api/jobs/train` reports
`instance_id`, `ssh_host`, `gpu_name` and `cost_per_hour` while the instance is up.

## Troubleshooting

| Symptom | Cause → fix |
| --- | --- |
| `ImportError: No module named 'tinygrad'` | `pip install -r requirements.txt` (the README says `config/requirements.txt`; there is no `config/` directory — it is at the package root). |
| A path from the README does not exist | Several are stale. The Dockerfiles are under `docker/images/`, compose under `docker/compose/compose.yml`, and this tree has no package-root `Dockerfile`, `wrangler.jsonc`, `worker/`, `config/` or `SETUP.md`, and no `src/training/train_next_word_prediction.py`. Read `docs/` and the compose file instead. |
| `aria2c not found` | `apt install aria2` / `brew install aria2`, or use the provided Docker images, which bundle it. |
| dumpster-dive or MongoDB errors | The pipeline falls back to small demo text automatically. For the real corpus, bring up MongoDB per the compose file. |
| Out of memory | Lower `BATCH_SIZE`, raise `GRADIENT_ACCUMULATION_STEPS`, or set `USE_DEMO_MODE=true`. |
| The Wikipedia pipeline dies on a Cloudflare Container | A `dev`/`standard` instance has a few GB of RAM and disk — nowhere near the ~20 GB compressed / ~100 GB uncompressed dump plus MongoDB. Run that on a VM or bare metal; use the container only as a control surface or to serve an already-small trained model. |
| `POST /api/jobs/train/start` refuses immediately | It checks `VAST_API_KEY` up front. |
| The GPU job cannot SSH in | The public half of `VAST_SSH_KEY_PATH` must be registered on your Vast.ai account beforehand. |
| Tests don't run under vitest | It uses **pytest** (`pytest.ini`) and is excluded from the root Vitest projects on purpose. |
