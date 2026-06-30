"""
🧠 Transformer Neural Network Training with Tinygrad

This implements a decoder-only transformer architecture that learns statistical patterns 
from text to predict the next word in a sequence. Language models work by converting words 
into high-dimensional vectors—numerical lists that capture meaning and relationships between 
concepts. These mathematical representations allow models to understand that "king/queen" 
share properties and "Paris/France" mirrors "Tokyo/Japan" through their transformer 
architecture, a neural network backbone that processes information through multiple layers.

The attention mechanism enables the system to dynamically focus on relevant parts of input 
text when generating each word, maintaining context like humans tracking conversation threads, 
while calculating probability scores across the entire vocabulary for each word position 
based on processed context. Rather than retrieving stored responses, models create novel 
text by selecting the most probable words given learned patterns.

🔍 Self-Attention Mechanism:
Each word creates three representations: Query (what it's looking for), Key (what it offers), 
and Value (its actual content). For example, in "The cat sat on the mat," the word "cat" 
has a Query vector that searches for actions, a Key vector that advertises itself as a 
subject, and a Value vector containing its semantic meaning as an animal. The attention 
mechanism calculates how much "cat" should focus on other words by comparing its Query 
with their Keys - finding high similarity with "sat" (the action) - then combines the 
corresponding Value vectors to create a contextualized representation where "cat" now 
understands it's the one doing the sitting.

📚 Learning Resources:
- LLM Training Example: https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js
- Transformer Overview: https://jalammar.github.io/illustrated-transformer/
- Building Transformer Guide: https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch
- Hugging Face Tutorials: https://huggingface.co/learn
- OpenAI Cookbook: https://cookbook.openai.com
- PyTorch Overview: https://www.learnpytorch.io/pytorch_cheatsheet/
- Original Transformer Paper: https://arxiv.org/abs/1706.03762 ("Attention Is All You Need")
- GPT Paper: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
- Tinygrad Documentation: https://docs.tinygrad.org/
"""

from tinygrad.tensor import Tensor
from tinygrad.nn import Linear, LayerNorm, Embedding
from tinygrad.nn.optim import Adam
import math
import numpy as np


class LearnedPositionalEmbeddings:
    """
    🎯 Positional Information Encoder
    
    Since attention mechanisms are permutation-invariant (they don't naturally understand 
    word order), we need to inject positional information. This layer learns position 
    embeddings that get added to token embeddings, teaching the model that word order matters.
    
    Think of it like adding GPS coordinates to each word so the model knows "The cat sat" 
    vs "Sat the cat" are different meanings.
    
    Args:
        sequence_max_length: Maximum number of words in a sequence
        embedding_dimension: Size of the vector representation for each position
    """
    def __init__(self, sequence_max_length: int, embedding_dimension: int):
        # Initialize random position vectors that will be learned during training
        # Each position gets its own unique vector representation
        self.position_vectors = Tensor.randn(sequence_max_length, embedding_dimension) * 0.02
        
    def __call__(self, token_indices):
        # token_indices shape: [batch_size, sequence_length, 1] for token IDs
        # Extract how many positions we need for this sequence
        sequence_length = token_indices.shape[1]
        position_embeddings = self.position_vectors[:sequence_length, :]  # [seq_len, embedding_dim]
        
        # Broadcast to match batch size: [batch_size, sequence_length, embedding_dimension]
        return position_embeddings.unsqueeze(0).expand(
            token_indices.shape[0], sequence_length, self.position_vectors.shape[1]
        )


