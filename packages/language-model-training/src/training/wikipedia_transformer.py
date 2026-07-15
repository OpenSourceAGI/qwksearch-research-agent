"""
Entry point for Wikipedia-scale transformer training.

The implementation lives in the `wikipedia` package (config, download,
dumpster_dive, tokenizer, dataset, model, scheduler, trainer, generation,
analysis, pipeline) — see that package's README for details.

Run directly:
    python src/training/wikipedia_transformer.py

Or via Docker (handles aria2c download, MongoDB, dumpster-dive, and training):
    docker compose -f packages/train-next-word-prediction/docker/compose.yml \\
        --profile wikipedia up wikipedia
"""

from wikipedia.pipeline import educational_resources, main_with_dumpster_dive

if __name__ == "__main__":
    main_with_dumpster_dive()
    educational_resources()
