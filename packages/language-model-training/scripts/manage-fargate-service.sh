#!/bin/bash

###############################################################################
# Fargate Service Management Script
# Scale, monitor, and manage running Fargate services
###############################################################################

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-default}"
CLUSTER_NAME="${CLUSTER_NAME:-transformer-training}"
SERVICE_NAME="${SERVICE_NAME:-train-next-word-prediction}"
LOG_GROUP="${LOG_GROUP:-/ecs/transformer-training}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
    cat << 'EOF'
Usage: ./manage-fargate-service.sh <command> [OPTIONS]

Commands:
  status              Show service status
  logs                Stream logs
  scale <count>       Scale service to N tasks
  restart             Restart service
  stop                Stop service
  start               Start service
  exec <task-id>      Execute shell in task
  list-tasks          List running tasks
  describe-task       Describe specific task
  cost                Estimate service cost
  config              Show current configuration

Examples:
  ./manage-fargate-service.sh status
  ./manage-fargate-service.sh logs
  ./manage-fargate-service.sh scale 3
  ./manage-fargate-service.sh exec
  ./manage-fargate-service.sh cost
EOF
}

status() {
    echo -e "${YELLOW}Service Status:${NC}\n"
    
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'services[0].{
            Name:serviceName,
            Status:status,
            LaunchType:launchType,
            DesiredCount:desiredCount,
            RunningCount:runningCount,
            PendingCount:pendingCount,
            FailingCount:failingCount
        }' \
        --output table
    
    echo -e "\n${YELLOW}Task Status:${NC}\n"
    
    local task_arns=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'taskArns[]' \
        --output text)
    
    if [[ -z "$task_arns" ]]; then
        echo "No running tasks"
        return
    fi
    
    aws ecs describe-tasks \
        --cluster "$CLUSTER_NAME" \
        --tasks $task_arns \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'tasks[].{
            TaskId:taskArn|split(`/`)[-1],
            Status:lastStatus,
            DesiredStatus:desiredStatus,
            CreatedAt:createdAt,
            LaunchType:launchType
        }' \
        --output table
}

logs() {
    local follow="${1:--f}"
    local hours="${2:-1}"
    
    echo -e "${YELLOW}Streaming logs from last $hours hour(s)...${NC}\n"
    
    aws logs tail "$LOG_GROUP" \
        --since "${hours}h" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        $follow
}

scale() {
    local count="$1"
    
    if [[ -z "$count" ]] || ! [[ "$count" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Error: Scale count must be a positive number${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Scaling service to $count tasks...${NC}"
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --desired-count "$count" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" > /dev/null
    
    echo -e "${GREEN}✓ Scale request sent${NC}"
    
    # Wait for update to complete
    echo "Waiting for tasks to reach desired state..."
    aws ecs wait services-stable \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" || echo -e "${YELLOW}Timeout waiting for stability${NC}"
    
    status
}

restart() {
    echo -e "${YELLOW}Restarting service...${NC}"
    
    # Set desired count to 0
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --desired-count 0 \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" > /dev/null
    
    sleep 10
    
    # Get original desired count
    local desired_count=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'services[0].runningCount' \
        --output text 2>/dev/null || echo "1")
    
    # Set back to 1 if it was 0
    if (( desired_count == 0 )); then
        desired_count=1
    fi
    
    # Restore desired count
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --desired-count "$desired_count" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" > /dev/null
    
    echo -e "${GREEN}✓ Service restarted${NC}"
    
    sleep 5
    status
}

stop() {
    echo -e "${YELLOW}Stopping service...${NC}"
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --desired-count 0 \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" > /dev/null
    
    echo -e "${GREEN}✓ Service stopped${NC}"
}

start() {
    echo -e "${YELLOW}Starting service...${NC}"
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --desired-count 1 \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" > /dev/null
    
    echo -e "${GREEN}✓ Service started${NC}"
    
    sleep 5
    status
}

exec_shell() {
    echo -e "${YELLOW}Getting task list...${NC}"
    
    local task_arns=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'taskArns[]' \
        --output text)
    
    if [[ -z "$task_arns" ]]; then
        echo -e "${RED}No running tasks${NC}"
        return 1
    fi
    
    local task_id=$(echo "$task_arns" | awk '{print $1}' | rev | cut -d'/' -f1 | rev)
    
    echo -e "${YELLOW}Connecting to task: $task_id${NC}\n"
    
    aws ecs execute-command \
        --cluster "$CLUSTER_NAME" \
        --task "$task_id" \
        --container train-next-word-prediction \
        --interactive \
        --command "/bin/bash" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION"
}

list_tasks() {
    echo -e "${YELLOW}Running Tasks:${NC}\n"
    
    local task_arns=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'taskArns[]' \
        --output text)
    
    if [[ -z "$task_arns" ]]; then
        echo "No running tasks"
        return
    fi
    
    aws ecs describe-tasks \
        --cluster "$CLUSTER_NAME" \
        --tasks $task_arns \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'tasks[].{
            TaskArn:taskArn,
            Status:lastStatus,
            PrivateIP:attachments[0].details[?name==`privateIPv4Address`].value|[0],
            CreatedAt:createdAt,
            PullStartedAt:pullStartedAt,
            PullStoppedAt:pullStoppedAt,
            ExecutionStoppedAt:executionStoppedAt
        }' \
        --output table
}

