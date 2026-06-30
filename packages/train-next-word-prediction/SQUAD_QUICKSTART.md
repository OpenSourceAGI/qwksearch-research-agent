# Quick Reference: SQuAD Q&A Pipeline on AWS Fargate

Complete setup for running the SQuAD Q&A training pipeline on AWS Fargate with IAM authentication, GPU/CPU flexibility, and self-recursive improvement loops.

## 30-Second Setup

```bash
# 1. Configure
export COMPUTE_TYPE=gpu
export GPU_COUNT=1
export USE_FARGATE_SPOT=true
export SQUAD_VERSION=1.1
export NUM_WORKERS=4

# 2. Deploy
chmod +x scripts/launch-fargate.sh
./scripts/launch-fargate.sh

# 3. Connect
chmod +x scripts/manage-fargate-service.sh
./scripts/manage-fargate-service.sh exec

# 4. Run SQuAD pipeline (inside container)
chmod +x /app/scripts/run-qa-training-pipeline.sh
/app/scripts/run-qa-training-pipeline.sh
```

## Files Created

### Scripts

| File | Purpose |
|------|---------|
| `scripts/launch-fargate.sh` | Deploy to AWS Fargate with GPU/CPU selection |
| `scripts/manage-fargate-service.sh` | Monitor, scale, SSH into running tasks |
| `scripts/quick-deploy.sh` | One-command setup |
| `scripts/startup-server.sh` | IAM auth + health checks |
| `scripts/run-squad-pipeline.sh` | Download and extract SQuAD |
| `scripts/run-qa-training-pipeline.sh` | Main orchestrator (SQuAD + loops) |
| `scripts/deploy-fargate-cloudformation.sh` | CloudFormation infrastructure |

### Python Modules

| File | Purpose |
|------|---------|
| `src/aws_utils.py` | IAM auth, S3 operations, Fargate detection |
| `src/training/squad_manager.py` | Download, extract, manage SQuAD data |
| `src/training/qa_improver.py` | Single improvement loop with evaluation |
| `src/training/qa_recursive_loops.py` | Parallel & async improvement loops |

### Configuration

| File | Purpose |
|------|---------|
| `.env.fargate.example` | Configuration template |
| `docker-compose.fargate.yml` | Local testing with CPU/GPU |
| `Dockerfile` | Standard container |
| `Dockerfile.gpu` | GPU-optimized container |

### Documentation

| File | Purpose |
|------|---------|
| `FARGATE_DEPLOYMENT.md` | Complete Fargate deployment guide |
| `SQUAD_QA_PIPELINE.md` | SQuAD pipeline architecture & usage |

## One-Line Commands

### Download SQuAD (Local)
```bash
python3 -c "from src.training.squad_manager import SQuADManager; m = SQuADManager(); m.download()"
```

### Extract Q&A Pairs
```bash
python3 << 'EOF'
from src.training.squad_manager import SQuADManager
m = SQuADManager()
train = m.load_train()
pairs = m.extract_qa_pairs(train, 5000)
m.save_qa_pairs(pairs, "/data/squad/qa_pairs_train.json")
EOF
```

### Run Single Loop
```bash
python3 << 'EOF'
from src.training.qa_improver import QAImproverLoop
improver = QAImproverLoop(model_trainer, "/data/squad/qa_pairs_train.json")
improver.run(batch_size=32, num_epochs=1)
EOF
```

### Run 4 Parallel Loops
```bash
python3 << 'EOF'
from src.training.qa_recursive_loops import ParallelQAImprover
p = ParallelQAImprover(num_workers=4)
p.run_parallel(max_iterations_per_worker=100)
EOF
```

### Run 8 Async Loops
```bash
python3 << 'EOF'
import asyncio
from src.training.qa_recursive_loops import AsyncQAImprover
async def main():
    a = AsyncQAImprover(num_loops=8)
    await a.run_async_loops(max_iterations=100)
asyncio.run(main())
EOF
```

## Environment Variables

### Fargate Deployment
```bash
export AWS_REGION=us-east-1
export COMPUTE_TYPE=gpu              # cpu, gpu, gpu-spot
export CPU_UNITS=4096
export MEMORY_MB=30720
export GPU_COUNT=1
export USE_FARGATE_SPOT=true
export DESIRED_COUNT=1
export TASK_SUBNETS="subnet-xxx,subnet-yyy"
export TASK_SECURITY_GROUPS="sg-xxx"
```

### SQuAD Pipeline
```bash
export SQUAD_VERSION=1.1
export SQUAD_DIR=/data/squad
export QA_PAIRS_LIMIT=5000
export BATCH_SIZE=32
export NUM_EPOCHS=1
export MAX_ITERATIONS=100
export NUM_WORKERS=4
export LOOP_TYPE=parallel            # single, parallel, async
```

### AWS S3 (Optional)
```bash
export S3_BUCKET=my-training-bucket
export S3_PREFIX=qa-models
export ENABLE_EFS=true
export EFS_ID=fs-12345678
```

## Quick Workflows

### Local Testing

```bash
# Build images
docker build -t transformer:cpu -f Dockerfile .
docker build -t transformer:gpu -f Dockerfile.gpu .

# Test CPU
docker-compose -f docker-compose.fargate.yml up transformer-cpu

# Test GPU
docker-compose -f docker-compose.fargate.yml up transformer-gpu

# Inside container
python3 << 'EOF'
from src.training.squad_manager import SQuADManager
m = SQuADManager(version="1.1")
m.download()
m.verify_files()
EOF
```

### Development Deployment (Cheap)

