# SQuAD Q&A Pipeline and Self-Recursive Training

Complete pipeline for continuous model improvement using the SQuAD dataset on AWS Fargate.

## Overview

This system downloads SQuAD (Stanford Question Answering Dataset), extracts Q&A pairs, and runs multiple self-recursive improvement loops to continuously enhance model performance.

### What is SQuAD?

SQuAD is a large-scale machine reading comprehension dataset with:
- **100,000+ questions** on Wikipedia articles (v1.1) or v2.0
- **Questions and answers** extracted from passages
- **Multiple answer annotations** for robustness
- **Free public access** at https://rajpurkar.github.io/SQuAD-explorer/

Files used:
- `train-v1.1.json` - Training set (87,599 questions)
- `dev-v1.1.json` - Evaluation set (10,570 questions)

## Quick Start

### 1. Download and Extract SQuAD

```bash
# Set configuration
export SQUAD_VERSION=1.1
export SQUAD_DIR=/data/squad
export QA_PAIRS_LIMIT=5000  # Limit pairs for faster testing

# Run pipeline
chmod +x scripts/run-squad-pipeline.sh
./scripts/run-squad-pipeline.sh
```

This will:
1. Download official SQuAD JSON files (direct links, no authentication)
2. Extract Q&A pairs
3. Save to `/data/squad/qa_pairs_train.json` and `/data/squad/qa_pairs_dev.json`

### 2. Run Single Improvement Loop

```python
from src.training.qa_improver import QAImproverLoop

# Initialize with your model trainer
improver = QAImproverLoop(
    model_trainer=your_model,
    qa_data_file="/data/squad/qa_pairs_train.json",
    checkpoint_dir="/data/checkpoints",
    iteration_limit=100,
    min_improvement=0.01
)

# Run continuously improving loop
improver.run(batch_size=32, num_epochs=1)
```

### 3. Run Parallel Improvement Loops

```bash
# Run 4 parallel workers
SQUAD_DIR=/data/squad python3 << 'EOF'
from src.training.qa_recursive_loops import ParallelQAImprover

improver = ParallelQAImprover(
    squad_dir="/data/squad",
    checkpoint_dir="/data/checkpoints",
    num_workers=4,
    batch_size=32,
    num_epochs=1
)

improver.run_parallel(max_iterations_per_worker=100)
EOF
```

### 4. Run Async Lightweight Loops

```bash
# Run 8 concurrent async loops (lower memory footprint)
python3 << 'EOF'
import asyncio
from src.training.qa_recursive_loops import AsyncQAImprover

async def main():
    improver = AsyncQAImprover(
        squad_dir="/data/squad",
        checkpoint_dir="/data/checkpoints",
        num_loops=8
    )
    await improver.run_async_loops(max_iterations=100)

asyncio.run(main())
EOF
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│  AWS Fargate Container                                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  SQuAD Manager                                   │   │
│  │  - Download train-v1.1.json, dev-v1.1.json      │   │
│  │  - Extract Q&A pairs                            │   │
│  │  - Statistics & validation                       │   │
│  └──────────────────────────────────────────────────┘   │
│           ↓                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Q&A Data (/data/squad/)                         │   │
│  │  - qa_pairs_train.json (87k questions)          │   │
│  │  - qa_pairs_dev.json (10k questions)            │   │
│  └──────────────────────────────────────────────────┘   │
│           ↓                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Parallel/Async Improvement Loops                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │  │  Loop 1  │  │  Loop 2  │  │  Loop N  │  ...  │   │
│  │  │ (Worker) │  │ (Worker) │  │ (Worker) │       │   │
│  │  └──────────┘  └──────────┘  └──────────┘       │   │
│  │       ↓              ↓              ↓             │   │
│  │   ┌────────────────────────────┐                │   │
│  │   │  QA Evaluator              │                │   │
│  │   │  - Exact match             │                │   │
│  │   │  - Token F1                │                │   │
│  │   │  - Combined scoring        │                │   │
│  │   └────────────────────────────┘                │   │
│  │       ↓                                           │   │
│  │   ┌────────────────────────────┐                │   │
│  │   │  Model Trainer             │                │   │
│  │   │  - Evaluate batch          │                │   │
│  │   │  - Fine-tune on errors     │                │   │
│  │   │  - Save checkpoints        │                │   │
│  │   └────────────────────────────┘                │   │
│  └──────────────────────────────────────────────────┘   │
│           ↓                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Results & Checkpoints                           │   │
│  │  /data/checkpoints/ - Model weights              │   │
│  │  /data/logs/ - Metrics & history                 │   │
│  │  S3 backup (optional)                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Classes

#### SQuADManager
```python
from src.training.squad_manager import SQuADManager

