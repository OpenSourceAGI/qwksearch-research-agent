import { DownloadPanel } from "@/components/dashboard/download-panel";
import { HealthBadge } from "@/components/dashboard/health-badge";
import { ImprovePanel } from "@/components/dashboard/improve-panel";
import { TrainPanel } from "@/components/dashboard/train-panel";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">train-next-word-prediction</h1>
        <p className="text-muted-foreground">
          Control panel for the FastAPI training API (src/services/server.py) — start/stop the Wikipedia download
          and training jobs and watch their logs live, whether the API is running locally, in Docker, or
          behind a Cloudflare Container.
        </p>
        <HealthBadge />
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <DownloadPanel />
        <TrainPanel />
        <ImprovePanel />
      </section>
    </main>
  );
}
