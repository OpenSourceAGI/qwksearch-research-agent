# Deployment Checklist

Complete checklist for deploying SQuAD Q&A training pipeline on AWS Fargate.

## Pre-Deployment

- [ ] **AWS Account**
  - [ ] AWS CLI installed (`aws --version`)
  - [ ] AWS credentials configured (`aws sts get-caller-identity`)
  - [ ] Sufficient account permissions (ECS, ECR, CloudFormation, IAM)

- [ ] **Local Machine**
  - [ ] Docker installed (`docker --version`)
  - [ ] Docker running (`docker ps`)
  - [ ] git cloned repository
  - [ ] `cd` to `packages/train-next-word-prediction/`

- [ ] **Scripts Permissions**
  ```bash
  chmod +x scripts/*.sh
  chmod +x src/training/*.py
  ```

## Phase 1: Local Testing (5 minutes)

- [ ] **Test CPU Container**
  ```bash
  docker build -t transformer:cpu -f Dockerfile .
  docker run -it --rm transformer:cpu python3 -c "import torch; print('✓ CPU OK')"
  ```

- [ ] **Test SQuAD Download**
  ```bash
  python3 << 'EOF'
  from src.training.squad_manager import SQuADManager
  m = SQuADManager(data_dir="/tmp/squad_test")
  m.download()
  print("✓ Download OK")
  EOF
  ```

- [ ] **Test Docker Compose**
  ```bash
  docker-compose -f docker-compose.fargate.yml up transformer-cpu --build
  # Wait for container to start
  curl http://localhost:8080/health
  # Ctrl+C to stop
  ```

## Phase 2: AWS Infrastructure (10 minutes)

- [ ] **Configure AWS**
  ```bash
  export AWS_REGION=us-east-1
  export AWS_PROFILE=default
  aws sts get-caller-identity  # Verify credentials
  ```

- [ ] **Create CloudFormation Stack** (Optional but recommended)
  ```bash
  export CLUSTER_NAME=transformer-training
  ./scripts/deploy-fargate-cloudformation.sh
  # Wait for stack creation to complete
  ```

- [ ] **Get VPC Details**
  ```bash
  # If using CloudFormation
  aws cloudformation describe-stacks --stack-name transformer-training-stack --query 'Stacks[0].Outputs' --output table
  
  # Or manually get your default VPC
  export TASK_SUBNETS=$(aws ec2 describe-subnets --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
  export TASK_SECURITY_GROUPS=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text)
  ```

- [ ] **Verify Prerequisites**
  ```bash
  echo "Subnets: $TASK_SUBNETS"
  echo "Security Groups: $TASK_SECURITY_GROUPS"
  # Both should have values
  ```

## Phase 3: First Deployment (15 minutes)

- [ ] **Configure Compute**
  ```bash
  # Start with cheap CPU for testing
  export COMPUTE_TYPE=cpu
  export CPU_UNITS=1024
  export MEMORY_MB=2048
  export USE_FARGATE_SPOT=true
  export DESIRED_COUNT=1
  ```

- [ ] **Build and Deploy**
  ```bash
  ./scripts/launch-fargate.sh
  # Wait for deployment to complete (5-10 minutes)
  ```

- [ ] **Verify Deployment**
  ```bash
  ./scripts/manage-fargate-service.sh status
  # Should show Running tasks
  ```

- [ ] **Check Logs**
  ```bash
  ./scripts/manage-fargate-service.sh logs
  # Should see server startup messages
  ```

## Phase 4: SQuAD Pipeline Setup (5 minutes)

- [ ] **SSH Into Task**
  ```bash
  ./scripts/manage-fargate-service.sh exec
  # You should now be in the container shell
  ```

- [ ] **Verify SQuAD Scripts**
  ```bash
  ls -la /app/scripts/run-*.sh
  # Should see run-squad-pipeline.sh and run-qa-training-pipeline.sh
  ```

- [ ] **Download SQuAD** (inside container)
  ```bash
  chmod +x /app/scripts/run-squad-pipeline.sh
  /app/scripts/run-squad-pipeline.sh
  # Wait for download and extraction (~3 minutes)
  ```

