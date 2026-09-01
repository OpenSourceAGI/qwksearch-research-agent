"""
Runs the training job on a rented Vast.ai GPU instead of in-process.

VastJob implements the same interface as the plain subprocess `Job` in
server.py (`.running`, `.exit_code`, `.stop()`, `.tail()`, `.to_dict()`), so
the existing /api/jobs/train/* routes and the webui's JobPanel/SSE log
stream work unmodified - only where "train" actually runs changes.

Lifecycle, run entirely on a background thread:
  1. Search Vast.ai offers, pick the best one under the price cap, accept it
     (this creates the instance) and wait for it to report `running`.
  2. Wait for SSH to come up, then scp the package's src/, scripts/, and
     requirements.txt onto the instance and drop a generated run.sh that
     installs deps, runs the training command, and records its exit code.
  3. Touch a READY sentinel file; the instance's onstart script (a wait
     loop) picks it up and launches run.sh.
  4. `ssh ... tail -F` the remote log into this job's local log file, so
     the existing tail()/SSE-stream code paths need no changes.
  5. Poll for the exit-code sentinel file; once seen, stop tailing and
     (optionally) destroy the instance so billing stops.

Requires VAST_API_KEY, and an SSH keypair where the *public* half is
already added to the Vast.ai account (Settings -> SSH Keys) - Vast has no
API for pushing a one-off key at instance-creation time. Point
VAST_SSH_KEY_PATH at the matching private key (default ~/.ssh/id_rsa).
"""

import dataclasses
import logging
import os
import shlex
import subprocess
import threading
import time
from typing import Optional

from ..cloud.vast_utils import VastAPIError, VastClient, pick_best_offer

logger = logging.getLogger(__name__)

REMOTE_PROJECT_DIR = "/workspace/project"
REMOTE_LOG_FILE = "/workspace/train.log"
REMOTE_EXIT_FILE = "/workspace/train.exit"
REMOTE_READY_FILE = "/workspace/READY"
REMOTE_RUN_SCRIPT = "/workspace/run.sh"


@dataclasses.dataclass
class VastTrainConfig:
    gpu_name: str = "RTX_4090"
    num_gpus: int = 1
    max_hourly: float = 1.5
    image: str = "pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime"
    disk_gb: float = 64
    train_cmd: str = "pip install -r requirements.txt && python src/training/wikipedia_transformer.py"
    destroy_on_finish: bool = True
    ssh_key_path: str = os.path.expanduser(os.getenv("VAST_SSH_KEY_PATH", "~/.ssh/id_rsa"))
    poll_seconds: float = 15
    ssh_ready_timeout: float = 300
    instance_running_timeout: float = 900

    @classmethod
    def from_env(cls) -> "VastTrainConfig":
        return cls(
            gpu_name=os.getenv("VAST_GPU_NAME", cls.gpu_name),
            num_gpus=int(os.getenv("VAST_NUM_GPUS", cls.num_gpus)),
            max_hourly=float(os.getenv("VAST_MAX_HOURLY", cls.max_hourly)),
            image=os.getenv("VAST_IMAGE", cls.image),
            disk_gb=float(os.getenv("VAST_DISK_GB", cls.disk_gb)),
            train_cmd=os.getenv("VAST_TRAIN_CMD", cls.train_cmd),
            destroy_on_finish=os.getenv("VAST_DESTROY_ON_FINISH", "true").lower() != "false",
        )


def _onstart_script() -> str:
    # Idles until the orchestrator has finished uploading files, then runs them.
    return (
        f"mkdir -p {REMOTE_PROJECT_DIR} && touch {REMOTE_LOG_FILE} && "
        f"while [ ! -f {REMOTE_READY_FILE} ]; do sleep 2; done && "
        f"bash {REMOTE_RUN_SCRIPT}"
    )


def _run_script(train_cmd: str) -> str:
    return (
        "#!/bin/bash\n"
        "set -uo pipefail\n"
        f"cd {REMOTE_PROJECT_DIR}\n"
        f"( {train_cmd} ) >> {REMOTE_LOG_FILE} 2>&1\n"
        f"echo $? > {REMOTE_EXIT_FILE}\n"
    )


