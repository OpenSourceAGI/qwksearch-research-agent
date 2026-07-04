"""
Learning rate scheduling: linear warmup followed by cosine decay.

Warmup prevents gradient explosion while parameters are randomly initialized;
cosine annealing afterwards lets the model settle into a good minimum.

Reference: https://arxiv.org/abs/1608.03983 (SGDR)
"""

import math


class LearningRateScheduler:
    def __init__(self, optimizer, warmup_steps: int, max_steps: int,
                 base_lr: float, min_lr: float = 1e-6):
        self.optimizer = optimizer
        self.warmup_steps = warmup_steps
        self.max_steps = max_steps
        self.base_lr = base_lr
        self.min_lr = min_lr
        self.current_step = 0

    def step(self) -> float:
        """Advance one step and update the optimizer's learning rate in place."""
        self.current_step += 1

        if self.current_step <= self.warmup_steps:
            lr = self.base_lr * (self.current_step / self.warmup_steps)
        else:
            progress = (self.current_step - self.warmup_steps) / (self.max_steps - self.warmup_steps)
            progress = min(progress, 1.0)
            lr = self.min_lr + (self.base_lr - self.min_lr) * 0.5 * (1 + math.cos(math.pi * progress))

        for param_group in self.optimizer.param_groups:
            param_group["lr"] = lr

        return lr