class MultiHeadSelfAttention:
    """
    🎯 Multi-Head Self-Attention: The Core Intelligence Mechanism
    
    This is where the magic happens! Each word looks at every other word in the sentence 
    and decides how much attention to pay to each one. Multiple "heads" allow the model 
    to attend to different types of relationships simultaneously.
    
    For example, one head might focus on subject-verb relationships while another focuses 
    on noun-adjective connections. Each head creates Query, Key, and Value representations:
    
    - Query: "What am I looking for?" (e.g., "cat" looking for actions)
    - Key: "What do I offer?" (e.g., "sat" advertising itself as an action) 
    - Value: "What is my actual meaning?" (the semantic content)
    
    The attention score is calculated as: Attention(Q,K,V) = softmax(QK^T/√d_k)V
    
    Reference: https://jalammar.github.io/illustrated-transformer/
    
    Args:
        embedding_dimension: Hidden size of embeddings
        num_attention_heads: Number of parallel attention mechanisms
        sequence_max_length: Maximum sequence length for causal masking
        dropout_probability: Regularization (not used in this implementation)
    """
    def __init__(self, embedding_dimension: int, num_attention_heads: int, 
                 sequence_max_length: int, dropout_probability: float = 0.0):
        assert embedding_dimension % num_attention_heads == 0, \
            "embedding_dimension must be divisible by num_attention_heads"
        
        self.embedding_dimension = embedding_dimension
        self.num_attention_heads = num_attention_heads
        self.head_dimension = embedding_dimension // num_attention_heads  # Size per attention head
        self.sequence_max_length = sequence_max_length
        
        # Linear transformations to create Query, Key, and Value representations
        # Each gets its own learned transformation matrix
        self.query_projection = Linear(embedding_dimension, embedding_dimension)
        self.key_projection = Linear(embedding_dimension, embedding_dimension)
        self.value_projection = Linear(embedding_dimension, embedding_dimension)
        self.output_projection = Linear(embedding_dimension, embedding_dimension)
        
        # 🚫 Causal Mask: Prevents cheating by looking at future words
        # In language modeling, we can only use past and present context to predict the next word
        # This creates a lower triangular matrix where 1 = "can attend", 0 = "cannot attend"
        causal_mask = Tensor.ones(sequence_max_length, sequence_max_length).tril(diagonal=0)
        self.register_buffer('causal_attention_mask', causal_mask)
        
    def register_buffer(self, buffer_name: str, tensor_data: Tensor):
        """Store the causal mask as a model component"""
        setattr(self, buffer_name, tensor_data)
        
    def __call__(self, hidden_states):
        batch_size, sequence_length, embedding_dimension = hidden_states.shape
        
        # 🔄 Generate Query, Key, Value representations for each word
        queries = self.query_projection(hidden_states)  # [batch, seq_len, embed_dim]
        keys = self.key_projection(hidden_states)       # [batch, seq_len, embed_dim]
        values = self.value_projection(hidden_states)   # [batch, seq_len, embed_dim]
        
        # 🧩 Reshape for multi-head attention: split embedding_dimension across heads
        # [batch, seq_len, embed_dim] -> [batch, seq_len, num_heads, head_dim] -> [batch, num_heads, seq_len, head_dim]
        queries = queries.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        keys = keys.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        values = values.reshape(batch_size, sequence_length, self.num_attention_heads, self.head_dimension).transpose(1, 2)
        
        # 🎯 Scaled Dot-Product Attention
        # Calculate attention scores: how much should each word attend to every other word?
        # QK^T gives us similarity scores, scaled by √d_k for numerical stability
        attention_scores = queries.dot(keys.transpose(-2, -1)) / math.sqrt(self.head_dimension)
        
        # 🚫 Apply causal masking to prevent attending to future positions
        current_mask = self.causal_attention_mask[:sequence_length, :sequence_length]
        # Set masked positions to large negative value so softmax makes them ≈ 0
        attention_scores = attention_scores.masked_fill(current_mask == 0, -1e9)
        
        # 📊 Convert scores to probabilities: each word's attention sums to 1
        attention_weights = attention_scores.softmax(axis=-1)
        
        # 🎭 Apply attention weights to values: weighted combination of meanings
        attention_output = attention_weights.dot(values)
        
        # 🔄 Reshape back to original format: [batch, num_heads, seq_len, head_dim] -> [batch, seq_len, embed_dim]
        attention_output = attention_output.transpose(1, 2).reshape(batch_size, sequence_length, embedding_dimension)
        
        # 🎯 Final linear transformation to integrate multi-head outputs
        return self.output_projection(attention_output)


class PositionWiseFeedForward:
    """
    🧠 Position-wise Feed-Forward Network: Deep Processing Layer
    
    After attention mechanisms identify what to focus on, this layer performs deep 
    processing on each word position independently. It's a two-layer neural network 
    with ReLU activation that transforms the attended representations.
    
    Think of it as giving each word time to "think deeply" about what it learned 
    from attending to other words. The standard expansion factor is 4x, so a 512-dim 
    input becomes 2048-dim in the middle layer before contracting back to 512-dim.
    
    Reference: https://arxiv.org/abs/1706.03762 Section 3.3
    
    Args:
        embedding_dimension: Input/output dimension size
        feed_forward_dimension: Internal expansion dimension (typically 4 * embedding_dimension)
    """
    def __init__(self, embedding_dimension: int, feed_forward_dimension: int = None):
        if feed_forward_dimension is None:
            feed_forward_dimension = 4 * embedding_dimension  # Standard 4x expansion
            
        self.expansion_layer = Linear(embedding_dimension, feed_forward_dimension)
        self.contraction_layer = Linear(feed_forward_dimension, embedding_dimension)
        
    def __call__(self, hidden_states):
        # 🔄 Two-layer MLP: Expand -> ReLU -> Contract
        # ReLU adds non-linearity to enable complex pattern learning
        expanded_representation = self.expansion_layer(hidden_states).relu()
        processed_output = self.contraction_layer(expanded_representation)
        return processed_output