```bash
export COMPUTE_TYPE=cpu
export CPU_UNITS=256
export MEMORY_MB=512
export USE_FARGATE_SPOT=true
export DESIRED_COUNT=1

./scripts/launch-fargate.sh

# Cost: ~$0.01/hour
```

### Production Deployment (GPU)

```bash
export COMPUTE_TYPE=gpu
export CPU_UNITS=4096
export MEMORY_MB=30720
export GPU_COUNT=2
export USE_FARGATE_SPOT=true
export DESIRED_COUNT=2

./scripts/launch-fargate.sh

# Cost: ~$0.60/hour for 2 tasks
```

### High-Performance Deployment (Guaranteed)

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

## Monitoring & Management

### Check Status
```bash
./scripts/manage-fargate-service.sh status
```

### View Logs
```bash
./scripts/manage-fargate-service.sh logs
```

### SSH Into Task
```bash
./scripts/manage-fargate-service.sh exec
```

### Scale Up/Down
```bash
./scripts/manage-fargate-service.sh scale 5   # 5 tasks
```

### Estimate Costs
```bash
./scripts/manage-fargate-service.sh cost
```

## Data Locations

On Fargate (inside container):
```
/data/
├── squad/
│   ├── train-v1.1.json
│   ├── dev-v1.1.json
│   ├── qa_pairs_train.json
│   └── qa_pairs_dev.json
├── checkpoints/
│   ├── qa_model_iter_0.pt
│   ├── qa_model_iter_5.pt
│   └── ...
└── logs/
    ├── qa_results_iter_0.json
    ├── qa_improvement_history.json
    └── ...
```

Optional S3 backup:
```
s3://my-bucket/qa-models/
├── checkpoints/
├── logs/
└── qa_pairs/
```

## IAM Permissions Required

Automatic via `launch-fargate.sh`, but here's what's created:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": "*"
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

## Cost Breakdown

Per 1 hour of training:

| Config | CPU | Memory | GPU | Cost/hr |
|--------|-----|--------|-----|---------|
| Demo | 256 | 512MB | - | $0.006 |
| Dev | 1024 | 2GB | - | $0.06 |
| GPU (Spot) | 4096 | 30GB | 1 | $0.30 |
| GPU (On-Demand) | 4096 | 30GB | 1 | $1.00 |
| GPU 4x (Spot) | 4096 | 30GB | 4 | $1.20 |
| GPU 4x (On-Demand) | 4096 | 30GB | 4 | $4.00 |

Per 100 iterations (3,200 Q&A evaluations):
- Time: 30min-2hr (depends on inference speed)
- Cost: $0.003 - $1.33

## Troubleshooting

### SQuAD Download Fails
```bash
# Check connectivity
curl -I https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v1.1.json

# Manual download
cd /data/squad
wget https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v1.1.json
wget https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v1.1.json
```

### Out of Memory
```bash
# Reduce settings
export CPU_UNITS=2048
export MEMORY_MB=8192
export BATCH_SIZE=16
export NUM_WORKERS=2
```

### Slow Inference
```bash
# Check model inference time
python3 -m cProfile -s cumtime your_inference_script.py

# Consider GPU acceleration
export COMPUTE_TYPE=gpu
export GPU_COUNT=2
```

### Task Keeps Restarting
```bash
# Check logs
./scripts/manage-fargate-service.sh logs

# SSH and debug
./scripts/manage-fargate-service.sh exec
```

## References

- **SQuAD Official**: https://rajpurkar.github.io/SQuAD-explorer/
- **GitHub Repo**: https://github.com/rajpurkar/SQuAD-explorer
- **Paper**: https://arxiv.org/abs/1606.05017
- **AWS Fargate**: https://aws.amazon.com/fargate/
- **AWS Pricing**: https://aws.amazon.com/fargate/pricing/

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Your Local Machine / CI/CD                  │
├─────────────────────────────────────────────┤
│                                              │
│  ./scripts/launch-fargate.sh                │
│    ↓                                         │
│  AWS CloudFormation (VPC, Security)         │
│    ↓                                         │
│  ECR (Push Docker Image)                    │
│    ↓                                         │
│  ECS Cluster + Service                      │
│                                              │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  AWS Fargate (eu-east-1)                     │
├─────────────────────────────────────────────┤
│                                              │
│  Container(s) - CPU or GPU                  │
│    ├─ SQuAD Manager                         │
│    │  ├─ Download (88MB + 11MB)             │
│    │  └─ Extract 87K Q&A pairs             │
│    │                                        │
│    ├─ Improvement Loop(s)                  │
│    │  ├─ Single: Sequential                │
│    │  ├─ Parallel: 4+ processes            │
│    │  └─ Async: 8+ concurrent tasks        │
│    │                                        │
│    ├─ QA Evaluator                         │
│    │  ├─ Exact Match Score                 │
│    │  └─ Token F1 Score                    │
│    │                                        │
│    └─ Results → /data/ → S3 (opt.)         │
│                                              │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Optional: S3 Backup                         │
│  s3://bucket/qa-models/                     │
│    ├─ checkpoints/                          │
│    ├─ logs/                                 │
│    └─ metrics/                              │
└─────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Configure AWS credentials
2. ✅ Set environment variables
3. ✅ Run `./scripts/launch-fargate.sh`
4. ✅ SSH: `./scripts/manage-fargate-service.sh exec`
5. ✅ Run: `/app/scripts/run-qa-training-pipeline.sh`
6. ✅ Monitor: `./scripts/manage-fargate-service.sh logs`
7. ✅ Retrieve: Download checkpoints & metrics from `/data/`

---

**Questions?** Check `FARGATE_DEPLOYMENT.md` for detailed setup or `SQUAD_QA_PIPELINE.md` for architecture.
