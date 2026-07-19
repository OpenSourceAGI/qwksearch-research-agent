"""End-to-end Wikipedia training orchestration."""

from .pipeline import educational_resources, main, main_with_dumpster_dive

__all__ = ["educational_resources", "main", "main_with_dumpster_dive"]
