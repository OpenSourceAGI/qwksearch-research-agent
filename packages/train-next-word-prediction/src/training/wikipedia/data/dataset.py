"""
Dataset handling for Wikipedia-scale transformer training.

Packs tokenized articles into fixed-length sequences to minimize wasted
computation on padding, and serves shifted-by-one (input, target) batches
for next-token prediction.
"""

import os
import pickle
from typing import List, Tuple

from tinygrad.tensor import Tensor

from ..core.config import WikipediaConfig
from ..data.tokenizer import WikipediaTokenizer


class WikipediaDataset:
    """Streams Wikipedia articles into packed, fixed-length training sequences."""

    def __init__(self, config: WikipediaConfig, tokenizer: WikipediaTokenizer):
        self.config = config
        self.tokenizer = tokenizer
        self.sequences: List[List[int]] = []
        self.current_batch_idx = 0

    def prepare_training_data_from_dumpster(self, dumpster) -> None:
        """Extract articles via dumpster-dive/MongoDB and pack them into sequences."""
        total_articles = dumpster.get_article_count()

        if self.config.use_demo_mode:
            limit = min(self.config.max_articles_demo, total_articles)
            print(f"Demo mode: processing {limit:,} articles")
        else:
            limit = None
            print(f"Full mode: processing all {total_articles:,} articles")

        articles = dumpster.extract_articles(limit=limit)
        if not articles:
            raise ValueError("No articles available for training data preparation")

        self.prepare_training_data(articles)

    def prepare_training_data(self, texts: List[str]) -> None:
        """Tokenize articles and pack tokens into fixed-length training sequences."""
        print(f"Preparing training data from {len(texts):,} articles...")

        all_token_ids = []
        for i, text in enumerate(texts):
            if i % 10000 == 0:
                print(f"Tokenized {i:,}/{len(texts):,} articles")
            all_token_ids.extend(self.tokenizer.tokenize(text))

        print(f"Total tokens: {len(all_token_ids):,}")

        max_seq_len = self.config.sequence_max_length
        sequences = [
            all_token_ids[i:i + max_seq_len]
            for i in range(0, len(all_token_ids) - max_seq_len, max_seq_len)
        ]
        sequences = [seq for seq in sequences if len(seq) == max_seq_len]

        self.sequences = sequences
        print(f"Created {len(sequences):,} training sequences")

        processed_path = os.path.join(self.config.processed_data_dir, "training_sequences.pkl")
        with open(processed_path, "wb") as f:
            pickle.dump(sequences, f)
        print(f"Saved processed sequences to {processed_path}")

    def get_batch(self, batch_size: int) -> Tuple[Tensor, Tensor]:
        """Return a (input, target) batch, where target is input shifted by one position."""
        if self.current_batch_idx + batch_size > len(self.sequences):
            self.current_batch_idx = 0

        batch_sequences = self.sequences[self.current_batch_idx:self.current_batch_idx + batch_size]
        self.current_batch_idx += batch_size

        inputs = [sequence[:-1] for sequence in batch_sequences]
        targets = [sequence[1:] for sequence in batch_sequences]

        max_len = max(len(seq) for seq in inputs)
        pad_token_id = self.tokenizer.token_to_id["<PAD>"]

        padded_inputs = [inp + [pad_token_id] * (max_len - len(inp)) for inp in inputs]
        padded_targets = [tgt + [pad_token_id] * (max_len - len(tgt)) for tgt in targets]

        return Tensor(padded_inputs), Tensor(padded_targets)

    def __len__(self) -> int:
        return len(self.sequences)
