"""
FastAPI REST API for Q&A Training & Evaluation
Exposes endpoints for evaluation, training control, and metrics
"""

import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Q&A Training API",
    description="SQuAD Q&A model training & evaluation service",
    version="1.0.0"
)


# Request/Response Models
class QARequest(BaseModel):
    """Q&A evaluation request"""
    context: str
    question: str
    expected_answer: Optional[str] = None


class QAResponse(BaseModel):
    """Q&A evaluation response"""
    question: str
    answer: str
    score: Optional[float] = None
    model_version: str
    timestamp: str


class BatchEvalRequest(BaseModel):
    """Batch evaluation request"""
    qa_pairs: List[QARequest]
    batch_size: int = 32


class BatchEvalResponse(BaseModel):
    """Batch evaluation response"""
    total: int
    completed: int
    average_score: float
    results: List[QAResponse]


class TrainingStartRequest(BaseModel):
    """Start training request"""
    loop_type: str  # 'single', 'parallel', 'async'
    num_workers: int = 4
    batch_size: int = 32
    max_iterations: int = 100
    min_improvement: float = 0.01


class C4DownloadRequest(BaseModel):
    """C4 dataset download request"""
    version: str = "en"  # 'en' or 'multilingual'
    split: str = "train"
    subset: str = "1pct"  # '1pct', '10pct', 'full'


class HardwarePresetResponse(BaseModel):
    """Hardware preset response"""
    name: str
    compute_type: str
    gpu_count: int
    cpu_cores: int
    memory_gb: int
    estimated_tokens_per_hour: int
    cost_per_hour: float


class MetricsResponse(BaseModel):
    """Metrics response"""
    iteration: int
    timestamp: str
    batch_score: float
    best_score: float
    improvement: float
    high_score_count: int
    medium_score_count: int
    low_score_count: int


# Global state
class AppState:
    training_active = False
    current_iteration = 0
    best_score = 0.0
    model_version = "v1.0"
    dataset_info = {}
    metrics_history = []


state = AppState()


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    logger.info("Q&A Training API starting")
    
    # Load dataset info
    squad_dir = Path("/data/squad")
    if (squad_dir / "qa_pairs_train.json").exists():
        with open(squad_dir / "qa_pairs_train.json") as f:
            pairs = json.load(f)
        state.dataset_info['train_count'] = len(pairs)
    
    if (squad_dir / "qa_pairs_dev.json").exists():
        with open(squad_dir / "qa_pairs_dev.json") as f:
            pairs = json.load(f)
        state.dataset_info['dev_count'] = len(pairs)
    
    logger.info(f"Dataset info: {state.dataset_info}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Q&A Training API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "evaluate": "POST /evaluate",
            "batch-evaluate": "POST /batch-evaluate",
            "training": "GET/POST /training",
            "metrics": "GET /metrics",
            "datasets": "GET /datasets"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "training_active": state.training_active,
        "model_version": state.model_version,
        "dataset_info": state.dataset_info
    }


