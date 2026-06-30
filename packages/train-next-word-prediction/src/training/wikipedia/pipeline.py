"""
End-to-end orchestration: download -> dumpster-dive -> tokenize -> train -> generate.

This is the module the Docker entrypoint and CLI scripts call into.
"""

import os
import pickle
from typing import List, Optional

from .analysis import analyze_model_performance
from .config import WikipediaConfig
from .dataset import WikipediaDataset
from .download import WikipediaDownloader
from .dumpster_dive import DumpsterDiveIntegration
from .generation import demo_advanced_generation
from .model import GPTStyleTransformer
from .tokenizer import WikipediaTokenizer
from .trainer import WikipediaTrainer

DEMO_TEXTS = [
    "The cat sat on the mat and looked at the dog. This is a simple sentence for testing.",
    "Wikipedia is a free online encyclopedia that anyone can edit. It contains millions of articles in many languages.",
    "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn from data.",
    "The transformer architecture revolutionized natural language processing by introducing the attention mechanism.",
    "Deep learning models require large amounts of training data to learn complex patterns and representations.",
    "Python is a high-level programming language known for its simplicity and readability.",
    "Neural networks are inspired by the structure and function of biological neural networks in animal brains.",
    "Natural language processing combines computational linguistics with statistical and machine learning methods.",
    "Artificial intelligence aims to create machines that can perform tasks that typically require human intelligence.",
    "Large language models like GPT have shown remarkable capabilities in text generation and understanding.",
]


def get_demo_texts(repeat: int = 2000) -> List[str]:
    """Sample texts usable for development/testing without a real Wikipedia dump."""
    return DEMO_TEXTS * repeat


def _build_tokenizer(config: WikipediaConfig) -> WikipediaTokenizer:
    """Load an existing tokenizer, or build one from MongoDB/demo text and save it."""
    if os.path.exists(config.tokenizer_path):
        print(f"Loading existing tokenizer from {config.tokenizer_path}")
        return WikipediaTokenizer.load(config.tokenizer_path)

    tokenizer = WikipediaTokenizer(config)
    wikipedia_texts: Optional[List[str]] = None

    print("Preparing Wikipedia corpus for tokenizer training...")
    try:
        dumpster = DumpsterDiveIntegration(config)

        if not dumpster.check_dependencies():
            print("Required dependencies not available. Falling back to demo mode.")
            wikipedia_texts = get_demo_texts()
        elif not dumpster.setup_mongodb():
            print("MongoDB setup failed. Falling back to demo mode.")
            wikipedia_texts = get_demo_texts()
        else:
            downloader = WikipediaDownloader(config)
            if downloader.ensure_dump_ready() and dumpster.run_dumpster_dive():
                print("Building tokenizer vocabulary from MongoDB...")
                tokenizer.build_vocabulary_from_dumpster(dumpster)
                tokenizer.save(config.tokenizer_path)
                return tokenizer
            print("Wikipedia download or dumpster-dive processing failed. Falling back to demo mode.")
            wikipedia_texts = get_demo_texts()

    except Exception as exc:
        print(f"Error in Wikipedia processing: {exc}")
        print("Falling back to demo mode with sample text.")
        wikipedia_texts = get_demo_texts()

    print("Building demo tokenizer vocabulary...")
    tokenizer.build_vocabulary(wikipedia_texts)
    tokenizer.save(config.tokenizer_path)
    return tokenizer


def _build_dataset(config: WikipediaConfig, tokenizer: WikipediaTokenizer) -> WikipediaDataset:
    """Load cached training sequences, or build them from MongoDB/demo text."""
    dataset = WikipediaDataset(config, tokenizer)

    processed_data_path = os.path.join(config.processed_data_dir, "training_sequences.pkl")
    if os.path.exists(processed_data_path):
        print(f"Loading existing processed data from {processed_data_path}")
        with open(processed_data_path, "rb") as f:
            dataset.sequences = pickle.load(f)
        print(f"Loaded {len(dataset.sequences):,} training sequences")
        return dataset

    print("Processing Wikipedia text into training sequences...")
    try:
        dumpster = DumpsterDiveIntegration(config)
        if dumpster.setup_mongodb() and dumpster.get_article_count() > 0:
            dataset.prepare_training_data_from_dumpster(dumpster)
            return dataset
        raise RuntimeError("MongoDB not available or empty")
    except Exception as exc:
        print(f"MongoDB processing failed: {exc}")
        print("Using demo texts instead...")
        dataset.prepare_training_data(get_demo_texts())

    return dataset


