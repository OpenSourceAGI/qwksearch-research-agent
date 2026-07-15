import json
import os
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

app = FastAPI()

AUTH_FILE = Path("/app/.auth.json")
AUTH_JSON = os.environ.get("NOTEBOOKLM_AUTH_JSON", "")

if AUTH_JSON and not AUTH_FILE.exists():
    AUTH_FILE.write_text(AUTH_JSON)


class Job(BaseModel):
    action: str
    notebookId: str | None = None
    sourceUrls: list[str] | None = None
    title: str | None = None
    prompt: str | None = None


def run_cmd(args: list[str], cwd: str) -> str:
    env = os.environ.copy()
    env["NOTEBOOKLM_AUTH_JSON"] = AUTH_JSON
    result = subprocess.run(
        args,
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Command failed: {result.stderr.strip()}",
        )
    return result.stdout.strip()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/store-auth")
async def store_auth(request: Request):
    body = await request.json()
    AUTH_FILE.write_text(json.dumps(body, indent=2))
    global AUTH_JSON
    AUTH_JSON = json.dumps(body)
    return {"stored": True}


@app.post("/run")
def run(job: Job):
    with tempfile.TemporaryDirectory() as td:
        if job.action == "list":
            out = run_cmd(["notebooklm", "list", "--json"], td)
            return json.loads(out)

        if job.action == "create":
            title = job.title or "Untitled"
            out = run_cmd(["notebooklm", "create", title, "--json"], td)
            result = json.loads(out)

            if job.sourceUrls:
                notebook_id = result.get("id", result.get("notebook_id"))
                if notebook_id:
                    run_cmd(["notebooklm", "use", notebook_id], td)
                    for url in job.sourceUrls:
                        run_cmd(["notebooklm", "source", "add", url], td)
                    out = run_cmd(["notebooklm", "source", "list", "--json"], td)
                    result["sources"] = json.loads(out)

            return result

        if job.action == "ask":
            if not job.notebookId or not job.prompt:
                raise HTTPException(
                    status_code=400,
                    detail="ask requires notebookId and prompt",
                )
            run_cmd(["notebooklm", "use", job.notebookId], td)
            out = run_cmd(["notebooklm", "ask", job.prompt, "--json"], td)
            return json.loads(out)

        if job.action == "summarize":
            if not job.sourceUrls or not job.prompt:
                raise HTTPException(
                    status_code=400,
                    detail="summarize requires sourceUrls and prompt",
                )
            title = job.title or "Summary Job"
            out = run_cmd(["notebooklm", "create", title, "--json"], td)
            result = json.loads(out)
            notebook_id = result.get("id", result.get("notebook_id"))

            if notebook_id:
                run_cmd(["notebooklm", "use", notebook_id], td)
                for url in job.sourceUrls:
                    run_cmd(["notebooklm", "source", "add", url], td)
                out = run_cmd(["notebooklm", "ask", job.prompt, "--json"], td)
                return json.loads(out)

            raise HTTPException(status_code=500, detail="Failed to create notebook")

        if job.action == "delete":
            if not job.notebookId:
                raise HTTPException(
                    status_code=400,
                    detail="delete requires notebookId",
                )
            out = run_cmd(
                ["notebooklm", "delete", job.notebookId, "--json"], td
            )
            return json.loads(out) if out else {"deleted": True}

        raise HTTPException(status_code=400, detail=f"Unknown action: {job.action}")