@app.post("/evaluate", response_model=QAResponse)
async def evaluate_qa(request: QARequest):
    """Evaluate single Q&A pair"""
    try:
        # This would call actual model inference
        # For now, return mock response
        answer = f"Mock answer for: {request.question[:30]}..."
        score = 0.75 if request.expected_answer else None
        
        return QAResponse(
            question=request.question,
            answer=answer,
            score=score,
            model_version=state.model_version,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error evaluating Q&A: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-evaluate", response_model=BatchEvalResponse)
async def batch_evaluate(request: BatchEvalRequest):
    """Evaluate batch of Q&A pairs"""
    try:
        results = []
        total_score = 0.0
        
        for qa in request.qa_pairs:
            # Evaluate each pair
            answer = f"Mock: {qa.question[:20]}..."
            score = 0.75
            
            results.append(QAResponse(
                question=qa.question,
                answer=answer,
                score=score,
                model_version=state.model_version,
                timestamp=datetime.now().isoformat()
            ))
            total_score += score
        
        avg_score = total_score / len(results) if results else 0.0
        
        return BatchEvalResponse(
            total=len(request.qa_pairs),
            completed=len(results),
            average_score=avg_score,
            results=results
        )
    except Exception as e:
        logger.error(f"Error in batch evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/training")
async def get_training_status():
    """Get training status"""
    return {
        "active": state.training_active,
        "iteration": state.current_iteration,
        "best_score": state.best_score,
        "model_version": state.model_version
    }


@app.post("/training/start")
async def start_training(request: TrainingStartRequest, background_tasks: BackgroundTasks):
    """Start training loop"""
    if state.training_active:
        raise HTTPException(status_code=400, detail="Training already active")
    
    try:
        state.training_active = True
        
        # Add background task to run training
        # background_tasks.add_task(run_training_loop, request)
        
        return {
            "status": "started",
            "loop_type": request.loop_type,
            "num_workers": request.num_workers,
            "max_iterations": request.max_iterations
        }
    except Exception as e:
        state.training_active = False
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/training/stop")
async def stop_training():
    """Stop training loop"""
    state.training_active = False
    return {"status": "stopped"}


@app.get("/metrics")
async def get_metrics():
    """Get current metrics"""
    metrics_file = Path("/data/logs/qa_improvement_history.json")
    
    if metrics_file.exists():
        with open(metrics_file) as f:
            metrics = json.load(f)
        return {"metrics": metrics[-50:]}  # Last 50 iterations
    
    return {"metrics": [], "message": "No metrics available"}


@app.get("/metrics/{iteration}")
async def get_iteration_metrics(iteration: int):
    """Get metrics for specific iteration"""
    metrics_file = Path(f"/data/logs/qa_results_iter_{iteration}.json")
    
    if metrics_file.exists():
        with open(metrics_file) as f:
            return json.load(f)
    
    raise HTTPException(status_code=404, detail=f"Iteration {iteration} not found")


@app.get("/datasets")
async def get_datasets():
    """Get available datasets info"""
    squad_dir = Path("/data/squad")
    
    datasets = {
        "squad": {
            "train": (squad_dir / "qa_pairs_train.json").exists(),
            "dev": (squad_dir / "qa_pairs_dev.json").exists(),
            "counts": state.dataset_info
        }
    }
    
    return datasets


@app.get("/checkpoints")
async def list_checkpoints():
    """List available checkpoints"""
    checkpoint_dir = Path("/data/checkpoints")
    checkpoints = []
    
    if checkpoint_dir.exists():
        for cp in sorted(checkpoint_dir.glob("*.pt")):
            stat = cp.stat()
            checkpoints.append({
                "name": cp.name,
                "size_mb": stat.st_size / (1024*1024),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    
    return {"checkpoints": checkpoints}


@app.get("/checkpoints/{checkpoint_name}")
async def download_checkpoint(checkpoint_name: str):
    """Download checkpoint file"""
    checkpoint_path = Path("/data/checkpoints") / checkpoint_name
    
    if not checkpoint_path.exists():
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    return FileResponse(
        path=checkpoint_path,
        media_type="application/octet-stream",
        filename=checkpoint_name
    )


@app.get("/logs")
async def get_logs(lines: int = 100):
    """Get recent log entries"""
    log_dir = Path("/data/logs")
    
    if not log_dir.exists():
        return {"logs": []}
    
    logs = []
    for log_file in sorted(log_dir.glob("*.log"))[-5:]:
        try:
            with open(log_file) as f:
                content = f.read().split('\n')
            logs.extend(content[-lines:])
        except:
            pass
    
    return {"logs": logs[-lines:]}


@app.get("/config")
async def get_configuration():
    """Get current configuration"""
    import os
    
    return {
        "squad_version": os.getenv("SQUAD_VERSION", "1.1"),
        "squad_dir": os.getenv("SQUAD_DIR", "/data/squad"),
        "batch_size": os.getenv("BATCH_SIZE", "32"),
        "compute_type": os.getenv("COMPUTE_TYPE", "cpu"),
        "gpu_count": os.getenv("GPU_COUNT", "0"),
        "num_workers": os.getenv("NUM_WORKERS", "4"),
        "loop_type": os.getenv("LOOP_TYPE", "parallel")
    }


# C4 Dataset Endpoints
@app.get("/datasets/c4/info")
async def get_c4_info():
    """Get C4 dataset information"""
    from src.data.c4_dataset import C4DatasetManager
    
    manager = C4DatasetManager()
    return manager.get_dataset_info()


@app.get("/datasets/c4/requirements/{dataset_config}")
async def get_c4_requirements(dataset_config: str):
    """
    Get C4 storage and resource requirements
    Examples: 'en_1pct', 'en_full', 'multilingual_subset'
    """
    from src.data.c4_dataset import C4DatasetManager, C4Config
    
    manager = C4DatasetManager()
    
    # Parse config
    config_parts = dataset_config.split("_")
    version = config_parts[0]  # 'en' or 'multilingual'
    subset = "_".join(config_parts[1:]) if len(config_parts) > 1 else "1pct"
    
    config = C4Config(version=version)
    reqs = manager.get_storage_requirements(config)
    
    return {
        "dataset_config": dataset_config,
        "storage": {
            "compressed_gb": reqs.dataset_gb,
            "uncompressed_gb": reqs.uncompressed_gb
        },
        "hardware": {
            "recommended_gpu_vram_gb": reqs.recommended_gpu_vram_gb,
            "recommended_cpu_cores": reqs.recommended_cpu_cores,
            "batch_size_gpu": reqs.batch_size_gpu,
            "batch_size_cpu": reqs.batch_size_cpu
        }
    }


@app.get("/datasets/c4/disk-space")
async def check_c4_disk_space():
    """Check available disk space for C4"""
    from src.data.c4_dataset import C4DatasetManager
    
    manager = C4DatasetManager()
    space = manager.estimate_disk_space()
    
    return {
        "total_gb": space["total_gb"],
        "used_gb": space["used_gb"],
        "free_gb": space["free_gb"],
        "can_fit_en_1pct": space["free_gb"] > 50,
        "can_fit_en_10pct": space["free_gb"] > 500,
        "can_fit_en_full": space["free_gb"] > 5000
    }


@app.post("/datasets/c4/download")
async def download_c4_dataset(request: C4DownloadRequest, background_tasks: BackgroundTasks):
    """Start C4 dataset download"""
    from src.data.c4_dataset import C4DatasetManager, C4Config
    
    manager = C4DatasetManager()
    
    config = C4Config(
        version=request.version,
        split=request.split
    )
    
    # Check disk space
    can_fit, message = manager.can_fit_dataset(config)
    if not can_fit:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient disk space: {message}"
        )
    
    # Start download in background
    background_tasks.add_task(
        manager.download_with_progress,
        config
    )
    
    return {
        "status": "downloading",
        "version": request.version,
        "split": request.split,
        "message": f"Started downloading C4 ({request.version}/{request.split})"
    }


@app.get("/hardware/presets")
async def list_hardware_presets():
    """List available hardware presets"""
    from src.data.c4_dataset import HardwarePresets
    
    presets = HardwarePresets.list_presets()
    
    return {
        "presets": [
            {
                "id": name,
                "name": preset["name"],
                "compute_type": preset["compute_type"],
                "gpu_count": preset["gpu_count"],
                "gpu_type": preset.get("gpu_type", "N/A"),
                "cpu_cores": preset["cpu_cores"],
                "memory_gb": preset["memory_gb"],
                "gpu_vram_gb": preset.get("gpu_vram_gb", 0),
                "batch_size": preset["batch_size"],
                "throughput": preset["estimated_tokens_per_hour"],
                "cost_per_hour": preset["cost_per_hour"],
                "suitable_for": preset.get("suitable_for", [])
            }
            for name, preset in presets.items()
        ]
    }


@app.get("/hardware/recommend")
async def recommend_hardware(dataset_size_gb: float):
    """Recommend hardware based on dataset size"""
    from src.data.c4_dataset import HardwarePresets
    
    recommended = HardwarePresets.recommend_preset(int(dataset_size_gb))
    presets = HardwarePresets.list_presets()
    preset = presets[recommended]
    
    return {
        "recommended_preset": recommended,
        "name": preset["name"],
        "reason": f"For {dataset_size_gb:.1f}GB dataset"
    }


@app.get("/datasets/training-estimate")
async def estimate_training_time(
    dataset_gb: float,
    gpu_type: str = "h100",
    gpu_count: int = 1
):
    """Estimate training time for dataset on hardware"""
    from src.data.c4_dataset import C4DatasetManager, C4Config
    
    manager = C4DatasetManager()
    
    config = C4Config()
    estimate = manager.estimate_training_time(
        config,
        f"gpu_{gpu_type}",
        gpu_count
    )
    
    return {
        "dataset_gb": dataset_gb,
        "gpu_type": gpu_type,
        "gpu_count": gpu_count,
        "total_tokens": estimate["total_tokens"],
        "tokens_per_hour": estimate["tokens_per_hour"],
        "estimated_hours": estimate["estimated_hours"],
        "estimated_days": estimate["estimated_days"],
        "estimated_weeks": estimate["estimated_weeks"]
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,
        log_level="info"
    )
