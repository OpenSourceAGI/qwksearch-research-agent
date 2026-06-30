# AWS Fargate Deployment Guide

Complete guide for deploying `train-next-word-prediction` on AWS Fargate with GPU/CPU flexibility and cost optimization.

## Quick Start

### 1. Configure AWS Credentials

```bash
# Use AWS CLI credentials (stored in ~/.aws/credentials)
export AWS_PROFILE=default
export AWS_REGION=us-east-1

# Or set IAM credentials directly
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
```

### 2. Set Configuration

```bash
# Copy example config
cp .env.fargate.example .env.fargate
source .env.fargate

# Or set individual variables
export COMPUTE_TYPE=cpu              # 'cpu', 'gpu', or 'gpu-spot'
export DESIRED_COUNT=1               # Number of tasks
export CPU_UNITS=1024                # 256, 512, 1024, 2048, 4096
export MEMORY_MB=2048                # Must match valid CPU/Memory combo
```

### 3. Deploy Infrastructure (One-time Setup)

```bash
# Option A: Using CloudFormation (recommended)
chmod +x scripts/deploy-fargate-cloudformation.sh
./scripts/deploy-fargate-cloudformation.sh

# This creates:
# - VPC with public/private subnets
# - Security groups
# - ECS cluster with Fargate support
# - CloudWatch log group
# - IAM roles with S3 and ECS Exec access

# Get the subnet and security group IDs from CloudFormation outputs
export TASK_SUBNETS="subnet-xxx,subnet-yyy"
export TASK_SECURITY_GROUPS="sg-xxx"
```

### 4. Launch Service

```bash
# Make launch script executable
chmod +x scripts/launch-fargate.sh

# Launch on CPU (cheap)
./scripts/launch-fargate.sh

# Or launch on GPU with Spot instances (more cost-effective)
COMPUTE_TYPE=gpu USE_FARGATE_SPOT=true ./scripts/launch-fargate.sh

# Or launch on GPU with reserved instances (guaranteed, higher cost)
COMPUTE_TYPE=gpu GPU_COUNT=2 ./scripts/launch-fargate.sh
```

### 5. Manage Service

```bash
# Make manage script executable
chmod +x scripts/manage-fargate-service.sh

# Check status
./scripts/manage-fargate-service.sh status

# Stream logs
./scripts/manage-fargate-service.sh logs

# Scale to N tasks
./scripts/manage-fargate-service.sh scale 3

# SSH into a running task
./scripts/manage-fargate-service.sh exec

# Estimate costs
./scripts/manage-fargate-service.sh cost
```

## Configuration Options

### Compute Types

#### CPU Only (Minimal Cost)
```bash
COMPUTE_TYPE=cpu
CPU_UNITS=256
MEMORY_MB=512
USE_FARGATE_SPOT=false
# ~$0.01/hour per task
```

#### CPU Medium (Low Cost, Spot)
```bash
COMPUTE_TYPE=cpu
CPU_UNITS=1024
MEMORY_MB=2048
USE_FARGATE_SPOT=true
# ~$0.01/hour per task
```

#### GPU with Spot (Medium Cost, Interruptible)
```bash
COMPUTE_TYPE=gpu-spot
CPU_UNITS=4096
MEMORY_MB=30720
GPU_COUNT=1
USE_FARGATE_SPOT=true
# ~$0.30/hour per task
```

#### GPU On-Demand (Premium, Guaranteed)
```bash
COMPUTE_TYPE=gpu
CPU_UNITS=4096
MEMORY_MB=30720
GPU_COUNT=1
USE_FARGATE_SPOT=false
# ~$1.00/hour per task
```

### Valid CPU/Memory Combinations

```
256 CPU:  512MB, 1024MB, 2048MB
512 CPU:  1024MB, 2048MB, 3072MB, 4096MB
1024 CPU: 2048MB-8192MB
2048 CPU: 4096MB-16384MB
4096 CPU: 8192MB, 30720MB
```

## Environment Variables

