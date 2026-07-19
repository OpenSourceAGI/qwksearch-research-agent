"""
SQuAD Dataset Manager
Downloads, extracts, and manages SQuAD dataset for Q&A training and evaluation
"""

import json
import os
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.request import urlretrieve
import zipfile

logger = logging.getLogger(__name__)


class SQuADManager:
    """Manages SQuAD dataset download, extraction, and access"""
    
    # Official SQuAD URLs
    SQUAD_V1_TRAIN_URL = "https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v1.1.json"
    SQUAD_V1_DEV_URL = "https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v1.1.json"
    SQUAD_V2_TRAIN_URL = "https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v2.0.json"
    SQUAD_V2_DEV_URL = "https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v2.0.json"
    
    def __init__(self, data_dir: str = "/data/squad", version: str = "1.1"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.version = version
        self.train_file = self.data_dir / f"train-v{version}.json"
        self.dev_file = self.data_dir / f"dev-v{version}.json"
    
    def download(self, force: bool = False) -> bool:
        """Download SQuAD dataset files"""
        if self.version == "1.1":
            train_url = self.SQUAD_V1_TRAIN_URL
            dev_url = self.SQUAD_V1_DEV_URL
        elif self.version == "2.0":
            train_url = self.SQUAD_V2_TRAIN_URL
            dev_url = self.SQUAD_V2_DEV_URL
        else:
            raise ValueError(f"Unsupported SQuAD version: {self.version}")
        
        success = True
        
        # Download training set
        if force or not self.train_file.exists():
            logger.info(f"Downloading SQuAD v{self.version} training set...")
            try:
                urlretrieve(train_url, str(self.train_file))
                logger.info(f"✓ Training set downloaded: {self.train_file}")
            except Exception as e:
                logger.error(f"✗ Failed to download training set: {e}")
                success = False
        else:
            logger.info(f"✓ Training set already exists: {self.train_file}")
        
        # Download dev set
        if force or not self.dev_file.exists():
            logger.info(f"Downloading SQuAD v{self.version} dev set...")
            try:
                urlretrieve(dev_url, str(self.dev_file))
                logger.info(f"✓ Dev set downloaded: {self.dev_file}")
            except Exception as e:
                logger.error(f"✗ Failed to download dev set: {e}")
                success = False
        else:
            logger.info(f"✓ Dev set already exists: {self.dev_file}")
        
        return success
    
    def load_squad_file(self, file_path: Path) -> Dict[str, Any]:
        """Load and parse SQuAD JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"Loaded {file_path}: {len(data['data'])} articles")
            return data
        except Exception as e:
            logger.error(f"Failed to load SQuAD file: {e}")
            return {}
    
    def load_train(self) -> Dict[str, Any]:
        """Load training set"""
        if not self.train_file.exists():
            logger.warning("Training set not downloaded, attempting download...")
            if not self.download():
                return {}
        return self.load_squad_file(self.train_file)
    
    def load_dev(self) -> Dict[str, Any]:
        """Load dev set"""
        if not self.dev_file.exists():
            logger.warning("Dev set not downloaded, attempting download...")
            if not self.download():
                return {}
        return self.load_squad_file(self.dev_file)
    
    def extract_qa_pairs(self, squad_data: Dict[str, Any], limit: Optional[int] = None) -> List[Dict[str, str]]:
        """Extract Q&A pairs from SQuAD data"""
        qa_pairs = []
        
        for article_idx, article in enumerate(squad_data.get('data', [])):
            if limit and len(qa_pairs) >= limit:
                break
            
            for paragraph in article.get('paragraphs', []):
                if limit and len(qa_pairs) >= limit:
                    break
                
                context = paragraph.get('context', '')
                
                for qa in paragraph.get('qas', []):
                    if limit and len(qa_pairs) >= limit:
                        break
                    
                    question = qa.get('question', '')
                    
                    # Get first answer (there can be multiple)
                    answers = qa.get('answers', [])
                    if answers:
                        answer = answers[0].get('text', '')
                        qa_pairs.append({
                            'context': context,
                            'question': question,
                            'answer': answer,
                            'id': qa.get('id', '')
                        })
        
        logger.info(f"Extracted {len(qa_pairs)} Q&A pairs")
        return qa_pairs
    
    def get_statistics(self, squad_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get statistics about the dataset"""
        total_articles = len(squad_data.get('data', []))
        total_paragraphs = sum(
            len(article.get('paragraphs', []))
            for article in squad_data.get('data', [])
        )
        total_qas = sum(
            sum(len(p.get('qas', [])) for p in article.get('paragraphs', []))
            for article in squad_data.get('data', [])
        )
        
        return {
            'total_articles': total_articles,
            'total_paragraphs': total_paragraphs,
            'total_qas': total_qas,
            'avg_qas_per_paragraph': total_qas / max(total_paragraphs, 1)
        }
    
    def save_qa_pairs(self, qa_pairs: List[Dict[str, str]], output_file: str):
        """Save extracted Q&A pairs to JSON"""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(qa_pairs, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved {len(qa_pairs)} Q&A pairs to {output_file}")
    
    def verify_files(self) -> bool:
        """Verify both dataset files exist"""
        train_exists = self.train_file.exists()
        dev_exists = self.dev_file.exists()
        
        logger.info(f"Training set: {'✓' if train_exists else '✗'} {self.train_file}")
        logger.info(f"Dev set:      {'✓' if dev_exists else '✗'} {self.dev_file}")
        
        return train_exists and dev_exists


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    # Download and extract
    manager = SQuADManager(version="1.1")
    
    # Download
    manager.download()
    
    # Verify
    if manager.verify_files():
        # Load data
        train_data = manager.load_train()
        dev_data = manager.load_dev()
        
        # Show statistics
        if train_data:
            stats = manager.get_statistics(train_data)
            print("\nTraining set statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
        
        if dev_data:
            stats = manager.get_statistics(dev_data)
            print("\nDev set statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
        
        # Extract and save Q&A pairs
        if train_data:
            qa_pairs = manager.extract_qa_pairs(train_data, limit=1000)
            manager.save_qa_pairs(qa_pairs, "/data/squad/qa_pairs_train_1k.json")
        
        if dev_data:
            qa_pairs = manager.extract_qa_pairs(dev_data, limit=500)
            manager.save_qa_pairs(qa_pairs, "/data/squad/qa_pairs_dev_500.json")
