/**
 * @fileoverview Time arithmetic for self-paced playlists: totals, what is
 * left once some items are checked off, and how it reads on screen.
 */
import type { Playlist } from '../types';

/**
 * "45 min", "2 h 30 min", "176 h". From ten hours up the minutes are dropped:
 * most estimates are rough, and "175 h 50 min" claims a precision they lack.
 */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  if (total >= 600) return `${Math.round(total / 60)} h`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export interface PlaylistTime {
  totalMinutes: number;
  doneMinutes: number;
  remainingMinutes: number;
  /** 0–100, by time rather than by item count, since items vary by tens of hours. */
  percent: number;
  doneCount: number;
  itemCount: number;
}

export function playlistTime(playlist: Playlist, done: ReadonlySet<string>): PlaylistTime {
  let totalMinutes = 0;
  let doneMinutes = 0;
  let doneCount = 0;
  for (const item of playlist.items) {
    totalMinutes += item.minutes;
    if (done.has(item.id)) {
      doneMinutes += item.minutes;
      doneCount += 1;
    }
  }
  return {
    totalMinutes,
    doneMinutes,
    remainingMinutes: totalMinutes - doneMinutes,
    percent: totalMinutes ? Math.round((doneMinutes / totalMinutes) * 100) : 0,
    doneCount,
    itemCount: playlist.items.length,
  };
}

/** Weeks to finish what is left at a weekly pace; `null` with no pace. */
export function weeksToFinish(remainingMinutes: number, minutesPerWeek?: number): number | null {
  if (!minutesPerWeek || minutesPerWeek <= 0) return null;
  return Math.ceil(remainingMinutes / minutesPerWeek);
}
