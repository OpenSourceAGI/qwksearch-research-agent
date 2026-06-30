"""
Wikipedia dump downloading and decompression.

Uses aria2c for multi-connection segmented downloads, which is dramatically
faster than a single-stream wget/curl for the ~20GB English Wikipedia dump.
aria2c also resumes interrupted downloads automatically with -c.

Install aria2c:
    macOS:   brew install aria2
    Ubuntu:  sudo apt install aria2
    Windows: choco install aria2 (or run inside the provided Docker container)
"""

import os
import shutil
import subprocess

from .config import WikipediaConfig


class WikipediaDownloader:
    """Downloads and decompresses a Wikipedia XML dump via aria2c."""

    def __init__(self, config: WikipediaConfig):
        self.config = config

    def check_aria2c(self) -> bool:
        """Check that aria2c is installed and on PATH."""
        if shutil.which("aria2c"):
            return True
        print("aria2c not found. Install with:")
        print("   macOS:   brew install aria2")
        print("   Ubuntu:  sudo apt install aria2")
        print("   Windows: choco install aria2 (or use the provided Docker image)")
        return False

    def download_dump(self) -> bool:
        """
        Download the compressed Wikipedia dump with aria2c if not already present.

        Returns:
            bool: True if the compressed (or decompressed) dump is available on disk.
        """
        if os.path.exists(self.config.wikipedia_dump_path):
            print(f"Wikipedia dump already exists: {self.config.wikipedia_dump_path}")
            return True

        if os.path.exists(self.config.wikipedia_bz2_path):
            print(f"Found compressed dump: {self.config.wikipedia_bz2_path}")
            return True

        if not self.check_aria2c():
            return False

        print("Downloading Wikipedia dump via aria2c...")
        print("This is a large file (~20GB compressed) and will take a while.")
        print(f"URL: {self.config.wikipedia_dump_url}")

        out_dir = os.path.dirname(os.path.abspath(self.config.wikipedia_bz2_path)) or "."
        out_name = os.path.basename(self.config.wikipedia_bz2_path)

        cmd = [
            "aria2c",
            "-x", str(self.config.aria2c_connections_per_server),  # max connections per server
            "-s", str(self.config.aria2c_split),  # number of segments to split into
            "-k", self.config.aria2c_min_split_size,  # minimum split size per segment
            "-c",  # continue/resume partial downloads
            "--auto-file-renaming=false",
            "--summary-interval=15",
            "-d", out_dir,
            "-o", out_name,
            self.config.wikipedia_dump_url,
        ]

        try:
            subprocess.run(cmd, check=True)
            print("Download completed via aria2c.")
            return True
        except subprocess.CalledProcessError as exc:
            print(f"aria2c download failed: {exc}")
            print(f"You can also download manually:\n   aria2c -x16 -s16 {self.config.wikipedia_dump_url}")
            return False

    def decompress_dump(self) -> bool:
        """
        Decompress the downloaded bz2 dump into the raw XML file.

        Prefers lbzip2 (multi-threaded) over bzip2 when available.

        Returns:
            bool: True if the XML dump is available on disk after this call.
        """
        if os.path.exists(self.config.wikipedia_dump_path):
            return True

        print("Decompressing Wikipedia dump...")
        print("This can take 10-60 minutes depending on CPU and chosen tool.")

        if shutil.which("lbzip2"):
            print("Using lbzip2 for fast multi-threaded decompression...")
            cmd = ["lbzip2", "-d", "-k", self.config.wikipedia_bz2_path]
        elif shutil.which("bzip2"):
            print("Using standard bzip2 decompression (consider installing lbzip2 for speed)...")
            cmd = ["bzip2", "-d", "-k", self.config.wikipedia_bz2_path]
        else:
            print("Neither lbzip2 nor bzip2 found on PATH. Install one of them to decompress.")
            return False

        try:
            subprocess.run(cmd, check=True)
            print("Decompression completed.")
            return True
        except subprocess.CalledProcessError as exc:
            print(f"Decompression failed: {exc}")
            return False

    def ensure_dump_ready(self) -> bool:
        """Download (if needed) and decompress the Wikipedia dump in one call."""
        if not self.download_dump():
            return False
        return self.decompress_dump()
