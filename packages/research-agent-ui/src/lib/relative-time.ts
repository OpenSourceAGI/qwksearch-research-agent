/**
 * @fileoverview Formats a timestamp as a compact relative string (e.g. "5 min", "2 hr",
 * "3 days"). Used by the home page chat history chips to show how long ago a
 * conversation was last active, without a trailing "ago".
 */
export function formatRelativeTime(input: string | number | Date): string {
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} sec`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"}`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;

  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}
