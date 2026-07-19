# 🧠 Wikipedia Transformer Training with Dumpster-Dive

A production-ready implementation of GPT-style transformer training on the entire English Wikipedia corpus, split into the `src/training/wikipedia/` package (see [README.md](README.md)) and using efficient data processing with aria2c, dumpster-dive, and MongoDB.

## 🌟 Features

- **🚀 Real Wikipedia Scale**: Process the entire English Wikipedia corpus (6M+ articles)
- **📥 Fast Parallel Downloads**: `aria2c` (16 connections, resumable) instead of single-stream wget/curl
- **⚡ Efficient Processing**: Use dumpster-dive for fast XML parsing and MongoDB storage
- **🏗️ Production Architecture**: Complete transformer implementation with all modern techniques
- **📊 Advanced Training**: Gradient accumulation, learning rate scheduling, checkpointing
- **🎨 Smart Generation**: Top-k, nucleus sampling, and temperature control
- **📈 Comprehensive Monitoring**: Training metrics, model analysis, and performance tracking
- **🐳 One-Command Container**: `docker compose --profile wikipedia up` runs download + processing + training together
- **🔧 Educational**: Every component thoroughly documented with explanations

## 📋 Prerequisites

### Option A: Docker (recommended — bundles every dependency below)
- Docker + Docker Compose
- 150GB+ free disk space mounted into the container for the full corpus (10GB for demo mode)

### Option B: Manual / bare-metal
- **OS**: Linux, macOS, or Windows with WSL
- **RAM**: 16GB+ recommended (8GB minimum for demo mode)
- **Storage**: 150GB+ free space for full Wikipedia (10GB for demo)
- **GPU**: Optional but recommended for faster training
- **Python 3.8+** with pip
- **Node.js 12+** with npm
- **MongoDB 4.0+**
- **aria2** (`apt install aria2` / `brew install aria2`)

## 🐳 Quick Start (Docker, Recommended)

```bash
cd docker

# Demo mode: sample text, no Wikipedia download, verifies the whole pipeline works
docker compose --profile wikipedia up wikipedia

# Full English Wikipedia: aria2c download -> decompress -> dumpster-dive -> MongoDB -> training
USE_DEMO_MODE=false docker compose --profile wikipedia up wikipedia
```

This single command starts a `mongodb` service plus a `wikipedia` service (built from `docker/Dockerfile.wikipedia`) that runs `scripts/run_wikipedia_pipeline.sh`, which:
1. Waits for MongoDB to be reachable
2. Hands off to `python -m wikipedia.pipeline`, which downloads the dump via `aria2c` (`WikipediaDownloader` in `src/training/wikipedia/download.py`), decompresses it, runs `dumpster-dive`, builds the BPE tokenizer, and trains the model — all driven by environment variables (`USE_DEMO_MODE`, `MONGO_HOST`, `WIKIPEDIA_DUMP_PATH`, etc. — see `WikipediaConfig.from_env()`)

Dumps and processed sequences persist in `docker/data/`, checkpoints in `docker/model_checkpoints/`.

## 🛠️ Manual Setup

### 1. Install Dependencies
```bash
# Python dependencies
pip install -r config/requirements.txt   # tinygrad, numpy, pymongo

# Node.js tool for Wikipedia processing
npm install -g dumpster-dive

# aria2 for fast parallel downloads
brew install aria2     # macOS
sudo apt install aria2 # Ubuntu

# MongoDB (choose your platform)
brew install mongodb-community   # macOS
sudo apt install mongodb         # Ubuntu
# Windows: Download from mongodb.com
```

### 2. Start MongoDB
```bash
mongod
# Or with custom config:
mongod --config /path/to/mongod.conf
```

### 3. Quick Demo (Recommended First Run)
```bash
# Run with demo data (no Wikipedia download needed)
python src/training/wikipedia_transformer.py
```

This will train a small model on sample text to verify everything works.

## 🌍 Full Wikipedia Training (Manual)

### 1. Download Wikipedia Dump via aria2c
```bash
# English Wikipedia (~20GB compressed, ~100GB uncompressed), 16 parallel connections, resumable
aria2c -x16 -s16 -k1M -c https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2

# For testing, try smaller languages:
# Afrikaans (38MB): aria2c -x16 -s16 -c https://dumps.wikimedia.org/afwiki/latest/afwiki-latest-pages-articles.xml.bz2
# Simple English (200MB): aria2c -x16 -s16 -c https://dumps.wikimedia.org/simplewiki/latest/simplewiki-latest-pages-articles.xml.bz2
```
`WikipediaDownloader.download_dump()` (`src/training/wikipedia/download.py`) runs the equivalent command automatically when you start training with `USE_DEMO_MODE=false` and no dump is already on disk.

