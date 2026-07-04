"""
Wikipedia-scale GPT-style transformer training pipeline.

Split into focused subpackages:
- core: WikipediaConfig hyperparameters and paths
- ingestion: dump download and dumpster-dive/MongoDB extraction
- data: BPE tokenization and sequence batching
- architecture: decoder-only transformer architecture
- runtime: scheduler and trainer
- inference: top-k / nucleus sampling utilities
- analysis: training and dataset statistics
- orchestration: end-to-end CLI pipeline
"""

from .architecture import GPTStyleTransformer
from .core import WikipediaConfig
from .data import WikipediaDataset, WikipediaTokenizer
from .ingestion import DumpsterDiveIntegration, WikipediaDownloader
from .runtime import LearningRateScheduler, WikipediaTrainer

__all__ = [
    "WikipediaConfig",
    "WikipediaDownloader",
    "DumpsterDiveIntegration",
    "WikipediaTokenizer",
    "WikipediaDataset",
    "GPTStyleTransformer",
    "LearningRateScheduler",
    "WikipediaTrainer",
]
