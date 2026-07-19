#!/bin/bash

###############################################################################
# Server startup script with IAM authentication and health checks
# This script is meant to be sourced or run before starting the main server
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PORT="${PORT:-8080}"
ENVIRONMENT="${ENVIRONMENT:-production}"
LOG_LEVEL="${LOG_LEVEL:-info}"

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting Transformer Training Server${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# Check IAM credentials
check_iam_credentials() {
    echo -e "\n${YELLOW}Checking IAM credentials...${NC}"
    
    # If in AWS Fargate, credentials come from task role
    if [[ -n "${AWS_CONTAINER_CREDENTIALS_RELATIVE_URI:-}" ]]; then
        echo -e "${GREEN}✓ Using Fargate task role credentials${NC}"
        return 0
    fi
    
    # Check for explicit credentials
    if [[ -n "${AWS_ACCESS_KEY_ID:-}" ]] && [[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
        echo -e "${GREEN}✓ AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY set${NC}"
        
        # Verify credentials work
        if aws sts get-caller-identity &>/dev/null; then
            local account_id=$(aws sts get-caller-identity --query Account --output text)
            echo -e "${GREEN}✓ Credentials valid (Account: $account_id)${NC}"
            return 0
        else
            echo -e "${RED}✗ IAM credentials invalid${NC}"
            return 1
        fi
    fi
    
    # Check AWS CLI credentials
    if [[ -n "${AWS_PROFILE:-}" ]]; then
        echo -e "${YELLOW}Using AWS profile: $AWS_PROFILE${NC}"
        if aws sts get-caller-identity --profile "$AWS_PROFILE" &>/dev/null; then
            echo -e "${GREEN}✓ Profile credentials valid${NC}"
            return 0
        fi
    fi
    
    # Check default credentials from ~/.aws/credentials
    if [[ -f "$HOME/.aws/credentials" ]]; then
        echo -e "${YELLOW}Using credentials from $HOME/.aws/credentials${NC}"
        if aws sts get-caller-identity &>/dev/null; then
            echo -e "${GREEN}✓ Default credentials valid${NC}"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}No IAM credentials found (OK if running in demo mode)${NC}"
    return 0
}

# Initialize directories
init_directories() {
    echo -e "\n${YELLOW}Initializing directories...${NC}"
    
    mkdir -p /data/checkpoints
    mkdir -p /data/logs
    mkdir -p /app/logs
    
    echo -e "${GREEN}✓ Directories initialized${NC}"
}

# Download models or data if needed
download_assets() {
    if [[ "${USE_DEMO_MODE:-true}" == "true" ]]; then
        echo -e "\n${YELLOW}Running in demo mode${NC}"
        return 0
    fi
    
    echo -e "\n${YELLOW}Downloading training data...${NC}"
    
    # If S3_BUCKET is set, download data from S3
    if [[ -n "${S3_BUCKET:-}" ]]; then
        echo "Downloading from S3: $S3_BUCKET/$S3_PREFIX"
        
        # Check for latest checkpoint
        if aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive | grep -q "checkpoint"; then
            echo "Found existing checkpoint, downloading..."
            aws s3 cp \
                "s3://${S3_BUCKET}/${S3_PREFIX}/" \
                "/data/checkpoints/" \
                --recursive \
                --include "*.pt" \
                --include "*.json"
        fi
    fi
}

# Start health check server (simple HTTP endpoint for ECS/ALB)
start_health_server() {
    echo -e "\n${YELLOW}Starting health check server...${NC}"
    
    # Create a simple Python health check endpoint
    python3 << 'PYEOF' &
import http.server
import socketserver
import json

PORT = 8081  # Health check on separate port

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'status': 'healthy',
                'service': 'transformer-training',
                'port': 8080
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        return  # Suppress logging

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), HealthHandler) as httpd:
        print(f"Health check server running on port {PORT}")
        httpd.serve_forever()
except Exception as e:
    print(f"Error starting health check server: {e}")
PYEOF
    
    echo -e "${GREEN}✓ Health check server started on port 8081${NC}"
}

# Log configuration
log_config() {
    echo -e "\n${YELLOW}Server Configuration:${NC}"
    echo "  Environment:      $ENVIRONMENT"
    echo "  Port:             $PORT"
    echo "  Log Level:        $LOG_LEVEL"
    echo "  Demo Mode:        ${USE_DEMO_MODE:-true}"
    
    if [[ -n "${AWS_REGION:-}" ]]; then
        echo "  AWS Region:       $AWS_REGION"
    fi
    
    if [[ -n "${S3_BUCKET:-}" ]]; then
        echo "  S3 Bucket:        $S3_BUCKET"
    fi
    
    if [[ -n "${MONGO_HOST:-}" ]]; then
        echo "  MongoDB:          $MONGO_HOST:${MONGO_PORT:-27017}"
    fi
    
    if [[ -n "${COMPUTE_TYPE:-}" ]]; then
        echo "  Compute Type:     $COMPUTE_TYPE"
    fi
}

# Main startup
main() {
    check_iam_credentials
    init_directories
    download_assets
    start_health_server
    log_config
    
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Server ready to start!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}To start the main server, run:${NC}"
    echo "  uvicorn src.services.server:app --host 0.0.0.0 --port $PORT"
    echo ""
    echo -e "${YELLOW}Health check available at: http://localhost:8081/health${NC}"
    echo ""
}

main "$@"
