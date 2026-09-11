# CLAUDE.md — `language-model-training`

**Read [`skills/ask-language-model-training`](../../skills/ask-language-model-training/SKILL.md)
first.**

**The only Python in this repo** — a GPT trained on Tinygrad, with its own
toolchain: `pyproject.toml`, `requirements.txt`, `pytest.ini`, `docker/`,
`scripts/`, and a Fargate deployment example.

## It is outside every JavaScript convention here

- No `package.json`. `bun install`, `bun run test` and turbo never touch it.
  **Nothing in the root CI covers it.**
- Tests are **pytest**, not Vitest. Dependencies are pip/`requirements.txt`, not
  bun.
- Don't apply the repo's TypeScript conventions to it; follow Python ones
  (PEP 8, type hints, the existing module layout).

## Rules

- **Training runs cost real money** (`fargate.example.env` is a hint about
  where). Never commit a change that raises default epochs, model size or
  instance type without saying so explicitly.
- Never commit checkpoints, datasets or credentials — they are large and often
  licensed.
- Verify with `pytest` from inside this directory, and say in the PR that this
  is the only check that covers it.