### 2. Decompress Wikipedia Dump
```bash
# Fast decompression (recommended):
brew install lbzip2  # macOS
sudo apt install lbzip2  # Ubuntu
lbzip2 -d enwiki-latest-pages-articles.xml.bz2

# Standard decompression (slower):
bzip2 -d enwiki-latest-pages-articles.xml.bz2
```

### 3. Process with Dumpster-Dive
```bash
# Process Wikipedia into MongoDB (takes 4-8 hours for English)
dumpster ./enwiki-latest-pages-articles.xml --db=enwiki --citations=false --images=false

# Monitor progress in another terminal:
mongo enwiki --eval 'db.pages.count()'
```

### 4. Configure Training
Set environment variables (picked up by `WikipediaConfig.from_env()` in `src/training/wikipedia/config.py`), or edit the dataclass defaults directly:

```bash
export USE_DEMO_MODE=false
export EMBEDDING_DIMENSION=512
export NUM_TRANSFORMER_LAYERS=6
export NUM_ATTENTION_HEADS=8
export BATCH_SIZE=16
export LEARNING_RATE=1e-4
export NUM_TRAINING_EPOCHS=3
export MONGO_DB_NAME=enwiki  # Match the --db parameter above
```

### 5. Start Training
```bash
python src/training/wikipedia_transformer.py
```

## 📊 Architecture Overview

### Model Components
- **🔤 BPE Tokenizer**: Byte-pair encoding with 32K vocabulary
- **📍 Positional Embeddings**: Learned position encodings
- **🎯 Multi-Head Attention**: 8 parallel attention mechanisms
- **🧠 Transformer Blocks**: 6 layers with residual connections
- **📈 Language Modeling Head**: Next-word prediction

### Training Features
- **📦 Gradient Accumulation**: Simulate large batch sizes
- **📈 Learning Rate Scheduling**: Warmup + cosine decay
- **✂️ Gradient Clipping**: Prevent exploding gradients
- **💾 Automatic Checkpointing**: Save/resume training
- **📊 Progress Monitoring**: Real-time loss tracking

### Data Pipeline
- **🗂️ Dumpster-Dive Integration**: Efficient Wikipedia processing
- **🗄️ MongoDB Storage**: Scalable article storage and querying
- **🔧 Smart Filtering**: Remove low-quality articles
- **📦 Sequence Packing**: Minimize padding for efficiency

## 🎛️ Configuration Options

### Model Architecture
```python
# Small model (fast training, lower quality)
embedding_dimension = 256
num_transformer_layers = 4
num_attention_heads = 4

# Medium model (balanced)
embedding_dimension = 512
num_transformer_layers = 6
num_attention_heads = 8

# Large model (slow training, higher quality)
embedding_dimension = 768
num_transformer_layers = 12
num_attention_heads = 12
```

### Training Settings
```python
# Fast training (lower quality)
batch_size = 32
learning_rate = 3e-4
sequence_max_length = 512

# Quality training (slower)
batch_size = 8
learning_rate = 1e-4
sequence_max_length = 1024
```

### Data Processing
```python
# Demo mode (sample data)
use_demo_mode = True
max_articles_demo = 1000

# Full Wikipedia
use_demo_mode = False
min_article_length = 500
max_article_length = 50000
```

## 🎨 Text Generation

After training, generate text with various strategies:

```python
# Simple generation
text = trainer.generate_sample_text("The history of artificial intelligence", max_length=100)

# Advanced generation with top-k sampling
text = generate_with_top_k("Machine learning", temperature=0.8, top_k=50)

# Nucleus sampling for dynamic vocabulary
text = generate_with_nucleus("Deep learning", temperature=0.9, top_p=0.95)
```

## 📊 Monitoring and Evaluation

### Training Metrics
- **📉 Loss**: Cross-entropy loss (lower is better)
- **📊 Perplexity**: exp(loss) - model uncertainty
- **⏱️ Speed**: Tokens per second, steps per hour
- **💾 Memory**: GPU/CPU usage, disk space

### Model Quality
- **🎯 Perplexity**: < 50 excellent, < 100 good, < 200 fair
- **📝 Generation Quality**: Coherence, factuality, creativity
- **🧠 Knowledge**: Factual accuracy on Wikipedia topics

### View Training Progress
```bash
# Monitor loss in real-time
tail -f training.log

# Check MongoDB article count
mongo enwiki --eval 'db.pages.count()'

# View model checkpoints
ls -la model_checkpoints/
```

## 🔧 Troubleshooting

### Common Issues

#### "dumpster command not found"
```bash
npm install -g dumpster-dive
# If permission issues: sudo npm install -g dumpster-dive
```