class TransformerDecoderBlock:
    """
    🏗️ Single Transformer Decoder Block: The Core Building Block
    
    This is the fundamental unit of transformer architecture, repeated multiple times 
    to build deep language understanding. Each block contains:
    
    1. 🎯 Multi-head self-attention: Learn what to focus on
    2. 🧠 Feed-forward network: Process the attended information deeply
    3. 🔄 Residual connections: Preserve original information flow
    4. 📊 Layer normalization: Stabilize training dynamics
    
    The architecture uses "pre-normalization" (LayerNorm before attention/FFN) which 
    provides better training stability compared to post-normalization.
    
    Reference: https://arxiv.org/abs/2002.04745 (Pre-LN Transformer)
    
    Args:
        embedding_dimension: Hidden dimension size throughout the block
        num_attention_heads: Number of parallel attention mechanisms
        sequence_max_length: Maximum sequence length for causal masking
        dropout_probability: Regularization probability (not implemented here)
    """
    def __init__(self, embedding_dimension: int, num_attention_heads: int, 
                 sequence_max_length: int, dropout_probability: float = 0.0):
        self.self_attention = MultiHeadSelfAttention(
            embedding_dimension, num_attention_heads, sequence_max_length, dropout_probability
        )
        self.feed_forward_network = PositionWiseFeedForward(embedding_dimension)
        
        # Layer normalization for stable training dynamics
        self.attention_layer_norm = LayerNorm(embedding_dimension)
        self.feed_forward_layer_norm = LayerNorm(embedding_dimension)
        
    def __call__(self, hidden_states):
        # 🎯 Self-Attention Sub-layer with Pre-LN and Residual Connection
        # Pre-normalization: normalize first, then apply transformation
        normalized_states = self.attention_layer_norm(hidden_states)
        attention_output = self.self_attention(normalized_states)
        hidden_states = hidden_states + attention_output  # Residual connection preserves original info
        
        # 🧠 Feed-Forward Sub-layer with Pre-LN and Residual Connection
        normalized_states = self.feed_forward_layer_norm(hidden_states)
        feed_forward_output = self.feed_forward_network(normalized_states)
        hidden_states = hidden_states + feed_forward_output  # Another residual connection
        
        return hidden_states