describe_task() {
    echo -e "${YELLOW}Getting task list...${NC}"
    
    local task_arns=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'taskArns[]' \
        --output text)
    
    if [[ -z "$task_arns" ]]; then
        echo -e "${RED}No running tasks${NC}"
        return 1
    fi
    
    local task_id=$(echo "$task_arns" | awk '{print $1}')
    
    echo -e "${YELLOW}Task Details:${NC}\n"
    
    aws ecs describe-tasks \
        --cluster "$CLUSTER_NAME" \
        --tasks "$task_id" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --output json | jq .
}

estimate_cost() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ AWS Fargate Cost Estimation${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
    
    # Get service details
    local service_info=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'services[0]' \
        --output json)
    
    local desired_count=$(echo "$service_info" | jq -r '.desiredCount')
    local running_count=$(echo "$service_info" | jq -r '.runningCount')
    
    # Get task definition
    local task_def=$(echo "$service_info" | jq -r '.taskDefinition' | rev | cut -d':' -f1 | rev)
    local task_def_info=$(aws ecs describe-task-definition \
        --task-definition "$task_def" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'taskDefinition' \
        --output json)
    
    local cpu=$(echo "$task_def_info" | jq -r '.cpu')
    local memory=$(echo "$task_def_info" | jq -r '.memory')
    
    echo "Service Configuration:"
    echo "  Cluster:          $CLUSTER_NAME"
    echo "  Service:          $SERVICE_NAME"
    echo "  Running Tasks:    $running_count / $desired_count"
    echo "  CPU per Task:     $cpu vCPU"
    echo "  Memory per Task:  $memory MB"
    echo ""
    
    # Calculate hourly costs (as of 2024, adjust as needed)
    # CPU: $0.04048 per vCPU-hour
    # Memory: $0.004445 per GB-hour
    # Spot: 70% discount
    
    local cpu_vcpu=$(echo "scale=3; $cpu / 1024" | bc)
    local memory_gb=$(echo "scale=3; $memory / 1024" | bc)
    
    local cpu_cost_hourly=$(echo "scale=6; $cpu_vcpu * 0.04048" | bc)
    local memory_cost_hourly=$(echo "scale=6; $memory_gb * 0.004445" | bc)
    local task_cost_hourly=$(echo "scale=6; $cpu_cost_hourly + $memory_cost_hourly" | bc)
    local total_cost_hourly=$(echo "scale=6; $task_cost_hourly * $running_count" | bc)
    
    local spot_cost_hourly=$(echo "scale=6; $total_cost_hourly * 0.3" | bc)
    
    echo -e "${GREEN}Hourly Costs (On-Demand):${NC}"
    echo "  CPU Cost:         \$$cpu_cost_hourly"
    echo "  Memory Cost:      \$$memory_cost_hourly"
    echo "  Per Task:         \$$task_cost_hourly"
    echo "  Total ($running_count tasks): \$$total_cost_hourly"
    echo ""
    
    echo -e "${YELLOW}Hourly Costs (Spot - 70% Discount):${NC}"
    echo "  Total ($running_count tasks): \$$spot_cost_hourly"
    echo ""
    
    local daily_on_demand=$(echo "scale=2; $total_cost_hourly * 24" | bc)
    local daily_spot=$(echo "scale=2; $spot_cost_hourly * 24" | bc)
    local monthly_on_demand=$(echo "scale=2; $daily_on_demand * 30" | bc)
    local monthly_spot=$(echo "scale=2; $daily_spot * 30" | bc)
    
    echo -e "${GREEN}Daily Costs (On-Demand): \$$daily_on_demand${NC}"
    echo -e "${YELLOW}Daily Costs (Spot):      \$$daily_spot${NC}"
    echo ""
    echo -e "${GREEN}Monthly Costs (On-Demand): \$$monthly_on_demand${NC}"
    echo -e "${YELLOW}Monthly Costs (Spot):      \$$monthly_spot${NC}"
    echo ""
    
    echo -e "${BLUE}Savings with Spot Instances: \$$(echo "scale=2; $monthly_on_demand - $monthly_spot" | bc)/month${NC}"
}

show_config() {
    echo -e "${YELLOW}Current Configuration:${NC}\n"
    echo "  AWS_REGION:      $AWS_REGION"
    echo "  AWS_PROFILE:     $AWS_PROFILE"
    echo "  CLUSTER_NAME:    $CLUSTER_NAME"
    echo "  SERVICE_NAME:    $SERVICE_NAME"
    echo "  LOG_GROUP:       $LOG_GROUP"
}

# Main
case "${1:-help}" in
    status)
        status
        ;;
    logs)
        logs "${2:--f}" "${3:-1}"
        ;;
    scale)
        scale "${2:-}"
        ;;
    restart)
        restart
        ;;
    stop)
        stop
        ;;
    start)
        start
        ;;
    exec)
        exec_shell
        ;;
    list-tasks)
        list_tasks
        ;;
    describe-task)
        describe_task
        ;;
    cost)
        estimate_cost
        ;;
    config)
        show_config
        ;;
    -h|--help|help)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}\n"
        print_usage
        exit 1
        ;;
esac
