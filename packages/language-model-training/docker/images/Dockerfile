# Transformer Language Model Training - Container Image
#
# Includes:
#  1. Q&A training pipeline with SQuAD
#  2. REST API for training control
#  3. Web dashboard for metrics visualization
#  4. Support for CPU and GPU training
#
# Build (from this directory): docker build -t train-next-word-prediction .
# Run:   docker run -it --rm -p 8080:8080 train-next-word-prediction
# GPU:   docker run -it --rm --gpus all train-next-word-prediction

FROM python:3.11-slim

LABEL maintainer="Q&A Training Pipeline"
LABEL description="SQuAD Q&A training pipeline with REST API and dashboard"
LABEL version="2.0"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8080 \
    CUDA_VISIBLE_DEVICES=0 \
    SQUAD_DIR=/data/squad \
    CHECKPOINT_DIR=/data/checkpoints \
    LOG_DIR=/data/logs

RUN groupadd -r transformer && useradd -r -g transformer transformer

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    # aria2 provides aria2c, used to download Wikipedia dumps over BitTorrent
    # (with automatic HTTP fallback) - see scripts/download_wikipedia_torrent.sh
    aria2 \
    bzip2 \
    lbzip2 \
    htop \
    vim \
    ocl-icd-opencl-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/logs /app/checkpoints /app/data \
    && chown -R transformer:transformer /app

COPY config/requirements.txt .

RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir \
        boto3 \
        fastapi \
        uvicorn \
        streamlit \
        plotly \
        pandas \
        requests \
        numpy

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY dashboard.py .
COPY README.md .

RUN chmod +x /app/scripts/*.sh

RUN chown -R transformer:transformer /app

USER transformer

# Start orchestration (API + Dashboard + optional training)
CMD ["/bin/bash", "/app/scripts/entrypoint-orchestration.sh"]

EXPOSE 8080 8501

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

LABEL com.example.training-type="transformer"
LABEL com.example.framework="tinygrad"
LABEL com.example.gpu-support="optional"