class GPTStyleTransformer:
    """
    🤖 GPT-Style Transformer: Complete Language Model Architecture
    
    This implements a decoder-only transformer similar to GPT models that learn to predict 
    the next word in a sequence. Unlike encoder-decoder transformers (like the original), 
    this architecture only uses decoder blocks with causal masking for autoregressive 
    text generation.
    
    🏗️ Architecture Flow:
    1. 📝 Token Embedding: Convert word IDs to dense vectors
    2. 📍 Positional Embedding: Add position information
    3. 🧠 Multiple Transformer Blocks: Deep pattern recognition
    4. 📊 Final Layer Norm: Output stabilization  
    5. 🎯 Language Modeling Head: Predict next word probabilities
    
    The model learns to compress human language patterns into billions of parameters,
    enabling it to generate coherent text by predicting one word at a time based on
    all previous context.
    
    References:
    - GPT Paper: https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
    - Transformer Paper: https://arxiv.org/abs/1706.03762
    - Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/
    
    Args:
        vocabulary_size: Total number of unique tokens the model can handle
        embedding_dimension: Size of word vector representations
        sequence_max_length: Maximum number of words in input sequences
        num_attention_heads: Number of parallel attention mechanisms per block
        num_transformer_layers: Number of transformer blocks to stack
        dropout_probability: Regularization rate (disabled in this demo)
    """
    def __init__(self, vocabulary_size: int, embedding_dimension: int, sequence_max_length: int, 
                 num_attention_heads: int, num_transformer_layers: int = 2, dropout_probability: float = 0.0):
        
        # 📝 Word Embedding: Maps discrete token IDs to continuous vector space
        # This learnable lookup table stores meaning representations for each vocabulary word
        self.token_embeddings = Embedding(vocabulary_size, embedding_dimension)
        
        # 📍 Position Embedding: Adds sequence order information
        # Crucial since attention is permutation-invariant by default
        self.positional_embeddings = LearnedPositionalEmbeddings(sequence_max_length, embedding_dimension)
        
        # 🧠 Stack of Transformer Blocks: The core intelligence layers
        # Each block can learn increasingly complex language patterns
        self.transformer_blocks = [
            TransformerDecoderBlock(embedding_dimension, num_attention_heads, sequence_max_length, dropout_probability) 
            for _ in range(num_transformer_layers)
        ]
        
        # 📊 Final Layer Normalization: Stabilizes final representations
        self.final_layer_norm = LayerNorm(embedding_dimension)
        
        # 🎯 Language Modeling Head: Projects hidden states to vocabulary probabilities
        # This linear layer predicts the probability of each word being next
        self.language_modeling_head = Linear(embedding_dimension, vocabulary_size)
        
    def __call__(self, input_token_ids):
        """
        🔄 Forward Pass: Convert Token IDs to Next-Word Predictions
        
        This function implements the complete forward computation:
        1. Convert tokens to embeddings and add positional info
        2. Process through multiple transformer blocks
        3. Apply final normalization and project to vocabulary
        
        Args:
            input_token_ids: Token IDs of shape [batch_size, sequence_length]
            
        Returns:
            Tensor: Logits of shape [batch_size, sequence_length, vocabulary_size]
                   Each position contains probability scores for all possible next words
        """
        # 📝 Convert discrete tokens to continuous vector representations
        token_vectors = self.token_embeddings(input_token_ids)  # [batch, seq_len, embed_dim]
        
        # 📍 Add positional information so model understands word order
        position_vectors = self.positional_embeddings(input_token_ids)  # [batch, seq_len, embed_dim]
        
        # 🔄 Combine semantic (token) and positional information
        # This gives each word both meaning and position context
        hidden_representations = token_vectors + position_vectors
        
        # 🧠 Process through stack of transformer blocks
        # Each block adds another layer of language understanding
        for transformer_block in self.transformer_blocks:
            hidden_representations = transformer_block(hidden_representations)
            
        # 📊 Apply final normalization for stable outputs
        normalized_representations = self.final_layer_norm(hidden_representations)
        
        # 🎯 Project to vocabulary size for next-word prediction
        # Each position gets probability scores for all possible next words
        next_word_logits = self.language_modeling_head(normalized_representations)
        
        return next_word_logits


