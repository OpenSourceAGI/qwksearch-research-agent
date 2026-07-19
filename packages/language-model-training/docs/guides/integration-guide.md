# Q&A Training Pipeline - Integration Guide

Complete guide to using the Q&A training pipeline with SQuAD dataset on AWS Fargate.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Orchestration Layer                     │
│  (entrypoint-orchestration.sh)                      │
└────┬────────────────────────────────────────────┬───┘
     │                                            │
     ▼                                            ▼
┌─────────────────────────┐        ┌──────────────────────────┐
│   REST API Server       │        │  Streamlit Dashboard     │
│   (src/services/api.py)          │        │  (dashboard.py)          │
│   Port: 8080            │        │  Port: 8501              │
│   - /health             │        │  - Real-time metrics     │
│   - /evaluate           │        │  - Score progression     │
│   - /batch-evaluate     │        │  - Checkpoints browser   │
│   - /training/*         │        │  - Dataset stats         │
│   - /metrics            │        │  - Sample quality        │
│   - /checkpoints        │        │                          │
└────────┬────────────────┘        └──────────────┬───────────┘
         │                                        │
         └───────────────┬──────────────────────┬─┘
                         │                      │
                         ▼                      ▼
            ┌─────────────────────────────────────────┐
            │  Training Pipeline                      │
            │  - Squad Manager (dataset)              │
            │  - QA Evaluator (scoring)               │
            │  - Recursive Loops (parallel/async)     │
            │  - Model Adapter (abstract interface)   │
            │  - Advanced Sampling (curriculum, etc)  │
            │  - Distributed Training (multi-GPU)     │
            └─────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌────────┐      ┌────────┐     ┌─────────┐
    │  S3    │      │Logs    │     │Checkpts │
    │Backup  │      │Monitor │     │Models   │
    └────────┘      └────────┘     └─────────┘
```

## Quick Start

### 1. Local Development (CPU)

```bash
# Clone and setup
cd packages/train-next-word-prediction

# Create directories
mkdir -p data/squad data/checkpoints logs

# Download SQuAD
python3 -c "
from src.training.squad_manager import SQuADManager
m = SQuADManager()
m.download()
train = m.load_train()
qa = m.extract_qa_pairs(train, limit=1000)
m.save_qa_pairs(qa, 'data/squad/qa_pairs_train.json')
"

# Start services (API + Dashboard)
bash scripts/entrypoint-orchestration.sh
```

Access:
- API: http://localhost:8080
- Dashboard: http://localhost:8501

### 2. Docker Compose (Local)

```bash
# Build and run
docker-compose -f docker-compose.fargate.yml up --build

# View logs
docker-compose -f docker-compose.fargate.yml logs -f transformer-cpu
```

Both CPU and GPU services start:
- CPU API: http://localhost:8080
- GPU API: http://localhost:8081
- CPU Dashboard: http://localhost:8501
- GPU Dashboard: http://localhost:8502

### 3. AWS Fargate Deployment

```bash
# Set environment
export AWS_REGION=us-east-1
export COMPUTE_TYPE=cpu
export AUTO_DOWNLOAD_SQUAD=true
export AUTO_RUN_TRAINING=false

# Deploy
bash scripts/launch-fargate.sh

# The script will output the public IP for your services
# Monitor logs:
aws logs tail /ecs/qa-training --follow
```

## API Usage

### Health Check
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "training_active": false,
  "model_version": "v1.0",
  "dataset_info": {
    "train_count": 1000,
    "dev_count": 200
  }
}
```

### Single Q&A Evaluation
```bash
curl -X POST http://localhost:8080/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the capital of France?",
    "context": "Paris is the capital of France.",
    "answer": "Paris"
  }'
```

Response:
```json
{
  "question": "What is the capital of France?",
  "predicted_answer": "Paris",
  "expected_answer": "Paris",
  "exact_match": 1.0,
  "token_f1": 1.0,
  "combined_score": 1.0,
  "confidence": 0.95
}
```

### Batch Evaluation
```bash
curl -X POST http://localhost:8080/batch-evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "qa_pairs": [
      {
        "question": "Q1?",
        "context": "Context 1",
        "answer": "A1"
      },
      {
        "question": "Q2?",
        "context": "Context 2",
        "answer": "A2"
      }
    ]
  }'
```

### Start Training
```bash
curl -X POST http://localhost:8080/training/start \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "mock",
    "training_mode": "async",
    "epochs": 1,
    "batch_size": 32,
    "num_iterations": 100
  }'
```

### Get Metrics
```bash
curl http://localhost:8080/metrics
```

Response:
```json
{
  "metrics": [
    {
      "iteration": 1,
      "batch_score": 0.65,
      "best_score": 0.65,
      "improvement": 0.0,
      "timestamp": "2024-01-15T10:00:00Z"
    },
    {
      "iteration": 2,
      "batch_score": 0.72,
      "best_score": 0.72,
      "improvement": 0.07,
      "timestamp": "2024-01-15T10:05:00Z"
    }
  ]
}
```

### List Checkpoints
```bash
curl http://localhost:8080/checkpoints
```

## Training Pipeline

### SQuAD Dataset Manager

```python
from src.training.squad_manager import SQuADManager

# Initialize
manager = SQuADManager(version="1.1")

# Download
manager.download()

# Load
train_data = manager.load_train()
dev_data = manager.load_dev()

# Extract Q&A pairs
qa_pairs = manager.extract_qa_pairs(train_data, limit=5000)

# Get statistics
stats = manager.get_statistics(train_data)
print(f"Total Q&A: {stats['total_qas']}")

# Save for training
manager.save_qa_pairs(qa_pairs, "data/squad/qa_pairs_train.json")
```

### Q&A Evaluation

```python
from src.training.qa_improver import QAEvaluator

# Single evaluation
em = QAEvaluator.exact_match_score("Paris", "Paris")
token_f1 = QAEvaluator.token_overlap_score("Paris France", "Paris")
combined = QAEvaluator.combined_score("Paris", "Paris")

print(f"EM: {em}, Token F1: {token_f1}, Combined: {combined}")

# Batch evaluation
predictions = [("Paris", "Paris"), ("London", "Paris")]
results = QAEvaluator.evaluate_batch(predictions)
print(f"Mean: {results['mean']}, Std: {results['std']}")
```

### Training Loops

```python
import asyncio
from src.training.qa_recursive_loops import AsyncQAImprover, ParallelQAImprover

# Async loops (8 concurrent tasks)
improver = AsyncQAImprover(squad_dir="/data/squad", num_loops=8)
asyncio.run(improver.run_async_loops(max_iterations=50))

# Parallel loops (4 workers)
improver = ParallelQAImprover(squad_dir="/data/squad", num_workers=4)
improver.run_parallel(max_iterations_per_worker=50)
```

### Model Integration

```python
from src.models.model_adapter import ModelFactory

# Create model
model = ModelFactory.create("mock")  # or "transformers", "wikipedia"

# Generate answer
answer = model.generate_qa_answer(
    context="Paris is the capital of France",
    question="What is the capital of France?"
)

# Fine-tune
result = model.finetune_qa(
    contexts=["..."],
    questions=["..."],
    answers=["..."],
    epochs=1
)

# Checkpoint
model.save_checkpoint("data/checkpoints/model.ckpt")
```

### Advanced Sampling

```python
from src.generation.advanced_sampling import AdaptiveSampler

sampler = AdaptiveSampler(qa_pairs)

# Get curriculum learning batch (progressively harder)
batch, strategy = sampler.get_adaptive_batch(batch_size=32, improvement=0.01)

# Can use:
# - CurriculumSampler: 5 stages (easy → hard)
# - HardExampleMiner: Focus on low-scoring predictions
# - UncertaintySampler: High-uncertainty samples
# - DiversitySampler: Stratified sampling
# - AdaptiveSampler: Auto-switch strategies
```

### Distributed Training

```python
from src.training.distributed_training import DistributedTrainer

trainer = DistributedTrainer(model=my_model, num_gpus=4)

# Setup distributed
trainer.setup_distributed()

# Train
result = trainer.train_distributed(
    qa_pairs=qa_data,
    batch_size=32,
    epochs=1
)

# Check status
status = trainer.get_distributed_status()
print(f"Distributed: {status['distributed']}, GPUs: {status['gpus']}")
```

### Performance Benchmarking

```python
from src.evaluation.benchmarking import Benchmarker

benchmarker = Benchmarker()

# Benchmark Q&A evaluation
result = benchmarker.benchmark_qa_evaluation(
    num_samples=1000,
    context_length=100,
    question_length=20
)

print(f"Throughput: {result.throughput:.2f} ops/sec")
print(f"Latency (mean): {result.latency_mean:.2f}ms")

# Cost estimation
cost = benchmarker.estimate_cost(
    config="gpu_2",
    duration_hours=24
)

print(f"Per instance: ${cost['cost_per_instance']:.2f}")
```

## Environment Configuration

### Local Environment Variables
```bash
export SQUAD_DIR=/data/squad
export CHECKPOINT_DIR=/data/checkpoints
export LOG_DIR=/data/logs
export AUTO_DOWNLOAD_SQUAD=true
export AUTO_RUN_TRAINING=false
export TRAINING_MODE=single  # single, parallel, async
```

### AWS Fargate Environment Variables
```bash
export AWS_REGION=us-east-1
export COMPUTE_TYPE=cpu  # cpu or gpu
export AUTO_DOWNLOAD_SQUAD=true
export AUTO_RUN_TRAINING=true
export TRAINING_MODE=async
export NUM_WORKERS=4
export QA_PAIRS_LIMIT=5000
export S3_BUCKET=my-bucket
export S3_PREFIX=qa-models
```

### Docker Environment Variables
```bash
export COMPUTE_TYPE=cpu
export MODEL_CHECKPOINT_PATH=/data/checkpoints
export DATA_PATH=/data
export SQUAD_VERSION=1.1
export SQUAD_DIR=/data/squad
export QA_PAIRS_LIMIT=5000
export NUM_WORKERS=2
```

## Troubleshooting

### API Health Check Fails
```bash
# Check if API is running
curl http://localhost:8080/health

# Check logs
tail -f logs/training.log

# Restart services
bash scripts/entrypoint-orchestration.sh
```

### Dashboard Can't Connect to API
```bash
# Ensure API is running on correct port
netstat -tlnp | grep 8080

# Check firewall
sudo ufw allow 8080
sudo ufw allow 8501

# Restart dashboard
streamlit run dashboard.py --server.port 8501
```

### Out of Memory (OOM)
```bash
# Reduce batch size
export QA_PAIRS_LIMIT=1000

# Use gradient accumulation
# In training loop, use GradientAccumulationTrainer

# Run single-worker training
export TRAINING_MODE=single
```

### GPU Not Detected
```bash
# Check GPU availability
python3 -c "import torch; print(torch.cuda.is_available())"

# Check docker GPU support
docker run --gpus all nvidia/cuda:12.4.0-runtime-ubuntu22.04 nvidia-smi

# Use CPU fallback
export COMPUTE_TYPE=cpu
```

## Monitoring & Observability

### CloudWatch Logs (Fargate)
```bash
# View logs
aws logs tail /ecs/qa-training --follow

# Get specific stream
aws logs get-log-events \
  --log-group-name /ecs/qa-training \
  --log-stream-name <stream-name>
```

### Metrics Endpoints
- `/metrics` - All recorded metrics
- `/metrics/{iteration}` - Specific iteration
- `/health` - System health
- `/config` - Current configuration

### Dashboard Tabs
1. **Score Progression** - Training score over time
2. **Improvement** - Iteration-to-iteration improvement
3. **Sample Quality** - Distribution of scores
4. **Statistics** - Summary metrics

## Files & Directory Structure

```
packages/train-next-word-prediction/
├── src/
│   ├── api.py                      # FastAPI REST endpoints
│   ├── model_adapter.py            # Model integration interface
│   ├── distributed_training.py     # Multi-GPU training
│   ├── benchmarking.py             # Performance analysis
│   ├── advanced_sampling.py        # Sampling strategies
│   ├── additional_datasets.py      # GLUE, MS MARCO, etc
│   └── training/
│       ├── squad_manager.py        # SQuAD dataset
│       ├── qa_improver.py          # Training loop
│       └── qa_recursive_loops.py   # Parallel/async loops
├── dashboard.py                    # Streamlit web UI
├── scripts/
│   ├── entrypoint-orchestration.sh # Local startup
│   ├── launch-fargate.sh           # AWS Fargate deployment
│   └── startup-server.sh           # Server initialization
├── Dockerfile                      # CPU container
├── Dockerfile.gpu                  # GPU container
├── docker-compose.fargate.yml      # Local testing
├── data/
│   ├── squad/                      # SQuAD dataset
│   ├── checkpoints/                # Model checkpoints
│   └── benchmarks/                 # Benchmark results
└── logs/                           # Training logs
```

## Support & Examples

See `examples_complete.py` for comprehensive examples:
```bash
python3 examples_complete.py
```

Examples included:
1. SQuAD download and exploration
2. Model integration patterns
3. Q&A evaluation
4. Performance benchmarking
5. Advanced sampling strategies
6. Async training loops

---

**Documentation Version**: 2.0
**Last Updated**: 2024-01-15
**Status**: Production Ready
