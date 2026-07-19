"""
C4 Dataset Manager
Download and manage the C4 dataset from Hugging Face via AWS accelerated URLs
"""

import logging
import os
from pathlib import Path
from typing import Dict, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class C4Config:
    """C4 dataset configuration"""
    version: str = "en"  # en, multilingual
    split: str = "train"  # train, validation
    samples_limit: Optional[int] = None  # None = full dataset
    languages: List[str] = None  # For multilingual: ['en', 'fr', 'de', ...]


@dataclass
class StorageRequirements:
    """Storage and resource requirements"""
    dataset_gb: float
    uncompressed_gb: float
    recommended_gpu_vram_gb: float
    recommended_cpu_cores: int
    batch_size_gpu: int
    batch_size_cpu: int


class C4DatasetManager:
    """Manages C4 dataset download and preparation"""
    
    # AWS Accelerated URLs for C4 dataset
    C4_URLS = {
        "en": {
            "train": "https://huggingface.co/datasets/c4/resolve/main/data/en/c4-train.{index:05d}-of-{total:05d}.jsonl.zst",
            "validation": "https://huggingface.co/datasets/c4/resolve/main/data/en/c4-validation.{index:05d}-of-{total:05d}.jsonl.zst"
        },
        "multilingual": {
            "train": "https://huggingface.co/datasets/c4/resolve/main/multilingual/c4-multilingual-train.{index:05d}-of-{total:05d}.jsonl.zst",
            "validation": "https://huggingface.co/datasets/c4/resolve/main/multilingual/c4-multilingual-validation.{index:05d}-of-{total:05d}.jsonl.zst"
        }
    }
    
    # Storage estimates (GB)
    STORAGE_REQUIREMENTS = {
        "en_full": StorageRequirements(
            dataset_gb=750,  # ~750GB compressed
            uncompressed_gb=5000,  # ~5TB uncompressed
            recommended_gpu_vram_gb=24,
            recommended_cpu_cores=32,
            batch_size_gpu=8,
            batch_size_cpu=1
        ),
        "en_subset_10pct": StorageRequirements(
            dataset_gb=75,
            uncompressed_gb=500,
            recommended_gpu_vram_gb=8,
            recommended_cpu_cores=16,
            batch_size_gpu=16,
            batch_size_cpu=2
        ),
        "en_subset_1pct": StorageRequirements(
            dataset_gb=8,
            uncompressed_gb=50,
            recommended_gpu_vram_gb=4,
            recommended_cpu_cores=8,
            batch_size_gpu=32,
            batch_size_cpu=4
        ),
        "multilingual_full": StorageRequirements(
            dataset_gb=5000,  # ~5TB compressed
            uncompressed_gb=40000,  # ~40TB uncompressed
            recommended_gpu_vram_gb=48,
            recommended_cpu_cores=64,
            batch_size_gpu=4,
            batch_size_cpu=1
        ),
        "multilingual_subset": StorageRequirements(
            dataset_gb=100,
            uncompressed_gb=800,
            recommended_gpu_vram_gb=16,
            recommended_cpu_cores=16,
            batch_size_gpu=12,
            batch_size_cpu=2
        )
    }
    
    def __init__(self, data_dir: str = "/data/c4"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir = self.data_dir / ".cache"
        self.cache_dir.mkdir(exist_ok=True)
    
    def get_storage_requirements(self, dataset_config: C4Config) -> StorageRequirements:
        """Get storage requirements for given config"""
        version = dataset_config.version
        
        if version == "en":
            if dataset_config.samples_limit:
                if dataset_config.samples_limit < 1000000:
                    return self.STORAGE_REQUIREMENTS["en_subset_1pct"]
                elif dataset_config.samples_limit < 10000000:
                    return self.STORAGE_REQUIREMENTS["en_subset_10pct"]
            return self.STORAGE_REQUIREMENTS["en_full"]
        
        elif version == "multilingual":
            if dataset_config.samples_limit and dataset_config.samples_limit < 10000000:
                return self.STORAGE_REQUIREMENTS["multilingual_subset"]
            return self.STORAGE_REQUIREMENTS["multilingual_full"]
        
        # Default
        return self.STORAGE_REQUIREMENTS["en_subset_1pct"]
    
    def estimate_disk_space(self) -> Dict[str, float]:
        """Estimate disk space needed and available"""
        import shutil
        
        stat = shutil.disk_usage(str(self.data_dir))
        
        return {
            "total_gb": stat.total / (1024**3),
            "used_gb": stat.used / (1024**3),
            "free_gb": stat.free / (1024**3)
        }
    
    def can_fit_dataset(self, config: C4Config) -> tuple[bool, str]:
        """Check if dataset can fit on disk"""
        requirements = self.get_storage_requirements(config)
        disk_space = self.estimate_disk_space()
        
        needed_gb = requirements.uncompressed_gb
        available_gb = disk_space["free_gb"]
        
        # Add 20% buffer
        needed_with_buffer = needed_gb * 1.2
        
        if available_gb >= needed_with_buffer:
            return True, f"Sufficient space: {available_gb:.1f}GB available, {needed_with_buffer:.1f}GB needed"
        else:
            return False, f"Insufficient space: {available_gb:.1f}GB available, {needed_with_buffer:.1f}GB needed"
    
    def download_with_progress(
        self,
        config: C4Config,
        progress_callback=None
    ) -> bool:
        """
        Download C4 dataset using AWS accelerated URLs
        Uses huggingface_hub for efficient parallel downloads
        """
        try:
            from huggingface_hub import hf_hub_download, dataset_info
        except ImportError:
            logger.error("huggingface_hub not installed: pip install huggingface_hub")
            return False
        
        try:
            # Get dataset info
            repo_id = "c4"
            if config.version == "multilingual":
                repo_id = "c4/multilingual"
            
            logger.info(f"Downloading C4 ({config.version}/{config.split})...")
            
            # Download using HF hub (automatic parallel downloads, caching, resume)
            path = hf_hub_download(
                repo_id=repo_id,
                filename=f"c4-{config.split}.tar.gz",
                cache_dir=str(self.cache_dir),
                local_dir=str(self.data_dir),
                local_dir_use_symlinks=False
            )
            
            logger.info(f"Downloaded to: {path}")
            return True
            
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False
    
    def estimate_training_time(
        self,
        config: C4Config,
        compute_type: str = "gpu",
        gpu_count: int = 1
    ) -> Dict[str, any]:
        """Estimate training time with given hardware"""
        requirements = self.get_storage_requirements(config)
        
        # Rough estimates based on typical transformer training
        tokens_per_hour = {
            "cpu": 50_000,  # Very slow
            "gpu_v100": 500_000,  # V100
            "gpu_a100": 2_000_000,  # A100
            "gpu_h100": 5_000_000,  # H100
        }
        
        # Estimate total tokens in dataset
        tokens_estimate = requirements.uncompressed_gb * 1_000_000  # ~1M tokens per GB
        
        gpu_type = compute_type.split("_")[1] if "_" in compute_type else "v100"
        throughput = tokens_per_hour.get(f"gpu_{gpu_type}", tokens_per_hour["gpu_v100"])
        throughput *= gpu_count  # Scale with GPU count
        
        hours = tokens_estimate / throughput
        
        return {
            "total_tokens": int(tokens_estimate),
            "tokens_per_hour": int(throughput),
            "estimated_hours": float(hours),
            "estimated_days": float(hours / 24),
            "estimated_weeks": float(hours / (24 * 7))
        }
    
    def get_dataset_info(self) -> Dict[str, any]:
        """Get information about C4 dataset"""
        return {
            "name": "C4 (Colossal Clean Crawled Corpus)",
            "versions": {
                "en": {
                    "description": "English only",
                    "tokens": 750_000_000_000,  # 750B tokens
                    "documents": 350_000_000,
                    "compressed_gb": 750,
                    "uncompressed_gb": 5000
                },
                "multilingual": {
                    "description": "101 languages",
                    "tokens": 6_000_000_000_000,  # 6T tokens
                    "documents": 2_600_000_000,
                    "compressed_gb": 5000,
                    "uncompressed_gb": 40000,
                    "languages": [
                        "af", "ar", "bg", "bn", "ca", "cs", "cy", "da", "de", "el",
                        "en", "es", "et", "fa", "fi", "fr", "gu", "he", "hi", "hu",
                        "id", "it", "ja", "kn", "ko", "lt", "lv", "mk", "ml", "mr",
                        "ne", "nl", "pa", "pl", "pt", "ro", "ru", "sk", "sl", "so",
                        "sq", "sv", "ta", "te", "th", "tr", "uk", "ur", "vi", "zh"
                    ]
                }
            },
            "paper": "https://arxiv.org/abs/2104.08758",
            "license": "ODC-BY",
            "source": "Common Crawl"
        }


class HardwarePresets:
    """Predefined hardware configurations"""
    
    PRESETS = {
        # CPU-only
        "cpu_small": {
            "name": "CPU Small (8 cores, 32GB RAM)",
            "compute_type": "cpu",
            "cpu_cores": 8,
            "gpu_count": 0,
            "memory_gb": 32,
            "batch_size": 4,
            "estimated_tokens_per_hour": 50_000,
            "cost_per_hour": 0.50,  # Rough estimate
            "suitable_for": ["en_subset_1pct"]
        },
        "cpu_medium": {
            "name": "CPU Medium (16 cores, 64GB RAM)",
            "compute_type": "cpu",
            "cpu_cores": 16,
            "gpu_count": 0,
            "memory_gb": 64,
            "batch_size": 8,
            "estimated_tokens_per_hour": 100_000,
            "cost_per_hour": 1.00,
            "suitable_for": ["en_subset_1pct", "en_subset_10pct"]
        },
        "cpu_large": {
            "name": "CPU Large (32 cores, 128GB RAM)",
            "compute_type": "cpu",
            "cpu_cores": 32,
            "gpu_count": 0,
            "memory_gb": 128,
            "batch_size": 16,
            "estimated_tokens_per_hour": 200_000,
            "cost_per_hour": 2.50,
            "suitable_for": ["en_subset_10pct"]
        },
        
        # Single GPU
        "gpu_v100_single": {
            "name": "GPU: 1x V100 (32GB)",
            "compute_type": "gpu",
            "gpu_type": "v100",
            "cpu_cores": 8,
            "gpu_count": 1,
            "gpu_vram_gb": 32,
            "memory_gb": 32,
            "batch_size": 16,
            "estimated_tokens_per_hour": 500_000,
            "cost_per_hour": 3.06,
            "suitable_for": ["en_subset_1pct", "en_subset_10pct"]
        },
        "gpu_a100_single": {
            "name": "GPU: 1x A100 (80GB)",
            "compute_type": "gpu",
            "gpu_type": "a100",
            "cpu_cores": 16,
            "gpu_count": 1,
            "gpu_vram_gb": 80,
            "memory_gb": 64,
            "batch_size": 32,
            "estimated_tokens_per_hour": 2_000_000,
            "cost_per_hour": 10.32,
            "suitable_for": ["en_subset_1pct", "en_subset_10pct", "en_full"]
        },
        "gpu_h100_single": {
            "name": "GPU: 1x H100 (80GB)",
            "compute_type": "gpu",
            "gpu_type": "h100",
            "cpu_cores": 16,
            "gpu_count": 1,
            "gpu_vram_gb": 80,
            "memory_gb": 64,
            "batch_size": 64,
            "estimated_tokens_per_hour": 5_000_000,
            "cost_per_hour": 40.00,
            "suitable_for": ["en_subset_10pct", "en_full"]
        },
        
        # Multi GPU
        "gpu_a100_quad": {
            "name": "GPU: 4x A100 (80GB each)",
            "compute_type": "gpu_distributed",
            "gpu_type": "a100",
            "cpu_cores": 64,
            "gpu_count": 4,
            "gpu_vram_gb": 320,
            "memory_gb": 256,
            "batch_size": 128,
            "estimated_tokens_per_hour": 8_000_000,
            "cost_per_hour": 41.28,
            "suitable_for": ["en_subset_10pct", "en_full", "multilingual_subset"]
        },
        "gpu_h100_quad": {
            "name": "GPU: 4x H100 (80GB each)",
            "compute_type": "gpu_distributed",
            "gpu_type": "h100",
            "cpu_cores": 64,
            "gpu_count": 4,
            "gpu_vram_gb": 320,
            "memory_gb": 256,
            "batch_size": 256,
            "estimated_tokens_per_hour": 20_000_000,
            "cost_per_hour": 160.00,
            "suitable_for": ["en_full", "multilingual_subset"]
        },
        "gpu_h100_8": {
            "name": "GPU: 8x H100 (80GB each) - Enterprise",
            "compute_type": "gpu_distributed",
            "gpu_type": "h100",
            "cpu_cores": 128,
            "gpu_count": 8,
            "gpu_vram_gb": 640,
            "memory_gb": 512,
            "batch_size": 512,
            "estimated_tokens_per_hour": 40_000_000,
            "cost_per_hour": 320.00,
            "suitable_for": ["en_full", "multilingual_subset", "multilingual_full"]
        }
    }
    
    @classmethod
    def get_preset(cls, name: str) -> Optional[Dict]:
        """Get hardware preset by name"""
        return cls.PRESETS.get(name)
    
    @classmethod
    def list_presets(cls) -> Dict[str, Dict]:
        """List all available presets"""
        return cls.PRESETS
    
    @classmethod
    def recommend_preset(cls, dataset_size_gb: int) -> str:
        """Recommend preset based on dataset size"""
        if dataset_size_gb < 100:
            return "gpu_v100_single"
        elif dataset_size_gb < 1000:
            return "gpu_a100_quad"
        else:
            return "gpu_h100_8"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Example usage
    manager = C4DatasetManager()
    
    # Get dataset info
    info = manager.get_dataset_info()
    print("C4 Dataset Info:")
    print(f"  Name: {info['name']}")
    print(f"  Versions: {list(info['versions'].keys())}")
    
    # Get storage requirements
    config = C4Config(version="en", split="train")
    reqs = manager.get_storage_requirements(config)
    print(f"\nStorage Requirements (English):")
    print(f"  Dataset: {reqs.dataset_gb}GB")
    print(f"  Uncompressed: {reqs.uncompressed_gb}GB")
    
    # List presets
    print(f"\nAvailable Hardware Presets:")
    for name, preset in HardwarePresets.list_presets().items():
        print(f"  {name}: {preset['name']}")
