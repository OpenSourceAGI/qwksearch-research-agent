"""
Training loop orchestration: gradient accumulation, clipping, checkpointing,
and sample generation for monitoring progress during Wikipedia-scale training.
"""

import json
import os
import time

from tinygrad.nn.optim import Adam
from tinygrad.tensor import Tensor

from ..core.config import WikipediaConfig
from ..data.dataset import WikipediaDataset
from ..architecture.model import GPTStyleTransformer
from .scheduler import LearningRateScheduler
from ..data.tokenizer import WikipediaTokenizer


class WikipediaTrainer:
    """Owns the optimizer, scheduler, and training/checkpointing loop for one model."""

    def __init__(self, config: WikipediaConfig, model: GPTStyleTransformer,
                 tokenizer: WikipediaTokenizer, dataset: WikipediaDataset):
        self.config = config
        self.model = model
        self.tokenizer = tokenizer
        self.dataset = dataset

        self.optimizer = Adam(model.get_parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)

        total_steps = (len(dataset) // (config.batch_size * config.gradient_accumulation_steps)) * config.num_training_epochs
        self.scheduler = LearningRateScheduler(self.optimizer, config.warmup_steps, total_steps, config.learning_rate)

        self.global_step = 0
        self.epoch = 0
        self.best_loss = float("inf")
        self.training_losses = []
        self.validation_losses = []

        print(f"Initialized trainer with {total_steps:,} total training steps")
        print(f"Model parameters: {sum(p.numel() for p in model.get_parameters() if p is not None):,}")

    def save_checkpoint(self, filepath: str, is_best: bool = False) -> None:
        """Save checkpoint metadata to disk (tinygrad weight serialization is left to safetensors/state_dict)."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        metadata_path = filepath.replace(".pt", "_metadata.json")
        with open(metadata_path, "w") as f:
            json.dump({
                "epoch": self.epoch,
                "global_step": self.global_step,
                "best_loss": self.best_loss,
                "config": self.config.__dict__,
            }, f, indent=2)
        print(f"Saved checkpoint to {metadata_path}")

        if is_best:
            best_path = filepath.replace(".pt", "_best.json")
            with open(best_path, "w") as f:
                json.dump({
                    "epoch": self.epoch,
                    "global_step": self.global_step,
                    "best_loss": self.best_loss,
                    "message": "Best model checkpoint",
                }, f, indent=2)
            print(f"Saved best model checkpoint to {best_path}")

    def clip_gradients(self) -> float:
        """Global-norm gradient clipping for training stability."""
        total_norm = 0.0
        for param in self.model.get_parameters():
            if param.grad is not None:
                total_norm += param.grad.norm() ** 2
        total_norm = total_norm ** 0.5

        if total_norm > self.config.gradient_clip_norm:
            clip_coef = self.config.gradient_clip_norm / (total_norm + 1e-8)
            for param in self.model.get_parameters():
                if param.grad is not None:
                    param.grad *= clip_coef

        return total_norm

    def compute_loss(self, input_ids: Tensor, target_ids: Tensor) -> Tensor:
        """Cross-entropy loss between predicted and target next tokens."""
        logits = self.model(input_ids)
        batch_size, seq_len, vocab_size = logits.shape
        return logits.reshape(-1, vocab_size).sparse_categorical_crossentropy(target_ids.reshape(-1))

    def train_epoch(self) -> float:
        """Run one full pass over the dataset, returning the average loss."""
        epoch_losses = []
        accumulated_loss = 0.0
        num_batches = len(self.dataset) // self.config.batch_size

        print(f"Training epoch {self.epoch + 1}/{self.config.num_training_epochs}")
        print(f"Processing {num_batches:,} batches")

        for batch_idx in range(num_batches):
            input_ids, target_ids = self.dataset.get_batch(self.config.batch_size)

            loss = self.compute_loss(input_ids, target_ids)
            scaled_loss = loss / self.config.gradient_accumulation_steps
            scaled_loss.backward()

            accumulated_loss += loss.item()

            if (batch_idx + 1) % self.config.gradient_accumulation_steps == 0:
                grad_norm = self.clip_gradients()

                self.optimizer.step()
                self.optimizer.zero_grad()
                current_lr = self.scheduler.step()

                self.global_step += 1
                avg_loss = accumulated_loss / self.config.gradient_accumulation_steps
                epoch_losses.append(avg_loss)
                self.training_losses.append(avg_loss)

                if self.global_step % self.config.log_every_steps == 0:
                    print(f"Step {self.global_step:,} | Loss: {avg_loss:.4f} | "
                          f"LR: {current_lr:.2e} | Grad Norm: {grad_norm:.2f}")

                if self.global_step % self.config.save_every_steps == 0:
                    checkpoint_path = os.path.join(
                        self.config.model_checkpoint_dir, f"checkpoint_step_{self.global_step}.pt"
                    )
                    self.save_checkpoint(checkpoint_path)

                accumulated_loss = 0.0

        return sum(epoch_losses) / len(epoch_losses) if epoch_losses else float("inf")

    def generate_sample_text(self, prompt: str = "The", max_length: int = 100) -> str:
        """Generate sample text from the current model state for qualitative monitoring."""
        prompt_ids = self.tokenizer.tokenize(prompt)
        current_ids = Tensor([prompt_ids])

        for _ in range(max_length):
            if current_ids.shape[1] >= self.config.sequence_max_length:
                break

            with Tensor.no_grad():
                logits = self.model(current_ids)
                next_token_logits = logits[0, -1, :] / self.config.generation_temperature

                probs = next_token_logits.softmax(axis=-1)
                next_token = probs.multinomial(1)

                current_ids = current_ids.cat(next_token.unsqueeze(0).unsqueeze(0), dim=1)

                if next_token.item() == self.tokenizer.token_to_id.get("<EOS>", -1):
                    break

        generated_ids = current_ids[0].numpy().tolist()
        return self.tokenizer.detokenize(generated_ids)

    def train(self) -> dict:
        """Run the full multi-epoch training loop with checkpointing and recovery."""
        print("Starting Wikipedia transformer training...")
        print(f"Dataset size: {len(self.dataset):,} sequences")
        print(f"Training for {self.config.num_training_epochs} epochs")
        print(f"Checkpoints saved to: {self.config.model_checkpoint_dir}")

        start_time = time.time()

        try:
            for epoch in range(self.config.num_training_epochs):
                self.epoch = epoch

                epoch_loss = self.train_epoch()
                print(f"Epoch {epoch + 1} completed | Average Loss: {epoch_loss:.4f}")

                sample_text = self.generate_sample_text("The history of", max_length=50)
                print(f"Sample generation: {sample_text}")

                if epoch_loss < self.best_loss:
                    self.best_loss = epoch_loss
                    best_checkpoint_path = os.path.join(
                        self.config.model_checkpoint_dir, f"best_model_epoch_{epoch + 1}.pt"
                    )
                    self.save_checkpoint(best_checkpoint_path, is_best=True)

                print(f"Epoch time: {(time.time() - start_time) / 60:.1f} minutes")
                start_time = time.time()

        except KeyboardInterrupt:
            print("\nTraining interrupted by user")
            interrupt_checkpoint = os.path.join(
                self.config.model_checkpoint_dir, f"interrupted_epoch_{self.epoch}_step_{self.global_step}.pt"
            )
            self.save_checkpoint(interrupt_checkpoint)
            print(f"Saved interrupted training state to {interrupt_checkpoint}")

        except Exception as exc:
            print(f"Training failed with error: {exc}")
            error_checkpoint = os.path.join(
                self.config.model_checkpoint_dir, f"error_epoch_{self.epoch}_step_{self.global_step}.pt"
            )
            self.save_checkpoint(error_checkpoint)
            print(f"Saved error state to {error_checkpoint}")
            raise

        print("Training completed successfully!")

        final_checkpoint = os.path.join(self.config.model_checkpoint_dir, "final_model.pt")
        self.save_checkpoint(final_checkpoint)

        return {
            "final_loss": self.best_loss,
            "total_steps": self.global_step,
            "training_losses": self.training_losses,
            "validation_losses": self.validation_losses,
        }