def train_next_word_predictor():
    """
    🚀 Comprehensive Transformer Training Pipeline
    
    This function demonstrates the complete process of training a language model to predict 
    the next word in sequences. In production, this would process billions of text examples 
    from books, websites, and articles to learn human language patterns.
    
    🎯 Training Process:
    1. 📊 Initialize model with random weights
    2. 📝 Feed text sequences through the model  
    3. 📈 Calculate prediction errors using cross-entropy loss
    4. 🔄 Adjust weights to minimize errors using backpropagation
    5. 🔁 Repeat millions of times until the model learns language patterns
    
    The model learns by trying to predict the next word in billions of examples,
    gradually discovering grammar, facts, reasoning patterns, and world knowledge
    embedded in human text.
    
    Reference: https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch
    
    Returns:
        dict: Complete training results with model, losses, and metadata
    """
    
    # ⚙️ Model Architecture Configuration
    # These hyperparameters control the model's capacity and behavior
    vocabulary_size = 52        # Number of unique words/tokens (small for demo)
    embedding_dimension = 32    # Size of word vector representations  
    sequence_max_length = 16    # Maximum words per training example
    num_attention_heads = 4     # Parallel attention mechanisms (must divide embedding_dimension)
    num_transformer_layers = 2  # Depth of the neural network
    dropout_probability = 0.0   # Regularization (disabled for clearer demo)
    
    # 🎓 Training Configuration  
    batch_size = 8              # Number of text sequences processed simultaneously
    num_training_epochs = 30    # Number of complete passes through the data
    learning_rate = 5e-3        # How aggressively to update model weights
    
    print(f"🧠 Initializing GPT-style transformer:")
    print(f"   📚 Vocabulary: {vocabulary_size} tokens")
    print(f"   🎯 Embedding size: {embedding_dimension} dimensions") 
    print(f"   🏗️ Architecture: {num_transformer_layers} layers, {num_attention_heads} attention heads")
    
    # 🤖 Model Instantiation
    # Create the transformer with specified architecture
    language_model = GPTStyleTransformer(
        vocabulary_size=vocabulary_size,
        embedding_dimension=embedding_dimension,
        sequence_max_length=sequence_max_length,
        num_attention_heads=num_attention_heads,
        num_transformer_layers=num_transformer_layers,
        dropout_probability=dropout_probability
    )
    
    # 📈 Optimizer Setup: Adam for adaptive learning rate optimization
    # Adam adjusts learning rate per parameter based on gradient history
    # Reference: https://arxiv.org/abs/1412.6980
    all_model_parameters = [
        language_model.token_embeddings.weight,
        language_model.positional_embeddings.position_vectors,
        # Collect all transformer block parameters
        *[parameter for block in language_model.transformer_blocks 
          for layer in [block.self_attention.query_projection, block.self_attention.key_projection, 
                       block.self_attention.value_projection, block.self_attention.output_projection,
                       block.feed_forward_network.expansion_layer, block.feed_forward_network.contraction_layer,
                       block.attention_layer_norm, block.feed_forward_layer_norm] 
          for parameter in [layer.weight, getattr(layer, 'bias', None)] if parameter is not None],
        language_model.final_layer_norm.weight,
        language_model.final_layer_norm.bias,
        language_model.language_modeling_head.weight,
        language_model.language_modeling_head.bias
    ]
    
    optimizer = Adam(all_model_parameters, lr=learning_rate)
    
    # 📊 Synthetic Training Data Generation
    # In production, this would be real tokenized text from books, articles, etc.
    # Format: sequences of token IDs representing words
    input_sequences = Tensor(np.random.randint(0, vocabulary_size, (batch_size, sequence_max_length)))
    
    # 🎯 Target Generation: Next word for each position
    # In real language modeling, targets are input sequences shifted by one position:
    # Input:  [START, "The", "cat", "sat"] 
    # Target: ["The", "cat", "sat", "END"]
    target_sequences = Tensor(np.random.randint(0, vocabulary_size, (batch_size, sequence_max_length)))
    
    print(f"📝 Generated training data:")
    print(f"   📊 Input shape: {input_sequences.shape}")
    print(f"   🎯 Target shape: {target_sequences.shape}")
    print(f"   📈 Total parameters to learn: {len([p for p in all_model_parameters if p is not None])}")
    
    # 🎓 Training Loop: The Learning Process
    print(f"\n🚀 Starting training for {num_training_epochs} epochs...")
    training_loss_history = []
    
    for epoch_number in range(num_training_epochs):
        # 🔄 Forward Pass: Model makes predictions
        # Process input sequences through all transformer layers
        predicted_logits = language_model(input_sequences)  # [batch, seq_len, vocab_size]
        
        # 📊 Loss Calculation: How wrong are the predictions?
        # Cross-entropy measures the difference between predicted and actual next words
        # Reshape for loss calculation: flatten batch and sequence dimensions
        flattened_predictions = predicted_logits.reshape(-1, vocabulary_size)  # [batch*seq_len, vocab_size]
        flattened_targets = target_sequences.reshape(-1)                       # [batch*seq_len]
        
        # 📈 Cross-entropy loss: -log(probability of correct word)
        # Lower loss = better predictions
        prediction_loss = flattened_predictions.sparse_categorical_crossentropy(flattened_targets)
        
        # 🔄 Backward Pass: Calculate how to improve
        optimizer.zero_grad()          # Clear previous gradients
        prediction_loss.backward()     # Compute gradients via backpropagation  
        optimizer.step()               # Update model weights
        
        # 📊 Progress Monitoring
        current_loss = prediction_loss.item()
        training_loss_history.append(current_loss)
        
        if epoch_number % 5 == 0:  # Report every 5 epochs
            print(f"   📈 Epoch {epoch_number:3d} | Loss: {current_loss:.4f}")
    
    final_training_loss = training_loss_history[-1]
    print(f"\n✅ Training completed! Final loss: {final_training_loss:.4f}")
    
    # 📊 Return Complete Training Results
    return {
        'trained_model': language_model,
        'final_loss': final_training_loss,
        'loss_history': training_loss_history,
        'training_successful': True,
        'total_epochs': num_training_epochs,
        'model_configuration': {
            'vocabulary_size': vocabulary_size,
            'embedding_dimension': embedding_dimension,
            'sequence_max_length': sequence_max_length,
            'num_attention_heads': num_attention_heads,
            'num_transformer_layers': num_transformer_layers,
            'batch_size': batch_size,
            'learning_rate': learning_rate
        }
    }


