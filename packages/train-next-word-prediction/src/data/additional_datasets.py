"""
Additional Datasets Support
GLUE, MS MARCO, and other Q&A datasets
"""

import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.request import urlretrieve
import zipfile

logger = logging.getLogger(__name__)


class GLUEDatasetManager:
    """Manages GLUE benchmark datasets"""
    
    DATASETS = {
        "MRPC": "https://dl.fbaipublicfiles.com/glue/data/MRPC.zip",
        "QQP": "https://dl.fbaipublicfiles.com/glue/data/QQP.zip",
        "WNLI": "https://dl.fbaipublicfiles.com/glue/data/WNLI.zip",
    }
    
    def __init__(self, data_dir: str = "/data/glue"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def download(self, dataset: str, force: bool = False) -> bool:
        """Download GLUE dataset"""
        if dataset not in self.DATASETS:
            logger.error(f"Unknown dataset: {dataset}")
            return False
        
        url = self.DATASETS[dataset]
        zip_file = self.data_dir / f"{dataset}.zip"
        
        if zip_file.exists() and not force:
            logger.info(f"✓ {dataset} already downloaded")
            return True
        
        try:
            logger.info(f"Downloading {dataset}...")
            urlretrieve(url, str(zip_file))
            
            # Extract
            with zipfile.ZipFile(zip_file, 'r') as z:
                z.extractall(str(self.data_dir))
            
            logger.info(f"✓ {dataset} extracted")
            return True
        except Exception as e:
            logger.error(f"Failed to download {dataset}: {e}")
            return False


class MSMarcoDatasetManager:
    """Manages MS MARCO Q&A dataset"""
    
    # MS MARCO v2 download URLs
    URLS = {
        "train": "https://huggingface.co/datasets/ms_marco/resolve/main/data/train_v2.1.json.gz",
        "dev": "https://huggingface.co/datasets/ms_marco/resolve/main/data/dev_v2.1.json.gz",
    }
    
    def __init__(self, data_dir: str = "/data/ms_marco"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def download(self, split: str = "train", force: bool = False) -> bool:
        """Download MS MARCO dataset"""
        if split not in self.URLS:
            logger.error(f"Unknown split: {split}")
            return False
        
        output_file = self.data_dir / f"{split}_v2.1.json.gz"
        
        if output_file.exists() and not force:
            logger.info(f"✓ MS MARCO {split} already downloaded")
            return True
        
        try:
            logger.info(f"Downloading MS MARCO {split}...")
            urlretrieve(self.URLS[split], str(output_file))
            logger.info(f"✓ MS MARCO {split} downloaded")
            return True
        except Exception as e:
            logger.error(f"Failed to download MS MARCO: {e}")
            return False
    
    def extract_qa_pairs(self, file_path: Path, limit: Optional[int] = None) -> List[Dict[str, str]]:
        """Extract Q&A pairs from MS MARCO"""
        import gzip
        
        qa_pairs = []
        count = 0
        
        try:
            with gzip.open(file_path, 'rt', encoding='utf-8') as f:
                for line in f:
                    if limit and count >= limit:
                        break
                    
                    try:
                        data = json.loads(line)
                        
                        # MS MARCO format: query, answers, passages
                        question = data.get('query', '')
                        passages = data.get('passages', [])
                        
                        if question and passages:
                            for passage in passages:
                                answers = passage.get('answers', [])
                                if answers:
                                    qa_pairs.append({
                                        'question': question,
                                        'context': passage.get('passage_text', ''),
                                        'answer': answers[0],
                                        'id': data.get('query_id', '')
                                    })
                                    count += 1
                    except:
                        continue
            
            logger.info(f"Extracted {len(qa_pairs)} Q&A pairs from MS MARCO")
            return qa_pairs
        except Exception as e:
            logger.error(f"Error extracting MS MARCO pairs: {e}")
            return []


class NaturalQuestionsDatasetManager:
    """Manages Google Natural Questions dataset"""
    
    def __init__(self, data_dir: str = "/data/natural_questions"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def download(self, force: bool = False) -> bool:
        """Download Natural Questions dataset"""
        # NQ is available via TensorFlow Datasets
        logger.info("Natural Questions dataset is available via TensorFlow Datasets")
        logger.info("Install: pip install tensorflow-datasets")
        
        return False


class TriviaQADatasetManager:
    """Manages TriviaQA dataset"""
    
    URLS = {
        "wikipedia": "http://nlp.cs.washington.edu/triviaqa/data/triviaqa-wikipedia-100000-evidence-train.json",
        "web": "http://nlp.cs.washington.edu/triviaqa/data/triviaqa-web-train.json",
    }
    
    def __init__(self, data_dir: str = "/data/triviaqa"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
    
    def download(self, source: str = "wikipedia", force: bool = False) -> bool:
        """Download TriviaQA dataset"""
        if source not in self.URLS:
            logger.error(f"Unknown source: {source}")
            return False
        
        output_file = self.data_dir / f"triviaqa-{source}.json"
        
        if output_file.exists() and not force:
            logger.info(f"✓ TriviaQA {source} already downloaded")
            return True
        
        try:
            logger.info(f"Downloading TriviaQA {source}...")
            urlretrieve(self.URLS[source], str(output_file))
            logger.info(f"✓ TriviaQA {source} downloaded")
            return True
        except Exception as e:
            logger.error(f"Failed to download TriviaQA: {e}")
            return False
    
    def extract_qa_pairs(self, file_path: Path, limit: Optional[int] = None) -> List[Dict[str, str]]:
        """Extract Q&A pairs from TriviaQA"""
        qa_pairs = []
        count = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for item in data.get('data', []):
                if limit and count >= limit:
                    break
                
                for para in item.get('paragraphs', []):
                    if limit and count >= limit:
                        break
                    
                    context = para.get('context', '')
                    
                    for qa in para.get('qas', []):
                        if limit and count >= limit:
                            break
                        
                        question = qa.get('question', '')
                        answers = qa.get('answers', [])
                        
                        if answers:
                            qa_pairs.append({
                                'question': question,
                                'context': context,
                                'answer': answers[0].get('text', ''),
                                'id': qa.get('id', '')
                            })
                            count += 1
            
            logger.info(f"Extracted {len(qa_pairs)} Q&A pairs from TriviaQA")
            return qa_pairs
        except Exception as e:
            logger.error(f"Error extracting TriviaQA pairs: {e}")
            return []


class DatasetFactory:
    """Factory for dataset managers"""
    
    @staticmethod
    def create(dataset_type: str, **kwargs) -> Any:
        """Create dataset manager"""
        if dataset_type == "squad":
            from training.squad_manager import SQuADManager
            return SQuADManager(**kwargs)
        elif dataset_type == "glue":
            return GLUEDatasetManager(**kwargs)
        elif dataset_type == "ms_marco":
            return MSMarcoDatasetManager(**kwargs)
        elif dataset_type == "natural_questions":
            return NaturalQuestionsDatasetManager(**kwargs)
        elif dataset_type == "triviaqa":
            return TriviaQADatasetManager(**kwargs)
        else:
            logger.warning(f"Unknown dataset: {dataset_type}")
            return None


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    # Example: Download TriviaQA
    # manager = TriviaQADatasetManager()
    # manager.download(source="wikipedia")
