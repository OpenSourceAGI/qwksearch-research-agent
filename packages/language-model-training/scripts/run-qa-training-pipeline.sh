#!/bin/bash

###############################################################################
# Main SQuAD Q&A Training Orchestrator
# Complete pipeline: Download SQuAD → Extract Q&A → Run improvement loops
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SQUAD_VERSION="${SQUAD_VERSION:-1.1}"
SQUAD_DIR="${SQUAD_DIR:-/data/squad}"
CHECKPOINT_DIR="${CHECKPOINT_DIR:-/data/checkpoints}"
LOG_DIR="${LOG_DIR:-/data/logs}"
QA_PAIRS_LIMIT="${QA_PAIRS_LIMIT:-5000}"
BATCH_SIZE="${BATCH_SIZE:-32}"
NUM_EPOCHS="${NUM_EPOCHS:-1}"
MAX_ITERATIONS="${MAX_ITERATIONS:-100}"
NUM_WORKERS="${NUM_WORKERS:-4}"
LOOP_TYPE="${LOOP_TYPE:-parallel}"  # 'single', 'parallel', or 'async'

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
    echo -e "\n${YELLOW}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Main execution
main() {
    print_header "SQuAD Q&A Training Pipeline"
    
    echo "Configuration:"
    echo "  SQuAD Version:      $SQUAD_VERSION"
    echo "  SQuAD Directory:    $SQUAD_DIR"
    echo "  Checkpoint Dir:     $CHECKPOINT_DIR"
    echo "  Log Directory:      $LOG_DIR"
    echo "  QA Pairs Limit:     $QA_PAIRS_LIMIT"
    echo "  Batch Size:         $BATCH_SIZE"
    echo "  Epochs:             $NUM_EPOCHS"
    echo "  Max Iterations:     $MAX_ITERATIONS"
    echo "  Loop Type:          $LOOP_TYPE"
    if [[ "$LOOP_TYPE" == "parallel" ]]; then
        echo "  Workers:            $NUM_WORKERS"
    fi
    echo ""
    
    # Create directories
    print_step "Creating directories"
    mkdir -p "$SQUAD_DIR" "$CHECKPOINT_DIR" "$LOG_DIR"
    print_success "Directories ready"
    
    # Download and extract SQuAD
    print_step "Downloading and extracting SQuAD dataset"
    
    if [[ ! -f "$SQUAD_DIR/run-squad-pipeline.sh" ]]; then
        # Copy script if not already present
        if [[ -f "scripts/run-squad-pipeline.sh" ]]; then
            cp scripts/run-squad-pipeline.sh "$SQUAD_DIR/"
        fi
    fi
    
    # Run SQuAD pipeline
    SQUAD_VERSION="$SQUAD_VERSION" \
    SQUAD_DIR="$SQUAD_DIR" \
    QA_PAIRS_LIMIT="$QA_PAIRS_LIMIT" \
    python3 << 'PYEOF'
import sys
import logging
from pathlib import Path
import os

sys.path.insert(0, '/app/src')

from training.squad_manager import SQuADManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

squad_version = os.getenv('SQUAD_VERSION', '1.1')
squad_dir = os.getenv('SQUAD_DIR', '/data/squad')
qa_pairs_limit = int(os.getenv('QA_PAIRS_LIMIT', '5000'))

try:
    # Initialize
    manager = SQuADManager(data_dir=squad_dir, version=squad_version)
    
    # Download
    if not manager.download():
        print("Failed to download SQuAD", file=sys.stderr)
        sys.exit(1)
    
    # Verify
    if not manager.verify_files():
        print("SQuAD files verification failed", file=sys.stderr)
        sys.exit(1)
    
    # Extract
    train_data = manager.load_train()
    if not train_data:
        print("Failed to load training data", file=sys.stderr)
        sys.exit(1)
    
    qa_pairs = manager.extract_qa_pairs(train_data, limit=qa_pairs_limit)
    manager.save_qa_pairs(qa_pairs, str(Path(squad_dir) / "qa_pairs_train.json"))
    
    # Dev set
    dev_data = manager.load_dev()
    if dev_data:
        qa_pairs_dev = manager.extract_qa_pairs(dev_data, limit=int(qa_pairs_limit * 0.2))
        manager.save_qa_pairs(qa_pairs_dev, str(Path(squad_dir) / "qa_pairs_dev.json"))
    
    print("SUCCESS")
    
except Exception as e:
    logger.error(f"Error: {e}", exc_info=True)
    sys.exit(1)
PYEOF
    
    if [[ $? -eq 0 ]]; then
        print_success "SQuAD dataset ready"
    else
        print_error "Failed to prepare SQuAD dataset"
        return 1
    fi
    
    # Verify Q&A files exist
    if [[ ! -f "$SQUAD_DIR/qa_pairs_train.json" ]]; then
        print_error "Q&A pairs file not found: $SQUAD_DIR/qa_pairs_train.json"
        return 1
    fi
    
    # Show statistics
    print_step "Dataset Statistics"
    python3 << PYEOF
import json
from pathlib import Path

squad_dir = Path("$SQUAD_DIR")

if (squad_dir / "qa_pairs_train.json").exists():
    with open(squad_dir / "qa_pairs_train.json") as f:
        pairs = json.load(f)
    print(f"Training Q&A Pairs:  {len(pairs)}")
    if pairs:
        sample = pairs[0]
        print(f"\nSample:")
        print(f"  Q: {sample['question'][:60]}...")
        print(f"  A: {sample['answer'][:60]}...")

if (squad_dir / "qa_pairs_dev.json").exists():
    with open(squad_dir / "qa_pairs_dev.json") as f:
        pairs = json.load(f)
    print(f"Evaluation Q&A Pairs: {len(pairs)}")
PYEOF
    
    # Start improvement loops
    print_step "Starting Q&A Improvement Loops (Type: $LOOP_TYPE)"
    
    export SQUAD_DIR="$SQUAD_DIR"
    export CHECKPOINT_DIR="$CHECKPOINT_DIR"
    export LOG_DIR="$LOG_DIR"
    export BATCH_SIZE="$BATCH_SIZE"
    export NUM_EPOCHS="$NUM_EPOCHS"
    export MAX_ITERATIONS="$MAX_ITERATIONS"
    export NUM_WORKERS="$NUM_WORKERS"
    
    case "$LOOP_TYPE" in
        single)
            python3 << 'PYEOF'