manager = SQuADManager(data_dir="/data/squad", version="1.1")

# Download
manager.download()  # ~100MB for v1.1

# Load and extract
train_data = manager.load_train()
qa_pairs = manager.extract_qa_pairs(train_data, limit=5000)

# Statistics
stats = manager.get_statistics(train_data)
# {'total_articles': 442, 'total_paragraphs': 18896, 'total_qas': 87599}

# Save
manager.save_qa_pairs(qa_pairs, "/data/squad/qa_pairs.json")
```

#### QAEvaluator
```python
from src.training.qa_improver import QAEvaluator

# Exact match
score = QAEvaluator.exact_match_score("apple", "apple")  # 1.0

# Token F1
score = QAEvaluator.token_overlap_score("the apple", "an apple")  # 0.67

# Combined
score = QAEvaluator.combined_score("apple pie", "apple")  # 0.5 * 1.0 + 0.5 * 0.5 = 0.75

# Batch evaluation
results = QAEvaluator.evaluate_batch([
    ("answer1", "expected1"),
    ("answer2", "expected2"),
])
# {'mean': 0.5, 'std': 0.25, 'min': 0.3, 'max': 0.7, 'count': 2}
```

#### QAImproverLoop
```python
from src.training.qa_improver import QAImproverLoop

improver = QAImproverLoop(
    model_trainer=my_model,
    qa_data_file="/data/squad/qa_pairs_train.json",
    checkpoint_dir="/data/checkpoints",
    iteration_limit=100,  # Max iterations
    min_improvement=0.01   # Stop if improvement < this
)

improver.run(
    batch_size=32,      # Q&As per iteration
    num_epochs=1,       # Fine-tune epochs on errors
    max_iterations=100
)
```

Single loop behavior:
1. Load Q&A pairs from file
2. Sample random batch
3. Evaluate on current model
4. Calculate metrics
5. Fine-tune on low-scoring questions
6. Save checkpoint
7. Repeat if improvement > threshold

#### ParallelQAImprover
```python
from src.training.qa_recursive_loops import ParallelQAImprover

improver = ParallelQAImprover(
    squad_dir="/data/squad",
    checkpoint_dir="/data/checkpoints",
    num_workers=4,      # Process count
    batch_size=32,
    num_epochs=1
)

improver.run_parallel(max_iterations_per_worker=100)
```

Multiple worker processes, each:
- Independently loads Q&A data
- Runs own improvement loop
- Saves own checkpoints
- Can share metrics via file system

#### AsyncQAImprover
```python
import asyncio
from src.training.qa_recursive_loops import AsyncQAImprover

async def main():
    improver = AsyncQAImprover(
        squad_dir="/data/squad",
        num_loops=8              # Concurrent tasks
    )
    await improver.run_async_loops(max_iterations=100)

asyncio.run(main())
```

Lightweight async loops (single process, multiple coroutines):
- Lower memory overhead than multiprocessing
- Good for I/O-bound operations
- Easier debugging

## Configuration

Environment variables:

```bash
# SQuAD Dataset
export SQUAD_VERSION=1.1              # v1.1 or v2.0
export SQUAD_DIR=/data/squad          # Download location
export QA_PAIRS_LIMIT=5000            # Limit for testing

# Improvement Loop
export BATCH_SIZE=32                  # Q&As per iteration
export NUM_EPOCHS=1                   # Fine-tune epochs
export MAX_ITERATIONS=100             # Max iterations per loop
export MIN_IMPROVEMENT=0.01           # Improvement threshold

# Parallel/Async
export NUM_WORKERS=4                  # For ParallelQAImprover
export NUM_LOOPS=8                    # For AsyncQAImprover

# Storage
export CHECKPOINT_DIR=/data/checkpoints
export LOG_DIR=/data/logs
export S3_BUCKET=my-bucket            # Optional S3 backup
```

## Deployment on Fargate

### 1. Build and Push Image

```bash
# With SQuAD dependencies
docker build -f Dockerfile -t train-next-word-prediction:squad .
docker tag train-next-word-prediction:squad 123456789.dkr.ecr.us-east-1.amazonaws.com/train-next-word-prediction:squad
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/train-next-word-prediction:squad
```

### 2. Configure Fargate Task

```bash
export COMPUTE_TYPE=gpu
export GPU_COUNT=1
export CPU_UNITS=4096
export MEMORY_MB=30720
export USE_FARGATE_SPOT=true

