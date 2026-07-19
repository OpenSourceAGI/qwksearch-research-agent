#!/usr/bin/env bash

###############################################################################
# Quick Start Guide - Q&A Training Pipeline
# Run this script to set up and launch the complete system
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Q&A Training Pipeline - Quick Start Setup${NC}                 ${BLUE}║"
echo "╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

dependencies=("python3" "pip" "docker")
missing=()

for dep in "${dependencies[@]}"; do
    if ! command -v "$dep" &> /dev/null; then
        missing+=("$dep")
    fi
done

if [ ${#missing[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing dependencies: ${missing[*]}${NC}"
    echo ""
    echo "Installation instructions:"
    echo "  Python 3.11+:  https://www.python.org/downloads/"
    echo "  Docker:        https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ All dependencies available${NC}\n"

# Install Python packages
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -q --upgrade pip setuptools wheel
pip install -q -r "$PROJECT_ROOT/config/requirements.txt"
pip install -q \
    fastapi \
    uvicorn \
    streamlit \
    plotly \
    pandas \
    requests \
    numpy \
    boto3

echo -e "${GREEN}✓ Python dependencies installed${NC}\n"

# Create directories
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p "$PROJECT_ROOT/data/squad"
mkdir -p "$PROJECT_ROOT/data/checkpoints"
mkdir -p "$PROJECT_ROOT/logs"

echo -e "${GREEN}✓ Directories created${NC}\n"

# Download SQuAD (optional)
echo -e "${YELLOW}SQuAD Dataset:${NC}"
echo "  Train: $PROJECT_ROOT/data/squad/qa_pairs_train.json"
echo "  Dev:   $PROJECT_ROOT/data/squad/qa_pairs_dev.json"

read -p "Download SQuAD dataset now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Downloading SQuAD v1.1...${NC}"
    
    python3 << 'EOF'
import sys
import os
sys.path.insert(0, '/app/src')
os.chdir('$(pwd)')

from src.training.squad_manager import SQuADManager

manager = SQuADManager(data_dir="data/squad", version="1.1")
manager.download()
manager.verify_files()

train = manager.load_train()
dev = manager.load_dev()

if train:
    qa_train = manager.extract_qa_pairs(train)
    manager.save_qa_pairs(qa_train, "data/squad/qa_pairs_train.json")
    print(f"✓ Train: {len(qa_train)} Q&A pairs")

if dev:
    qa_dev = manager.extract_qa_pairs(dev)
    manager.save_qa_pairs(qa_dev, "data/squad/qa_pairs_dev.json")
    print(f"✓ Dev: {len(qa_dev)} Q&A pairs")
EOF
    
    echo -e "${GREEN}✓ SQuAD downloaded${NC}\n"
fi

# Launch local
echo -e "${YELLOW}Ready to launch!${NC}\n"

echo "Options:"
echo "  1. Interactive Setup Wizard  - GUI for dataset, hardware, and deployment"
echo "  2. Local (CPU)               - Run on this machine with FastAPI + Dashboard"
echo "  3. Docker                    - Run in container (docker-compose)"
echo "  4. AWS Fargate               - Deploy to AWS Fargate (requires AWS credentials)"
echo ""

read -p "Choose (1-4): " choice

case $choice in
    1)
        echo -e "\n${GREEN}Launching Setup Wizard...${NC}\n"
        cd "$PROJECT_ROOT"
        pip install -q streamlit plotly pandas requests
        streamlit run webui_setup_wizard.py
        ;;
    2)
        echo -e "\n${GREEN}Launching locally...${NC}\n"
        cd "$PROJECT_ROOT"
        bash scripts/entrypoint-orchestration.sh
        ;;
    3)
        echo -e "\n${GREEN}Launching with Docker Compose...${NC}\n"
        cd "$PROJECT_ROOT"
        docker-compose -f docker-compose.fargate.yml up --build
        ;;
    4)
        echo -e "\n${GREEN}Deploying to AWS Fargate...${NC}\n"
        cd "$PROJECT_ROOT"
        bash scripts/launch-fargate.sh
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac
