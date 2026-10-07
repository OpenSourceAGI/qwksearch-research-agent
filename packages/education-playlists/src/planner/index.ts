/**
 * @fileoverview The interactive planner: from a learning goal, ask a few
 * follow-up questions, then turn the goal and the answers into searches and
 * the searches into a custom playlist.
 *
 * The language model and the web search are injected, never imported, so the
 * package stays provider-neutral and the host decides which model pays for
 * it. With neither, the planner still works ("offline" mode): fixed questions,
 * keyword searches over the bundled catalog. That is also the fallback when a
 * model call fails or answers with something unparseable, so a learner never
 * gets an error where a reasonable playlist was possible.
 */
import type { EducationCatalog, PlanAnswer, Playlist, PlaylistItem, CourseLevel } from '../types';
import { catalogItems, getDefaultCatalog } from '../catalog';
import { searchCatalog, tokenize } from '../lib/search';
import { createPlaylist } from '../lib/playlists';
import { safeUrl } from '../lib/sanitize';

export const MAX_GOAL_LENGTH = 300;
export const MAX_ANSWERS = 8;
export const MAX_ANSWER_LENGTH = 300;
export const MAX_PLAN_ITEMS = 12;
const MAX_SEARCHES = 5;
const WEB_RESULTS_PER_SEARCH = 3;
/** A web result's length is unknown; this is what it is budgeted at. */
const WEB_ITEM_MINUTES = 60;

export interface FollowUpQuestion {
  id: string;
  question: string;
  /** Quick answers; the learner can always type their own instead. */
  options: string[];
}

export interface WebSearchHit {
  title: string;
  url: string;
  snippet?: string;
}

export interface PlannerDeps {
  /** Runs a language model: a system and a user prompt in, its text out. */
  generate?: (input: { system: string; prompt: string }) => Promise<string>;
  /** Web search for material outside the catalog. */
  search?: (query: string) => Promise<WebSearchHit[]>;
  catalog?: EducationCatalog;
}

export interface PlanRequest {
  goal: string;
  answers?: PlanAnswer[];
}

export type PlannerMode = 'llm' | 'offline';

export interface FollowUpsResult {
  questions: FollowUpQuestion[];
  mode: PlannerMode;
}

export interface PlanResult {
  playlist: Playlist;
  /** The searches the playlist was assembled from, shown so the learner can see why. */
  searches: string[];
  mode: PlannerMode;
  /** Weekly time the answers implied, when they named one. */
  minutesPerWeek?: number;
}

/** The questions asked when there is no model, or the model's were unusable. */
export const DEFAULT_FOLLOW_UPS: FollowUpQuestion[] = [
  { id: 'level', question: 'Where are you starting from?', options: ['New to this', 'Some background', 'Comfortable, want depth'] },
  { id: 'time', question: 'How much time can you give it each week?', options: ['2 hours', '5 hours', '10 hours'] },
  { id: 'format', question: 'What do you learn best from?', options: ['Lecture videos', 'Problem sets and notes', 'A mix'] },
  { id: 'outcome', question: 'What should you be able to do at the end?', options: ['Pass a course or exam', 'Build a project', 'Switch careers', 'Just curious'] },
];

/** Trims and caps a request; throws when there is no goal to plan from. */
export function normalizePlanRequest(raw: unknown): PlanRequest {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const goal = typeof r.goal === 'string' ? r.goal.trim().slice(0, MAX_GOAL_LENGTH) : '';
  if (!goal) throw new Error('A learning goal is required');
  const answers = Array.isArray(r.answers)
    ? r.answers
        .slice(0, MAX_ANSWERS)
        .flatMap((entry) => {
          const e = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
          const question = typeof e.question === 'string' ? e.question.trim().slice(0, MAX_ANSWER_LENGTH) : '';
          const answer = typeof e.answer === 'string' ? e.answer.trim().slice(0, MAX_ANSWER_LENGTH) : '';
          return question && answer ? [{ question, answer }] : [];
        })
    : [];
  return { goal, answers };
}

