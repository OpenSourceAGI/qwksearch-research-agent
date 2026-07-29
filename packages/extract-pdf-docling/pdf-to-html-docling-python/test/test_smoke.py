"""Smoke test that the main Granite Docling converter module imports cleanly.

Note: the source module lives at ``src/pdf-granite-docling.py``. The hyphen in
the filename makes it non-importable via a normal ``import`` statement, so it
is loaded here via ``importlib`` from its file path instead.
"""

import importlib.util
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parent.parent / "src" / "pdf-granite-docling.py"


def test_main_module_imports_without_raising():
    """The main module should import and expose its converter API."""
    spec = importlib.util.spec_from_file_location("pdf_granite_docling", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert hasattr(module, "GraniteDoclingConverter")
    assert hasattr(module, "main")
