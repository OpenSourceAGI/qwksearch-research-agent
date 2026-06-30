"""
Post-training and dataset analysis: loss dynamics, vocabulary stats, model
size, perplexity estimates, and Wikipedia MongoDB corpus statistics.
"""

import math
from collections import Counter

import numpy as np

from .dumpster_dive import DumpsterDiveIntegration
from .tokenizer import WikipediaTokenizer
from .trainer import WikipediaTrainer


def analyze_model_performance(trainer: WikipediaTrainer, tokenizer: WikipediaTokenizer) -> None:
    """Print training dynamics, vocabulary, architecture, and perplexity estimates."""
    print("\n" + "=" * 80)
    print("MODEL PERFORMANCE ANALYSIS")
    print("=" * 80)

    print("Training Dynamics:")
    if trainer.training_losses:
        initial_loss = trainer.training_losses[0]
        final_loss = trainer.training_losses[-1]
        improvement = ((initial_loss - final_loss) / initial_loss) * 100

        print(f"   Initial loss: {initial_loss:.4f}")
        print(f"   Final loss: {final_loss:.4f}")
        print(f"   Improvement: {improvement:.1f}%")

        best_loss = min(trainer.training_losses)
        best_step = trainer.training_losses.index(best_loss) + 1
        print(f"   Best loss: {best_loss:.4f} (step {best_step:,})")

        recent_losses = trainer.training_losses[-100:] if len(trainer.training_losses) > 100 else trainer.training_losses
        print(f"   Recent loss variance: {np.var(recent_losses):.6f}")

    print("\nVocabulary Analysis:")
    print(f"   Total vocabulary size: {len(tokenizer.token_to_id):,}")
    print(f"   Special tokens: {len(tokenizer.config.special_tokens)}")
    print(f"   BPE merges learned: {len(tokenizer.bpe_merges):,}")

    if tokenizer.word_frequencies:
        print("   Most frequent words:")
        for word, freq in tokenizer.word_frequencies.most_common(10):
            print(f"      '{word}': {freq:,}")

    print("\nModel Architecture:")
    config = trainer.config
    total_params = sum(p.numel() for p in trainer.model.get_parameters() if p is not None)

    print(f"   Layers: {config.num_transformer_layers}")
    print(f"   Attention heads: {config.num_attention_heads}")
    print(f"   Embedding dimension: {config.embedding_dimension}")
    print(f"   Sequence length: {config.sequence_max_length}")
    print(f"   Total parameters: {total_params:,}")
    print(f"   Model size (FP32): {total_params * 4 / 1024**2:.1f} MB")
    print(f"   Model size (FP16): {total_params * 2 / 1024**2:.1f} MB")

    print("\nTraining Efficiency:")
    print(f"   Total training steps: {trainer.global_step:,}")
    print(f"   Batch size: {config.batch_size}")
    print(f"   Gradient accumulation: {config.gradient_accumulation_steps}")
    print(f"   Effective batch size: {config.batch_size * config.gradient_accumulation_steps}")
    print(f"   Learning rate: {config.learning_rate}")
    print(f"   Warmup steps: {config.warmup_steps:,}")

    print("\nPerformance Estimates:")
    if trainer.training_losses:
        final_loss = trainer.training_losses[-1]
        estimated_perplexity = math.exp(final_loss)
        print(f"   Estimated perplexity: {estimated_perplexity:.2f}")

        if estimated_perplexity < 50:
            quality = "Excellent"
        elif estimated_perplexity < 100:
            quality = "Good"
        elif estimated_perplexity < 200:
            quality = "Fair"
        else:
            quality = "Needs improvement"
        print(f"   Model quality: {quality}")

    print("\nReference Benchmarks:")
    print("   GPT-1: ~18.4 perplexity on Penn Treebank")
    print("   GPT-2: ~8.6 perplexity on Penn Treebank")
    print("   Human performance: ~12 perplexity (estimated)")
    print("   Note: Direct comparison requires the same evaluation dataset")


def get_wikipedia_statistics(dumpster: DumpsterDiveIntegration) -> None:
    """Print article counts, length distribution, top categories, and size estimates."""
    print("\n" + "=" * 80)
    print("WIKIPEDIA DATASET STATISTICS")
    print("=" * 80)

    if dumpster.collection is None:
        print("MongoDB collection not available")
        return

    try:
        total_articles = dumpster.collection.count_documents({})
        main_articles = dumpster.collection.count_documents({"ns": 0})

        print(f"Total pages in database: {total_articles:,}")
        print(f"Main namespace articles: {main_articles:,}")
        print(f"Other pages (talk, category, etc.): {total_articles - main_articles:,}")

        print("\nAnalyzing sample articles...")
        sample_articles = list(dumpster.collection.find({"ns": 0}, {"text": 1, "title": 1}).limit(1000))

        avg_article_size = 0
        if sample_articles:
            lengths = [len(article.get("text", "")) for article in sample_articles]

            print(f"Article length statistics (sample of {len(sample_articles):,}):")
            print(f"   Average length: {sum(lengths) / len(lengths):.0f} characters")
            print(f"   Median length: {sorted(lengths)[len(lengths)//2]:,} characters")
            print(f"   Min length: {min(lengths):,} characters")
            print(f"   Max length: {max(lengths):,} characters")

            short_articles = sum(1 for l in lengths if l < 1000)
            medium_articles = sum(1 for l in lengths if 1000 <= l < 10000)
            long_articles = sum(1 for l in lengths if l >= 10000)

            print("\nLength distribution:")
            print(f"   Short (<1K chars): {short_articles:,} ({short_articles/len(lengths)*100:.1f}%)")
            print(f"   Medium (1K-10K): {medium_articles:,} ({medium_articles/len(lengths)*100:.1f}%)")
            print(f"   Long (>10K chars): {long_articles:,} ({long_articles/len(lengths)*100:.1f}%)")

        print("\nCategory analysis...")
        categories_sample = list(dumpster.collection.find(
            {"ns": 0, "categories": {"$exists": True, "$ne": []}}, {"categories": 1}
        ).limit(1000))

        if categories_sample:
            all_categories = []
            for doc in categories_sample:
                all_categories.extend(doc.get("categories", []))

            top_categories = Counter(all_categories).most_common(10)
            print("Top categories (from sample):")
            for category, count in top_categories:
                print(f"   {category}: {count}")

        sample_size = min(100, main_articles)
        size_sample = list(dumpster.collection.find({"ns": 0}, {"text": 1}).limit(sample_size))

        if size_sample:
            avg_article_size = sum(len(doc.get("text", "")) for doc in size_sample) / len(size_sample)
            estimated_total_size = avg_article_size * main_articles

            print("\nEstimated dataset size:")
            print(f"   Average article size: {avg_article_size:.0f} characters")
            print(f"   Total text size: {estimated_total_size / 1024**2:.0f} MB")
            print(f"   Total text size: {estimated_total_size / 1024**3:.1f} GB")

        print("\nTraining recommendations:")
        if main_articles < 1000:
            print("   Small dataset - good for testing and development")
        elif main_articles < 100000:
            print("   Medium dataset - suitable for initial training")
        else:
            print("   Large dataset - production-scale training possible")

        if avg_article_size:
            print(f"   Recommended sequence length: {min(1024, int(avg_article_size * 0.8))}")
        print(f"   Recommended vocab size: {min(32000, max(8000, main_articles // 100))}")

    except Exception as exc:
        print(f"Error analyzing dataset: {exc}")
