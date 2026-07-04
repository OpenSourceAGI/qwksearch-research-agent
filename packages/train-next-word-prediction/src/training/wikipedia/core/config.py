"""
Configuration for Wikipedia-scale transformer training.

Centralizes every hyperparameter and file path so the rest of the pipeline
(download, dumpster-dive, tokenizer, dataset, model, trainer) shares one
source of truth.
"""

import os
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class WikipediaConfig:
    # Data paths
    wikipedia_dump_path: str = "enwiki-latest-pages-articles.xml"  # Uncompressed XML file
    wikipedia_bz2_path: str = "enwiki-latest-pages-articles.xml.bz2"  # Compressed download
    wikipedia_dump_url: str = "https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-pages-articles.xml.bz2"
    processed_data_dir: str = "./wikipedia_processed"
    tokenizer_path: str = "./wikipedia_tokenizer.pkl"
    model_checkpoint_dir: str = "./model_checkpoints"

    # aria2c download settings
    aria2c_connections_per_server: int = 16  # -x
    aria2c_split: int = 16  # -s
    aria2c_min_split_size: str = "1M"  # -k

    # MongoDB settings for dumpster-dive
    mongo_host: str = "localhost"
    mongo_port: int = 27017
    mongo_db_name: str = "enwiki"
    mongo_collection: str = "pages"

    # Data processing settings
    max_articles_demo: int = 100000  # For demo mode
    min_article_length: int = 100  # Minimum characters per article
    max_article_length: int = 50000  # Maximum characters per article (for memory)
    use_demo_mode: bool = True  # Set to False for full Wikipedia processing

    # Tokenizer settings
    vocab_size: int = 32000  # Standard BPE vocabulary size
    min_token_frequency: int = 5  # Minimum frequency for token inclusion
    special_tokens: Optional[List[str]] = None  # Set in __post_init__

    # Model architecture
    embedding_dimension: int = 512
    sequence_max_length: int = 1024
    num_attention_heads: int = 8
    num_transformer_layers: int = 6
    feed_forward_dimension: int = 2048  # 4 * embedding_dimension
    dropout_probability: float = 0.1

    # Training configuration
    batch_size: int = 16
    gradient_accumulation_steps: int = 4
    num_training_epochs: int = 3
    learning_rate: float = 1e-4
    warmup_steps: int = 10000
    weight_decay: float = 0.01
    gradient_clip_norm: float = 1.0

    # Checkpointing and logging
    save_every_steps: int = 5000
    log_every_steps: int = 100
    eval_every_steps: int = 2000
    max_checkpoints_to_keep: int = 5

    # Generation settings
    generation_max_length: int = 200
    generation_temperature: float = 0.8
    generation_top_k: int = 50
    generation_top_p: float = 0.9

    def __post_init__(self):
        if self.special_tokens is None:
            self.special_tokens = ["<PAD>", "<UNK>", "<BOS>", "<EOS>", "<SEP>"]

        os.makedirs(self.processed_data_dir, exist_ok=True)
        os.makedirs(self.model_checkpoint_dir, exist_ok=True)

    @classmethod
    def from_env(cls) -> "WikipediaConfig":
        """
        Build a config from defaults, overlaying any matching environment
        variables (uppercased field name, e.g. USE_DEMO_MODE, MONGO_HOST,
        BATCH_SIZE). Lets the Docker/Cloudflare entry points be configured
        without editing source.
        """
        overrides = {}
        for field_name, field_type in cls.__annotations__.items():
            env_value = os.environ.get(field_name.upper())
            if env_value is None:
                continue
            if field_type is bool or field_type == Optional[bool]:
                overrides[field_name] = env_value.strip().lower() in ("1", "true", "yes", "on")
            elif field_type is int:
                overrides[field_name] = int(env_value)
            elif field_type is float:
                overrides[field_name] = float(env_value)
            else:
                overrides[field_name] = env_value

        return cls(**overrides)
