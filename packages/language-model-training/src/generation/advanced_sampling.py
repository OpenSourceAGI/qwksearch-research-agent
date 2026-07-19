"""
Advanced Q&A Sampling Strategies
Curriculum learning, hard example mining, uncertainty sampling
"""

import logging
import random
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SamplingStrategy:
    """Base sampling strategy"""
    name: str
    description: str


class CurriculumSampler:
    """Curriculum learning - easy to hard progression"""
    
    def __init__(self, qa_pairs: List[Dict[str, str]]):
        self.qa_pairs = qa_pairs
        self.difficulty_scores = {}
    
    def estimate_difficulty(self, qa: Dict[str, str]) -> float:
        """Estimate question difficulty (0-1, higher = harder)"""
        # Simple heuristics
        context_len = len(qa.get('context', '').split())
        question_len = len(qa.get('question', '').split())
        answer_len = len(qa.get('answer', '').split())
        
        # Longer context, longer question = harder
        difficulty = min(1.0, (context_len + question_len) / 1000.0)
        
        return difficulty
    
    def get_curriculum_batch(self, batch_size: int, stage: int = 0) -> List[Dict[str, str]]:
        """
        Get batch for curriculum stage
        stage 0: easiest 20%
        stage 1: easy-medium 40%
        stage 2: medium 60%
        stage 3: hard 80%
        stage 4: hardest 100%
        """
        # Calculate difficulty for all
        difficulties = []
        for qa in self.qa_pairs:
            diff = self.estimate_difficulty(qa)
            difficulties.append((diff, qa))
        
        # Sort by difficulty
        difficulties.sort(key=lambda x: x[0])
        
        # Get range for this stage
        ranges = {
            0: (0.0, 0.2),
            1: (0.2, 0.4),
            2: (0.4, 0.6),
            3: (0.6, 0.8),
            4: (0.8, 1.0)
        }
        
        min_diff, max_diff = ranges.get(min(stage, 4), (0.8, 1.0))
        
        # Sample from this range
        candidates = [
            qa for diff, qa in difficulties
            if min_diff <= diff <= max_diff
        ]
        
        batch = random.sample(candidates, min(batch_size, len(candidates)))
        
        logger.info(f"Curriculum stage {stage}: {len(candidates)} candidates, sampling {len(batch)}")
        
        return batch


