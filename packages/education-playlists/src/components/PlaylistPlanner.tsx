/**
 * @fileoverview The "plan with AI" flow: a goal, then follow-up questions the
 * learner answers by tapping an option or typing their own words, then the
 * planned playlist.
 */
import React, { useRef, useState } from 'react';
import type { PlanAnswer } from '../types';
import { fetchFollowUps, fetchPlan } from '../api/client';
import type { FollowUpQuestion, PlanResult, PlannerMode } from '../planner';
import { MAX_GOAL_LENGTH, MAX_ANSWER_LENGTH } from '../planner';
import { s } from './styles';

export interface PlaylistPlannerProps {
  /** The host's planner endpoint; without one, planning runs locally over the catalog. */
  planEndpoint?: string;
  onPlanned: (result: PlanResult) => void;
  initialGoal?: string;
}

const MODE_NOTE: Record<PlannerMode, string> = {
  llm: 'Questions written by AI for your goal.',
  offline: 'AI is not connected here, so these are the standard questions.',
};

export function PlaylistPlanner({ planEndpoint, onPlanned, initialGoal = '' }: PlaylistPlannerProps) {
  const [goal, setGoal] = useState(initialGoal);
  const [questions, setQuestions] = useState<FollowUpQuestion[] | null>(null);
  const [mode, setMode] = useState<PlannerMode | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'questions' | 'plan' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = async <T,>(kind: 'questions' | 'plan', task: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(kind);
    setError(null);
    try {
      return await task(controller.signal);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
      return null;
    } finally {
      if (abort.current === controller) setBusy(null);
    }
  };

  const askQuestions = async () => {
    const result = await run('questions', (signal) => fetchFollowUps(goal, planEndpoint, signal));
    if (!result) return;
    setQuestions(result.questions);
    setMode(result.mode);
    setAnswers({});
  };

  const buildPlan = async () => {
    const answered: PlanAnswer[] = (questions ?? [])
      .map((question) => ({ question: question.question, answer: (answers[question.id] ?? '').trim() }))
      .filter((entry) => entry.answer);
    const result = await run('plan', (signal) => fetchPlan(goal, answered, planEndpoint, signal));
    if (result) onPlanned(result);
  };

  return (
    <div style={s.section}>
      <form
        style={s.row}
        onSubmit={(event) => {
          event.preventDefault();
          if (goal.trim()) void askQuestions();
        }}
      >
        <input
          style={s.input}
          value={goal}
          maxLength={MAX_GOAL_LENGTH}
          onChange={(event) => setGoal(event.target.value)}
          placeholder="What do you want to learn? e.g. machine learning from scratch"
          aria-label="What do you want to learn?"
        />
        <button type="submit" style={s.primary} disabled={!goal.trim() || busy !== null}>
          {busy === 'questions' ? 'Thinking…' : questions ? 'Ask again' : 'Start'}
        </button>
      </form>

      {questions && (
        <div style={s.section}>
          {mode && <div style={s.muted}>{MODE_NOTE[mode]}</div>}
          {questions.map((question) => (
            <fieldset key={question.id} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <legend style={{ fontWeight: 500, padding: 0, marginBottom: 4 }}>{question.question}</legend>
              <div style={s.row}>
                {question.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    style={{ ...s.chip, ...(answers[question.id] === option ? s.chipActive : null) }}
                    aria-pressed={answers[question.id] === option}
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: prev[question.id] === option ? '' : option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <input
                style={s.input}
                value={answers[question.id] ?? ''}
                maxLength={MAX_ANSWER_LENGTH}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                placeholder="Or say it in your own words"
                aria-label={`Your answer: ${question.question}`}
              />
            </fieldset>
          ))}
          <div style={s.row}>
            <button type="button" style={s.primary} onClick={() => void buildPlan()} disabled={busy !== null}>
              {busy === 'plan' ? 'Planning…' : 'Build my playlist'}
            </button>
          </div>
        </div>
      )}
      {error && <div style={{ ...s.muted, color: '#ef4444' }}>{error}</div>}
    </div>
  );
}