### Core Configuration
- `AWS_REGION`: AWS region (default: us-east-1)
- `AWS_PROFILE`: AWS CLI profile to use
- `CLUSTER_NAME`: ECS cluster name
- `SERVICE_NAME`: ECS service name
- `CONTAINER_NAME`: Container name in task

### Compute Configuration
- `COMPUTE_TYPE`: 'cpu', 'gpu', or 'gpu-spot'
- `CPU_UNITS`: CPU shares (256-4096)
- `MEMORY_MB`: Memory in MB
- `GPU_COUNT`: Number of GPUs (1, 2, 4, 8)
- `USE_FARGATE_SPOT`: Use spot instances for cost savings

### Storage Configuration
- `S3_BUCKET`: S3 bucket for model checkpoints
- `S3_PREFIX`: S3 path prefix
- `ENABLE_EFS`: Mount EFS for persistent storage
- `EFS_ID`: EFS file system ID

### Networking
- `TASK_SUBNETS`: VPC subnets (comma-separated)
- `TASK_SECURITY_GROUPS`: Security groups (comma-separated)

### Model Configuration
- `USE_DEMO_MODE`: Use demo data (true/false)
- `MONGO_HOST`: MongoDB host
- `MONGO_PORT`: MongoDB port
- `MODEL_CHECKPOINT_PATH`: Checkpoint storage path
- `DATA_PATH`: Data storage path

## IAM Permissions Required

The scripts automatically create IAM roles with these permissions:

### Task Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### Task Role (Application Container)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      "Resource": "*"
    }
  ]
}
```

## Cost Optimization Strategies

### 1. Use Spot Instances
Save up to 70% by using Fargate Spot:
```bash
USE_FARGATE_SPOT=true ./scripts/launch-fargate.sh
```

**Trade-off**: Instances can be interrupted (2-minute warning)

### 2. Use GPU Spot
Cheapest GPU option:
```bash
COMPUTE_TYPE=gpu-spot GPU_COUNT=1 USE_FARGATE_SPOT=true ./scripts/launch-fargate.sh
```

### 3. Scale Based on Demand
```bash
# Scale up during peak hours
./scripts/manage-fargate-service.sh scale 5

# Scale down during off-peak
./scripts/manage-fargate-service.sh scale 1
```

### 4. Use EFS for Shared Storage
Instead of each task storing data in S3, mount a shared EFS:
```bash
ENABLE_EFS=true EFS_ID=fs-12345 ./scripts/launch-fargate.sh
```

### 5. Monitor Costs
```bash
./scripts/manage-fargate-service.sh cost
```

## Example Deployments

### Scenario 1: Training on Budget (Demo Mode)
```bash
export COMPUTE_TYPE=cpu
export CPU_UNITS=256
export MEMORY_MB=512
export USE_FARGATE_SPOT=true
export USE_DEMO_MODE=true
export DESIRED_COUNT=1

./scripts/launch-fargate.sh
# Cost: ~$0.01/hour
```

### Scenario 2: Production CPU Training
```bash
export COMPUTE_TYPE=cpu
export CPU_UNITS=2048
export MEMORY_MB=8192
export USE_FARGATE_SPOT=true
export DESIRED_COUNT=3

./scripts/launch-fargate.sh
# Cost: ~$0.02/hour per task, $0.06/hour total
```

### Scenario 3: GPU Training with Spot (Cost-Effective)
```bash
export COMPUTE_TYPE=gpu-spot
export CPU_UNITS=4096
export MEMORY_MB=30720
export GPU_COUNT=1
export USE_FARGATE_SPOT=true
export DESIRED_COUNT=2

./scripts/launch-fargate.sh
# Cost: ~$0.30/hour per task, $0.60/hour total
```

### Scenario 4: High-Performance GPU Training
```bash
export COMPUTE_TYPE=gpu
export CPU_UNITS=4096
export MEMORY_MB=30720
export GPU_COUNT=4
export USE_FARGATE_SPOT=false
export DESIRED_COUNT=1

