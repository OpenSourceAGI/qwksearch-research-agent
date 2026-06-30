"""
Decoder-only (GPT-style) transformer architecture, built from scratch on tinygrad.

Architecture flow:
1. Token embedding: word IDs -> dense vectors
2. Positional embedding: add position information
3. N transformer decoder blocks: self-attention + feed-forward, pre-norm + residual
4. Final layer norm
5. Language modeling head: predict next-token logits over the vocabulary

References:
- Attention Is All You Need: https://arxiv.org/abs/1706.03762
- GPT paper: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
- Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/
"""

import math

from tinygrad.nn import Embedding, LayerNorm, Linear
from tinygrad.tensor import Tensor

from .config import WikipediaConfig


class LearnedPositionalEmbeddings:
    """Learns a unique vector per sequence position, since attention is permutation-invariant."""

    def __init__(self, sequence_max_length: int, embedding_dimension: int):
        self.position_vectors = Tensor.randn(sequence_max_length, embedding_dimension) * 0.02

    def __call__(self, token_indices):
        sequence_length = token_indices.shape[1]
        position_embeddings = self.position_vectors[:sequence_length, :]
        return position_embeddings.unsqueeze(0).expand(
            token_indices.shape[0], sequence_length, self.position_vectors.shape[1]
        )


class MultiHeadSelfAttention:
    """
    Scaled dot-product multi-head self-attention with causal masking:

        Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V

    Each head can learn a different relationship (subject-verb, modifier-noun, etc).
    Reference: https://jalammar.github.io/illustrated-transformer/
    """

    def __init__(self, embedding_dimension: int, num_attention_heads: int,
                 sequence_max_length: int, dropout_probability: float = 0.0):
        assert embedding_dimension % num_attention_heads == 0, \
            "embedding_dimension must be divisible by num_attention_heads"

        self.embedding_dimension = embedding_dimension
        self.num_attention_heads = num_attention_heads
        self.head_dimension = embedding_dimension // num_attention_heads
        self.sequence_max_length = sequence_max_length

        self.query_projection = Linear(embedding_dimension, embedding_dimension)
        self.key_projection = Linear(embedding_dimension, embedding_dimension)
        self.value_projection = Linear(embedding_dimension, embedding_dimension)
        self.output_projection = Linear(embedding_dimension, embedding_dimension)

        # Lower-triangular mask: 1 = can attend, 0 = cannot (no peeking at future tokens)
        self.causal_attention_mask = Tensor.ones(sequence_max_length, sequence_max_length).tril(diagonal=0)

    def __call__(self, hidden_states):
        batch_size, sequence_length, embedding_dimension = hidden_states.shape

        queries = self.query_projection(hidden_states)
        keys = self.key_projection(hidden_states)
        values = self.value_projection(hidden_states)

        queries = queries.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        keys = keys.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        values = values.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)

        attention_scores = queries.dot(keys.transpose(-2, -1)) / math.sqrt(self.head_dimension)

        current_mask = self.causal_attention_mask[:sequence_length, :sequence_length]
        attention_scores = attention_scores.masked_fill(current_mask == 0, -1e9)

        attention_weights = attention_scores.softmax(axis=-1)
        attention_output = attention_weights.dot(values)

        attention_output = attention_output.transpose(1, 2).reshape(batch_size, sequence_length, embedding_dimension)
        return self.output_projection(attention_output)


class PositionWiseFeedForward:
    """Two-layer MLP (expand -> ReLU -> contract) applied independently to each position."""

    def __init__(self, embedding_dimension: int, feed_forward_dimension: int = None):
        if feed_forward_dimension is None:
            feed_forward_dimension = 4 * embedding_dimension

        self.expansion_layer = Linear(embedding_dimension, feed_forward_dimension)
        self.contraction_layer = Linear(feed_forward_dimension, embedding_dimension)

    def __call__(self, hidden_states):
        return self.contraction_layer(self.expansion_layer(hidden_states).relu())


