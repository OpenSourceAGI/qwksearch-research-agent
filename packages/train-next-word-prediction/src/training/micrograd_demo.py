"""
=======================================================================================
Foundations: A Scalar Autograd Engine (ported from karpathy/micrograd)
=======================================================================================

Everything else in this package (tinygrad transformers, BPE tokenizers, attention)
is built on one idea: a computation graph of tensors that knows how to backpropagate
gradients through itself. That idea is easiest to see at the smallest possible scale -
plain Python floats - before it's wrapped in tensors, batching, and CUDA kernels.

This file is a self-contained port of Andrej Karpathy's micrograd, the ~150-line
autograd engine he built to teach exactly this:
https://github.com/karpathy/micrograd/tree/master

`Value` wraps a single number and remembers which operation produced it. Calling
`.backward()` walks that history in reverse (reverse-mode autodiff / backprop) and
accumulates `.grad` on every Value that contributed to the result - the same
algorithm that trains GPT-style transformers, just without tensors or a GPU.

To make the connection to the rest of this package concrete, `train_tiny_language_model()`
below uses this engine (no tinygrad, no numpy) to train a miniature next-word predictor:
each word gets a learned embedding (a handful of Value scalars), a small MLP maps the
embeddings of the previous two words to logits over the vocabulary, and softmax +
cross-entropy + SGD are all implemented from scratch with `Value` operations.

Reference implementation: https://github.com/karpathy/micrograd/tree/master
"""

import math
import random


class Value:
    """
    A scalar value in the computation graph, plus the gradient of the final
    output with respect to it. Ported from micrograd's engine.py:
    https://github.com/karpathy/micrograd/blob/master/micrograd/engine.py
    """

    def __init__(self, data, _children=(), _op=""):
        self.data = data
        self.grad = 0.0
        # internal bookkeeping used to build the computation graph
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")

        def _backward():
            self.grad += out.grad
            other.grad += out.grad

        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")

        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad

        out._backward = _backward
        return out

    def __pow__(self, other):
        assert isinstance(other, (int, float)), "only supporting int/float powers for now"
        out = Value(self.data ** other, (self,), f"**{other}")

        def _backward():
            self.grad += (other * self.data ** (other - 1)) * out.grad

        out._backward = _backward
        return out

    def exp(self):
        out = Value(math.exp(self.data), (self,), "exp")

        def _backward():
            self.grad += out.data * out.grad

        out._backward = _backward
        return out

    def log(self):
        out = Value(math.log(self.data + 1e-12), (self,), "log")

        def _backward():
            self.grad += (1.0 / (self.data + 1e-12)) * out.grad

        out._backward = _backward
        return out

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * out.grad

        out._backward = _backward
        return out

    def relu(self):
        out = Value(0 if self.data < 0 else self.data, (self,), "ReLU")

        def _backward():
            self.grad += (out.data > 0) * out.grad

        out._backward = _backward
        return out

    def backward(self):
        # topological order all of the children in the graph, then apply
        # the chain rule one node at a time, from output back to inputs
        topo = []
        visited = set()

        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)

        build_topo(self)

        self.grad = 1.0
        for v in reversed(topo):
            v._backward()

    def __neg__(self):
        return self * -1

    def __radd__(self, other):
        return self + other

    def __sub__(self, other):
        return self + (-other)

    def __rsub__(self, other):
        return other + (-self)

    def __rmul__(self, other):
        return self * other

    def __truediv__(self, other):
        return self * other ** -1

    def __rtruediv__(self, other):
        return other * self ** -1

    def __repr__(self):
        return f"Value(data={self.data:.4f}, grad={self.grad:.4f})"


class Module:
    """Base class matching micrograd's nn.py Module: tracks/zeroes parameter grads."""

    def zero_grad(self):
        for p in self.parameters():
            p.grad = 0.0

    def parameters(self):
        return []


class Neuron(Module):
    def __init__(self, n_inputs, nonlin=True):
        self.w = [Value(random.uniform(-1, 1)) for _ in range(n_inputs)]
        self.b = Value(0.0)
        self.nonlin = nonlin

    def __call__(self, x):
        act = sum((wi * xi for wi, xi in zip(self.w, x)), self.b)
        return act.tanh() if self.nonlin else act

    def parameters(self):
        return self.w + [self.b]


class Layer(Module):
    def __init__(self, n_inputs, n_outputs, **kwargs):
        self.neurons = [Neuron(n_inputs, **kwargs) for _ in range(n_outputs)]

    def __call__(self, x):
        out = [n(x) for n in self.neurons]
        return out[0] if len(out) == 1 else out

    def parameters(self):
        return [p for n in self.neurons for p in n.parameters()]


