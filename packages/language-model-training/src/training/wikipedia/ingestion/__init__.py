"""Wikipedia download and article extraction integrations."""

from .download import WikipediaDownloader
from .dumpster_dive import DumpsterDiveIntegration

__all__ = ["WikipediaDownloader", "DumpsterDiveIntegration"]
