/**
 * @fileoverview Browser side of the planner: call the host's endpoint when it
 * has one, and plan locally when it does not or when the call fails.
 */
import type { PlanAnswer } from '../types';
import { planPlaylist, suggestFollowUps, type FollowUpsResult, type PlanResult } from '../planner';
import { sanitizePlaylist } from '../lib/sanitize';

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`Planner request failed (${res.status})`);
  return (await res.json()) as T;
}

/** Follow-up questions from `endpoint`, or the local defaults. */
export async function fetchFollowUps(goal: string, endpoint?: string, signal?: AbortSignal): Promise<FollowUpsResult> {
  if (endpoint) {
    try {
      const result = await post<FollowUpsResult>(`${endpoint.replace(/\/+$/, '')}/questions`, { goal }, signal);
      if (Array.isArray(result?.questions) && result.questions.length) return result;
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
    }
  }
  return suggestFollowUps(goal);
}

/** A planned playlist from `endpoint`, or one planned locally from the catalog. */
export async function fetchPlan(
  goal: string,
  answers: PlanAnswer[],
  endpoint?: string,
  signal?: AbortSignal,
): Promise<PlanResult> {
  if (endpoint) {
    try {
      const result = await post<PlanResult>(endpoint.replace(/\/+$/, ''), { goal, answers }, signal);
      // The server's playlist is re-validated like any other outside data.
      const playlist = sanitizePlaylist({ ...result?.playlist, visibility: 'private' });
      if (playlist) {
        return {
          ...result,
          playlist: { ...playlist, visibility: 'private', members: [], plannedFrom: { goal, answers } },
        };
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
    }
  }
  return planPlaylist({ goal, answers });
}
