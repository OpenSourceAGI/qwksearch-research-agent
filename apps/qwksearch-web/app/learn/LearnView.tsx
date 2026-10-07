'use client';
/**
 * @fileoverview `/learn`: the full-page Education Playlists widget, and the
 * page a playlist's share link (`/learn#playlist=…`) or invite link
 * (`/learn#invite=…`) opens. The widget itself lives in
 * `packages/education-playlists`; this mounts it and, for a signed-in user,
 * points it at `/api/learn/playlists` so their playlists live in the account.
 */
import { EducationPlaylists } from 'education-playlists';
import { authClient } from '@/lib/auth/client';

export function LearnView() {
  const { data: session } = authClient.useSession();
  const user = (session as { user?: { id: string; isAnonymous?: boolean | null } } | null)?.user;
  // An anonymous guest session keeps playlists in this browser, as signed-out visitors do.
  const userId = user && !user.isAnonymous ? user.id : undefined;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Learn</h1>
      <p className="mb-4 text-sm opacity-70">
        Self-paced playlists of free university courses, organized like a college catalog. Check items off as you go,
        save your own, or plan one with AI.
      </p>
      <EducationPlaylists
        planEndpoint="/api/learn"
        playlistsEndpoint="/api/learn/playlists"
        userId={userId}
        importFromHash
        className="rounded-2xl border border-border bg-card"
      />
    </main>
  );
}