class MLP(Module):
    """A multi-layer perceptron: a stack of Layers, final layer linear (no tanh)."""

    def __init__(self, n_inputs, n_outputs_per_layer):
        sizes = [n_inputs] + n_outputs_per_layer
        self.layers = [
            Layer(sizes[i], sizes[i + 1], nonlin=(i != len(n_outputs_per_layer) - 1))
            for i in range(len(n_outputs_per_layer))
        ]

    def __call__(self, x):
        for layer in self.layers:
            x = layer(x)
        return x

    def parameters(self):
        return [p for layer in self.layers for p in layer.parameters()]


def softmax_cross_entropy(logits, target_index):
    """Numerically-naive softmax + cross-entropy loss, built entirely from Value ops."""
    max_logit = max(l.data for l in logits)
    shifted = [l - max_logit for l in logits]
    exps = [s.exp() for s in shifted]
    total = sum(exps[1:], exps[0])
    probs = [e / total for e in exps]
    return -probs[target_index].log(), probs


def train_tiny_language_model(epochs=200, lr=0.08, context_size=2, embedding_dim=4, seed=42):
    """
    Trains a tiny next-word predictor with nothing but the Value engine above.

    This mirrors what train_next_word_prediction.py and wikipedia_transformer.py do at
    much larger scale with tinygrad: look up embeddings for context words, feed them
    through an MLP to get logits over the vocabulary, minimize cross-entropy loss with
    gradient descent. Here every multiply/add/exp/log is a Value op, so .backward()
    literally walks through every arithmetic step of the forward pass.
    """
    random.seed(seed)

    corpus = [
        "the cat sat on the mat",
        "the dog sat on the rug",
        "the cat ran in the park",
        "the dog ran in the park",
        "a cat sat by the door",
        "a dog ran by the door",
    ]
    tokenized = [sentence.split() for sentence in corpus]
    vocab = sorted({word for sentence in tokenized for word in sentence})
    word_to_id = {word: i for i, word in enumerate(vocab)}

    # one learned embedding vector (a list of Value scalars) per vocabulary word
    embeddings = {
        word: [Value(random.uniform(-0.1, 0.1)) for _ in range(embedding_dim)]
        for word in vocab
    }

    examples = []
    for sentence in tokenized:
        for i in range(context_size, len(sentence)):
            context = sentence[i - context_size:i]
            target = sentence[i]
            examples.append((context, target))

    model = MLP(embedding_dim * context_size, [16, len(vocab)])
    parameters = model.parameters() + [v for vec in embeddings.values() for v in vec]

    print("=" * 80)
    print("MICROGRAD-STYLE TINY LANGUAGE MODEL")
    print(f"Reference engine: https://github.com/karpathy/micrograd/tree/master")
    print("=" * 80)
    print(f"Vocabulary ({len(vocab)} words): {vocab}")
    print(f"Training examples: {len(examples)}")
    print(f"Trainable scalars: {len(parameters)}")
    print()

    for epoch in range(epochs):
        total_loss = Value(0.0)
        for context, target in examples:
            context_vector = []
            for word in context:
                context_vector.extend(embeddings[word])
            logits = model(context_vector)
            loss, _ = softmax_cross_entropy(logits, word_to_id[target])
            total_loss = total_loss + loss

        mean_loss = total_loss * (1.0 / len(examples))

        for p in parameters:
            p.grad = 0.0
        mean_loss.backward()

        for p in parameters:
            p.data -= lr * p.grad

        if epoch % max(1, epochs // 10) == 0 or epoch == epochs - 1:
            print(f"  epoch {epoch:4d} | loss {mean_loss.data:.4f}")

    print()
    print("Sample predictions after training:")
    for context, target in examples[:5]:
        context_vector = []
        for word in context:
            context_vector.extend(embeddings[word])
        logits = model(context_vector)
        _, probs = softmax_cross_entropy(logits, word_to_id[target])
        predicted = vocab[max(range(len(vocab)), key=lambda i: probs[i].data)]
        print(f"  {' '.join(context):>20} -> predicted: {predicted:<8} (actual: {target})")

    print()
    print("This is the same backprop algorithm that trains the GPT-style transformer in")
    print("train_next_word_prediction.py and wikipedia_transformer.py - just at a scale")
    print("small enough to read every gradient by hand. See:")
    print("  https://github.com/karpathy/micrograd/tree/master")

    return model, embeddings, vocab


if __name__ == "__main__":
    train_tiny_language_model()
