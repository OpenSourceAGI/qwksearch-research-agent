#!/bin/bash

###############################################################################
# AWS Fargate Launch Script
# Launches train-next-word-prediction service on AWS Fargate
# Supports GPU and CPU instances with cost optimization
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration from environment or defaults
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"
CLUSTER_NAME="${CLUSTER_NAME:-transformer-training}"
SERVICE_NAME="${SERVICE_NAME:-train-next-word-prediction}"
CONTAINER_NAME="${CONTAINER_NAME:-train-next-word-prediction}"
ECR_REPO="${ECR_REPO:-train-next-word-prediction}"
TASK_FAMILY="${TASK_FAMILY:-train-next-word-prediction}"
COMPUTE_TYPE="${COMPUTE_TYPE:-cpu}" # 'cpu', 'gpu', or 'gpu-spot'
DESIRED_COUNT="${DESIRED_COUNT:-1}"
CPU_UNITS="${CPU_UNITS:-1024}"        # 256, 512, 1024, 2048, 4096
MEMORY_MB="${MEMORY_MB:-2048}"        # 512 to 30720
ENABLE_SPOT="${ENABLE_SPOT:-false}"

# GPU-specific configurations (if COMPUTE_TYPE=gpu)
GPU_COUNT="${GPU_COUNT:-1}"            # 1, 2, 4, 8
FARGATE_GPU_INSTANCE_TYPE="${FARGATE_GPU_INSTANCE_TYPE:-GPU}"

# Cost optimization
USE_FARGATE_SPOT="${USE_FARGATE_SPOT:-false}"
SPOT_PRICE="${SPOT_PRICE:-}"

# Logging
LOG_GROUP="${LOG_GROUP:-/ecs/transformer-training}"
LOG_STREAM="${LOG_STREAM:-train-next-word-prediction}"

# IAM and Security
EXECUTION_ROLE_NAME="${EXECUTION_ROLE_NAME:-ecsTaskExecutionRole}"
TASK_ROLE_NAME="${TASK_ROLE_NAME:-ecsTaskRole}"
TASK_SECURITY_GROUPS="${TASK_SECURITY_GROUPS:-}"
TASK_SUBNETS="${TASK_SUBNETS:-}"

# S3 Configuration (for checkpoints and data)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-transformer-training}"

# Model Configuration
USE_DEMO_MODE="${USE_DEMO_MODE:-true}"
MONGO_HOST="${MONGO_HOST:-mongodb.example.com}"
MONGO_PORT="${MONGO_PORT:-27017}"
MODEL_CHECKPOINT_PATH="${MODEL_CHECKPOINT_PATH:-/data/checkpoints}"
DATA_PATH="${DATA_PATH:-/data}"

# EFS Configuration (for persistent storage)
EFS_ID="${EFS_ID:-}"
ENABLE_EFS="${ENABLE_EFS:-false}"

echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}AWS Fargate Launcher - Transformer Training${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"

print_config() {
    echo -e "\n${GREEN}Configuration:${NC}"
    echo "  AWS Region:           $AWS_REGION"
    echo "  AWS Profile:          $AWS_PROFILE"
    echo "  Cluster:              $CLUSTER_NAME"
    echo "  Service:              $SERVICE_NAME"
    echo "  Compute Type:         $COMPUTE_TYPE"
    echo "  CPU Units:            $CPU_UNITS"
    echo "  Memory (MB):          $MEMORY_MB"
    echo "  Desired Count:        $DESIRED_COUNT"
    if [[ "$COMPUTE_TYPE" == "gpu"* ]]; then
        echo "  GPU Count:            $GPU_COUNT"
    fi
    echo "  Use Spot Instances:   $USE_FARGATE_SPOT"
    echo "  Log Group:            $LOG_GROUP"
    echo "  ECR Repository:       $ECR_REPO"
    if [[ -n "$S3_BUCKET" ]]; then
        echo "  S3 Bucket:            $S3_BUCKET/$S3_PREFIX"
    fi
    if [[ "$ENABLE_EFS" == "true" ]]; then
        echo "  EFS ID:               $EFS_ID"
    fi
    echo ""
}

check_prerequisites() {
    echo -e "\n${YELLOW}Checking prerequisites...${NC}"
    
    command -v aws &> /dev/null || {
        echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
        exit 1
    }
    
    # Check AWS credentials
    aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null || {
        echo -e "${RED}AWS credentials not configured for profile: $AWS_PROFILE${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ AWS CLI available${NC}"
    echo -e "${GREEN}✓ AWS credentials configured${NC}"
}

validate_config() {
    echo -e "\n${YELLOW}Validating configuration...${NC}"
    
    # Validate compute type
    if [[ ! "$COMPUTE_TYPE" =~ ^(cpu|gpu|gpu-spot)$ ]]; then
        echo -e "${RED}Invalid COMPUTE_TYPE: $COMPUTE_TYPE (must be 'cpu', 'gpu', or 'gpu-spot')${NC}"
        exit 1
    fi
    
    # Validate CPU/Memory combinations for Fargate
    local valid_combinations=(
        "256:512" "256:1024" "256:2048"
        "512:1024" "512:2048" "512:3072" "512:4096"
        "1024:2048" "1024:3072" "1024:4096" "1024:5120" "1024:6144" "1024:7168" "1024:8192"
        "2048:4096" "2048:5120" "2048:6144" "2048:7168" "2048:8192" "2048:9216" "2048:10240" "2048:11264" "2048:12288" "2048:13312" "2048:14336" "2048:15360" "2048:16384"
        "4096:8192" "4096:30720"
    )
    
    local combo="${CPU_UNITS}:${MEMORY_MB}"
    if [[ ! " ${valid_combinations[@]} " =~ " ${combo} " ]]; then
        echo -e "${RED}Invalid CPU/Memory combination: $combo${NC}"
        echo "Valid combinations: ${valid_combinations[@]}"
        exit 1
    fi
    
    # Validate GPU configurations
    if [[ "$COMPUTE_TYPE" == "gpu"* ]]; then
        if [[ ! "$GPU_COUNT" =~ ^[1248]$ ]]; then
            echo -e "${RED}Invalid GPU_COUNT: $GPU_COUNT (must be 1, 2, 4, or 8)${NC}"
            exit 1
        fi
        # GPU minimum resources
        if (( CPU_UNITS < 1024 )); then
            echo -e "${YELLOW}Warning: GPU tasks typically need CPU_UNITS >= 1024${NC}"
        fi
        if (( MEMORY_MB < 8192 )); then
            echo -e "${YELLOW}Warning: GPU tasks typically need MEMORY_MB >= 8192${NC}"
        fi
    fi
    
    echo -e "${GREEN}✓ Configuration is valid${NC}"
}

create_log_group() {
    echo -e "\n${YELLOW}Setting up CloudWatch logs...${NC}"
    
    if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
        echo -e "${GREEN}✓ Log group already exists: $LOG_GROUP${NC}"
    else
        echo "Creating log group: $LOG_GROUP"
        aws logs create-log-group \
            --log-group-name "$LOG_GROUP" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION"
        
        # Set retention policy (30 days)
        aws logs put-retention-policy \
            --log-group-name "$LOG_GROUP" \
            --retention-in-days 30 \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION"
        
        echo -e "${GREEN}✓ Log group created${NC}"
    fi
}

create_iam_roles() {
    echo -e "\n${YELLOW}Setting up IAM roles...${NC}"
    
    # Task Execution Role
    local execution_role_arn=""
    if aws iam get-role --role-name "$EXECUTION_ROLE_NAME" &> /dev/null; then
        execution_role_arn=$(aws iam get-role --role-name "$EXECUTION_ROLE_NAME" --query 'Role.Arn' --output text)
        echo -e "${GREEN}✓ Execution role exists: $EXECUTION_ROLE_NAME${NC}"
    else
        echo "Creating execution role: $EXECUTION_ROLE_NAME"
        aws iam create-role \
            --role-name "$EXECUTION_ROLE_NAME" \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ecs-tasks.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }'
        
        aws iam attach-role-policy \
            --role-name "$EXECUTION_ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
        
        aws iam put-role-policy \
            --role-name "$EXECUTION_ROLE_NAME" \
            --policy-name CloudWatchLogsPolicy \
            --policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "logs:CreateLogStream",
                            "logs:PutLogEvents"
                        ],
                        "Resource": "arn:aws:logs:*:*:*"
                    }
                ]
            }'
        
        execution_role_arn=$(aws iam get-role --role-name "$EXECUTION_ROLE_NAME" --query 'Role.Arn' --output text)
        echo -e "${GREEN}✓ Execution role created${NC}"
    fi
    
    # Task Role
    local task_role_arn=""
    if aws iam get-role --role-name "$TASK_ROLE_NAME" &> /dev/null; then
        task_role_arn=$(aws iam get-role --role-name "$TASK_ROLE_NAME" --query 'Role.Arn' --output text)
        echo -e "${GREEN}✓ Task role exists: $TASK_ROLE_NAME${NC}"
    else
        echo "Creating task role: $TASK_ROLE_NAME"
        aws iam create-role \
            --role-name "$TASK_ROLE_NAME" \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ecs-tasks.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }'
        
        # Add policies for S3 access
        if [[ -n "$S3_BUCKET" ]]; then
            aws iam put-role-policy \
                --role-name "$TASK_ROLE_NAME" \
                --policy-name S3Access \
                --policy-document "{
                    \"Version\": \"2012-10-17\",
                    \"Statement\": [
                        {
                            \"Effect\": \"Allow\",
                            \"Action\": [
                                \"s3:GetObject\",
                                \"s3:PutObject\",
                                \"s3:DeleteObject\",
                                \"s3:ListBucket\"
                            ],
                            \"Resource\": [
                                \"arn:aws:s3:::${S3_BUCKET}/${S3_PREFIX}*\",
                                \"arn:aws:s3:::${S3_BUCKET}\"
                            ]
                        }
                    ]
                }"
        fi
        
        task_role_arn=$(aws iam get-role --role-name "$TASK_ROLE_NAME" --query 'Role.Arn' --output text)
        echo -e "${GREEN}✓ Task role created${NC}"
    fi
}

