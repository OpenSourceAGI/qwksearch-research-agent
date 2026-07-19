from fastapi.testclient import TestClient

import src.services.server as server


class _FakeJob:
    def __init__(self, name):
        self.name = name
        self.running = True
        self.exit_code = None

    def stop(self):
        self.running = False
        self.exit_code = 0
        return True

    def to_dict(self):
        return {
            "name": self.name,
            "running": self.running,
            "exit_code": self.exit_code,
            "pid": 1234,
            "started_at": 0,
            "finished_at": None,
            "log_tail": "",
        }


client = TestClient(server.app)


def setup_function():
    server._jobs.clear()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "train-next-word-prediction"


def test_status_endpoint_has_docs_and_jobs():
    response = client.get("/api/status")
    assert response.status_code == 200
    body = response.json()
    assert body["reference"] == "https://github.com/tinygrad/tinygrad"
    assert "docs" in body
    assert isinstance(body["jobs"], dict)


def test_sample_qa_endpoint_shape():
    response = client.get("/api/sample-qa")
    assert response.status_code == 200
    body = response.json()
    assert "providers" in body
    assert "samples" in body
    assert len(body["samples"]) > 0


def test_improve_endpoint_success(monkeypatch):
    def _fake_call(provider, api_key, question, draft_answer, model=None):
        assert provider == "openai"
        assert api_key == "test-key"
        return "Refined answer"

    monkeypatch.setattr(server, "call_professional_model", _fake_call)

    response = client.post(
        "/api/improve",
        json={
            "provider": "openai",
            "api_key": "test-key",
            "question": "Q?",
            "draft_answer": "A",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "openai"
    assert body["improved_answer"] == "Refined answer"


def test_start_and_stop_download_job(monkeypatch):
    monkeypatch.setattr(server, "_start_job", lambda name, cmd, env=None: _FakeJob(name))

    response = client.post("/api/jobs/download-wikipedia/start", json={"lang": "en"})
    assert response.status_code == 200
    assert response.json()["name"] == "download-wikipedia"

    fake = _FakeJob("download-wikipedia")
    server._jobs["download-wikipedia"] = fake

    stop_response = client.post("/api/jobs/download-wikipedia/stop")
    assert stop_response.status_code == 200
    assert stop_response.json()["stopped"] is True


def test_train_status_404_when_not_started():
    response = client.get("/api/jobs/train")
    assert response.status_code == 404
