"""
Performance Benchmarking Tools
Measure throughput, latency, and costs
"""

import time
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Callable
from dataclasses import dataclass, asdict
import statistics

logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """Benchmark result"""
    name: str
    total_time: float
    num_operations: int
    throughput: float  # ops/sec
    min_latency: float
    max_latency: float
    mean_latency: float
    median_latency: float
    stdev_latency: float
    timestamp: str


class Benchmarker:
    """Benchmarking tool for Q&A operations"""
    
    def __init__(self, results_dir: str = "/data/benchmarks"):
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.results = []
    
    def benchmark_function(
        self,
        func: Callable,
        iterations: int = 100,
        name: str = None,
        *args,
        **kwargs
    ) -> BenchmarkResult:
        """Benchmark a function"""
        name = name or func.__name__
        latencies = []
        
        logger.info(f"Benchmarking {name} with {iterations} iterations")
        
        # Warmup
        try:
            func(*args, **kwargs)
        except:
            pass
        
        # Actual benchmark
        start_time = time.time()
        
        for _ in range(iterations):
            iter_start = time.time()
            try:
                func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Iteration failed: {e}")
            iter_end = time.time()
            latencies.append((iter_end - iter_start) * 1000)  # ms
        
        total_time = time.time() - start_time
        throughput = iterations / total_time
        
        result = BenchmarkResult(
            name=name,
            total_time=total_time,
            num_operations=iterations,
            throughput=throughput,
            min_latency=min(latencies),
            max_latency=max(latencies),
            mean_latency=statistics.mean(latencies),
            median_latency=statistics.median(latencies),
            stdev_latency=statistics.stdev(latencies) if len(latencies) > 1 else 0.0,
            timestamp=datetime.now().isoformat()
        )
        
        self.results.append(result)
        
        logger.info(f"✓ {name}:")
        logger.info(f"  Throughput: {throughput:.2f} ops/sec")
        logger.info(f"  Latency: {result.mean_latency:.2f}ms (min: {result.min_latency:.2f}, max: {result.max_latency:.2f})")
        
        return result
    
    def benchmark_qa_evaluation(
        self,
        evaluator: Any,
        qa_batch: List[Dict[str, str]],
        num_runs: int = 5
    ) -> BenchmarkResult:
        """Benchmark Q&A evaluation"""
        def evaluate():
            return evaluator.evaluate_batch(qa_batch)
        
        return self.benchmark_function(
            evaluate,
            iterations=num_runs,
            name=f"qa_evaluation_{len(qa_batch)}_items"
        )
    
    def estimate_cost(
        self,
        compute_type: str = "cpu",
        duration_hours: float = 1.0,
        num_instances: int = 1
    ) -> Dict[str, float]:
        """Estimate AWS Fargate cost"""
        # Fargate pricing as of 2024
        pricing = {
            "cpu_256": {"cpu": 0.0126, "memory": 0.0026},  # per vCPU-hour, per GB-hour
            "cpu_512": {"cpu": 0.0252, "memory": 0.0051},
            "cpu_1024": {"cpu": 0.0405, "memory": 0.0089},
            "cpu_2048": {"cpu": 0.0810, "memory": 0.0178},
            "cpu_4096": {"cpu": 0.1620, "memory": 0.0356},
            "gpu_1": 0.5228,  # per GPU-hour
            "gpu_2": 1.0456,
            "gpu_4": 2.0912,
        }
        
        if compute_type.startswith("cpu"):
            cpu_cost = pricing.get(compute_type, {}).get("cpu", 0) * duration_hours
            memory_cost = pricing.get(compute_type, {}).get("memory", 0) * 2 * duration_hours
            total_per_instance = cpu_cost + memory_cost
        else:
            gpu_count = int(compute_type.split("_")[1])
            gpu_cost = pricing.get(f"gpu_{gpu_count}", 0)
            total_per_instance = gpu_cost * duration_hours
        
        total_cost = total_per_instance * num_instances
        
        return {
            "compute_type": compute_type,
            "duration_hours": duration_hours,
            "num_instances": num_instances,
            "cost_per_instance": total_per_instance,
            "total_cost": total_cost,
            "cost_per_iteration": total_cost / 100 if duration_hours > 0 else 0
        }
    
    def cost_per_qa_evaluation(
        self,
        benchmark_result: BenchmarkResult,
        compute_type: str = "gpu_1"
    ) -> Dict[str, float]:
        """Calculate cost per Q&A evaluation"""
        cost_per_hour = {
            "cpu_256": 0.015,
            "cpu_512": 0.030,
            "cpu_1024": 0.061,
            "cpu_2048": 0.122,
            "cpu_4096": 0.244,
            "gpu_1": 0.53,
            "gpu_2": 1.05,
            "gpu_4": 2.10,
        }
        
        hourly_rate = cost_per_hour.get(compute_type, 1.0)
        cost_per_sec = hourly_rate / 3600
        
        total_time = benchmark_result.total_time
        total_cost = cost_per_sec * total_time
        
        return {
            "compute_type": compute_type,
            "hourly_rate": hourly_rate,
            "total_time_sec": total_time,
            "total_cost": total_cost,
            "cost_per_op": total_cost / benchmark_result.num_operations,
            "ops_per_dollar": benchmark_result.num_operations / max(total_cost, 0.0001)
        }
    
    def save_results(self, filename: str = None):
        """Save benchmark results"""
        if not filename:
            filename = f"benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = self.results_dir / filename
        
        results_data = [asdict(r) for r in self.results]
        
        with open(filepath, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        logger.info(f"✓ Benchmark results saved to {filepath}")
        return filepath
    
    def print_summary(self):
        """Print benchmark summary"""
        if not self.results:
            logger.info("No benchmark results")
            return
        
        logger.info("\n" + "=" * 60)
        logger.info("Benchmark Summary")
        logger.info("=" * 60)
        
        for result in self.results:
            logger.info(f"\n{result.name}:")
            logger.info(f"  Operations: {result.num_operations}")
            logger.info(f"  Total Time: {result.total_time:.2f}s")
            logger.info(f"  Throughput: {result.throughput:.2f} ops/sec")
            logger.info(f"  Latency (ms):")
            logger.info(f"    Min: {result.min_latency:.2f}")
            logger.info(f"    Median: {result.median_latency:.2f}")
            logger.info(f"    Mean: {result.mean_latency:.2f}")
            logger.info(f"    Max: {result.max_latency:.2f}")
            logger.info(f"    StdDev: {result.stdev_latency:.2f}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    benchmarker = Benchmarker()
    
    # Example: estimate costs
    cpu_cost = benchmarker.estimate_cost("cpu_1024", duration_hours=1)
    logger.info(f"CPU Cost: {cpu_cost}")
    
    gpu_cost = benchmarker.estimate_cost("gpu_1", duration_hours=1)
    logger.info(f"GPU Cost: {gpu_cost}")
