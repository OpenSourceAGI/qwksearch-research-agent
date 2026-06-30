"""
Byte-Pair Encoding (BPE) tokenizer for Wikipedia text.

Learns subword units from the corpus so out-of-vocabulary words can still be
encoded by breaking them into smaller, learned pieces.

Reference: https://arxiv.org/abs/1508.07909
"""

import pickle
import re
from collections import Counter
from typing import Dict, List, Tuple

from ..core.config import WikipediaConfig
from ..ingestion.dumpster_dive import DumpsterDiveIntegration


class WikipediaTokenizer:
    """
    Learns frequent character pairs and merges them iteratively:
    1. Start with character-level vocabulary
    2. Find the most frequent character pair
    3. Merge that pair into a single token
    4. Repeat until the target vocabulary size is reached

    Example progression:
    "unhappiness" -> ["u","n","h","a","p","p","i","n","e","s","s"]
    after learning "pp" -> ["u","n","h","a","pp","i","n","e","s","s"]
    after learning "un" -> ["un","h","a","pp","i","n","e","s","s"]
    """

    def __init__(self, config: WikipediaConfig):
        self.config = config
        self.token_to_id: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        self.bpe_merges: List[Tuple[str, str]] = []
        self.word_frequencies: Counter = Counter()

    def clean_text(self, text: str) -> str:
        """Strip markup and normalize whitespace before tokenization."""
        text = re.sub(r"<[^>]+>", "", text)
        text = re.sub(r"\[\[([^\]|]+)\|?[^\]]*\]\]", r"\1", text)  # Wiki links
        text = re.sub(r"\{\{[^}]+\}\}", "", text)  # Templates
        text = re.sub(r"\{\|[^}]+\|\}", "", text)  # Tables
        text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.DOTALL)
        text = re.sub(r"<ref[^>]*/?>", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        text = re.sub(r"([.!?])\s*", r"\1 ", text)
        return text

    def build_vocabulary(self, texts: List[str]) -> None:
        """Learn the BPE vocabulary and merge rules from a list of texts."""
        print(f"Building BPE vocabulary from {len(texts):,} articles...")

        print("Counting word frequencies...")
        for text in texts:
            self.word_frequencies.update(text.lower().split())
        print(f"Found {len(self.word_frequencies):,} unique words")

        print("Initializing character vocabulary...")
        char_vocab = set()
        for word in self.word_frequencies:
            char_vocab.update(list(word) + ["</w>"])  # End-of-word marker

        vocab = list(self.config.special_tokens) + sorted(char_vocab)

        print(f"Learning BPE merges (target vocab size: {self.config.vocab_size})...")
        word_splits = {
            word: list(word) + ["</w>"]
            for word, freq in self.word_frequencies.items()
            if freq >= self.config.min_token_frequency
        }

        while len(vocab) < self.config.vocab_size:
            pair_counts = Counter()
            for word, split in word_splits.items():
                freq = self.word_frequencies[word]
                for i in range(len(split) - 1):
                    pair_counts[(split[i], split[i + 1])] += freq

            if not pair_counts:
                break

            best_pair = pair_counts.most_common(1)[0][0]

            new_word_splits = {}
            for word, split in word_splits.items():
                new_split = []
                i = 0
                while i < len(split):
                    if i < len(split) - 1 and split[i] == best_pair[0] and split[i + 1] == best_pair[1]:
                        new_split.append(best_pair[0] + best_pair[1])
                        i += 2
                    else:
                        new_split.append(split[i])
                        i += 1
                new_word_splits[word] = new_split
            word_splits = new_word_splits

            self.bpe_merges.append(best_pair)
            merged_token = best_pair[0] + best_pair[1]
            if merged_token not in vocab:
                vocab.append(merged_token)

            if len(vocab) % 1000 == 0:
                print(f"Vocabulary size: {len(vocab):,}")

        self.token_to_id = {token: idx for idx, token in enumerate(vocab)}
        self.id_to_token = {idx: token for token, idx in self.token_to_id.items()}

        print(f"Built vocabulary with {len(vocab):,} tokens")
        print(f"Learned {len(self.bpe_merges):,} BPE merges")

    def build_vocabulary_from_dumpster(self, dumpster: DumpsterDiveIntegration, limit: int = None) -> None:
        """Extract articles from MongoDB via dumpster-dive and learn the vocabulary from them."""
        total_articles = dumpster.get_article_count()
        if limit is None and self.config.use_demo_mode:
            limit = min(self.config.max_articles_demo, total_articles)

        articles = dumpster.extract_articles(limit=limit)
        if not articles:
            raise ValueError("No articles available from MongoDB to build vocabulary")

        self.build_vocabulary(articles)

    def apply_bpe(self, word: str) -> List[str]:
        """Apply learned merge operations to tokenize a single word."""
        if not word:
            return []

        word_tokens = list(word.lower()) + ["</w>"]

        for merge_pair in self.bpe_merges:
            new_word_tokens = []
            i = 0
            while i < len(word_tokens):
                if i < len(word_tokens) - 1 and word_tokens[i] == merge_pair[0] and word_tokens[i + 1] == merge_pair[1]:
                    new_word_tokens.append(merge_pair[0] + merge_pair[1])
                    i += 2
                else:
                    new_word_tokens.append(word_tokens[i])
                    i += 1
            word_tokens = new_word_tokens

        return word_tokens

    def tokenize(self, text: str) -> List[int]:
        """Convert text into a list of token IDs, wrapped in BOS/EOS."""
        token_ids = [self.token_to_id["<BOS>"]]

        for word in text.split():
            for token in self.apply_bpe(word):
                token_ids.append(self.token_to_id.get(token, self.token_to_id["<UNK>"]))

        token_ids.append(self.token_to_id["<EOS>"])
        return token_ids

    def detokenize(self, token_ids: List[int]) -> str:
        """Convert token IDs back into readable text."""
        tokens = [
            self.id_to_token[token_id]
            for token_id in token_ids
            if token_id in self.id_to_token and self.id_to_token[token_id] not in self.config.special_tokens
        ]

        text = "".join(tokens).replace("</w>", " ")
        return re.sub(r"\s+", " ", text).strip()

    def save(self, path: str) -> None:
        tokenizer_data = {
            "token_to_id": self.token_to_id,
            "id_to_token": self.id_to_token,
            "bpe_merges": self.bpe_merges,
            "word_frequencies": dict(self.word_frequencies),
            "config": self.config,
        }
        with open(path, "wb") as f:
            pickle.dump(tokenizer_data, f)
        print(f"Saved tokenizer to {path}")

    @classmethod
    def load(cls, path: str) -> "WikipediaTokenizer":
        with open(path, "rb") as f:
            tokenizer_data = pickle.load(f)

        tokenizer = cls(tokenizer_data["config"])
        tokenizer.token_to_id = tokenizer_data["token_to_id"]
        tokenizer.id_to_token = tokenizer_data["id_to_token"]
        tokenizer.bpe_merges = tokenizer_data["bpe_merges"]
        tokenizer.word_frequencies = Counter(tokenizer_data.get("word_frequencies", {}))

        print(f"Loaded tokenizer from {path}")
        return tokenizer
