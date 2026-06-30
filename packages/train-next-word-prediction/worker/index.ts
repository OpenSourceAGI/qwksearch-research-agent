/**
 * Cloudflare Worker entry point for running this package's training container
 * behind Cloudflare Containers.
 *
 * The Worker itself does no work - it just routes incoming requests to a
 * `TrainingContainer` Durable Object instance, which Cloudflare backs with the
 * Docker image built from ../Dockerfile (a FastAPI control API, see
 * src/server.py, listening on $PORT).
 *
 * Local dev:   bunx wrangler dev          (requires Docker running locally)
 * Deploy:      bunx wrangler deploy
 *
 * Docs: https://developers.cloudflare.com/containers/
 */
import { Container, getContainer } from "@cloudflare/containers";

export class TrainingContainer extends Container {
  // Matches the Dockerfile's `ENV PORT=8080` / `EXPOSE 8080`.
  defaultPort = 8080;

  // Spin the container down after this much idle time so you're not billed
  // for a process sitting around between requests. Long-running jobs (the
  // Wikipedia download or a training run) are started via a POST to
  // /api/jobs/.../start and tracked by the FastAPI server itself, so the
  // container can still sleep between status-poll requests.
  sleepAfter = "10m";

  override onStart() {
    console.log("TrainingContainer instance started");
  }

  override onStop() {
    console.log("TrainingContainer instance stopped");
  }
}

export interface Env {
  TRAINING_CONTAINER: DurableObjectNamespace<TrainingContainer>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Single shared instance ("default") so repeated requests (status polls,
    // log streaming) land on the same container/process instead of fanning
    // out across replicas. Swap for a per-session/per-user name if you need
    // isolated containers per caller.
    const container = getContainer(env.TRAINING_CONTAINER, "default");
    return container.fetch(request);
  },
};
