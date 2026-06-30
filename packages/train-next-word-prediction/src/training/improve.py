"""
Refine the local (small, undertrained) model's draft answers by calling out to
a professional-grade hosted model: OpenRouter, OpenAI, Anthropic, or Google
Gemini. The user supplies their own API key per request - nothing here ever
reads a key from disk or an environment variable, and keys are never logged
or persisted (see src/server.py's /api/improve handler).

OpenRouter is included as the "etc others" catch-all: it proxies most hosted
models (GPT, Claude, Gemini, Llama, Mistral, ...) behind one OpenAI-compatible
endpoint, so picking it lets a single API key reach almost any provider.
"""

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional

REQUEST_TIMEOUT_SECONDS = 30


class ImproveError(Exception):
    """Raised when a provider call fails (bad key, network error, bad response shape)."""


@dataclass(frozen=True)
class ProviderSpec:
    label: str
    default_model: str


# Defaults are deliberately conservative/cheap placeholders - pass `model`
# explicitly to use whatever is current for your account.
PROVIDERS = {
    "openrouter": ProviderSpec("OpenRouter", "openai/gpt-4o-mini"),
    "openai": ProviderSpec("OpenAI", "gpt-4o-mini"),
    "anthropic": ProviderSpec("Anthropic (Claude)", "claude-3-5-sonnet-latest"),
    "gemini": ProviderSpec("Google Gemini", "gemini-1.5-flash"),
}


def _refine_prompt(question: str, draft_answer: str) -> str:
    return (
        "You are improving the output of a small, undertrained local language model "
        "that is still learning from a Wikipedia training corpus.\n\n"
        f"Question: {question}\n"
        f"Local model's draft answer: {draft_answer}\n\n"
        "Write a corrected, higher-quality answer to the question. Be accurate and concise."
    )


def _post_json(url: str, headers: dict, body: dict) -> dict:
    data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ImproveError(f"HTTP {exc.code} from provider: {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise ImproveError(f"network error reaching provider: {exc.reason}") from exc


def _call_openai_compatible(base_url: str, api_key: str, model: str, prompt: str) -> str:
    body = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    result = _post_json(f"{base_url}/chat/completions", headers, body)
    try:
        return result["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ImproveError(f"unexpected response shape: {result}") from exc


def _call_anthropic(api_key: str, model: str, prompt: str) -> str:
    body = {"model": model, "max_tokens": 1024, "messages": [{"role": "user", "content": prompt}]}
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    result = _post_json("https://api.anthropic.com/v1/messages", headers, body)
    try:
        return result["content"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ImproveError(f"unexpected response shape: {result}") from exc


def _call_gemini(api_key: str, model: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}
    result = _post_json(url, headers, body)
    try:
        return result["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ImproveError(f"unexpected response shape: {result}") from exc


# Sample (question, draft_answer) pairs for the webui's "before/after" demo.
# The draft answers stand in for what a freshly-initialized, barely-trained
# local model actually produces (short, vague, sometimes wrong) - train the
# model for real and swap in src/training/wikipedia/generation.py output once
# checkpoint loading is wired up. Until then these let you try the refine
# workflow end-to-end without waiting hours for a training run.
SAMPLE_QA = [
    {
        "id": "transformer-attention",
        "question": "What is self-attention in a transformer model?",
        "draft_answer": "Self-attention is part thing where word look at other word and the model decide what is important maybe.",
    },
    {
        "id": "bpe-tokenizer",
        "question": "How does byte-pair encoding (BPE) tokenization work?",
        "draft_answer": "BPE make small piece of word into token by merge common letter pair, it is used for vocabulary.",
    },
    {
        "id": "wikipedia-corpus",
        "question": "Why is Wikipedia a good training corpus for a language model?",
        "draft_answer": "Wikipedia have many article about many topic so model can learn word from it, it is free encyclopedia.",
    },
    {
        "id": "gradient-clipping",
        "question": "What does gradient clipping do during training?",
        "draft_answer": "Gradient clipping stop gradient from being too big number so training do not break.",
    },
    {
        "id": "top-k-sampling",
        "question": "What is the difference between top-k and nucleus (top-p) sampling?",
        "draft_answer": "Top-k pick k word, top-p pick word until probability add up, both are way to make text generate.",
    },
]


def call_professional_model(provider: str, api_key: str, question: str, draft_answer: str,
                             model: Optional[str] = None) -> str:
    """Send the local model's draft to a hosted provider and return the refined answer."""
    if provider not in PROVIDERS:
        raise ImproveError(f"unknown provider '{provider}'. Choose one of: {', '.join(PROVIDERS)}")
    if not api_key:
        raise ImproveError("api_key is required")

    resolved_model = model or PROVIDERS[provider].default_model
    prompt = _refine_prompt(question, draft_answer)

    if provider == "openrouter":
        return _call_openai_compatible("https://openrouter.ai/api/v1", api_key, resolved_model, prompt)
    if provider == "openai":
        return _call_openai_compatible("https://api.openai.com/v1", api_key, resolved_model, prompt)
    if provider == "anthropic":
        return _call_anthropic(api_key, resolved_model, prompt)
    if provider == "gemini":
        return _call_gemini(api_key, resolved_model, prompt)

    raise ImproveError(f"unhandled provider '{provider}'")
