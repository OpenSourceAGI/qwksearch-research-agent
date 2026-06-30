#!/bin/bash
# Entry point for the wikipedia-transformer container.
#
# Downloads the English Wikipedia dump via aria2c (parallel, resumable),
# decompresses it, then hands off to the Python pipeline, which runs
# dumpster-dive against MongoDB and trains the transformer.
#
# Configure via environment variables (see WikipediaConfig.from_env):
#   USE_DEMO_MODE=false       # full Wikipedia instead of demo sample text
#   MONGO_HOST=mongodb        # docker compose service name
#   WIKIPEDIA_DUMP_PATH=/app/data/enwiki-latest-pages-articles.xml
#   WIKIPEDIA_BZ2_PATH=/app/data/enwiki-latest-pages-articles.xml.bz2
#   MODEL_CHECKPOINT_DIR=/app/model_checkpoints
set -euo pipefail

echo "============================================================"
echo "Wikipedia Transformer Training Pipeline"
echo "============================================================"
echo "USE_DEMO_MODE=${USE_DEMO_MODE:-true}"
echo "MONGO_HOST=${MONGO_HOST:-localhost}"
echo ""

if [ "${USE_DEMO_MODE:-true}" = "false" ]; then
    echo "Waiting for MongoDB at ${MONGO_HOST:-localhost}:${MONGO_PORT:-27017}..."
    for i in $(seq 1 30); do
        python3 - <<PYEOF && break
import sys, pymongo
try:
    pymongo.MongoClient(host="${MONGO_HOST:-localhost}", port=${MONGO_PORT:-27017}, serverSelectionTimeoutMS=2000).server_info()
except Exception:
    sys.exit(1)
PYEOF
        echo "  MongoDB not ready yet (attempt $i/30), retrying in 5s..."
        sleep 5
    done
fi

echo "Starting training pipeline (downloads via aria2c happen automatically when USE_DEMO_MODE=false)..."
exec python3 -m wikipedia.pipeline "$@"