class TransformerDecoderBlock:
    """
    Pre-norm transformer block: LayerNorm -> Attention -> residual, LayerNorm -> FFN -> residual.

    Reference: https://arxiv.org/abs/2002.04745 (Pre-LN Transformer)
    """

    def __init__(self, embedding_dimension: int, num_attention_heads: int,
                 sequence_max_length: int, feed_forward_dimension: int = None,
                 dropout_probability: float = 0.0):
        self.self_attention = MultiHeadSelfAttention(
            embedding_dimension, num_attention_heads, sequence_max_length, dropout_probability
        )
        self.feed_forward_network = PositionWiseFeedForward(embedding_dimension, feed_forward_dimension)

        self.attention_layer_norm = LayerNorm(embedding_dimension)
        self.feed_forward_layer_norm = LayerNorm(embedding_dimension)

    def __call__(self, hidden_states):
        normalized_states = self.attention_layer_norm(hidden_states)
        hidden_states = hidden_states + self.self_attention(normalized_states)

        normalized_states = self.feed_forward_layer_norm(hidden_states)
        hidden_states = hidden_states + self.feed_forward_network(normalized_states)

        return hidden_states


class GPTStyleTransformer:
    """Full decoder-only language model, configured from a WikipediaConfig."""

    def __init__(self, config: WikipediaConfig):
        self.config = config

        self.token_embeddings = Embedding(config.vocab_size, config.embedding_dimension)
        self.positional_embeddings = LearnedPositionalEmbeddings(
            config.sequence_max_length, config.embedding_dimension
        )

        self.transformer_blocks = [
            TransformerDecoderBlock(
                config.embedding_dimension,
                config.num_attention_heads,
                config.sequence_max_length,
                config.feed_forward_dimension,
                config.dropout_probability,
            )
            for _ in range(config.num_transformer_layers)
        ]

        self.final_layer_norm = LayerNorm(config.embedding_dimension)
        self.language_modeling_head = Linear(config.embedding_dimension, config.vocab_size)

    def __call__(self, input_token_ids):
        """Forward pass: token IDs -> next-token logits [batch, seq_len, vocab_size]."""
        token_vectors = self.token_embeddings(input_token_ids)
        position_vectors = self.positional_embeddings(input_token_ids)
        hidden_representations = token_vectors + position_vectors

        for transformer_block in self.transformer_blocks:
            hidden_representations = transformer_block(hidden_representations)

        normalized_representations = self.final_layer_norm(hidden_representations)
        return self.language_modeling_head(normalized_representations)

    def get_parameters(self):
        """Collect every trainable parameter for the optimizer."""
        parameters = [
            self.token_embeddings.weight,
            self.positional_embeddings.position_vectors,
        ]

        for block in self.transformer_blocks:
            parameters.extend([
                block.self_attention.query_projection.weight,
                block.self_attention.query_projection.bias,
                block.self_attention.key_projection.weight,
                block.self_attention.key_projection.bias,
                block.self_attention.value_projection.weight,
                block.self_attention.value_projection.bias,
                block.self_attention.output_projection.weight,
                block.self_attention.output_projection.bias,
            ])
            parameters.extend([
                block.feed_forward_network.expansion_layer.weight,
                block.feed_forward_network.expansion_layer.bias,
                block.feed_forward_network.contraction_layer.weight,
                block.feed_forward_network.contraction_layer.bias,
            ])
            parameters.extend([
                block.attention_layer_norm.weight,
                block.attention_layer_norm.bias,
                block.feed_forward_layer_norm.weight,
                block.feed_forward_layer_norm.bias,
            ])

        parameters.extend([
            self.final_layer_norm.weight,
            self.final_layer_norm.bias,
            self.language_modeling_head.weight,
            self.language_modeling_head.bias,
        ])

        return [p for p in parameters if p is not None]
