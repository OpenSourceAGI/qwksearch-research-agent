// POST /api/answer — the demo's chat assistant. Returns { answer, followUps,
// source }. The answer is generated with no knowledge of any ad: ads are
// chosen afterwards, in the browser, by keyword auction. Keeping the model
// blind to advertisers is what makes "ads don't change the answer" true.
import { getComplete } from './llm.js';

const SYSTEM = `You are a concise, helpful research assistant.
Answer the user's question in 2-4 short paragraphs or a short list. Plain text, no markdown headings.
Then output a line containing only ---
Then output exactly 3 short follow-up questions the user might ask next, one per line, no numbering.`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Splits "answer --- q1 q2 q3" into its parts; tolerant of numbering and bullets. */
export function splitAnswer(text) {
  const [answer, rest = ''] = String(text).split(/\n\s*-{3,}\s*\n/);
  const followUps = rest
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  return { answer: answer.trim(), followUps };
}

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 2000) : '';
  if (!question) return json({ error: '`question` is required' }, 400);

  const complete = getComplete();
  if (!complete) return json({ source: 'none' });
  try {
    const text = await complete({ system: SYSTEM, user: question });
    const { answer, followUps } = splitAnswer(text);
    if (!answer) return json({ source: 'none' });
    return json({ answer, followUps, source: 'llm' });
  } catch (e) {
    // The client falls back to its canned answers; say why in the logs.
    console.error('answer: model call failed', e);
    return json({ source: 'none' });
  }
}