def generate_text_autoregressive(trained_model, starting_tokens, max_new_tokens=10, sampling_temperature=1.0):
    """
    🎭 Autoregressive Text Generation: Creating New Text Word by Word
    
    This function demonstrates how language models generate text by predicting one word 
    at a time and feeding each prediction back as input for the next prediction. This 
    autoregressive process allows models to generate coherent text of arbitrary length.
    
    🔄 Generation Process:
    1. Start with initial tokens (prompt)
    2. Model predicts probability distribution over next words
    3. Sample a word from this distribution  
    4. Append sampled word to sequence
    5. Repeat steps 2-4 for desired length
    
    The sampling temperature controls randomness: lower values make the model more 
    deterministic (always pick most likely word), higher values add creativity.
    
    Reference: https://huggingface.co/blog/how-to-generate
    
    Args:
        trained_model: The trained transformer model
        starting_tokens: Initial sequence to continue [1, seq_len]
        max_new_tokens: Number of new words to generate
        sampling_temperature: Controls randomness (1.0 = normal, <1.0 = focused, >1.0 = creative)
    
    Returns:
        Tensor: Extended sequence with generated tokens
    """
    generated_sequence = starting_tokens.clone()
    
    print(f"🎭 Generating {max_new_tokens} new tokens...")
    print(f"   🌡️ Temperature: {sampling_temperature}")
    
    for step in range(max_new_tokens):
        # 🧠 Get model predictions for current sequence (no gradient computation needed)
        with Tensor.no_grad():  # Disable gradients for efficiency during inference
            next_word_logits = trained_model(generated_sequence)  # [1, seq_len, vocab_size]
            
            # 🎯 Extract logits for the last position (what comes next?)
            final_position_logits = next_word_logits[0, -1, :] / sampling_temperature  # [vocab_size]
            
            # 📊 Convert logits to probabilities and sample next word
            word_probabilities = final_position_logits.softmax(axis=-1)
            next_token = word_probabilities.multinomial(1)  # Sample one token
            
            # 🔄 Append generated token to sequence for next iteration
            generated_sequence = generated_sequence.cat(
                next_token.unsqueeze(0).unsqueeze(0), dim=1
            )
    
    return generated_sequence


def main():
    """🚀 Main training and demonstration function"""
    # 🚀 Run the Complete Training and Generation Demo
    print("=" * 80)
    print("🧠 TRANSFORMER LANGUAGE MODEL TRAINING WITH TINYGRAD")
    print("=" * 80)
    print("This demo shows how transformers learn to predict the next word in sequences,")
    print("the fundamental task that enables language understanding and generation.\n")
    
    # 🎓 Train the Language Model
    training_results = train_next_word_predictor()
    
    # 📊 Display Training Summary
    print("\n" + "=" * 80)
    print("📊 TRAINING SUMMARY")
    print("=" * 80)
    print(f"✅ Training successful: {training_results['training_successful']}")
    print(f"📉 Final loss: {training_results['final_loss']:.4f}")
    print(f"📈 Total epochs: {training_results['total_epochs']}")
    print(f"🏗️ Model configuration: {training_results['model_configuration']}")
    
    # 🎭 Demonstrate Text Generation
    print("\n" + "=" * 80)
    print("🎭 AUTOREGRESSIVE TEXT GENERATION DEMO")
    print("=" * 80)
    print("Showing how the model generates new text by predicting one word at a time...")
    
    trained_model = training_results['trained_model']
    vocab_size = training_results['model_configuration']['vocabulary_size']
    
    # 🎲 Create random starting sequence (in practice, this would be real text tokens)
    initial_tokens = Tensor(np.random.randint(0, vocab_size, (1, 5)))
    print(f"🎲 Starting tokens: {initial_tokens.numpy().tolist()}")
    
    # 🎭 Generate continuation
    extended_sequence = generate_text_autoregressive(
        trained_model, initial_tokens, max_new_tokens=8, sampling_temperature=1.0
    )
    print(f"🎯 Generated sequence: {extended_sequence.numpy().tolist()}")
    
    print("\n" + "=" * 80)
    print("💡 UNDERSTANDING WHAT HAPPENED")
    print("=" * 80)
    print("🧠 The model learned statistical patterns from the training data and used")
    print("   those patterns to generate new sequences token by token.")
    print("📝 In real applications, you would:")
    print("   • Use billions of real text examples instead of random data")
    print("   • Train for thousands of epochs on massive datasets")
    print("   • Implement proper tokenization (BPE, WordPiece, etc.)")
    print("   • Use validation data to prevent overfitting") 
    print("   • Scale to billions of parameters for better performance")
    print("\n📚 Learn more:")
    print("   • Illustrated Transformer: https://jalammar.github.io/illustrated-transformer/")
    print("   • Hugging Face Course: https://huggingface.co/learn")
    print("   • Original Paper: https://arxiv.org/abs/1706.03762")
    print("   • LLM Training Example: https://github.com/vtempest/ai-research-agent/blob/master/packages/neural-net/src/train/predict-next-word.js")
    print("   • Building Transformers Guide: https://www.datacamp.com/tutorial/building-a-transformer-with-py-torch")
    print("   • OpenAI Cookbook: https://cookbook.openai.com")
    print("   • PyTorch Learning: https://www.learnpytorch.io/pytorch_cheatsheet/")