/** The first JSON object in a model's reply, tolerating code fences and chatter around it. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const FOLLOW_UP_SYSTEM = `You help a self-directed learner plan a study playlist of free university courses and lecture videos.
Ask 3 or 4 short follow-up questions that would most change which courses to recommend (their starting level, weekly time, preferred format, and what they want to be able to do are usually the most useful).
Give each question 2 to 4 short answer options. The learner can also type their own answer.
Reply with JSON only, in this shape: {"questions":[{"question":"...","options":["...","..."]}]}`;

function parseFollowUps(text: string): FollowUpQuestion[] | null {
  const json = extractJson(text) as { questions?: unknown } | null;
  if (!json || !Array.isArray(json.questions)) return null;
  const questions = json.questions
    .slice(0, 4)
    .flatMap((entry, index) => {
      const e = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const question = typeof e.question === 'string' ? e.question.trim().slice(0, 200) : '';
      if (!question) return [];
      const options = Array.isArray(e.options)
        ? e.options.filter((o): o is string => typeof o === 'string' && o.trim() !== '').map((o) => o.trim().slice(0, 80)).slice(0, 4)
        : [];
      return [{ id: `q${index + 1}`, question, options }];
    });
  return questions.length ? questions : null;
}

/** Follow-up questions for a goal: the model's, or the defaults. */
export async function suggestFollowUps(goal: string, deps: PlannerDeps = {}): Promise<FollowUpsResult> {
  const { goal: cleanGoal } = normalizePlanRequest({ goal });
  if (deps.generate) {
    try {
      const text = await deps.generate({ system: FOLLOW_UP_SYSTEM, prompt: `Learning goal: ${cleanGoal}` });
      const questions = parseFollowUps(text);
      if (questions) return { questions, mode: 'llm' };
    } catch {
      // Fall through to the defaults below.
    }
  }
  return { questions: DEFAULT_FOLLOW_UPS, mode: 'offline' };
}

const PLAN_SYSTEM = `You plan a self-paced study playlist from free university courseware (MIT OpenCourseWare first) and lecture videos.
From the learner's goal and answers, write 3 to 5 short search queries (a few words each, the way you would search a course catalog) that together cover what they need, in study order.
If you know MIT course numbers that fit (for example 6.0001 or 18.06), list them too.
Reply with JSON only, in this shape: {"title":"...","searches":["..."],"courses":["6.0001"]}`;

interface ModelPlan {
  title?: string;
  searches: string[];
  courses: string[];
}

function parseModelPlan(text: string): ModelPlan | null {
  const json = extractJson(text) as Record<string, unknown> | null;
  if (!json || !Array.isArray(json.searches)) return null;
  const strings = (value: unknown, max: number) =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim().slice(0, max))
      : [];
  const searches = strings(json.searches, 120).slice(0, MAX_SEARCHES);
  if (searches.length === 0) return null;
  return {
    title: typeof json.title === 'string' && json.title.trim() ? json.title.trim().slice(0, 120) : undefined,
    searches,
    courses: strings(json.courses, 20).slice(0, 10),
  };
}

/** What the answers say about level, format and pace, read from their words. */
export function readPreferences(answers: PlanAnswer[] = []): {
  maxLevel?: CourseLevel;
  preferAdvanced: boolean;
  format: 'videos' | 'courseware' | 'mix';
  minutesPerWeek?: number;
} {
  const text = answers.map((a) => a.answer.toLowerCase()).join(' | ');
  const beginner = /\b(new|beginner|none|no background|never|starting out|from scratch)\b/.test(text);
  const advanced = /\b(comfortable|depth|advanced|expert|graduate|deep)\b/.test(text);
  const wantsVideos = /\bvideo|lecture|watch/.test(text);
  const wantsCourseware = /\bproblem|notes|reading|exercise|courseware|text/.test(text);
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:h|hr|hrs|hour|hours)\b/);
  return {
    maxLevel: beginner && !advanced ? 'intermediate' : undefined,
    preferAdvanced: advanced && !beginner,
    format: wantsVideos && !wantsCourseware ? 'videos' : wantsCourseware && !wantsVideos ? 'courseware' : 'mix',
    minutesPerWeek: hours ? Math.round(Number(hours[1]) * 60) : undefined,
  };
}

const LEVEL_ORDER: Record<CourseLevel, number> = { introductory: 0, intermediate: 1, advanced: 2 };