create_ecs_cluster() {
    echo -e "\n${YELLOW}Setting up ECS cluster...${NC}"
    
    if aws ecs describe-clusters --clusters "$CLUSTER_NAME" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION" \
        --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
        echo -e "${GREEN}✓ ECS cluster already exists: $CLUSTER_NAME${NC}"
    else
        echo "Creating ECS cluster: $CLUSTER_NAME"
        aws ecs create-cluster \
            --cluster-name "$CLUSTER_NAME" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION" \
            --capacity-providers FARGATE FARGATE_SPOT
        
        echo -e "${GREEN}✓ ECS cluster created${NC}"
    fi
}

build_and_push_image() {
    echo -e "\n${YELLOW}Building and pushing Docker image...${NC}"
    
    local account_id=$(aws sts get-caller-identity --query Account --output text --profile "$AWS_PROFILE")
    local ecr_uri="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
    
    # Create ECR repository if it doesn't exist
    if ! aws ecr describe-repositories --repository-names "$ECR_REPO" \
        --profile "$AWS_PROFILE" --region "$AWS_REGION" &> /dev/null; then
        echo "Creating ECR repository: $ECR_REPO"
        aws ecr create-repository \
            --repository-name "$ECR_REPO" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION"
    fi
    
    # Login to ECR
    echo "Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" | \
        docker login --username AWS --password-stdin "$ecr_uri"
    
    # Select Dockerfile based on compute type
    local dockerfile="Dockerfile"
    if [[ "$COMPUTE_TYPE" == "gpu"* ]]; then
        dockerfile="Dockerfile.gpu"
        if [[ ! -f "$dockerfile" ]]; then
            echo -e "${YELLOW}GPU Dockerfile not found, using standard Dockerfile${NC}"
            dockerfile="Dockerfile"
        fi
    fi
    
    # Build image
    echo "Building Docker image..."
    docker build -t "${ECR_REPO}:latest" -f "$dockerfile" .
    docker tag "${ECR_REPO}:latest" "${ecr_uri}:latest"
    docker tag "${ECR_REPO}:latest" "${ecr_uri}:$(date +%Y%m%d-%H%M%S)"
    
    # Push to ECR
    echo "Pushing image to ECR..."
    docker push "${ecr_uri}:latest"
    docker push "${ecr_uri}:$(date +%Y%m%d-%H%M%S)"
    
    echo -e "${GREEN}✓ Image pushed to ECR: ${ecr_uri}:latest${NC}"
    
    # Return the ECR URI for use in task definition
    echo "$ecr_uri:latest"
}

create_task_definition() {
    echo -e "\n${YELLOW}Creating ECS task definition...${NC}"
    
    local image_uri="$1"
    local account_id=$(aws sts get-caller-identity --query Account --output text --profile "$AWS_PROFILE")
    local execution_role_arn="arn:aws:iam::${account_id}:role/${EXECUTION_ROLE_NAME}"
    local task_role_arn="arn:aws:iam::${account_id}:role/${TASK_ROLE_NAME}"
    
    # Build container environment variables
    local container_env="["
    container_env+='{"name": "USE_DEMO_MODE", "value": "'$USE_DEMO_MODE'"},'
    container_env+='{"name": "MONGO_HOST", "value": "'$MONGO_HOST'"},'
    container_env+='{"name": "MONGO_PORT", "value": "'$MONGO_PORT'"},'
    container_env+='{"name": "MODEL_CHECKPOINT_PATH", "value": "'$MODEL_CHECKPOINT_PATH'"},'
    container_env+='{"name": "DATA_PATH", "value": "'$DATA_PATH'"},'
    container_env+='{"name": "AWS_REGION", "value": "'$AWS_REGION'"},'
    container_env+='{"name": "COMPUTE_TYPE", "value": "'$COMPUTE_TYPE'"},'
    container_env+='{"name": "PORT", "value": "8080"}'
    
    if [[ -n "$S3_BUCKET" ]]; then
        container_env+=',"name": "S3_BUCKET", "value": "'$S3_BUCKET'"'
        container_env+=',"name": "S3_PREFIX", "value": "'$S3_PREFIX'"'
    fi
    
    container_env+="]"
    
    # Build GPU/accelerator config
    local accelerators="[]"
    if [[ "$COMPUTE_TYPE" == "gpu"* ]]; then
        accelerators='[{"type": "'$FARGATE_GPU_INSTANCE_TYPE'", "count": '$GPU_COUNT'}]'
    fi
    
    # Build mount points for EFS if enabled
    local mount_points="[]"
    if [[ "$ENABLE_EFS" == "true" && -n "$EFS_ID" ]]; then
        mount_points='[{"sourceVolume": "efs-storage", "containerPath": "/data", "readOnly": false}]'
    fi
    
    local volumes="[]"
    if [[ "$ENABLE_EFS" == "true" && -n "$EFS_ID" ]]; then
        volumes='[{"name": "efs-storage", "efsVolumeConfiguration": {"fileSystemId": "'$EFS_ID'", "transitEncryption": "ENABLED"}}]'
    fi
    
    # Create task definition JSON
    cat > /tmp/task-definition.json <<EOF
{
    "family": "$TASK_FAMILY",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "$CPU_UNITS",
    "memory": "$MEMORY_MB",
    "executionRoleArn": "$execution_role_arn",
    "taskRoleArn": "$task_role_arn",
    "containerDefinitions": [
        {
            "name": "$CONTAINER_NAME",
            "image": "$image_uri",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 8080,
                    "hostPort": 8080,
                    "protocol": "tcp"
                }
            ],
            "environment": $container_env,
            "mountPoints": $mount_points,
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "$LOG_GROUP",
                    "awslogs-region": "$AWS_REGION",
                    "awslogs-stream-prefix": "$LOG_STREAM"
                }
            },
            "resourceRequirements": $(if [[ "$COMPUTE_TYPE" == "gpu"* ]]; then echo "$accelerators"; else echo "[]"; fi)
        }
    ],
    "volumes": $volumes
}
EOF
    
    echo "Registering task definition: $TASK_FAMILY"
    aws ecs register-task-definition \
        --cli-input-json file:///tmp/task-definition.json \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" > /dev/null
    
    echo -e "${GREEN}✓ Task definition registered${NC}"
}

