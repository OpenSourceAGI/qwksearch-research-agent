"""
FastAPI control/monitoring API for the training container.

This is the process the Docker container (and the Cloudflare Workers Container)
runs by default - see Dockerfile's CMD. It gives the webui/ Next.js dashboard a
way to start/stop/monitor long-running jobs (Wikipedia download, training)
over plain HTTP/SSE so it works the same whether the container is reached
locally, via docker compose, or proxied through a Cloudflare Worker.

Run directly:
    uvicorn src.services.server:app --host 0.0.0.0 --port 8080
"""

import asyncio
import dataclasses
import json
import os
import signal
import subprocess
import sys
import time
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

try:  # `uvicorn src.services.server:app` imports this as part of the `src` package
    from ..training.improve import PROVIDERS, SAMPLE_QA, ImproveError, call_professional_model
    from ..cloud.vast_utils import VastAPIError
    from .vast_job import VastJob, VastTrainConfig
except ImportError:  # `python src/services/server.py` runs it as a standalone script
    from training.improve import PROVIDERS, SAMPLE_QA, ImproveError, call_professional_model
    from cloud.vast_utils import VastAPIError
    from services.vast_job import VastJob, VastTrainConfig

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.environ.get("LOG_DIR", os.path.join(ROOT_DIR, "logs"))
os.makedirs(LOG_DIR, exist_ok=True)

CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

app = FastAPI(
    title="train-next-word-prediction control API",
    version="1.0.0",
    description="Control/monitoring API for Wikipedia downloads, transformer training, "
                 "and model improvement workflows. See /scalar for an interactive reference.",
    openapi_url="/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/scalar", response_class=HTMLResponse, include_in_schema=False)
def scalar_api_reference():
    """Interactive API reference (Scalar) generated live from /openapi.json."""
    return """<!doctype html>
<html>
  <head>
    <title>train-next-word-prediction API reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>"""


class Job:
    """A single background subprocess plus its log file and lifecycle metadata."""

    def __init__(self, name: str, cmd: list, cwd: str = ROOT_DIR, env: Optional[dict] = None):
        self.name = name
        self.log_path = os.path.join(LOG_DIR, f"{name}.log")
        self.started_at = time.time()
        self.finished_at: Optional[float] = None
        self._log_file = open(self.log_path, "w")
        self.process = subprocess.Popen(
            cmd, cwd=cwd, stdout=self._log_file, stderr=subprocess.STDOUT,
            env={**os.environ, **(env or {})},
        )

    @property
    def running(self) -> bool:
        return self.process.poll() is None

    @property
    def exit_code(self) -> Optional[int]:
        return None if self.running else self.process.returncode

    def stop(self) -> bool:
        if not self.running:
            return False
        self.process.send_signal(signal.SIGTERM)
        try:
            self.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            self.process.kill()
        self.finished_at = time.time()
        return True

    def tail(self, max_lines: int = 200) -> str:
        try:
            with open(self.log_path, "r", errors="replace") as f:
                return "".join(f.readlines()[-max_lines:])
        except FileNotFoundError:
            return ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "running": self.running,
            "exit_code": self.exit_code,
            "pid": self.process.pid,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "log_tail": self.tail(),
        }


_jobs: dict[str, "Job | VastJob"] = {}


def _start_job(name: str, cmd: list, env: Optional[dict] = None) -> Job:
    existing = _jobs.get(name)
    if existing and existing.running:
        raise HTTPException(409, detail=f"job '{name}' is already running")
    job = Job(name, cmd, env=env)
    _jobs[name] = job
    return job


def _get_job(name: str) -> "Job | VastJob":
    job = _jobs.get(name)
    if not job:
        raise HTTPException(404, detail=f"no job named '{name}' has been started")
    return job


# --------------------------------------------------------------------------
# Health + status
# --------------------------------------------------------------------------

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "train-next-word-prediction"}


@app.get("/api/status")
def status():
    return {
        "service": "train-next-word-prediction",
        "reference": "https://github.com/tinygrad/tinygrad",
        "train_backend": "vast.ai",
        "docs": {"scalar": "/scalar", "openapi": "/openapi.json", "swagger": "/docs"},
        "jobs": {name: job.to_dict() for name, job in _jobs.items()},
    }


# --------------------------------------------------------------------------
# Improve via professional model APIs - refine the local model's draft
# answers using a hosted provider (OpenRouter, OpenAI, Anthropic, Gemini).
# API keys come from the request body only; they are never persisted, logged,
# or read from the environment - see src/training/improve.py.
# --------------------------------------------------------------------------

