from src.training.distributed_training import (
    DataParallelTrainer,
    DistributedTrainer,
    GradientAccumulationTrainer,
)


class DummyModel:
    pass


def test_setup_distributed_returns_false_without_rank_env(monkeypatch):
    monkeypatch.delenv("RANK", raising=False)
    trainer = DistributedTrainer(model=DummyModel(), num_gpus=1)
    assert trainer.setup_distributed() is False


def test_train_distributed_falls_back_to_single_gpu(monkeypatch):
    trainer = DistributedTrainer(model=DummyModel(), num_gpus=1)

    monkeypatch.setattr(trainer, "setup_distributed", lambda: False)
    result = trainer.train_distributed(qa_pairs=[{"q": "x", "a": "y"}], batch_size=2, epochs=1)

    assert result["status"] == "single gpu training completed"


def test_get_distributed_status_not_initialized(monkeypatch):
    trainer = DistributedTrainer(model=DummyModel(), num_gpus=1)

    status = trainer.get_distributed_status()
    assert status["distributed"] is False
    assert "gpus" in status


def test_data_parallel_returns_original_model_when_single_gpu():
    model = DummyModel()
    trainer = DataParallelTrainer(model)
    trainer.device_ids = [0]

    assert trainer.parallelize_model() is model


def test_gradient_accumulation_returns_completed_status():
    trainer = GradientAccumulationTrainer(model=DummyModel(), accumulation_steps=4)
    result = trainer.train_with_accumulation(
        qa_pairs=[{"q": "x", "a": "y"}],
        batch_size=8,
        effective_batch_size=32,
        epochs=1,
    )

    assert result["status"] == "gradient accumulation training completed"
