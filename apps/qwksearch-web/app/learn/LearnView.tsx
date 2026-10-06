'use client';
/**
 * @fileoverview `/learn`: the full-page Education Playlists widget, and the
 * page a playlist's share link opens (`/learn#playlist=…`). The widget itself
 * lives in `packages/education-playlists`; this only mounts it.
 */
import { EducationPlaylists } from 'education-playlists';

export function LearnView() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Learn</h1>
      <p className="mb-4 text-sm opacity-70">
        Self-paced playlists of free university courses, organized like a college catalog. Check items off as you go,
        save your own, or plan one with AI.
      </p>
      <EducationPlaylists planEndpoint="/api/learn" importFromHash className="rounded-2xl border border-border bg-card" />
    </main>
  );
}
