"""
Advanced autoregressive text generation strategies: top-k and nucleus (top-p)
sampling with temperature control.

Reference: https://huggingface.co/blog/how-to-generate
"""

from tinygrad.tensor import Tensor

from ..core.config import WikipediaConfig
from ..architecture.model import GPTStyleTransformer
from ..data.tokenizer import WikipediaTokenizer


def generate_with_top_k(model: GPTStyleTransformer, tokenizer: WikipediaTokenizer, config: WikipediaConfig,
                         prompt: str, max_length: int = 100, temperature: float = 0.8, top_k: int = 50) -> str:
    """Only sample from the k most likely next tokens at each step."""
    prompt_ids = tokenizer.tokenize(prompt)
    current_ids = Tensor([prompt_ids])
    generated_tokens = []

    for _ in range(max_length):
        if current_ids.shape[1] >= config.sequence_max_length:
            break

        with Tensor.no_grad():
            logits = model(current_ids)
            next_token_logits = logits[0, -1, :] / temperature

            if top_k > 0:
                top_k_logits, top_k_indices = next_token_logits.topk(min(top_k, next_token_logits.shape[0]))
                filtered_logits = Tensor([-float("inf")] * next_token_logits.shape[0])
                for i, idx in enumerate(top_k_indices.numpy()):
                    filtered_logits[idx] = top_k_logits[i]
                next_token_logits = filtered_logits

            probs = next_token_logits.softmax(axis=-1)
            next_token = probs.multinomial(1)

            current_ids = current_ids.cat(next_token.unsqueeze(0).unsqueeze(0), dim=1)
            generated_tokens.append(next_token.item())

            if next_token.item() == tokenizer.token_to_id.get("<EOS>", -1):
                break

    return tokenizer.detokenize(prompt_ids + generated_tokens)


def generate_with_nucleus(model: GPTStyleTransformer, tokenizer: WikipediaTokenizer, config: WikipediaConfig,
                           prompt: str, max_length: int = 100, temperature: float = 0.8, top_p: float = 0.9) -> str:
    """Sample from the smallest set of tokens whose cumulative probability exceeds top_p."""
    prompt_ids = tokenizer.tokenize(prompt)
    current_ids = Tensor([prompt_ids])
    generated_tokens = []

    for _ in range(max_length):
        if current_ids.shape[1] >= config.sequence_max_length:
            break

        with Tensor.no_grad():
            logits = model(current_ids)
            next_token_logits = logits[0, -1, :] / temperature

            if top_p < 1.0:
                sorted_logits, sorted_indices = next_token_logits.sort(descending=True)
                cumulative_probs = sorted_logits.softmax(axis=-1).cumsum(axis=-1)

                cutoff_idx = (cumulative_probs <= top_p).sum().item()
                cutoff_idx = max(1, cutoff_idx)

                filtered_logits = Tensor([-float("inf")] * next_token_logits.shape[0])
                for i in range(cutoff_idx):
                    original_idx = sorted_indices[i].item()
                    filtered_logits[original_idx] = next_token_logits[original_idx]
                next_token_logits = filtered_logits

            probs = next_token_logits.softmax(axis=-1)
            next_token = probs.multinomial(1)

            current_ids = current_ids.cat(next_token.unsqueeze(0).unsqueeze(0), dim=1)
            generated_tokens.append(next_token.item())

            if next_token.item() == tokenizer.token_to_id.get("<EOS>", -1):
                break

    return tokenizer.detokenize(prompt_ids + generated_tokens)


def demo_advanced_generation(model: GPTStyleTransformer, tokenizer: WikipediaTokenizer, config: WikipediaConfig) -> None:
    """Print a comparison of temperature, top-k, and nucleus sampling across sample prompts."""
    print("\n" + "=" * 80)
    print("ADVANCED TEXT GENERATION TECHNIQUES")
    print("=" * 80)

    test_prompts = [
        "The future of artificial intelligence",
        "Climate change is a global challenge",
        "The history of computing began",
    ]

    for prompt in test_prompts:
        print(f"\nPrompt: '{prompt}'")
        print("-" * 60)

        try:
            print("Temperature variations:")
            for temp in [0.5, 0.8, 1.2]:
                result = generate_with_top_k(model, tokenizer, config, prompt, max_length=30, temperature=temp, top_k=50)
                print(f"  T={temp}: {result}")

            print("\nTop-k variations:")
            for k in [10, 50, 100]:
                result = generate_with_top_k(model, tokenizer, config, prompt, max_length=30, temperature=0.8, top_k=k)
                print(f"  k={k}: {result}")

            print("\nNucleus (top-p) variations:")
            for p in [0.7, 0.9, 0.95]:
                result = generate_with_nucleus(model, tokenizer, config, prompt, max_length=30, temperature=0.8, top_p=p)
                print(f"  p={p}: {result}")

        except Exception as exc:
            print(f"Generation failed: {exc}")
