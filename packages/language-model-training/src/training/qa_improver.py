"""
Q&A Evaluation and Improvement Pipeline
Uses SQuAD dataset for continuous Q&A testing and model improvement
"""

import json
import logging
import time
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime
import random

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class QAResult:
    """Result of a Q&A prediction"""
    question: str
    expected_answer: str
    predicted_answer: str
    context: str
    score: float
    timestamp: str
    model_version: str


class QAEvaluator:
    """Evaluates model Q&A performance"""
    
    @staticmethod
    def exact_match_score(predicted: str, expected: str) -> float:
        """Calculate exact match score"""
        return 1.0 if predicted.strip().lower() == expected.strip().lower() else 0.0
    
    @staticmethod
    def token_overlap_score(predicted: str, expected: str) -> float:
        """Calculate token-level F1 score"""
        pred_tokens = set(predicted.lower().split())
        expected_tokens = set(expected.lower().split())
        
        if not pred_tokens or not expected_tokens:
            return 0.0
        
        common = pred_tokens & expected_tokens
        precision = len(common) / len(pred_tokens) if pred_tokens else 0
        recall = len(common) / len(expected_tokens) if expected_tokens else 0
        
        if precision + recall == 0:
            return 0.0
        
        f1 = 2 * (precision * recall) / (precision + recall)
        return f1
    
    @staticmethod
    def combined_score(predicted: str, expected: str, em_weight: float = 0.5) -> float:
        """Combined exact match + token overlap score"""
        em = QAEvaluator.exact_match_score(predicted, expected)
        token_f1 = QAEvaluator.token_overlap_score(predicted, expected)
        return em_weight * em + (1 - em_weight) * token_f1
    
    @staticmethod
    def evaluate_batch(predictions: List[Tuple[str, str]]) -> Dict[str, float]:
        """Evaluate a batch of predictions"""
        scores = []
        
        for predicted, expected in predictions:
            score = QAEvaluator.combined_score(predicted, expected)
            scores.append(score)
        
        if not scores:
            return {'mean': 0.0, 'std': 0.0, 'min': 0.0, 'max': 0.0}
        
        return {
            'mean': np.mean(scores),
            'std': np.std(scores),
            'min': np.min(scores),
            'max': np.max(scores),
            'count': len(scores)
        }