- [ ] **Verify Q&A Files**
  ```bash
  ls -lh /data/squad/*.json
  # Should see qa_pairs_train.json and qa_pairs_dev.json
  ```

## Phase 5: Test Training Loop (Optional)

- [ ] **Quick Test** (still inside container)
  ```bash
  export NUM_WORKERS=2
  export MAX_ITERATIONS=5
  export BATCH_SIZE=32
  
  python3 << 'EOF'
  from src.training.qa_recursive_loops import AsyncQAImprover
  import asyncio
  
  async def test():
      a = AsyncQAImprover(num_loops=2)
      await a.run_async_loops(max_iterations=3)
  
  asyncio.run(test())
  EOF
  ```

- [ ] **Check Results**
  ```bash
  ls -la /data/checkpoints/
  ls -la /data/logs/
  ```

## Phase 6: Scale Up to GPU (Optional)

- [ ] **Exit Container**
  ```bash
  exit
  ```

- [ ] **Configure GPU**
  ```bash
  export COMPUTE_TYPE=gpu
  export CPU_UNITS=4096
  export MEMORY_MB=30720
  export GPU_COUNT=1
  export USE_FARGATE_SPOT=true
  export DESIRED_COUNT=1
  ```

- [ ] **Update Service**
  ```bash
  ./scripts/launch-fargate.sh
  # Wait for task replacement
  ```

- [ ] **Verify GPU**
  ```bash
  ./scripts/manage-fargate-service.sh exec
  nvidia-smi  # Inside container
  exit
  ```

## Phase 7: Backup & Monitoring

- [ ] **Setup S3 Backup** (Optional)
  ```bash
  export S3_BUCKET=my-training-bucket
  export S3_PREFIX=qa-models
  
  # Inside container
  aws s3 cp /data/checkpoints/ s3://$S3_BUCKET/$S3_PREFIX/checkpoints/ --recursive
  aws s3 cp /data/logs/ s3://$S3_BUCKET/$S3_PREFIX/logs/ --recursive
  ```

- [ ] **Monitor Costs**
  ```bash
  # Outside container
  ./scripts/manage-fargate-service.sh cost
  ```

- [ ] **Setup CloudWatch Alarms** (Optional)
  ```bash
  aws cloudwatch put-metric-alarm \
    --alarm-name transformer-high-cost \
    --metric-name EstimatedCharges \
    --threshold 50 \
    --comparison-operator GreaterThanThreshold
  ```

## Phase 8: Production Configuration

- [ ] **Scale Workers** (inside container)
  ```bash
  export NUM_WORKERS=4
  export NUM_LOOPS=8
  
  /app/scripts/run-qa-training-pipeline.sh
  ```

- [ ] **Setup Auto-Restart**
  ```bash
  # Exit container
  exit
  
  # Configure service for auto-restart (outside)
  aws ecs update-service \
    --cluster transformer-training \
    --service train-next-word-prediction \
    --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
  ```

- [ ] **Configure Logging**
  ```bash
  # Already done by launch script, but verify
  aws logs describe-log-groups | grep transformer
  ```

## Phase 9: Testing Scenarios

- [ ] **Test Spot Interruption Handling**
  - Deploy with `USE_FARGATE_SPOT=true`
  - Tasks should auto-restart when interrupted
  - Checkpoints should resume training

- [ ] **Test Scaling**
  ```bash
  ./scripts/manage-fargate-service.sh scale 3
  ./scripts/manage-fargate-service.sh status
  ./scripts/manage-fargate-service.sh scale 1
  ```

- [ ] **Test Cost Optimization**
  ```bash
  # Monitor both CPU and GPU
  export COMPUTE_TYPE=cpu
  ./scripts/manage-fargate-service.sh cost
  
  export COMPUTE_TYPE=gpu
  ./scripts/manage-fargate-service.sh cost
  
  export COMPUTE_TYPE=gpu-spot
  export USE_FARGATE_SPOT=true
  ./scripts/manage-fargate-service.sh cost
  ```

## Phase 10: Production Deployment

- [ ] **Choose Configuration**
  ```bash
  # Example: GPU Spot with 4 workers
  export COMPUTE_TYPE=gpu
  export GPU_COUNT=1
  export USE_FARGATE_SPOT=true
  export DESIRED_COUNT=2
  export NUM_WORKERS=4
  ```