def train_wikipedia_transformer() -> dict:
    """
    Run the complete pipeline: tokenizer -> dataset -> model -> training -> sample generation.

    Returns:
        dict: model, tokenizer, trainer, config, and training results.
    """
    print("=" * 80)
    print("WIKIPEDIA TRANSFORMER TRAINING PIPELINE")
    print("=" * 80)

    config = WikipediaConfig.from_env()

    print("Training Configuration:")
    print(f"   Vocabulary size: {config.vocab_size:,}")
    print(f"   Model architecture: {config.num_transformer_layers} layers, {config.num_attention_heads} heads")
    print(f"   Embedding dimension: {config.embedding_dimension}")
    print(f"   Sequence length: {config.sequence_max_length}")
    print(f"   Batch size: {config.batch_size} (effective: {config.batch_size * config.gradient_accumulation_steps})")
    print(f"   Learning rate: {config.learning_rate}")
    print(f"   Warmup steps: {config.warmup_steps:,}")

    print("\nBuilding BPE tokenizer...")
    tokenizer = _build_tokenizer(config)
    print(f"Tokenizer ready with {len(tokenizer.token_to_id):,} tokens")

    print("\nPreparing training dataset...")
    dataset = _build_dataset(config, tokenizer)
    print(f"Dataset ready with {len(dataset):,} training sequences")

    print("\nInitializing transformer model...")
    model = GPTStyleTransformer(config)
    total_params = sum(p.numel() for p in model.get_parameters() if p is not None)
    print(f"Model initialized with {total_params:,} parameters")
    print(f"Estimated model size: {total_params * 4 / 1024**2:.1f} MB (FP32)")

    print("\nStarting training...")
    trainer = WikipediaTrainer(config, model, tokenizer, dataset)
    training_results = trainer.train()

    print("\n" + "=" * 80)
    print("TRAINING RESULTS")
    print("=" * 80)
    print(f"Best loss: {training_results['final_loss']:.4f}")
    print(f"Total training steps: {training_results['total_steps']:,}")
    print(f"Model saved to: {config.model_checkpoint_dir}")
    print(f"Tokenizer saved to: {config.tokenizer_path}")

    print("\n" + "=" * 80)
    print("SAMPLE TEXT GENERATION")
    print("=" * 80)
    for prompt in [
        "The history of artificial intelligence",
        "Wikipedia is an encyclopedia",
        "Machine learning algorithms",
        "The transformer neural network",
    ]:
        try:
            generated = trainer.generate_sample_text(prompt, max_length=50)
            print(f"'{prompt}' -> {generated}")
        except Exception as exc:
            print(f"Generation failed for '{prompt}': {exc}")

    return {
        "model": model,
        "tokenizer": tokenizer,
        "trainer": trainer,
        "config": config,
        "training_results": training_results,
        "dataset_size": len(dataset),
        "vocabulary_size": len(tokenizer.token_to_id),
        "model_parameters": total_params,
    }


def setup_wikipedia_environment() -> None:
    """Print step-by-step environment setup instructions."""
    print("=" * 80)
    print("WIKIPEDIA TRAINING ENVIRONMENT SETUP")
    print("=" * 80)

    print("Prerequisites for Wikipedia Training:")
    print("   1. Node.js (v12 or higher)")
    print("   2. MongoDB (v4.0 or higher)")
    print("   3. dumpster-dive package")
    print("   4. aria2 (for fast parallel downloads)")
    print("   5. Python packages: tinygrad, pymongo, numpy")
    print("   6. 100GB+ free disk space")
    print("   7. 16GB+ RAM recommended")
    print("")
    print("Or simply use the provided Docker image, which bundles every")
    print("dependency above. See docker/Dockerfile.wikipedia and run:")
    print("   docker compose -f docker/compose.yml --profile wikipedia up")
    print("")

    print("Manual setup:")
    print("1) Install Node.js: https://nodejs.org/")
    print("2) Install MongoDB: https://www.mongodb.com/try/download/community")
    print("3) Install dumpster-dive: npm install -g dumpster-dive")
    print("4) Install aria2: apt install aria2 / brew install aria2")
    print("5) Install Python deps: pip install -r config/requirements.txt")
    print("6) Start MongoDB: mongod")
    print("7) Download the dump with aria2c (16 parallel connections):")
    print("   aria2c -x16 -s16 -k1M -c https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2")
    print("8) Decompress: lbzip2 -d enwiki-latest-pages-articles.xml.bz2")
    print("9) Process with dumpster-dive: dumpster ./enwiki-latest-pages-articles.xml --db=enwiki")
    print("10) Run training: python -m training.wikipedia.pipeline")
    print("")
    print("Quick test (no Wikipedia download needed):")
    print("   Set config.use_demo_mode = True and run the pipeline directly.")