class QAImproverLoop:
    """Self-recursive loop for continuous Q&A model improvement"""
    
    def __init__(
        self,
        model_trainer,
        qa_data_file: str,
        checkpoint_dir: str = "/data/checkpoints",
        log_dir: str = "/data/logs",
        iteration_limit: Optional[int] = None,
        min_improvement: float = 0.01
    ):
        self.model_trainer = model_trainer
        self.qa_data_file = Path(qa_data_file)
        self.checkpoint_dir = Path(checkpoint_dir)
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self.iteration_limit = iteration_limit
        self.min_improvement = min_improvement
        self.iteration = 0
        self.best_score = 0.0
        self.scores_history: List[Dict[str, Any]] = []
    
    def load_qa_data(self) -> List[Dict[str, str]]:
        """Load Q&A data from file"""
        try:
            with open(self.qa_data_file, 'r', encoding='utf-8') as f:
                qa_pairs = json.load(f)
            logger.info(f"Loaded {len(qa_pairs)} Q&A pairs")
            return qa_pairs
        except Exception as e:
            logger.error(f"Failed to load Q&A data: {e}")
            return []
    
    def sample_qa_batch(self, qa_pairs: List[Dict[str, str]], batch_size: int = 32) -> List[Dict[str, str]]:
        """Sample random batch of Q&A pairs"""
        return random.sample(qa_pairs, min(batch_size, len(qa_pairs)))
    
    def evaluate_qa_batch(self, qa_batch: List[Dict[str, str]]) -> Tuple[List[QAResult], float]:
        """Evaluate model on Q&A batch"""
        results = []
        predictions = []
        
        for qa in qa_batch:
            try:
                # Generate answer using model
                context = qa['context']
                question = qa['question']
                expected_answer = qa['answer']
                
                # This would call your actual model inference
                predicted_answer = self.model_trainer.generate_qa_answer(
                    context=context,
                    question=question
                )
                
                # Calculate score
                score = QAEvaluator.combined_score(predicted_answer, expected_answer)
                predictions.append((predicted_answer, expected_answer))
                
                result = QAResult(
                    question=question,
                    expected_answer=expected_answer,
                    predicted_answer=predicted_answer,
                    context=context[:100],  # Truncate for logging
                    score=score,
                    timestamp=datetime.now().isoformat(),
                    model_version=f"iteration_{self.iteration}"
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Error evaluating Q&A: {e}")
        
        # Calculate batch metrics
        eval_metrics = QAEvaluator.evaluate_batch(predictions)
        batch_score = eval_metrics.get('mean', 0.0)
        
        return results, batch_score
    
    def save_results(self, results: List[QAResult]):
        """Save evaluation results to file"""
        output_file = self.log_dir / f"qa_results_iter_{self.iteration}.json"
        
        results_data = [
            {
                'question': r.question,
                'expected_answer': r.expected_answer,
                'predicted_answer': r.predicted_answer,
                'score': r.score,
                'timestamp': r.timestamp,
                'model_version': r.model_version
            }
            for r in results
        ]
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved results to {output_file}")
    
    def train_on_errors(self, results: List[QAResult], num_epochs: int = 1):
        """Fine-tune model on questions it got wrong"""
        errors = [r for r in results if r.score < 0.5]
        
        if not errors:
            logger.info("No errors found, skipping training")
            return
        
        logger.info(f"Fine-tuning on {len(errors)} error cases")
        
        # Create training data from errors
        error_contexts = [r.context for r in errors]
        error_questions = [r.question for r in errors]
        error_answers = [r.expected_answer for r in errors]
        
        # Train on error cases
        try:
            self.model_trainer.finetune_qa(
                contexts=error_contexts,
                questions=error_questions,
                answers=error_answers,
                epochs=num_epochs
            )
            logger.info(f"✓ Fine-tuning complete")
        except Exception as e:
            logger.error(f"Error during fine-tuning: {e}")
    
    def save_checkpoint(self):
        """Save model checkpoint"""
        checkpoint_file = self.checkpoint_dir / f"qa_model_iter_{self.iteration}.pt"
        
        try:
            self.model_trainer.save_checkpoint(str(checkpoint_file))
            logger.info(f"✓ Checkpoint saved: {checkpoint_file}")
        except Exception as e:
            logger.error(f"Error saving checkpoint: {e}")
    
    def log_metrics(self, batch_score: float, results: List[QAResult]):
        """Log iteration metrics"""
        metrics = {
            'iteration': self.iteration,
            'timestamp': datetime.now().isoformat(),
            'batch_score': batch_score,
            'best_score': self.best_score,
            'improvement': batch_score - self.best_score,
            'num_results': len(results),
            'high_score_count': sum(1 for r in results if r.score > 0.8),
            'medium_score_count': sum(1 for r in results if 0.5 <= r.score <= 0.8),
            'low_score_count': sum(1 for r in results if r.score < 0.5)
        }
        
        self.scores_history.append(metrics)
        
        logger.info("\n" + "=" * 60)
        logger.info(f"Iteration {self.iteration} Results:")
        logger.info(f"  Batch Score:        {batch_score:.4f}")
        logger.info(f"  Best Score:         {self.best_score:.4f}")
        logger.info(f"  Improvement:        {metrics['improvement']:.4f}")
        logger.info(f"  High Score (>0.8):  {metrics['high_score_count']}")
        logger.info(f"  Medium Score:       {metrics['medium_score_count']}")
        logger.info(f"  Low Score (<0.5):   {metrics['low_score_count']}")
        logger.info("=" * 60 + "\n")
        
        return metrics
    
    def should_continue(self, batch_score: float) -> bool:
        """Determine if loop should continue"""
        # Check iteration limit
        if self.iteration_limit and self.iteration >= self.iteration_limit:
            logger.info(f"Reached iteration limit: {self.iteration_limit}")
            return False
        
        # Check improvement
        improvement = batch_score - self.best_score
        if improvement >= self.min_improvement:
            logger.info(f"✓ Improvement detected: {improvement:.4f}")
            self.best_score = batch_score
            return True
        elif self.best_score > 0:
            logger.info(f"No significant improvement: {improvement:.4f} < {self.min_improvement}")
            return False
        else:
            # First iteration, always continue
            self.best_score = batch_score
            return True
    
    def run(self, batch_size: int = 32, num_epochs: int = 1, max_iterations: Optional[int] = None):
        """Run the improvement loop"""
        logger.info("\n" + "=" * 60)
        logger.info("Starting Q&A Improvement Loop")
        logger.info("=" * 60 + "\n")
        
        # Load Q&A data
        qa_pairs = self.load_qa_data()
        if not qa_pairs:
            logger.error("No Q&A data available")
            return
        
        self.iteration = 0
        max_iterations = max_iterations or self.iteration_limit or 100
        
        try:
            while self.iteration < max_iterations:
                logger.info(f"\n>>> Starting Iteration {self.iteration + 1}")
                
                # Sample batch
                qa_batch = self.sample_qa_batch(qa_pairs, batch_size)
                
                # Evaluate
                results, batch_score = self.evaluate_qa_batch(qa_batch)
                
                # Save results
                self.save_results(results)
                
                # Log metrics
                self.log_metrics(batch_score, results)
                
                # Train on errors
                self.train_on_errors(results, num_epochs)
                
                # Save checkpoint
                self.save_checkpoint()
                
                # Check if should continue
                self.iteration += 1
                if not self.should_continue(batch_score):
                    if self.best_score >= 0.8:
                        logger.info("✓ Reached acceptable performance, stopping")
                    else:
                        logger.info("No improvement detected, stopping")
                    break
                
                # Small delay between iterations
                time.sleep(1)
        
        except KeyboardInterrupt:
            logger.info("\n✓ Improvement loop interrupted by user")
        except Exception as e:
            logger.error(f"✗ Error in improvement loop: {e}", exc_info=True)
        finally:
            # Save history
            self.save_history()
            logger.info("\n✓ Q&A Improvement Loop Complete")
    
    def save_history(self):
        """Save metrics history to file"""
        history_file = self.log_dir / "qa_improvement_history.json"
        
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(self.scores_history, f, indent=2)
        
        logger.info(f"Saved history to {history_file}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    # This is a template - integrate with your actual model
    logger.info("Q&A Improvement Loop ready")
    logger.info("Integrate with your model trainer to start")