@app.get("/api/sample-qa")
def sample_qa():
    """Sample (question, draft_answer) pairs for the webui's before/after demo."""
    return {"providers": {name: spec.label for name, spec in PROVIDERS.items()}, "samples": SAMPLE_QA}


class ImproveRequest(BaseModel):
    provider: str
    api_key: str
    question: str
    draft_answer: str
    model: Optional[str] = None


@app.post("/api/improve")
def improve(req: ImproveRequest):
    try:
        improved = call_professional_model(
            provider=req.provider,
            api_key=req.api_key,
            question=req.question,
            draft_answer=req.draft_answer,
            model=req.model,
        )
    except ImproveError as exc:
        raise HTTPException(502, detail=str(exc))
    return {"provider": req.provider, "improved_answer": improved}


# --------------------------------------------------------------------------
# Wikipedia download job (aria2c, BitTorrent with HTTP fallback)
# --------------------------------------------------------------------------

class DownloadRequest(BaseModel):
    lang: Optional[str] = None
    dump_file: Optional[str] = None


@app.post("/api/jobs/download-wikipedia/start")
def start_download(req: DownloadRequest = DownloadRequest()):
    env = {}
    if req.lang:
        env["WIKI_LANG"] = req.lang
    if req.dump_file:
        env["WIKI_DUMP_FILE"] = req.dump_file
    script = os.path.join(ROOT_DIR, "scripts", "download_wikipedia_torrent.sh")
    job = _start_job("download-wikipedia", ["bash", script], env=env)
    return job.to_dict()


@app.post("/api/jobs/download-wikipedia/stop")
def stop_download():
    job = _get_job("download-wikipedia")
    return {"stopped": job.stop()}


@app.get("/api/jobs/download-wikipedia")
def download_status():
    return _get_job("download-wikipedia").to_dict()


# --------------------------------------------------------------------------
# Training job - provisions a GPU on Vast.ai, uploads this package to it, and
# runs the full pipeline (tokenizer -> dataset -> transformer -> generate)
# there. See src/services/vast_job.py for the provisioning/upload/log-tail
# lifecycle and src/cloud/vast_utils.py for the raw Vast.ai REST client.
# Requires VAST_API_KEY; VAST_GPU_NAME/VAST_MAX_HOURLY/etc set the defaults
# below and can be overridden per-request.
# --------------------------------------------------------------------------

class TrainRequest(BaseModel):
    gpu_name: Optional[str] = None
    num_gpus: Optional[int] = None
    max_hourly: Optional[float] = None
    image: Optional[str] = None
    disk_gb: Optional[float] = None
    train_cmd: Optional[str] = None


@app.post("/api/jobs/train/start")
def start_train(req: TrainRequest = TrainRequest()):
    if not os.environ.get("VAST_API_KEY"):
        raise HTTPException(500, detail="VAST_API_KEY is not configured on the control API container")

    existing = _jobs.get("train")
    if existing and existing.running:
        raise HTTPException(409, detail="job 'train' is already running")

    config = VastTrainConfig.from_env()
    overrides = req.model_dump(exclude_none=True)
    config = dataclasses.replace(config, **overrides)

    try:
        job = VastJob("train", LOG_DIR, ROOT_DIR, config)
    except VastAPIError as exc:
        raise HTTPException(502, detail=str(exc))
    _jobs["train"] = job
    return job.to_dict()


@app.post("/api/jobs/train/stop")
def stop_train():
    job = _get_job("train")
    return {"stopped": job.stop()}


@app.get("/api/jobs/train")
def train_status():
    return _get_job("train").to_dict()


# --------------------------------------------------------------------------
# Live log streaming (Server-Sent Events) for the dashboard
# --------------------------------------------------------------------------

@app.get("/api/jobs/{name}/stream")
async def stream_logs(name: str):
    job = _get_job(name)

    async def event_source():
        position = 0
        while True:
            try:
                with open(job.log_path, "r", errors="replace") as f:
                    f.seek(position)
                    chunk = f.read()
                    position = f.tell()
            except FileNotFoundError:
                chunk = ""

            if chunk:
                for line in chunk.splitlines():
                    yield f"data: {json.dumps({'line': line})}\n\n"

            if not job.running and not chunk:
                yield f"data: {json.dumps({'done': True, 'exit_code': job.exit_code})}\n\n"
                break

            await asyncio.sleep(1)

    return StreamingResponse(event_source(), media_type="text/event-stream")


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))


if __name__ == "__main__":
    main()