create_or_update_service() {
    echo -e "\n${YELLOW}Creating/updating ECS service...${NC}"
    
    local capacity_provider="FARGATE"
    if [[ "$USE_FARGATE_SPOT" == "true" ]]; then
        capacity_provider="FARGATE_SPOT"
    fi
    
    # Check if service exists
    if aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'services[0].serviceName' --output text 2>/dev/null | grep -q "$SERVICE_NAME"; then
        
        echo "Updating existing service: $SERVICE_NAME"
        aws ecs update-service \
            --cluster "$CLUSTER_NAME" \
            --service "$SERVICE_NAME" \
            --task-definition "$TASK_FAMILY" \
            --desired-count "$DESIRED_COUNT" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION"
    else
        echo "Creating new service: $SERVICE_NAME"
        
        # Need subnets and security groups for service creation
        if [[ -z "$TASK_SUBNETS" ]] || [[ -z "$TASK_SECURITY_GROUPS" ]]; then
            echo -e "${YELLOW}Warning: TASK_SUBNETS and TASK_SECURITY_GROUPS not provided${NC}"
            echo "Set these variables before creating the service:"
            echo "  export TASK_SUBNETS='subnet-xxx subnet-yyy'"
            echo "  export TASK_SECURITY_GROUPS='sg-xxx'"
            echo ""
            echo "To find your default VPC subnets and security group:"
            echo "  aws ec2 describe-subnets --query 'Subnets[0].SubnetId' --output text"
            echo "  aws ec2 describe-security-groups --query 'SecurityGroups[0].GroupId' --output text"
            return 1
        fi
        
        aws ecs create-service \
            --cluster "$CLUSTER_NAME" \
            --service-name "$SERVICE_NAME" \
            --task-definition "$TASK_FAMILY" \
            --desired-count "$DESIRED_COUNT" \
            --launch-type "$capacity_provider" \
            --network-configuration "awsvpcConfiguration={subnets=[${TASK_SUBNETS}],securityGroups=[${TASK_SECURITY_GROUPS}],assignPublicIp=ENABLED}" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION"
    fi
    
    echo -e "${GREEN}✓ Service created/updated${NC}"
}

get_service_status() {
    echo -e "\n${YELLOW}Service Status:${NC}"
    
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'services[0].{Status:status, DesiredCount:desiredCount, RunningCount:runningCount, PendingCount:pendingCount}' \
        --output table
    
    echo ""
    echo -e "${YELLOW}Task Status:${NC}"
    
    aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'taskArns[]' --output text | while read -r task_arn; do
        aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks "$task_arn" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION" \
            --query 'tasks[0].{TaskArn:taskArn, Status:lastStatus, DesiredStatus:desiredStatus}' \
            --output table
    done
    
    echo ""
    echo -e "${YELLOW}Recent Logs:${NC}"
    aws logs tail "$LOG_GROUP" --since 1h --follow --profile "$AWS_PROFILE" --region "$AWS_REGION" &
}

main() {
    print_config
    
    check_prerequisites
    validate_config
    
    create_log_group
    create_iam_roles
    create_ecs_cluster
    
    local image_uri=$(build_and_push_image)
    create_task_definition "$image_uri"
    create_or_update_service
    
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Deployment complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    
    get_service_status
    
    echo -e "\n${GREEN}Useful commands:${NC}"
    echo "  View service: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
    echo "  View logs: aws logs tail $LOG_GROUP --follow"
    echo "  Scale: aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --desired-count N"
    echo "  SSH: aws ecs execute-command --cluster $CLUSTER_NAME --task <task-id> --container $CONTAINER_NAME --interactive --command /bin/bash"
}

# Show help
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo -e "\n${GREEN}Usage: ./launch-fargate.sh [OPTIONS]${NC}\n"
    echo "Environment Variables:"
    echo "  AWS_REGION              AWS region (default: us-east-1)"
    echo "  AWS_PROFILE             AWS profile to use (default: default)"
    echo "  CLUSTER_NAME            ECS cluster name (default: transformer-training)"
    echo "  SERVICE_NAME            ECS service name (default: train-next-word-prediction)"
    echo "  COMPUTE_TYPE            'cpu', 'gpu', or 'gpu-spot' (default: cpu)"
    echo "  CPU_UNITS               256-4096 (default: 1024)"
    echo "  MEMORY_MB               512-30720 (default: 2048)"
    echo "  GPU_COUNT               1, 2, 4, or 8 (default: 1)"
    echo "  USE_FARGATE_SPOT        true/false for spot instances (default: false)"
    echo "  DESIRED_COUNT           Number of tasks (default: 1)"
    echo "  S3_BUCKET               S3 bucket for checkpoints/data"
    echo "  ENABLE_EFS              true/false to mount EFS (default: false)"
    echo "  EFS_ID                  EFS ID if ENABLE_EFS=true"
    echo "  TASK_SUBNETS            VPC subnet IDs (comma-separated)"
    echo "  TASK_SECURITY_GROUPS    Security group IDs (comma-separated)"
    echo ""
    echo "Example - CPU Task:"
    echo "  COMPUTE_TYPE=cpu DESIRED_COUNT=2 ./launch-fargate.sh"
    echo ""
    echo "Example - GPU Task with Spot Instances:"
    echo "  COMPUTE_TYPE=gpu GPU_COUNT=2 USE_FARGATE_SPOT=true ./launch-fargate.sh"
    echo ""
    exit 0
fi

main "$@"
