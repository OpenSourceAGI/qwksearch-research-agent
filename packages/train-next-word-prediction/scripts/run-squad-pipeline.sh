#!/bin/bash

###############################################################################
# SQuAD Pipeline Runner
# Downloads SQuAD, extracts Q&A pairs, and runs self-recursive improvement loops
###############################################################################

set -euo pipefail

# Configuration
SQUAD_VERSION="${SQUAD_VERSION:-1.1}"
SQUAD_DIR="${SQUAD_DIR:-/data/squad}"
QA_PAIRS_LIMIT="${QA_PAIRS_LIMIT:-5000}"
BATCH_SIZE="${BATCH_SIZE:-32}"
NUM_EPOCHS="${NUM_EPOCHS:-1}"
MAX_ITERATIONS="${MAX_ITERATIONS:-100}"
MIN_IMPROVEMENT="${MIN_IMPROVEMENT:-0.01}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}SQuAD Pipeline Runner${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}\n"

# Check Python
command -v python3 &>/dev/null || {
    echo -e "${RED}Python 3 not found${NC}"
    exit 1
}

# Create Python script to run SQuAD pipeline
cat > /tmp/run_squad_pipeline.py << 'EOF'
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, '/app/src')

from training.squad_manager import SQuADManager
from training.qa_improver import QAImproverLoop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_squad_pipeline():
    """Run complete SQuAD pipeline"""
    
    # Configuration from environment
    import os
    squad_version = os.getenv('SQUAD_VERSION', '1.1')
    squad_dir = os.getenv('SQUAD_DIR', '/data/squad')
    qa_pairs_limit = int(os.getenv('QA_PAIRS_LIMIT', '5000'))
    batch_size = int(os.getenv('BATCH_SIZE', '32'))
    num_epochs = int(os.getenv('NUM_EPOCHS', '1'))
    max_iterations = int(os.getenv('MAX_ITERATIONS', '100'))
    min_improvement = float(os.getenv('MIN_IMPROVEMENT', '0.01'))
    
    logger.info(f"Configuration:")
    logger.info(f"  SQuAD Version:     {squad_version}")
    logger.info(f"  SQuAD Dir:         {squad_dir}")
    logger.info(f"  QA Pairs Limit:    {qa_pairs_limit}")
    logger.info(f"  Batch Size:        {batch_size}")
    logger.info(f"  Epochs:            {num_epochs}")
    logger.info(f"  Max Iterations:    {max_iterations}")
    logger.info(f"  Min Improvement:   {min_improvement}\n")
    
    # Initialize SQuAD manager
    squad_manager = SQuADManager(data_dir=squad_dir, version=squad_version)
    
    # Step 1: Download SQuAD
    logger.info("\n" + "=" * 60)
    logger.info("Step 1: Downloading SQuAD Dataset")
    logger.info("=" * 60)
    
    if not squad_manager.download(force=False):
        logger.error("Failed to download SQuAD dataset")
        return False
    
    # Step 2: Verify files
    logger.info("\n" + "=" * 60)
    logger.info("Step 2: Verifying Files")
    logger.info("=" * 60)
    
    if not squad_manager.verify_files():
        logger.error("SQuAD files not available")
        return False
    
    # Step 3: Load and extract Q&A pairs
    logger.info("\n" + "=" * 60)
    logger.info("Step 3: Extracting Q&A Pairs")
    logger.info("=" * 60)
    
    # Load training set
    train_data = squad_manager.load_train()
    if train_data:
        train_stats = squad_manager.get_statistics(train_data)
        logger.info("Training Set Statistics:")
        for key, value in train_stats.items():
            logger.info(f"  {key}: {value}")
        
        # Extract Q&A pairs
        qa_pairs = squad_manager.extract_qa_pairs(train_data, limit=qa_pairs_limit)
        
        # Save extracted pairs
        qa_file = Path(squad_dir) / "qa_pairs_train.json"
        squad_manager.save_qa_pairs(qa_pairs, str(qa_file))
        logger.info(f"\n✓ Extracted and saved {len(qa_pairs)} Q&A pairs")
    
    # Step 4: Load dev set for testing
    logger.info("\n" + "=" * 60)
    logger.info("Step 4: Preparing Evaluation Set")
    logger.info("=" * 60)
    
    dev_data = squad_manager.load_dev()
    if dev_data:
        dev_stats = squad_manager.get_statistics(dev_data)
        logger.info("Dev Set Statistics:")
        for key, value in dev_stats.items():
            logger.info(f"  {key}: {value}")
        
        # Extract Q&A pairs for evaluation
        qa_pairs_dev = squad_manager.extract_qa_pairs(dev_data, limit=int(qa_pairs_limit * 0.2))
        
        # Save evaluation pairs
        qa_file_dev = Path(squad_dir) / "qa_pairs_dev.json"
        squad_manager.save_qa_pairs(qa_pairs_dev, str(qa_file_dev))
        logger.info(f"\n✓ Extracted and saved {len(qa_pairs_dev)} evaluation Q&A pairs")
    
    logger.info("\n" + "=" * 60)
    logger.info("✓ SQuAD Pipeline Complete!")
    logger.info("=" * 60)
    logger.info(f"\nQ&A pairs ready at:")
    logger.info(f"  Training: {squad_dir}/qa_pairs_train.json")
    logger.info(f"  Evaluation: {squad_dir}/qa_pairs_dev.json")
    
    return True

if __name__ == '__main__':
    try:
        success = run_squad_pipeline()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        sys.exit(1)
EOF

# Run Python script
echo -e "${YELLOW}Running SQuAD pipeline...${NC}\n"

python3 /tmp/run_squad_pipeline.py

if [[ $? -eq 0 ]]; then
    echo -e "\n${GREEN}✓ SQuAD pipeline complete!${NC}"
    echo -e "\n${YELLOW}Q&A Pairs Location:${NC}"
    echo "  Training:   $SQUAD_DIR/qa_pairs_train.json"
    echo "  Evaluation: $SQUAD_DIR/qa_pairs_dev.json"
else
    echo -e "\n${RED}✗ SQuAD pipeline failed${NC}"
    exit 1
fi

# Optional: Show dataset statistics
if [[ -f "$SQUAD_DIR/qa_pairs_train.json" ]]; then
    echo -e "\n${YELLOW}Dataset Statistics:${NC}"
    
    python3 << PYEOF
import json
from pathlib import Path

squad_dir = Path("$SQUAD_DIR")

# Count training pairs
with open(squad_dir / "qa_pairs_train.json") as f:
    train_pairs = json.load(f)
    print(f"  Training Q&A Pairs: {len(train_pairs)}")

# Count eval pairs
if (squad_dir / "qa_pairs_dev.json").exists():
    with open(squad_dir / "qa_pairs_dev.json") as f:
        eval_pairs = json.load(f)
        print(f"  Evaluation Q&A Pairs: {len(eval_pairs)}")

# Show sample
if train_pairs:
    print("\n${YELLOW}Sample Q&A:${NC}")
    sample = train_pairs[0]
    print(f"\n  Question: {sample['question']}")
    print(f"  Answer: {sample['answer']}")
    print(f"  Context: {sample['context'][:100]}...")
PYEOF
fi

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Ready to start Q&A improvement loops!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