if __name__ == "__main__":
    # Run the main training demo first
    main()


def advanced_training_features():
    """
    🚀 Advanced Training Features for Production Language Models
    
    This section demonstrates additional techniques used in real-world language model training
    that go beyond the basic demo. These features are crucial for training large, capable models.
    """
    print("\n" + "=" * 80)
    print("🚀 ADVANCED TRAINING FEATURES")
    print("=" * 80)
    print("Real production language models use many additional techniques:")
    
    print("\n🎯 1. GRADIENT ACCUMULATION")
    print("   • Simulate larger batch sizes when GPU memory is limited")
    print("   • Accumulate gradients over multiple forward passes before updating")
    print("   • Essential for training large models on consumer hardware")
    
    print("\n📊 2. LEARNING RATE SCHEDULING")
    print("   • Cosine annealing: gradually reduce learning rate")
    print("   • Warmup: start with small learning rate, increase to target")
    print("   • Critical for stable training of large models")
    
    print("\n💾 3. GRADIENT CHECKPOINTING")
    print("   • Trade computation for memory by recomputing activations")
    print("   • Allows training much larger models on limited hardware")
    print("   • Essential for billion+ parameter models")
    
    print("\n🎲 4. ADVANCED TOKENIZATION")
    print("   • Byte-Pair Encoding (BPE): handles unknown words efficiently")
    print("   • SentencePiece: language-agnostic tokenization")
    print("   • Proper handling of special tokens, padding, truncation")
    
    print("\n📈 5. VALIDATION AND EARLY STOPPING")
    print("   • Monitor performance on held-out validation data")
    print("   • Stop training when validation loss stops improving")
    print("   • Prevents overfitting to training data")
    
    print("\n🔄 6. MIXED PRECISION TRAINING")
    print("   • Use 16-bit floats for forward pass, 32-bit for gradients")
    print("   • Reduces memory usage and speeds up training")
    print("   • Maintains numerical stability")


def explain_attention_mechanism():
    """
    🧠 Deep Dive: How Self-Attention Actually Works
    
    Provides an intuitive explanation of the attention mechanism with concrete examples.
    """
    print("\n" + "=" * 80)
    print("🧠 DEEP DIVE: SELF-ATTENTION MECHANISM")
    print("=" * 80)
    
    print("Let's trace through exactly how attention works with a concrete example:")
    print("Sentence: 'The cat sat on the mat'")
    
    print("\n🔍 STEP 1: CREATE QUERY, KEY, VALUE REPRESENTATIONS")
    print("Each word creates three vectors:")
    print("   • Query (Q): 'What am I looking for?'")
    print("   • Key (K): 'What do I represent?'") 
    print("   • Value (V): 'What information do I contain?'")
    
    print("\n🎯 STEP 2: CALCULATE ATTENTION SCORES")
    print("For the word 'cat':")
    print("   • Its Query asks: 'What action am I doing?'")
    print("   • It compares with all Keys in the sentence")
    print("   • 'sat' Key responds: 'I represent an action!'")
    print("   • High similarity score between 'cat' Query and 'sat' Key")
    
    print("\n📊 STEP 3: APPLY SOFTMAX TO GET ATTENTION WEIGHTS")
    print("Raw scores: cat→cat(0.1), cat→sat(0.9), cat→on(0.2), ...")
    print("After softmax: cat→cat(0.05), cat→sat(0.7), cat→on(0.1), ...")
    print("(Numbers sum to 1.0, representing probability distribution)")
    
    print("\n🎭 STEP 4: WEIGHTED COMBINATION OF VALUES")
    print("'cat' gets new representation:")
    print("   new_cat = 0.05×cat_value + 0.7×sat_value + 0.1×on_value + ...")
    print("   Result: 'cat' now understands it's the entity performing 'sitting'")
    
    print("\n🔄 STEP 5: REPEAT FOR ALL WORDS IN PARALLEL")
    print("Every word simultaneously attends to every other word")
    print("Creates rich contextual representations for the entire sentence")
    
    print("\n🎯 WHY MULTIPLE HEADS?")
    print("Different attention heads can focus on different relationships:")
    print("   • Head 1: Subject-Verb relationships (cat → sat)")
    print("   • Head 2: Object-Preposition relationships (mat → on)")
    print("   • Head 3: Modifier-Noun relationships (the → cat)")
    print("   • Head 4: Long-distance dependencies")