- [ ] **Deploy**
  ```bash
  ./scripts/launch-fargate.sh
  ```

- [ ] **Run Pipeline**
  ```bash
  ./scripts/manage-fargate-service.sh exec
  export LOOP_TYPE=parallel
  /app/scripts/run-qa-training-pipeline.sh
  ```

- [ ] **Setup Monitoring**
  ```bash
  # Terminal 1: Monitor status
  watch -n 10 './scripts/manage-fargate-service.sh status'
  
  # Terminal 2: Monitor logs
  ./scripts/manage-fargate-service.sh logs -f
  
  # Terminal 3: Monitor costs (periodically)
  ./scripts/manage-fargate-service.sh cost
  ```

## Phase 11: Maintenance

- [ ] **Daily Checks**
  - [ ] Service running (`./scripts/manage-fargate-service.sh status`)
  - [ ] No errors in logs (`./scripts/manage-fargate-service.sh logs | grep ERROR`)
  - [ ] Cost within budget (`./scripts/manage-fargate-service.sh cost`)

- [ ] **Weekly Tasks**
  - [ ] Download latest checkpoints from `/data/checkpoints/`
  - [ ] Archive logs to S3
  - [ ] Review metrics history

- [ ] **Monthly Tasks**
  - [ ] Review cost trends
  - [ ] Optimize batch size if needed
  - [ ] Update documentation with learnings

## Phase 12: Cleanup (When Done)

- [ ] **Stop Service**
  ```bash
  ./scripts/manage-fargate-service.sh scale 0
  ```

- [ ] **Download Results**
  ```bash
  # Before deleting
  aws s3 cp /data/checkpoints/ s3://backup-bucket/final/ --recursive
  aws s3 cp /data/logs/ s3://backup-bucket/logs/ --recursive
  ```

- [ ] **Delete Stack** (if created)
  ```bash
  aws cloudformation delete-stack --stack-name transformer-training-stack
  ```

- [ ] **Delete ECR Repository**
  ```bash
  aws ecr delete-repository \
    --repository-name train-next-word-prediction \
    --force
  ```

- [ ] **Verify Cleanup**
  ```bash
  aws ecs list-clusters
  aws ecr describe-repositories
  aws logs describe-log-groups | grep transformer
  ```

## Troubleshooting During Deployment

If deployment fails:

1. **Check credentials**
   ```bash
   aws sts get-caller-identity
   ```

2. **Check CloudFormation events**
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name transformer-training-stack
   ```

3. **Check ECR push**
   ```bash
   aws ecr describe-repositories --repository-names train-next-word-prediction
   ```

4. **Check ECS task definition**
   ```bash
   aws ecs describe-task-definition --task-definition train-next-word-prediction
   ```

5. **Check running tasks**
   ```bash
   aws ecs list-tasks --cluster transformer-training
   ```

6. **Check task logs**
   ```bash
   aws logs tail /ecs/transformer-training --follow
   ```

## Success Criteria

- [ ] ✅ Container running on Fargate
- [ ] ✅ SQuAD downloaded (88MB)
- [ ] ✅ Q&A pairs extracted (87K+)
- [ ] ✅ Improvement loops running
- [ ] ✅ Checkpoints saving to `/data/checkpoints/`
- [ ] ✅ Metrics logging to `/data/logs/`
- [ ] ✅ Cost < $0.50/hour (with spot)
- [ ] ✅ Can SSH into task and monitor

## Time Estimates

- Local Testing: 5-10 minutes
- AWS Setup: 10-15 minutes
- First Deployment: 15-20 minutes
- SQuAD Download: 3-5 minutes
- Training (100 iterations): 30 minutes - 2 hours
- **Total**: 2-3 hours for complete setup & first training run

## Support

If stuck:
1. Check `SQUAD_QUICKSTART.md` for quick reference
2. Check `FARGATE_DEPLOYMENT.md` for detailed guide
3. Check `SQUAD_QA_PIPELINE.md` for architecture
4. Review logs: `./scripts/manage-fargate-service.sh logs`
5. Debug in container: `./scripts/manage-fargate-service.sh exec`
