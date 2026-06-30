"""
Wikipedia-scale GPT-style transformer training pipeline.

Split into focused modules:
- config: WikipediaConfig hyperparameters and paths
- download: aria2c-based Wikipedia dump downloader + decompression
- dumpster_dive: dumpster-dive/MongoDB integration for article extraction
- tokenizer: byte-pair encoding (BPE) tokenizer
- dataset: tokenized sequence packing and batching
- model: decoder-only transformer architecture
- scheduler: learning rate warmup + cosine decay
- trainer: training loop, checkpointing, generation
- generation: top-k / nucleus sampling utilities
- analysis: training and dataset statistics
- pipeline: end-to-end orchestration and CLI entry points
"""

from .config import WikipediaConfig
from .download import WikipediaDownloader
from .dumpster_dive import DumpsterDiveIntegration
from .tokenizer import WikipediaTokenizer
from .dataset import WikipediaDataset
from .model import GPTStyleTransformer
from .scheduler import LearningRateScheduler
from .trainer import WikipediaTrainer

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