def explain_training_dynamics():
    """
    📈 Understanding Training Dynamics and Loss Curves
    
    Explains what happens during training and how to interpret the results.
    """
    print("\n" + "=" * 80)
    print("📈 UNDERSTANDING TRAINING DYNAMICS")
    print("=" * 80)
    
    print("🎯 WHAT THE MODEL LEARNS DURING TRAINING:")
    print("   • Early epochs: Basic token patterns and frequencies")
    print("   • Middle epochs: Grammar rules and sentence structure")
    print("   • Later epochs: Semantic relationships and world knowledge")
    print("   • Advanced training: Reasoning and complex dependencies")
    
    print("\n📉 INTERPRETING LOSS CURVES:")
    print("   • High initial loss (~log(vocab_size)): Random predictions")
    print("   • Rapid decrease: Learning basic patterns")
    print("   • Gradual decrease: Refining complex relationships")
    print("   • Plateau: Model has learned available patterns")
    
    print("\n🚨 COMMON TRAINING ISSUES:")
    print("   • Loss not decreasing: Learning rate too high/low")
    print("   • Loss exploding: Gradient explosion, need clipping")
    print("   • Overfitting: Training loss << Validation loss")
    print("   • Underfitting: Both losses plateau at high values")
    
    print("\n🔧 DEBUGGING STRATEGIES:")
    print("   • Start with tiny model and synthetic data")
    print("   • Monitor gradient norms and activation statistics")
    print("   • Use learning rate finders and schedulers")
    print("   • Implement proper validation and early stopping")


def scaling_to_production():
    """
    🏭 Scaling to Production-Level Language Models
    
    Discusses the engineering challenges of training large language models.
    """
    print("\n" + "=" * 80)
    print("🏭 SCALING TO PRODUCTION LANGUAGE MODELS")
    print("=" * 80)
    
    print("🏗️ MODEL SCALING LAWS:")
    print("   • GPT-3: 175 billion parameters, 300 billion tokens")
    print("   • Training cost: Millions of dollars in compute")
    print("   • Memory requirements: Hundreds of GPUs/TPUs")
    print("   • Training time: Weeks to months")
    
    print("\n⚡ DISTRIBUTED TRAINING TECHNIQUES:")
    print("   • Data Parallelism: Split batches across GPUs")
    print("   • Model Parallelism: Split model layers across GPUs")
    print("   • Pipeline Parallelism: Pipeline model stages")
    print("   • Tensor Parallelism: Split individual operations")
    
    print("\n💾 MEMORY OPTIMIZATION:")
    print("   • Gradient checkpointing: Recompute vs store activations")
    print("   • Parameter offloading: Move parameters to CPU/disk")
    print("   • Mixed precision: Use FP16 where possible")
    print("   • ZeRO optimizer: Distribute optimizer states")
    
    print("\n📊 DATA ENGINEERING:")
    print("   • Dataset size: Trillions of tokens from web crawls")
    print("   • Data cleaning: Remove duplicates, filter quality")
    print("   • Tokenization: Efficient encoding schemes (BPE)")
    print("   • Data loading: Efficient streaming from distributed storage")
    
    print("\n🔄 INFRASTRUCTURE REQUIREMENTS:")
    print("   • Fault tolerance: Handle hardware failures gracefully")
    print("   • Monitoring: Track metrics across distributed systems")
    print("   • Checkpointing: Save model state for recovery")
    print("   • Networking: High-bandwidth interconnects")


if __name__ == "__main__":
    # Run the main training demo first
    main()
    
    # Then show additional educational content
    explain_attention_mechanism()
    explain_training_dynamics() 
    advanced_training_features()
    scaling_to_production()
    
    print("\n" + "=" * 80)
    print("🎓 CONGRATULATIONS!")
    print("=" * 80)
    print("You've now seen a complete transformer implementation from scratch!")
    print("This covers the core concepts used in GPT, BERT, T5, and other models.")
    print("\n🚀 Next steps for your learning journey:")
    print("   1. Implement attention visualization tools")
    print("   2. Try training on real text datasets")
    print("   3. Experiment with different architectures")
    print("   4. Study recent papers on transformer improvements")
    print("   5. Build applications using pre-trained models")
    print("\n💡 Remember: Every major language model uses these same core concepts!")
    print("The main differences are scale, training data, and fine-tuning strategies.")