class HardExampleMiner:
    """Mine hard examples (low-scoring predictions)"""
    
    def __init__(self, qa_pairs: List[Dict[str, str]]):
        self.qa_pairs = qa_pairs
        self.hard_examples = []
        self.easy_examples = []
    
    def record_score(self, qa: Dict[str, str], score: float):
        """Record prediction score for a Q&A pair"""
        if score < 0.5:
            self.hard_examples.append((qa, score))
        elif score > 0.8:
            self.easy_examples.append((qa, score))
    
    def get_hard_batch(self, batch_size: int) -> List[Dict[str, str]]:
        """Get batch of hard examples"""
        if not self.hard_examples:
            logger.warning("No hard examples yet, sampling random batch")
            return random.sample(self.qa_pairs, min(batch_size, len(self.qa_pairs)))
        
        # Sort by score (lowest first)
        self.hard_examples.sort(key=lambda x: x[1])
        
        # Get hardest examples
        hard_batch = [qa for qa, score in self.hard_examples[:batch_size]]
        
        logger.info(f"Hard batch: {len(hard_batch)} examples, avg score: {sum(s for _, s in self.hard_examples[:batch_size]) / len(hard_batch):.4f}")
        
        return hard_batch
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get mining statistics"""
        return {
            'total_hard': len(self.hard_examples),
            'total_easy': len(self.easy_examples),
            'hard_avg_score': sum(s for _, s in self.hard_examples) / len(self.hard_examples) if self.hard_examples else 0.0,
            'easy_avg_score': sum(s for _, s in self.easy_examples) / len(self.easy_examples) if self.easy_examples else 0.0,
        }


class UncertaintySampler:
    """Uncertainty sampling - sample predictions with highest uncertainty"""
    
    def __init__(self, qa_pairs: List[Dict[str, str]]):
        self.qa_pairs = qa_pairs
        self.uncertainties = {}
    
    def record_confidence(self, qa_id: str, confidence: float):
        """Record model confidence (0-1, lower = more uncertain)"""
        self.uncertainties[qa_id] = 1.0 - confidence  # uncertainty
    
    def get_uncertain_batch(self, batch_size: int) -> List[Dict[str, str]]:
        """Get batch of most uncertain predictions"""
        if not self.uncertainties:
            logger.warning("No uncertainty scores yet")
            return random.sample(self.qa_pairs, min(batch_size, len(self.qa_pairs)))
        
        # Sort by uncertainty (highest first)
        sorted_uncertain = sorted(
            self.uncertainties.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Map back to QA pairs
        uncertain_ids = [qa_id for qa_id, _ in sorted_uncertain[:batch_size]]
        uncertain_batch = [
            qa for qa in self.qa_pairs
            if qa.get('id') in uncertain_ids
        ]
        
        logger.info(f"Uncertain batch: {len(uncertain_batch)} examples")
        
        return uncertain_batch


class DiversitySampler:
    """Diversity sampling - sample diverse examples"""
    
    def __init__(self, qa_pairs: List[Dict[str, str]]):
        self.qa_pairs = qa_pairs
    
    def get_diverse_batch(self, batch_size: int) -> List[Dict[str, str]]:
        """
        Get diverse batch by stratified sampling
        - Different context lengths
        - Different question types
        - Different answer patterns
        """
        # Group by context length
        by_context_len = {}
        for qa in self.qa_pairs:
            ctx_len = len(qa.get('context', '').split()) // 100  # Buckets of 100 words
            if ctx_len not in by_context_len:
                by_context_len[ctx_len] = []
            by_context_len[ctx_len].append(qa)
        
        # Sample from each group
        batch = []
        samples_per_group = batch_size // len(by_context_len)
        
        for group, items in by_context_len.items():
            group_batch = random.sample(items, min(samples_per_group, len(items)))
            batch.extend(group_batch)
        
        # Fill remaining with random samples if needed
        if len(batch) < batch_size:
            remaining = batch_size - len(batch)
            batch.extend(random.sample(self.qa_pairs, min(remaining, len(self.qa_pairs))))
        
        logger.info(f"Diverse batch: {len(batch)} examples from {len(by_context_len)} groups")
        
        return batch


class AdaptiveSampler:
    """Adaptive sampling - switches between strategies based on performance"""
    
    def __init__(self, qa_pairs: List[Dict[str, str]]):
        self.qa_pairs = qa_pairs
        self.curriculum = CurriculumSampler(qa_pairs)
        self.hard_miner = HardExampleMiner(qa_pairs)
        self.diversity = DiversitySampler(qa_pairs)
        self.stage = 0
    
    def get_adaptive_batch(self, batch_size: int, improvement: float) -> Tuple[List[Dict[str, str]], str]:
        """
        Adaptively select sampling strategy
        
        Args:
            batch_size: Size of batch to return
            improvement: Recent improvement metric (positive = improving)
        
        Returns:
            (batch, strategy_name)
        """
        if improvement < 0.01:
            # Not improving - use hard examples
            strategy = "hard_mining"
            batch = self.hard_miner.get_hard_batch(batch_size)
        elif self.stage < 5 and improvement > 0.05:
            # Improving - progress curriculum
            strategy = "curriculum"
            self.stage = min(self.stage + 1, 4)
            batch = self.curriculum.get_curriculum_batch(batch_size, self.stage)
        else:
            # Stable - use diversity
            strategy = "diversity"
            batch = self.diversity.get_diverse_batch(batch_size)
        
        logger.info(f"Adaptive sampling: {strategy} (curriculum stage {self.stage}, improvement {improvement:.4f})")
        
        return batch, strategy


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    # Example usage
    sample_qa = [
        {'id': f'q{i}', 'question': f'Q{i}?', 'answer': f'A{i}', 'context': 'x ' * (100 * i)}
        for i in range(100)
    ]
    
    # Curriculum
    curriculum = CurriculumSampler(sample_qa)
    for stage in range(5):
        batch = curriculum.get_curriculum_batch(10, stage)
        logger.info(f"Stage {stage}: got {len(batch)} samples")