./scripts/launch-fargate.sh
# Cost: ~$4.00/hour (guaranteed availability)
```

## Monitoring & Debugging

### View Service Status
```bash
./scripts/manage-fargate-service.sh status
```

### Stream Logs
```bash
# Last hour
./scripts/manage-fargate-service.sh logs

# Last 24 hours
./scripts/manage-fargate-service.sh logs -f 24
```

### SSH into Running Task
```bash
./scripts/manage-fargate-service.sh exec
```

Requires:
- AWS Systems Manager Session Manager permissions
- SSM agent in container (added automatically)

### Describe Task Details
```bash
./scripts/manage-fargate-service.sh describe-task
```

## Troubleshooting

### Service Won't Start
Check logs:
```bash
./scripts/manage-fargate-service.sh logs
```

Common issues:
- ECR image not found: Build and push image
- Insufficient resources: Check CPU/Memory availability
- Network issues: Check security groups and subnets

### High Costs
```bash
# Check hourly costs
./scripts/manage-fargate-service.sh cost

# Solutions:
# 1. Use Spot instances (70% discount)
# 2. Reduce CPU/Memory allocation
# 3. Scale down when not in use
# 4. Use GPU Spot instead of on-demand
```

### Tasks Failing
```bash
# Check task details
./scripts/manage-fargate-service.sh describe-task

# SSH into task to debug
./scripts/manage-fargate-service.sh exec

# View detailed logs
./scripts/manage-fargate-service.sh logs
```

### GPU Not Available
- Ensure `COMPUTE_TYPE=gpu` or `gpu-spot`
- Check GPU count is valid (1, 2, 4, 8)
- Verify region supports GPU Fargate
- Check IAM permissions

## Local Testing

Test configuration locally before deploying:

```bash
# Using docker-compose with CPU
docker-compose -f docker-compose.fargate.yml up transformer-cpu

# Using docker-compose with GPU
docker-compose -f docker-compose.fargate.yml up transformer-gpu

# Access services:
# API: http://localhost:8080
# Jupyter: http://localhost:8888
# MongoDB: localhost:27017
```

## Advanced Configuration

### Using Custom VPC

```bash
# Get your VPC subnets
aws ec2 describe-subnets --query 'Subnets[?VpcId==`vpc-xxx`].SubnetId' --output text

# Get your security groups
aws ec2 describe-security-groups --query 'SecurityGroups[0].GroupId' --output text

# Export and use
export TASK_SUBNETS="subnet-xxx,subnet-yyy"
export TASK_SECURITY_GROUPS="sg-xxx"
./scripts/launch-fargate.sh
```

### S3 Checkpoint Storage

```bash
export S3_BUCKET=my-transformer-bucket
export S3_PREFIX=models/v1

./scripts/launch-fargate.sh

# Task automatically gets S3 access via IAM role
# Inside container:
# - Download checkpoints: aws s3 cp s3://bucket/prefix/model.pt /data/
# - Upload results: aws s3 cp /data/results s3://bucket/prefix/ --recursive
```

### EFS Persistent Storage

```bash
# Create EFS in your VPC
aws efs create-file-system --performance-mode general-purpose --throughput-mode bursting

# Get EFS ID
aws efs describe-file-systems --query 'FileSystems[0].FileSystemId' --output text

# Mount in Fargate
export ENABLE_EFS=true
export EFS_ID=fs-12345678
./scripts/launch-fargate.sh

# All tasks share /data from EFS
```

## Cleanup

### Remove Service
```bash
aws ecs delete-service \
  --cluster transformer-training \
  --service train-next-word-prediction \
  --force
```

### Remove Stack
```bash
./scripts/deploy-fargate-cloudformation.sh delete
# or manually:
aws cloudformation delete-stack --stack-name transformer-training-stack
```

### Remove ECR Repository
```bash
aws ecr delete-repository \
  --repository-name train-next-word-prediction \
  --force
```

## Support

For issues:
1. Check logs: `./scripts/manage-fargate-service.sh logs`
2. Verify configuration: `./scripts/manage-fargate-service.sh config`
3. Check AWS costs: `./scripts/manage-fargate-service.sh cost`
4. Review CloudWatch metrics in AWS Console