# Optional: Save checkpoints to S3
export S3_BUCKET=my-training-bucket
export S3_PREFIX=qa-models

./scripts/launch-fargate.sh
```

### 3. Run SQuAD Pipeline

```bash
# SSH into Fargate task
./scripts/manage-fargate-service.sh exec

# Inside container
bash /app/scripts/run-squad-pipeline.sh
```

### 4. Start Improvement Loops

```bash
# Still in container
python3 << 'EOF'
from src.training.qa_recursive_loops import ParallelQAImprover

improver = ParallelQAImprover(num_workers=4)
improver.run_parallel(max_iterations_per_worker=1000)
EOF
```

## Results

### Directory Structure

```
/data/
├── squad/
│   ├── train-v1.1.json              # Original SQuAD training data
│   ├── dev-v1.1.json                # Original SQuAD dev data
│   ├── qa_pairs_train.json          # Extracted Q&A pairs
│   └── qa_pairs_dev.json            # Evaluation Q&A pairs
├── checkpoints/
│   ├── qa_model_iter_0.pt           # Checkpoint after iteration 0
│   ├── qa_model_iter_10.pt          # Checkpoint after iteration 10
│   ├── worker_0_iter_5_score_0.7523.pt
│   ├── worker_1_iter_12_score_0.8142.pt
│   └── ...                          # Multiple worker checkpoints
└── logs/
    ├── qa_results_iter_0.json       # Detailed results per iteration
    ├── qa_results_iter_1.json
    ├── qa_improvement_history.json  # Metrics timeline
    └── squad_pipeline.log           # Execution log
```

### Metrics

For each iteration:
```json
{
  "iteration": 5,
  "timestamp": "2026-06-29T12:34:56.789123",
  "batch_score": 0.756,
  "best_score": 0.823,
  "improvement": -0.067,
  "num_results": 32,
  "high_score_count": 24,
  "medium_score_count": 6,
  "low_score_count": 2
}
```

Metrics tracked:
- **Exact Match**: Percentage of perfectly matching answers
- **Token F1**: Overlap of answer tokens (0-1)
- **Combined Score**: Weighted average (50% EM, 50% F1)
- **Improvement**: Change from best score

## Cost Estimation

On AWS Fargate with SQuAD pipeline:

### CPU Only
- 1 worker, CPU 1024, Memory 2GB
- Cost: ~$0.01/hour

### GPU (1x)
- 4 workers, CPU 4096, Memory 30GB, GPU 1
- Cost: ~$1.00/hour

### GPU Spot (70% discount)
- 4 workers, GPU 1
- Cost: ~$0.30/hour

Per 100 iterations @ 32 Q&As/iteration = 3,200 Q&A evaluations
- Time: ~30 minutes to 2 hours (depending on model inference speed)
- Cost: $0.01 - $0.30

## Optimization Tips

1. **Batch Size**: Larger batches → better GPU utilization but need more memory
2. **Workers**: More workers → faster iteration but more memory/cost
3. **Async vs Parallel**: Use Async for I/O-bound, Parallel for CPU-bound
4. **Spot Instances**: Save 70% on Fargate with interruption tolerance
5. **Checkpointing**: Save frequently for recovery
6. **Early Stopping**: Stop if no improvement for N iterations

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

### Memory Issues

- Reduce batch size: `BATCH_SIZE=16`
- Reduce workers: `NUM_WORKERS=2`
- Use smaller QA limit: `QA_PAIRS_LIMIT=1000`

### Slow Evaluation

- Check model inference time
- Profile with: `python3 -m cProfile your_script.py`
- Consider GPU acceleration if CPU-bound

### Checkpoint Not Saving

- Check `/data/checkpoints` permissions
- Enable S3 backup: `S3_BUCKET=my-bucket`
- Check disk space: `df -h /data/`

## References

- SQuAD Explorer: https://rajpurkar.github.io/SQuAD-explorer/
- SQuAD GitHub: https://github.com/rajpurkar/SQuAD-explorer
- SQuAD Paper: https://arxiv.org/abs/1606.05017
- Evaluation Metrics: https://github.com/rajpurkar/SQuAD-explorer/blob/master/evaluate-v1.1.py