#### "Cannot connect to MongoDB"
```bash
# Start MongoDB
mongod

# Check if running
ps aux | grep mongod

# Check logs
tail /var/log/mongodb/mongod.log
```

#### "Out of memory during training"
```bash
export BATCH_SIZE=4
export GRADIENT_ACCUMULATION_STEPS=8
export SEQUENCE_MAX_LENGTH=512
export USE_DEMO_MODE=true
```

#### "Wikipedia download fails"
```bash
# aria2c resumes automatically with -c; just rerun the same command
aria2c -x16 -s16 -k1M -c https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2

# Or download manually from:
# https://dumps.wikimedia.org/enwiki/latest/
```

#### "Dumpster-dive processing fails"
```bash
# Check file is decompressed
ls -lh enwiki-latest-pages-articles.xml

# Check XML file validity
head -n 100 enwiki-latest-pages-articles.xml

# Try with verbose output
dumpster ./enwiki-latest-pages-articles.xml --db=enwiki --verbose
```

### Performance Tips

#### Speed Up Training
- Use SSD storage for faster I/O
- Increase batch size if you have more RAM/GPU memory
- Use mixed precision training (FP16)
- Enable gradient checkpointing for large models

#### Reduce Memory Usage
- Decrease batch size and increase gradient accumulation
- Use shorter sequence lengths
- Enable demo mode for testing
- Close other applications to free RAM

#### Optimize Wikipedia Processing
- Use `lbzip2` instead of `bzip2` for faster decompression
- Process on SSD storage
- Use MongoDB indexes for faster queries
- Consider processing smaller Wikipedia languages first

## 📈 Scaling Up

### Distributed Training
```python
# Multi-GPU setup (conceptual)
# This would require additional distributed training code
config.num_gpus = 4
config.batch_size = 64  # 16 per GPU
```

### Larger Models
```python
# GPT-2 scale
config.embedding_dimension = 768
config.num_transformer_layers = 12
config.num_attention_heads = 12
config.vocab_size = 50257

# GPT-3 scale (requires significant resources)
config.embedding_dimension = 12288
config.num_transformer_layers = 96
config.num_attention_heads = 96
```

### Production Deployment
```python
# Model optimization for serving
model = optimize_for_inference(trained_model)

# API server setup
from fastapi import FastAPI
app = FastAPI()

@app.post("/generate")
def generate_text(prompt: str):
    return model.generate(prompt)
```

## 📚 Learning Resources

### Understanding Transformers
- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [Attention Is All You Need (Original Paper)](https://arxiv.org/abs/1706.03762)
- [The Illustrated GPT-2](https://jalammar.github.io/illustrated-gpt2/)

### Practical Guides
- [Hugging Face Course](https://huggingface.co/learn)
- [Building a Transformer with PyTorch](https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch)
- [LLM Training Guide](https://rentry.org/llm-training)

### Advanced Topics
- [Scaling Laws for Language Models](https://arxiv.org/abs/2001.08361)
- [Training Language Models to Follow Instructions](https://arxiv.org/abs/2203.02155)
- [Constitutional AI](https://arxiv.org/abs/2212.08073)

## 🤝 Contributing

### Development Setup
```bash
# Clone with development dependencies
git clone https://github.com/your-repo/wikipedia-transformer
cd wikipedia-transformer
pip install -e ".[dev]"

# Run tests
python -m pytest tests/

# Format code
black .
isort .
```

### Areas for Contribution
- 🚀 **Performance**: Optimize training speed and memory usage
- 🧠 **Architecture**: Implement new attention mechanisms
- 📊 **Evaluation**: Add comprehensive benchmarks
- 🌍 **Multi-language**: Support for other Wikipedia languages
- 🎨 **Generation**: Advanced sampling strategies
- 📱 **Deployment**: Production serving optimizations

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Dumpster-Dive**: Efficient Wikipedia processing tool
- **Tinygrad**: Minimalist deep learning framework
- **MongoDB**: Scalable document database
- **Wikipedia**: The free encyclopedia providing training data
- **Attention Is All You Need**: The foundational transformer paper
- **OpenAI GPT**: Inspiration for the architecture

## 📞 Support

### Getting Help
- 📖 **Documentation**: Check this README and code comments
- 🐛 **Issues**: Report bugs on GitHub Issues
- 💬 **Discussions**: Ask questions in GitHub Discussions
- 📧 **Contact**: [your-email@example.com]

### Community
- 🐦 **Twitter**: [@your-handle] for updates
- 💬 **Discord**: [Your Discord Server] for real-time chat
- 📺 **YouTube**: [Your Channel] for video tutorials