class VastJob:
    """A training run provisioned on Vast.ai; same surface as the local `Job`."""

    def __init__(self, name: str, log_dir: str, project_dir: str, config: VastTrainConfig):
        self.name = name
        self.project_dir = project_dir
        self.config = config
        self.log_path = os.path.join(log_dir, f"{name}.log")
        self.started_at = time.time()
        self.finished_at: Optional[float] = None
        self.instance_id: Optional[int] = None
        self.ssh_host: Optional[str] = None
        self.ssh_port: Optional[int] = None
        self.offer: dict = {}

        self._exit_code: Optional[int] = None
        self._stop_requested = threading.Event()
        self._tail_proc: Optional[subprocess.Popen] = None
        self._log_file = open(self.log_path, "w")
        self._vast = VastClient()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    # -- Job interface expected by server.py --------------------------------

    @property
    def running(self) -> bool:
        return self.finished_at is None

    @property
    def exit_code(self) -> Optional[int]:
        return self._exit_code

    def stop(self) -> bool:
        if not self.running:
            return False
        self._stop_requested.set()
        self._teardown(exit_code=self._exit_code if self._exit_code is not None else -1)
        return True

    def tail(self, max_lines: int = 200) -> str:
        try:
            with open(self.log_path, "r", errors="replace") as f:
                return "".join(f.readlines()[-max_lines:])
        except FileNotFoundError:
            return ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "running": self.running,
            "exit_code": self.exit_code,
            "pid": self.instance_id or 0,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "log_tail": self.tail(),
            "backend": "vast.ai",
            "instance_id": self.instance_id,
            "ssh_host": self.ssh_host,
            "ssh_port": self.ssh_port,
            "gpu_name": self.offer.get("gpu_name", self.config.gpu_name),
            "cost_per_hour": self.offer.get("dph_total"),
        }

    # -- internals ------------------------------------------------------------

    def _log(self, line: str) -> None:
        self._log_file.write(line.rstrip("\n") + "\n")
        self._log_file.flush()

    def _ssh_base(self) -> list:
        return [
            "ssh",
            "-i", self.config.ssh_key_path,
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-p", str(self.ssh_port),
            f"root@{self.ssh_host}",
        ]

    def _scp(self, local_path: str, remote_path: str, recursive: bool = False) -> None:
        cmd = ["scp"] + (["-r"] if recursive else []) + [
            "-i", self.config.ssh_key_path,
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-P", str(self.ssh_port),
            local_path,
            f"root@{self.ssh_host}:{remote_path}",
        ]
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)

    def _ssh_exec(self, remote_cmd: str, timeout: float = 30) -> subprocess.CompletedProcess:
        return subprocess.run(self._ssh_base() + [remote_cmd], capture_output=True, timeout=timeout)

    def _run(self) -> None:
        try:
            self._provision()
            self._wait_for_ssh()
            self._upload_project()
            self._start_tail()
            self._wait_for_completion()
        except Exception as exc:  # noqa: BLE001 - surface any failure into the job log
            logger.exception("Vast.ai training job %s failed", self.name)
            self._log(f"[vast] job failed: {exc}")
            self._teardown(exit_code=1)

    def _provision(self) -> None:
        self._log(f"[vast] searching offers for {self.config.num_gpus}x {self.config.gpu_name} "
                   f"under ${self.config.max_hourly}/hr")
        offers = self._vast.search_offers(
            gpu_name=self.config.gpu_name,
            num_gpus=self.config.num_gpus,
            max_hourly=self.config.max_hourly,
        )
        self.offer = pick_best_offer(offers, max_hourly=self.config.max_hourly)
        self._log(f"[vast] selected offer {self.offer.get('id')} "
                   f"(${self.offer.get('dph_total')}/hr, {self.offer.get('gpu_name')})")

        created = self._vast.create_instance(
            int(self.offer["id"]),
            image=self.config.image,
            disk=self.config.disk_gb,
            onstart=_onstart_script(),
        )
        self.instance_id = int(created.get("new_contract") or created.get("id"))
        self._log(f"[vast] created instance {self.instance_id}, waiting for it to boot")

        deadline = time.time() + self.config.instance_running_timeout
        while time.time() < deadline:
            if self._stop_requested.is_set():
                return
            info = self._vast.show_instance(self.instance_id)
            if info.get("actual_status") == "running":
                self.ssh_host = info.get("ssh_host") or info.get("public_ipaddr")
                self.ssh_port = int(info.get("ssh_port", 22))
                self._log(f"[vast] instance running at {self.ssh_host}:{self.ssh_port}")
                return
            time.sleep(self.config.poll_seconds)
        raise VastAPIError(f"Timed out waiting for instance {self.instance_id} to reach 'running'")

    def _wait_for_ssh(self) -> None:
        self._log("[vast] waiting for SSH to come up")
        deadline = time.time() + self.config.ssh_ready_timeout
        while time.time() < deadline:
            if self._stop_requested.is_set():
                return
            result = self._ssh_exec("true", timeout=15)
            if result.returncode == 0:
                self._log("[vast] SSH is up")
                return
            time.sleep(5)
        raise VastAPIError(f"Timed out waiting for SSH on instance {self.instance_id}")

    def _upload_project(self) -> None:
        self._log("[vast] uploading project files")
        run_sh_path = os.path.join(os.path.dirname(self.log_path), f"{self.name}.run.sh")
        with open(run_sh_path, "w") as f:
            f.write(_run_script(self.config.train_cmd))

        for rel in ("src", "scripts", "requirements.txt"):
            local_path = os.path.join(self.project_dir, rel)
            if os.path.exists(local_path):
                self._scp(local_path, REMOTE_PROJECT_DIR + "/", recursive=os.path.isdir(local_path))

        self._scp(run_sh_path, REMOTE_RUN_SCRIPT)
        self._ssh_exec(f"chmod +x {shlex.quote(REMOTE_RUN_SCRIPT)}")
        self._ssh_exec(f"touch {shlex.quote(REMOTE_READY_FILE)}")
        self._log("[vast] upload complete, training started remotely")

    def _start_tail(self) -> None:
        self._tail_proc = subprocess.Popen(
            self._ssh_base() + [f"touch {REMOTE_LOG_FILE}; tail -n +1 -F {REMOTE_LOG_FILE}"],
            stdout=self._log_file,
            stderr=subprocess.STDOUT,
        )

    def _wait_for_completion(self) -> None:
        while not self._stop_requested.is_set():
            result = self._ssh_exec(f"cat {shlex.quote(REMOTE_EXIT_FILE)} 2>/dev/null || true", timeout=15)
            output = result.stdout.decode(errors="replace").strip()
            if output:
                try:
                    self._teardown(exit_code=int(output.splitlines()[-1]))
                    return
                except ValueError:
                    pass

            info = self._vast.show_instance(self.instance_id)
            if info.get("actual_status") not in ("running", "loading"):
                self._log(f"[vast] instance left running state ({info.get('actual_status')})")
                self._teardown(exit_code=1)
                return

            time.sleep(self.config.poll_seconds)

    def _teardown(self, exit_code: int) -> None:
        if self.finished_at is not None:
            return
        self._exit_code = exit_code
        self.finished_at = time.time()

        if self._tail_proc and self._tail_proc.poll() is None:
            self._tail_proc.terminate()

        if self.instance_id is not None:
            try:
                if self.config.destroy_on_finish:
                    self._vast.destroy_instance(self.instance_id)
                    self._log(f"[vast] destroyed instance {self.instance_id}")
                else:
                    self._vast.stop_instance(self.instance_id)
                    self._log(f"[vast] stopped instance {self.instance_id}")
            except VastAPIError as exc:
                self._log(f"[vast] failed to tear down instance {self.instance_id}: {exc}")

        self._log(f"[vast] job finished with exit code {exit_code}")
