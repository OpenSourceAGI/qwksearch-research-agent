Yes — the clean pattern is:

- **Worker** handles the public API and auth.
- **Docker container** runs `notebooklm-py` on demand.
- The Worker calls the container over an internal/private endpoint or a service layer. Cloudflare supports Worker-to-Worker service bindings, and its Containers docs describe container-to-Workers connectivity for bindings and internal HTTP flows. [developers.cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)

## Architecture

- Public request → Worker.
- Worker validates input, creates a job, calls your Docker service.
- Docker service runs Python with `NOTEBOOKLM_AUTH_JSON`.
- Docker returns JSON/artifact metadata to the Worker. [developers.cloudflare](https://developers.cloudflare.com/containers/platform-details/workers-connections/)

## Worker example

```ts
// src/index.ts
export interface Env {
  NOTEBOOK_RUNNER_URL: string;
  NOTEBOOK_RUNNER_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json<{
      action: "ask" | "summarize";
      notebookId?: string;
      sourceUrl?: string;
      prompt: string;
    }>();

    const runnerResp = await fetch(`${env.NOTEBOOK_RUNNER_URL}/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${env.NOTEBOOK_RUNNER_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    return new Response(runnerResp.body, {
      status: runnerResp.status,
      headers: { "content-type": "application/json" },
    });
  },
};
```

This keeps secrets out of the browser and makes the Worker an orchestrator, which fits Cloudflare’s service-oriented model. [developers.cloudflare](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/)

## Docker service example

```dockerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir notebooklm-py fastapi uvicorn

WORKDIR /app
COPY server.py /app/server.py

EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
```

```py
# server.py
import json
import os
import subprocess
import tempfile
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI()

RUNNER_TOKEN = os.environ["RUNNER_TOKEN"]
NOTEBOOKLM_AUTH_JSON = os.environ["NOTEBOOKLM_AUTH_JSON"]

class Job(BaseModel):
    action: str
    notebookId: str | None = None
    sourceUrl: str | None = None
    prompt: str

@app.post("/run")
def run(job: Job, authorization: str | None = Header(default=None)):
    if authorization != f"Bearer {RUNNER_TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")

    env = os.environ.copy()
    env["NOTEBOOKLM_AUTH_JSON"] = NOTEBOOKLM_AUTH_JSON

    with tempfile.TemporaryDirectory() as td:
        if job.action == "summarize" and job.sourceUrl:
            subprocess.run(
                ["notebooklm", "create", "CF Job"],
                env=env, cwd=td, check=True, capture_output=True, text=True
            )
            subprocess.run(
                ["notebooklm", "source", "add", job.sourceUrl],
                env=env, cwd=td, check=True, capture_output=True, text=True
            )
            result = subprocess.run(
                ["notebooklm", "ask", job.prompt, "--json"],
                env=env, cwd=td, check=True, capture_output=True, text=True
            )
            return json.loads(result.stdout)

        if job.action == "ask" and job.notebookId:
            result = subprocess.run(
                ["notebooklm", "use", job.notebookId],
                env=env, cwd=td, check=True, capture_output=True, text=True
            )
            result = subprocess.run(
                ["notebooklm", "ask", job.prompt, "--json"],
                env=env, cwd=td, check=True, capture_output=True, text=True
            )
            return json.loads(result.stdout)

        raise HTTPException(status_code=400, detail="invalid job")
```

The key part is injecting `NOTEBOOKLM_AUTH_JSON` as a secret at runtime, which the project documents for sandbox/headless use. Treat it like full account credentials. [github](https://github.com/teng-lin/notebooklm-py/blob/main/docs/installation.md)

## docker-compose example

```yaml
version: "3.9"
services:
  notebook-runner:
    build: .
    ports:
      - "8080:8080"
    environment:
      RUNNER_TOKEN: ${RUNNER_TOKEN}
      NOTEBOOKLM_AUTH_JSON: ${NOTEBOOKLM_AUTH_JSON}
```

## Wrangler example

```toml
name = "notebook-proxy"
main = "src/index.ts"
compatibility_date = "2026-07-14"

[vars]
NOTEBOOK_RUNNER_URL = "https://runner.internal.example.com"

[observability]
enabled = true
```

Set `NOTEBOOK_RUNNER_TOKEN` with `wrangler secret put NOTEBOOK_RUNNER_TOKEN`. Use a private origin, tunnel, or internal service path rather than a public unauthenticated endpoint. Cloudflare documents service bindings for internal Worker-to-Worker calls; if your runner is another Worker or a container-connected service, that is the preferred shape. [developers.cloudflare](https://developers.cloudflare.com/changelog/post/2026-03-26-outbound-workers/)

## Practical notes

- Do the initial `notebooklm login` **outside** Docker, then copy the resulting auth JSON into your secret manager. The project’s headless docs explicitly recommend this pattern. [github](https://github.com/teng-lin/notebooklm-py/blob/main/docs/installation.md)
- For production, queue jobs instead of blocking the Worker on long runs.
- Use one notebook per job or explicit notebook IDs to avoid cross-request collisions.
- Rotate the auth material if exposed; the security policy says whoever has it can impersonate your Google account. 

## Better Cloudflare-native variant

- Worker receives request.
- Worker enqueues work.
- A **container/sandbox** job processes it.
- Result goes to R2/D1/KV, then Worker returns polling status.

That matches Cloudflare’s newer model where containers and sandboxes can connect to Workers/bindings over internal HTTP. [developers.cloudflare](https://developers.cloudflare.com/containers/platform-details/workers-connections/)

Would you like the next version as:
- **minimal demo repo layout**, or
- **production version with Queue + R2 + polling**?