def production_deployment_guide() -> None:
    """Print a deployment/optimization checklist for serving the trained model."""
    print("\n" + "=" * 80)
    print("PRODUCTION DEPLOYMENT GUIDE")
    print("=" * 80)

    print("Pre-Deployment Checklist:")
    print("   - Model training completed successfully")
    print("   - Model performance meets quality thresholds")
    print("   - Comprehensive evaluation on held-out test data")
    print("   - Safety and bias testing completed")
    print("   - Model size optimized for target hardware")
    print("   - Inference latency benchmarked")
    print("   - Memory requirements documented")

    print("\nModel Optimization Techniques:")
    print("   Quantization: FP32 -> FP16/INT8 (2-4x smaller, faster inference)")
    print("   Pruning: remove unimportant weights (50-90% size reduction possible)")
    print("   Knowledge distillation: train a smaller student model")

    print("\nInference Optimization:")
    print("   KV-cache: avoid recomputing attention keys/values during generation")
    print("   Batching: improve GPU utilization, reduce per-request latency")
    print("   Speculative decoding: 2-3x generation speedup")

    print("\nServing Infrastructure:")
    print("   API server: FastAPI+Uvicorn, TorchServe, TensorRT, or ONNX Runtime")
    print("   Load balancing: multiple replicas, health checks, automatic failover")
    print("   Security: input validation, rate limiting, output filtering, audit logging")

    print("\nMonitoring:")
    print("   Track latency (p50/p95/p99), throughput, error rates, resource usage")
    print("   Alert on latency spikes, error rate increases, quality degradation")

    print("\nModel Management:")
    print("   Version control, A/B testing, rollback capability, continuous evaluation")


def educational_resources() -> None:
    """Print links to papers, courses, and reference implementations."""
    print("\n" + "=" * 80)
    print("EDUCATIONAL RESOURCES")
    print("=" * 80)

    print("Foundational papers:")
    print("   Attention Is All You Need: https://arxiv.org/abs/1706.03762")
    print("   GPT (Improving Language Understanding): https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf")
    print("   GPT-3 (Few-Shot Learners): https://arxiv.org/abs/2005.14165")
    print("   InstructGPT: https://arxiv.org/abs/2203.02155")

    print("\nCourses and tutorials:")
    print("   Hugging Face Course: https://huggingface.co/learn")
    print("   CS224N Stanford NLP: http://web.stanford.edu/class/cs224n/")
    print("   Fast.ai NLP Course: https://www.fast.ai/")

    print("\nTechnical deep dives:")
    print("   The Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/")
    print("   The Illustrated GPT-2: https://jalammar.github.io/illustrated-gpt2/")
    print("   Transformer Math 101: https://blog.eleuther.ai/transformer-math/")

    print("\nImplementation references:")
    print("   Annotated Transformer: http://nlp.seas.harvard.edu/2018/04/03/attention.html")
    print("   GPT from Scratch: https://github.com/karpathy/minGPT")
    print("   Tinygrad: https://github.com/tinygrad/tinygrad")

    print("\nDatasets and benchmarks:")
    print("   Wikipedia Dumps: https://dumps.wikimedia.org/")
    print("   The Pile: https://pile.eleuther.ai/")
    print("   GLUE / SuperGLUE: https://gluebenchmark.com/ / https://super.gluebenchmark.com/")


def main_with_dumpster_dive() -> dict:
    """Run the full pipeline: train, analyze, demo generation strategies, and print guides."""
    print("Welcome to Wikipedia Transformer Training!")
    print("Training a GPT-style language model on the English Wikipedia corpus.\n")

    try:
        results = train_wikipedia_transformer()

        analyze_model_performance(results["trainer"], results["tokenizer"])

        demo_advanced_generation(results["model"], results["tokenizer"], results["config"])

        production_deployment_guide()

        print("\n" + "=" * 80)
        print("TRAINING PIPELINE COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print(f"Model trained with {results['model_parameters']:,} parameters")
        print(f"Vocabulary size: {results['vocabulary_size']:,} tokens")
        print(f"Dataset size: {results['dataset_size']:,} sequences")
        print(f"Final loss: {results['training_results']['final_loss']:.4f}")
        print(f"Saved to: {results['config'].model_checkpoint_dir}")

        return results

    except Exception as exc:
        print(f"\nTraining pipeline failed: {exc}")
        print("Troubleshooting suggestions:")
        print("   - Check the Wikipedia dump file exists and is readable")
        print("   - Ensure sufficient disk space for processed data")
        print("   - Verify adequate RAM for model training")
        print("   - Check Python dependencies are installed")
        print("   - Try reducing model size or batch size")
        raise


if __name__ == "__main__":
    main_with_dumpster_dive()
    educational_resources()
