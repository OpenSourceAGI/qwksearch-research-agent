#!/bin/bash

###############################################################################
# Quick Deployment Script
# One-command setup and deployment to Fargate
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Defaults
COMPUTE_TYPE="${1:-cpu}"
DESIRED_COUNT="${2:-1}"
USE_SPOT="${3:-false}"

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ Transformer Training - Fargate Quick Deploy${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"

# Validate inputs
case "$COMPUTE_TYPE" in
    cpu|gpu|gpu-spot)
        ;;
    *)
        echo -e "${RED}Invalid compute type: $COMPUTE_TYPE${NC}"
        echo "Valid options: cpu, gpu, gpu-spot"
        exit 1
        ;;
esac

# Set compute-specific defaults
case "$COMPUTE_TYPE" in
    cpu)
        CPU_UNITS=${CPU_UNITS:-1024}
        MEMORY_MB=${MEMORY_MB:-2048}
        GPU_COUNT=0
        ;;
    gpu)
        CPU_UNITS=${CPU_UNITS:-4096}
        MEMORY_MB=${MEMORY_MB:-30720}
        GPU_COUNT=${GPU_COUNT:-1}
        USE_SPOT=false
        ;;
    gpu-spot)
        CPU_UNITS=${CPU_UNITS:-4096}
        MEMORY_MB=${MEMORY_MB:-30720}
        GPU_COUNT=${GPU_COUNT:-1}
        USE_SPOT=true
        ;;
esac

echo -e "${YELLOW}Configuration:${NC}"
echo "  Compute Type:     $COMPUTE_TYPE"
echo "  Desired Tasks:    $DESIRED_COUNT"
echo "  CPU Units:        $CPU_UNITS"
echo "  Memory MB:        $MEMORY_MB"
if [[ "$GPU_COUNT" -gt 0 ]]; then
    echo "  GPU Count:        $GPU_COUNT"
fi
echo "  Use Spot:         $USE_SPOT"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v aws &>/dev/null || {
    echo -e "${RED}AWS CLI not found${NC}"
    exit 1
}

aws sts get-caller-identity &>/dev/null || {
    echo -e "${RED}AWS credentials not configured${NC}"
    exit 1
}

echo -e "${GREEN}✓ Prerequisites OK${NC}\n"

# Export configuration
export COMPUTE_TYPE
export CPU_UNITS
export MEMORY_MB
export GPU_COUNT
export DESIRED_COUNT
export USE_FARGATE_SPOT=$USE_SPOT

# Run full deployment
echo -e "${YELLOW}Running deployment...${NC}\n"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ ! -f scripts/launch-fargate.sh ]]; then
    echo -e "${RED}launch-fargate.sh not found${NC}"
    exit 1
fi

chmod +x scripts/launch-fargate.sh
./scripts/launch-fargate.sh

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ Deployment Complete!${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Check status:"
echo "   chmod +x scripts/manage-fargate-service.sh"
echo "   ./scripts/manage-fargate-service.sh status"
echo ""
echo "2. View logs:"
echo "   ./scripts/manage-fargate-service.sh logs"
echo ""
echo "3. Estimate costs:"
echo "   ./scripts/manage-fargate-service.sh cost"
echo ""
echo "4. SSH into task:"
echo "   ./scripts/manage-fargate-service.sh exec"
echo ""
echo "5. Scale:"
echo "   ./scripts/manage-fargate-service.sh scale 5"
echo ""