import sys
import os
import logging

sys.path.insert(0, '/app/src')

from training.qa_improver import QAImproverLoop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

squad_dir = os.getenv('SQUAD_DIR', '/data/squad')
checkpoint_dir = os.getenv('CHECKPOINT_DIR', '/data/checkpoints')
log_dir = os.getenv('LOG_DIR', '/data/logs')
max_iterations = int(os.getenv('MAX_ITERATIONS', '100'))
batch_size = int(os.getenv('BATCH_SIZE', '32'))
num_epochs = int(os.getenv('NUM_EPOCHS', '1'))

qa_data_file = f"{squad_dir}/qa_pairs_train.json"

# Initialize (would use actual model trainer)
# improver = QAImproverLoop(
#     model_trainer=your_model,
#     qa_data_file=qa_data_file,
#     checkpoint_dir=checkpoint_dir,
#     log_dir=log_dir,
#     iteration_limit=max_iterations
# )
# improver.run(batch_size=batch_size, num_epochs=num_epochs)

logger.info("Single improvement loop ready (integrate with actual model)")
PYEOF
            ;;
        
        parallel)
            python3 << 'PYEOF'
import sys
import os
import logging

sys.path.insert(0, '/app/src')

from training.qa_recursive_loops import ParallelQAImprover

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

squad_dir = os.getenv('SQUAD_DIR', '/data/squad')
checkpoint_dir = os.getenv('CHECKPOINT_DIR', '/data/checkpoints')
num_workers = int(os.getenv('NUM_WORKERS', '4'))
batch_size = int(os.getenv('BATCH_SIZE', '32'))
max_iterations = int(os.getenv('MAX_ITERATIONS', '100'))

logger.info(f"Starting {num_workers} parallel improvement loops")

improver = ParallelQAImprover(
    squad_dir=squad_dir,
    checkpoint_dir=checkpoint_dir,
    num_workers=num_workers,
    batch_size=batch_size
)

try:
    improver.run_parallel(max_iterations_per_worker=max_iterations)
except KeyboardInterrupt:
    logger.info("Interrupted by user")
except Exception as e:
    logger.error(f"Error: {e}", exc_info=True)
    sys.exit(1)
PYEOF
            ;;
        
        async)
            python3 << 'PYEOF'
import sys
import os
import asyncio
import logging

sys.path.insert(0, '/app/src')

from training.qa_recursive_loops import AsyncQAImprover

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    squad_dir = os.getenv('SQUAD_DIR', '/data/squad')
    checkpoint_dir = os.getenv('CHECKPOINT_DIR', '/data/checkpoints')
    num_loops = int(os.getenv('NUM_WORKERS', '4'))  # Reuse NUM_WORKERS for loop count
    max_iterations = int(os.getenv('MAX_ITERATIONS', '100'))
    
    logger.info(f"Starting {num_loops} async improvement loops")
    
    improver = AsyncQAImprover(
        squad_dir=squad_dir,
        checkpoint_dir=checkpoint_dir,
        num_loops=num_loops
    )
    
    try:
        await improver.run_async_loops(max_iterations=max_iterations)
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)

asyncio.run(main())
PYEOF
            ;;
        
        *)
            print_error "Unknown loop type: $LOOP_TYPE"
            print "Valid options: single, parallel, async"
            return 1
            ;;
    esac
    
    if [[ $? -eq 0 ]]; then
        print_success "Improvement loops completed"
    else
        print_error "Improvement loops failed"
        return 1
    fi
    
    # Show results
    print_step "Results"
    
    if [[ -f "$LOG_DIR/qa_improvement_history.json" ]]; then
        echo "Metrics saved to: $LOG_DIR/qa_improvement_history.json"
    fi
    
    if ls "$CHECKPOINT_DIR"/qa_model_iter_*.pt 1>/dev/null 2>&1; then
        echo "Checkpoints saved to: $CHECKPOINT_DIR/"
        ls -lh "$CHECKPOINT_DIR"/qa_model_iter_*.pt | head -5
    fi
    
    # Final summary
    echo ""
    print_header "Pipeline Complete ✓"
    
    echo "Summary:"
    echo "  Dataset Location:  $SQUAD_DIR"
    echo "  Checkpoints:       $CHECKPOINT_DIR"
    echo "  Logs:              $LOG_DIR"
    echo ""
    echo "Next Steps:"
    echo "  1. Review metrics:  cat $LOG_DIR/qa_improvement_history.json"
    echo "  2. Load checkpoint: torch.load('$CHECKPOINT_DIR/qa_model_iter_0.pt')"
    echo "  3. Export metrics:  aws s3 cp $LOG_DIR/ s3://bucket/path/ --recursive"
}

# Error handling
trap 'print_error "Pipeline failed"; exit 1' ERR

# Run main
main

echo ""
print_success "Pipeline execution complete"
