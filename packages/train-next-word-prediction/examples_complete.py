#!/usr/bin/env python3

"""
Complete Example: Q&A Training with SQuAD on AWS Fargate
Demonstrates the full pipeline with mock model
"""

import logging
import asyncio
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import modules
from src.training.squad_manager import SQuADManager
from src.training.qa_improver import QAImproverLoop, QAEvaluator
from src.training.qa_recursive_loops import AsyncQAImprover, ParallelQAImprover
from src.models.model_adapter import ModelFactory
from src.evaluation.benchmarking import Benchmarker
from src.generation.advanced_sampling import AdaptiveSampler


def example_1_basic_download():
    """Example 1: Download and explore SQuAD"""
    print("\n" + "="*60)
    print("Example 1: Download & Explore SQuAD")
    print("="*60)
    
    manager = SQuADManager(version="1.1")
    
    # Download
    if not manager.download():
        print("✗ Download failed")
        return
    
    # Verify
    if not manager.verify_files():
        print("✗ Verification failed")
        return
    
    # Load and show statistics
    train_data = manager.load_train()
    stats = manager.get_statistics(train_data)
    
    print(f"\nSQuAD v1.1 Statistics:")
    print(f"  Total Articles: {stats['total_articles']}")
    print(f"  Total Paragraphs: {stats['total_paragraphs']}")
    print(f"  Total Q&A Pairs: {stats['total_qas']}")
    
    # Extract and show sample
    qa_pairs = manager.extract_qa_pairs(train_data, limit=100)
    
    if qa_pairs:
        sample = qa_pairs[0]
        print(f"\nSample Q&A:")
        print(f"  Q: {sample['question']}")
        print(f"  A: {sample['answer']}")
        print(f"  Context: {sample['context'][:100]}...")


def example_2_model_integration():
    """Example 2: Model Integration"""
    print("\n" + "="*60)
    print("Example 2: Model Integration")
    print("="*60)
    
    # Create mock model
    model = ModelFactory.create("mock")
    
    # Test inference
    context = "Paris is the capital of France. It is located in northern France."
    question = "What is the capital of France?"
    
    answer = model.generate_qa_answer(context, question)
    
    print(f"\nModel: {model.__class__.__name__}")
    print(f"Q: {question}")
    print(f"A: {answer}")
    
    # Test fine-tuning
    result = model.finetune_qa(
        contexts=[context],
        questions=[question],
        answers=["Paris"],
        epochs=1
    )
    print(f"Fine-tuning result: {result}")


def example_3_evaluation():
    """Example 3: Q&A Evaluation"""
    print("\n" + "="*60)
    print("Example 3: Q&A Evaluation")
    print("="*60)
    
    # Test evaluator
    predictions = [
        ("Paris", "Paris"),          # Perfect
        ("Paris France", "Paris"),   # Close
        ("London", "Paris"),         # Wrong
    ]
    
    for pred, expected in predictions:
        em_score = QAEvaluator.exact_match_score(pred, expected)
        token_score = QAEvaluator.token_overlap_score(pred, expected)
        combined = QAEvaluator.combined_score(pred, expected)
        
        print(f"\nPredicted: '{pred}' | Expected: '{expected}'")
        print(f"  EM Score: {em_score:.4f}")
        print(f"  Token F1: {token_score:.4f}")
        print(f"  Combined: {combined:.4f}")
    
    # Batch evaluation
    batch_results = QAEvaluator.evaluate_batch(predictions)
    print(f"\nBatch Metrics:")
    print(f"  Mean: {batch_results['mean']:.4f}")
    print(f"  Std: {batch_results['std']:.4f}")
    print(f"  Min: {batch_results['min']:.4f}")
    print(f"  Max: {batch_results['max']:.4f}")


def example_4_benchmarking():
    """Example 4: Benchmarking & Cost Analysis"""
    print("\n" + "="*60)
    print("Example 4: Benchmarking & Cost Analysis")
    print("="*60)
    
    benchmarker = Benchmarker()
    
    # Estimate costs
    print("\nCost Estimates:")
    
    configs = [
        ("cpu_1024", "CPU (1 vCPU, 2GB)"),
        ("gpu_1", "GPU (1 GPU)"),
        ("gpu_2", "GPU (2 GPU)"),
        ("gpu_4", "GPU (4 GPU)"),
    ]
    
    for config, label in configs:
        cost = benchmarker.estimate_cost(config, duration_hours=1)
        print(f"\n{label}:")
        print(f"  Per Hour: ${cost['cost_per_instance']:.2f}")
        print(f"  Per 100 Iterations: ${cost['cost_per_iteration']:.2f}")


def example_5_advanced_sampling():
    """Example 5: Advanced Sampling Strategies"""
    print("\n" + "="*60)
    print("Example 5: Advanced Sampling Strategies")
    print("="*60)
    
    # Create sample QA pairs
    sample_qa = [
        {
            'id': f'q{i}',
            'question': f'Question {i}?',
            'answer': f'Answer {i}',
            'context': 'word ' * (50 * i)  # Varying length
        }
        for i in range(100)
    ]
    
    # Curriculum learning
    curriculum = AdaptiveSampler(sample_qa)
    
    print("\nCurriculum Learning Stages:")
    for stage in range(5):
        batch, strategy = curriculum.get_adaptive_batch(10, improvement=0.01)
        print(f"  Stage {stage}: {len(batch)} samples (strategy: {strategy})")


async def example_6_async_training():
    """Example 6: Async Training Loops"""
    print("\n" + "="*60)
    print("Example 6: Async Training Loops (Mock)")
    print("="*60)
    
    # Create sample data directory
    import json
    squad_dir = Path("/tmp/squad_example")
    squad_dir.mkdir(exist_ok=True)
    
    sample_qa = [
        {
            'context': f'Context {i}...',
            'question': f'Q{i}?',
            'answer': f'A{i}',
            'id': f'q{i}'
        }
        for i in range(50)
    ]
    
    with open(squad_dir / "qa_pairs_train.json", 'w') as f:
        json.dump(sample_qa, f)
    
    # Run async loops (limited iterations for demo)
    improver = AsyncQAImprover(squad_dir=str(squad_dir), num_loops=2)
    
    print(f"Starting 2 async loops with 3 iterations each...")
    await improver.run_async_loops(max_iterations=3)


def main():
    """Run all examples"""
    print("\n" + "="*80)
    print("Q&A Training Pipeline - Complete Examples")
    print("="*80)
    
    # Run examples
    examples = [
        (example_1_basic_download, "SQuAD Download"),
        (example_2_model_integration, "Model Integration"),
        (example_3_evaluation, "Q&A Evaluation"),
        (example_4_benchmarking, "Benchmarking"),
        (example_5_advanced_sampling, "Advanced Sampling"),
    ]
    
    for example_func, description in examples:
        try:
            example_func()
        except Exception as e:
            logger.error(f"Example '{description}' failed: {e}", exc_info=True)
    
    # Async example
    try:
        asyncio.run(example_6_async_training())
    except Exception as e:
        logger.error(f"Async example failed: {e}")
    
    print("\n" + "="*80)
    print("✓ All examples completed!")
    print("="*80)


if __name__ == "__main__":
    main()
