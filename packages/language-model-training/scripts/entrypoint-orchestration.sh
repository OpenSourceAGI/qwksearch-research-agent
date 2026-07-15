#!/bin/bash

###############################################################################
# Orchestration Startup Script
# Starts API server, web dashboard, and training pipeline on container launch
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Q&A Training Pipeline - Orchestration Startup${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Configuration
SQUAD_DIR="${SQUAD_DIR:-/data/squad}"
CHECKPOINT_DIR="${CHECKPOINT_DIR:-/data/checkpoints}"
LOG_DIR="${LOG_DIR:-/data/logs}"
API_PORT="${API_PORT:-8080}"
DASHBOARD_PORT="${DASHBOARD_PORT:-8501}"
AUTO_DOWNLOAD_SQUAD="${AUTO_DOWNLOAD_SQUAD:-true}"
AUTO_RUN_TRAINING="${AUTO_RUN_TRAINING:-false}"
TRAINING_MODE="${TRAINING_MODE:-single}"  # single, parallel, async

# Create directories
mkdir -p "$SQUAD_DIR" "$CHECKPOINT_DIR" "$LOG_DIR"

echo "Configuration:"
echo "  API Port:           $API_PORT"
echo "  Dashboard Port:     $DASHBOARD_PORT"
echo "  SQuAD Dir:          $SQUAD_DIR"
echo "  Auto Download:      $AUTO_DOWNLOAD_SQUAD"
echo "  Auto Run Training:  $AUTO_RUN_TRAINING"
echo ""

# Start API server
echo -e "${YELLOW}Starting FastAPI server on port $API_PORT...${NC}"
python3 -m uvicorn src.services.api:app \
    --host 0.0.0.0 \
    --port "$API_PORT" \
    --log-level info &
API_PID=$!

sleep 2

# Check if API is running
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${RED}✗ Failed to start API server${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API server running (PID: $API_PID)${NC}"

# Start web dashboard
echo -e "\n${YELLOW}Starting Streamlit dashboard on port $DASHBOARD_PORT...${NC}"
streamlit run dashboard.py \
    --server.port "$DASHBOARD_PORT" \
    --server.address 0.0.0.0 \
    --logger.level=info \
    --client.showErrorDetails=false &
DASHBOARD_PID=$!

sleep 3

echo -e "${GREEN}✓ Dashboard running (PID: $DASHBOARD_PID)${NC}"

# Auto-download SQuAD if enabled
if [[ "$AUTO_DOWNLOAD_SQUAD" == "true" ]] && [[ ! -f "$SQUAD_DIR/qa_pairs_train.json" ]]; then
    echo -e "\n${YELLOW}Auto-downloading SQuAD dataset...${NC}"
    
    python3 << 'EOF'
import sys
import logging
from pathlib import Path
import os

sys.path.insert(0, '/app/src')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from training.squad_manager import SQuADManager
    
    squad_dir = os.getenv('SQUAD_DIR', '/data/squad')
    qa_limit = int(os.getenv('QA_PAIRS_LIMIT', '5000'))
    
    manager = SQuADManager(data_dir=squad_dir, version="1.1")
    
    # Download
    if not manager.download():
        sys.exit(1)
    
    # Load and extract
    train_data = manager.load_train()
    if train_data:
        qa_pairs = manager.extract_qa_pairs(train_data, limit=qa_limit)
        manager.save_qa_pairs(qa_pairs, str(Path(squad_dir) / "qa_pairs_train.json"))
        
        dev_data = manager.load_dev()
        if dev_data:
            qa_pairs_dev = manager.extract_qa_pairs(dev_data, limit=int(qa_limit * 0.2))
            manager.save_qa_pairs(qa_pairs_dev, str(Path(squad_dir) / "qa_pairs_dev.json"))
    
    print("SUCCESS")
except Exception as e:
    logger.error(f"Error: {e}", exc_info=True)
    sys.exit(1)
EOF
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✓ SQuAD dataset ready${NC}"
    else
        echo -e "${RED}✗ Failed to prepare SQuAD dataset${NC}"
    fi
fi

# Auto-run training if enabled
if [[ "$AUTO_RUN_TRAINING" == "true" ]] && [[ -f "$SQUAD_DIR/qa_pairs_train.json" ]]; then
    echo -e "\n${YELLOW}Starting training pipeline ($TRAINING_MODE mode)...${NC}"
    
    # Run in background
    python3 << EOF &
import sys
import os
import logging

sys.path.insert(0, '/app/src')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/data/logs/training.log'),
        logging.StreamHandler()
    ]
)

from training.qa_recursive_loops import AsyncQAImprover, ParallelQAImprover

squad_dir = "$SQUAD_DIR"
checkpoint_dir = "$CHECKPOINT_DIR"
training_mode = "$TRAINING_MODE"

if training_mode == "async":
    import asyncio
    improver = AsyncQAImprover(squad_dir=squad_dir, checkpoint_dir=checkpoint_dir, num_loops=4)
    asyncio.run(improver.run_async_loops(max_iterations=100))
else:
    improver = ParallelQAImprover(squad_dir=squad_dir, checkpoint_dir=checkpoint_dir, num_workers=4)
    improver.run_parallel(max_iterations_per_worker=100)
EOF
    
    TRAINING_PID=$!
    echo -e "${GREEN}✓ Training started (PID: $TRAINING_PID)${NC}"
fi

# Setup signal handling
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down services...${NC}"
    
    kill $API_PID 2>/dev/null || true
    kill $DASHBOARD_PID 2>/dev/null || true
    
    if [[ "$AUTO_RUN_TRAINING" == "true" ]]; then
        kill $TRAINING_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Print URLs
echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Services Started Successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}\n"

echo "Access the following services:"
echo "  🔧 API:       http://localhost:$API_PORT"
echo "  📊 Dashboard: http://localhost:$DASHBOARD_PORT"
echo ""

echo "API Endpoints:"
echo "  GET  /health           - Health check"
echo "  GET  /metrics          - Training metrics"
echo "  POST /evaluate         - Evaluate Q&A"
echo "  POST /batch-evaluate   - Batch evaluation"
echo "  POST /training/start   - Start training"
echo "  POST /training/stop    - Stop training"
echo "  GET  /checkpoints      - List checkpoints"
echo ""

echo -e "${YELLOW}Press Ctrl+C to shutdown${NC}\n"

# Keep running
wait