function webItem(hit: WebSearchHit, query: string, index: number): PlaylistItem | null {
  const url = safeUrl(hit.url);
  const title = typeof hit.title === 'string' ? hit.title.trim().slice(0, 200) : '';
  if (!url || !title) return null;
  const isVideo = /youtube\.com|youtu\.be|vimeo\.com/.test(url);
  return {
    id: `web:${url}`,
    title,
    url,
    kind: isVideo ? 'video' : 'reading',
    minutes: WEB_ITEM_MINUTES,
    estimate: 'rough',
    estimateBasis: 'length unknown; budgeted at 1 h',
    description: hit.snippet?.slice(0, 300),
    provenance: {
      provider: isVideo ? 'youtube' : 'web',
      method: 'llm_search',
      verified: false,
      note: `Found by the planner's web search for "${query}" (result ${index + 1}).`,
    },
  };
}

/** Builds a custom playlist from a goal and the learner's answers. */
export async function planPlaylist(rawRequest: PlanRequest, deps: PlannerDeps = {}): Promise<PlanResult> {
  const { goal, answers = [] } = normalizePlanRequest(rawRequest);
  const catalog = deps.catalog ?? getDefaultCatalog();
  const items = catalogItems(catalog);
  const prefs = readPreferences(answers);

  let mode: PlannerMode = 'offline';
  let plan: ModelPlan | null = null;
  if (deps.generate) {
    try {
      const prompt = [`Learning goal: ${goal}`, ...answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`)].join('\n\n');
      plan = parseModelPlan(await deps.generate({ system: PLAN_SYSTEM, prompt }));
      if (plan) mode = 'llm';
    } catch {
      plan = null;
    }
  }
  // Offline, the goal and anything the learner typed in their own words are the searches.
  const searches = plan?.searches ?? [
    goal,
    ...answers
      .map((a) => a.answer)
      .filter((answer) => tokenize(answer).length >= 2 && !DEFAULT_FOLLOW_UPS.some((q) => q.options.includes(answer))),
  ].slice(0, MAX_SEARCHES);

  const picked = new Map<string, PlaylistItem>();
  const take = (item: PlaylistItem) => {
    if (!picked.has(item.id) && ![...picked.values()].some((p) => p.url === item.url)) picked.set(item.id, item);
  };

  // Courses the model named, when the catalog has them, lead: they are its most specific advice.
  for (const number of plan?.courses ?? []) {
    for (const item of items) if (item.courseNumber?.toLowerCase() === number.toLowerCase()) take(item);
  }
  for (const query of searches) for (const item of searchCatalog(items, query, 6)) take(item);

  if (deps.search) {
    for (const query of searches.slice(0, 3)) {
      try {
        const hits = await deps.search(`${query} free course lecture videos`);
        hits.slice(0, WEB_RESULTS_PER_SEARCH).forEach((hit, index) => {
          const item = webItem(hit, query, index);
          if (item) take(item);
        });
      } catch {
        // One failed search costs its results, not the playlist.
      }
    }
  }

  const chosen = [...picked.values()]
    .filter((item) => !prefs.maxLevel || !item.level || LEVEL_ORDER[item.level] <= LEVEL_ORDER[prefs.maxLevel])
    .filter((item) => {
      if (prefs.format === 'videos') return item.kind === 'video' || item.kind === 'video_playlist';
      if (prefs.format === 'courseware') return item.kind !== 'video' && item.kind !== 'video_playlist';
      return true;
    })
    .map((item, order) => ({ item, order }))
    // Study order: easier material first, otherwise the order the searches found it in.
    .sort((a, b) => {
      const la = a.item.level ? LEVEL_ORDER[a.item.level] : 1;
      const lb = b.item.level ? LEVEL_ORDER[b.item.level] : 1;
      return (prefs.preferAdvanced ? lb - la : la - lb) || a.order - b.order;
    })
    .slice(0, MAX_PLAN_ITEMS)
    .map((entry) => entry.item);

  const playlist = createPlaylist({
    title: plan?.title ?? `My path: ${goal.slice(0, 80)}`,
    description: `Planned from: ${goal}`,
    items: chosen,
    plannedFrom: { goal, answers },
  });
  return { playlist, searches, mode, minutesPerWeek: prefs.minutesPerWeek };
}
