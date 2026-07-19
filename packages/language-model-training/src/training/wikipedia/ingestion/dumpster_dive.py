"""
dumpster-dive integration for efficient Wikipedia XML processing.

dumpster-dive (https://github.com/notconfusing/dumpster-dive) parses a
decompressed Wikipedia XML dump and loads structured articles into MongoDB,
which is far faster and more reliable than hand-rolled XML streaming. This
module wraps the `dumpster` CLI and exposes a query/extraction API over the
resulting MongoDB collection.

Installation:
    npm install -g dumpster-dive

Usage:
    dumpster ./enwiki-latest-pages-articles.xml --db=enwiki
"""

import re
import subprocess
from typing import Dict, List, Optional

from ..core.config import WikipediaConfig

try:
    import pymongo
    PYMONGO_AVAILABLE = True
except ImportError:
    PYMONGO_AVAILABLE = False


class DumpsterDiveIntegration:
    """Runs dumpster-dive and queries the resulting MongoDB article store."""

    def __init__(self, config: WikipediaConfig):
        self.config = config
        self.mongo_client = None
        self.db = None
        self.collection = None

    def check_dependencies(self) -> bool:
        """Verify Node.js, dumpster-dive, MongoDB, and pymongo are all available."""
        print("Checking dependencies...")

        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode != 0:
                print("Node.js not found. Install from https://nodejs.org/")
                return False
            print(f"Node.js: {result.stdout.strip()}")
        except FileNotFoundError:
            print("Node.js not found. Install from https://nodejs.org/")
            return False

        try:
            result = subprocess.run(["dumpster", "--version"], capture_output=True, text=True)
            if result.returncode != 0:
                print("dumpster-dive not found. Install with: npm install -g dumpster-dive")
                return False
            print("dumpster-dive: available")
        except FileNotFoundError:
            print("dumpster-dive not found. Install with: npm install -g dumpster-dive")
            return False

        try:
            result = subprocess.run(["mongod", "--version"], capture_output=True, text=True)
            if result.returncode != 0:
                print("MongoDB not found. Install from https://www.mongodb.com/")
                return False
            print("MongoDB: available")
        except FileNotFoundError:
            print("MongoDB not found. Install from https://www.mongodb.com/")
            return False

        if not PYMONGO_AVAILABLE:
            print("PyMongo not found. Install with: pip install pymongo")
            return False
        print("PyMongo: available")

        return True

    def setup_mongodb(self) -> bool:
        """Connect to MongoDB and select the configured database/collection."""
        try:
            print("Connecting to MongoDB...")
            self.mongo_client = pymongo.MongoClient(
                host=self.config.mongo_host,
                port=self.config.mongo_port,
                serverSelectionTimeoutMS=5000,
            )
            self.mongo_client.server_info()  # Force connection test
            print(f"Connected to MongoDB at {self.config.mongo_host}:{self.config.mongo_port}")

            self.db = self.mongo_client[self.config.mongo_db_name]
            self.collection = self.db[self.config.mongo_collection]
            return True

        except pymongo.errors.ServerSelectionTimeoutError:
            print("Cannot connect to MongoDB. Make sure MongoDB is running:")
            print("   mongod --config /path/to/mongod.conf")
            return False
        except Exception as exc:
            print(f"MongoDB setup failed: {exc}")
            return False

    def run_dumpster_dive(self) -> bool:
        """Run the `dumpster` CLI to parse the XML dump into MongoDB."""
        import os

        if not os.path.exists(self.config.wikipedia_dump_path):
            print(f"Wikipedia dump not found: {self.config.wikipedia_dump_path}")
            return False

        if self.collection is not None and self.collection.count_documents({}) > 0:
            count = self.collection.count_documents({})
            print(f"Wikipedia data already in MongoDB: {count:,} articles")
            return True

        print("Running dumpster-dive to process Wikipedia dump...")
        print("This will take several hours for the full English Wikipedia.")
        print("Monitor progress in another terminal with:")
        print(f"   mongo {self.config.mongo_db_name} --eval 'db.{self.config.mongo_collection}.count()'")

        cmd = [
            "dumpster",
            self.config.wikipedia_dump_path,
            "--db", self.config.mongo_db_name,
            "--citations=false",
            "--images=false",
            "--verbose",
        ]
        print(f"Command: {' '.join(cmd)}")

        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            for line in process.stdout:
                print(line.rstrip())
            process.wait()

            if process.returncode == 0:
                print("dumpster-dive completed successfully.")
                return True
            print(f"dumpster-dive failed with exit code {process.returncode}")
            return False

        except Exception as exc:
            print(f"Error running dumpster-dive: {exc}")
            return False

    def get_article_count(self) -> int:
        if self.collection is None:
            return 0
        return self.collection.count_documents({})

    def extract_articles(self, limit: Optional[int] = None) -> List[str]:
        """Extract clean, length-filtered article text from MongoDB."""
        if self.collection is None:
            print("MongoDB collection not available")
            return []

        print("Extracting articles from MongoDB...")

        query = {
            "ns": 0,  # Main namespace only (skip talk pages, categories, etc.)
            "text": {"$regex": ".{" + str(self.config.min_article_length) + ",}"},
        }
        projection = {"text": 1, "title": 1, "_id": 0}

        total_count = self.collection.count_documents(query)
        if limit:
            total_count = min(total_count, limit)

        print(f"Processing {total_count:,} articles...")

        cursor = self.collection.find(query, projection)
        if limit:
            cursor = cursor.limit(limit)

        articles = []
        processed = 0
        for doc in cursor:
            text = doc.get("text", "")
            if text and len(text) >= self.config.min_article_length:
                cleaned_text = self.clean_article_text(text)
                if len(cleaned_text) >= self.config.min_article_length:
                    articles.append(cleaned_text)

            processed += 1
            if processed % 10000 == 0:
                print(f"Processed {processed:,}/{total_count:,} articles")

        print(f"Extracted {len(articles):,} clean articles")
        return articles

    def clean_article_text(self, text: str) -> str:
        """Strip Wikipedia markup that isn't useful for language model training."""
        text = re.sub(r"\{\{[^}]+\}\}", "", text)  # Templates
        text = re.sub(r"\[\[Category:[^\]]+\]\]", "", text)  # Categories
        text = re.sub(r"\[\[File:[^\]]+\]\]", "", text)  # Files
        text = re.sub(r"\[\[Image:[^\]]+\]\]", "", text)  # Images

        text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", text)  # [[target|display]] -> display
        text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)  # [[target]] -> target

        text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.DOTALL)
        text = re.sub(r"<ref[^>]*/?>", "", text)
        text = re.sub(r"<[^>]+>", "", text)

        text = re.sub(r"\s+", " ", text).strip()

        if len(text) > self.config.max_article_length:
            text = text[: self.config.max_article_length]

        return text

    def get_sample_articles(self, categories: Optional[List[str]] = None, limit: int = 100) -> List[Dict]:
        """Get a small sample of articles, optionally filtered by category."""
        if self.collection is None:
            return []

        query = {"ns": 0}
        if categories:
            query["categories"] = {"$in": categories}

        projection = {"title": 1, "text": 1, "categories": 1, "_id": 0}

        articles = []
        for doc in self.collection.find(query, projection).limit(limit):
            text = self.clean_article_text(doc.get("text", ""))
            if len(text) >= self.config.min_article_length:
                articles.append({
                    "title": doc.get("title", ""),
                    "text": text,
                    "categories": doc.get("categories", []),
                })

        return articles
