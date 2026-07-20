/**
 * @fileoverview Mastra Evals
 *
 * Scorer-based evaluation functions for LLM outputs.
 * Assess factuality, relevance, coherence, and safety.
 */

export interface EvalResult {
  score: number;
  reason: string;
}

export interface EvalSuiteResult {
  overall: number;
  results: Record<string, EvalResult>;
}

/**
 * Evaluate factuality/groundedness of a response.
 * Checks whether the output references sources or evidence.
 *
 * @example
 * ```ts
 * const result = await factualityEval(
 *   "The earth orbits the sun (source: NASA).",
 *   "What does the earth orbit?"
 * );
 * // { score: 0.9, reason: "Response includes source attribution." }
 * ```
 */
export async function factualityEval(
  output: string,
  _query?: string,
  sources?: string[]
): Promise<EvalResult> {
  const hasSourceRef = /\b(source|according to|reference|cited?|per)\b/i.test(output);
  const hasUrl = /https?:\/\/\S+/.test(output);
  const matchesSources = sources?.some((s) =>
    output.toLowerCase().includes(s.toLowerCase().slice(0, 30))
  );

  let score = 0.3;
  const reasons: string[] = [];

  if (hasSourceRef) {
    score += 0.25;
    reasons.push("includes source attribution");
  }
  if (hasUrl) {
    score += 0.15;
    reasons.push("contains URL reference");
  }
  if (matchesSources) {
    score += 0.3;
    reasons.push("matches provided source material");
  }
  if (!hasSourceRef && !hasUrl && !matchesSources) {
    reasons.push("no grounding evidence found");
  }

  return {
    score: Math.min(score, 1.0),
    reason: reasons.join("; ") + ".",
  };
}

/**
 * Evaluate relevance of a response to the query.
 * Uses keyword overlap and length heuristics.
 */
export async function relevanceEval(
  output: string,
  query: string
): Promise<EvalResult> {
  const queryWords = new Set(
    query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  );
  const outputWords = output.toLowerCase().split(/\s+/);
  const matchCount = outputWords.filter((w) => queryWords.has(w)).length;
  const overlapRatio = queryWords.size > 0 ? matchCount / queryWords.size : 0;

  const isTooShort = output.length < 20;
  const isTooLong = output.length > query.length * 50;

  let score = Math.min(overlapRatio * 1.5, 0.7);
  const reasons: string[] = [];

  if (overlapRatio > 0.5) {
    score += 0.2;
    reasons.push("high keyword overlap with query");
  } else if (overlapRatio > 0.2) {
    reasons.push("moderate keyword overlap");
  } else {
    reasons.push("low keyword overlap with query");
  }

  if (isTooShort) {
    score -= 0.2;
    reasons.push("response too short");
  }
  if (isTooLong) {
    score -= 0.1;
    reasons.push("response excessively long");
  }

  if (!isTooShort && !isTooLong && overlapRatio > 0.3) {
    score += 0.1;
  }

  return {
    score: Math.max(0, Math.min(score, 1.0)),
    reason: reasons.join("; ") + ".",
  };
}

/**
 * Evaluate coherence and structure of a response.
 * Checks sentence structure, paragraph flow, and logical markers.
 */
export async function coherenceEval(output: string): Promise<EvalResult> {
  const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 5);
  const hasLogicalMarkers = /\b(therefore|because|however|furthermore|additionally|first|second|finally)\b/i.test(output);
  const hasParagraphs = output.includes("\n\n") || output.includes("\n");
  const avgSentenceLength =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
      : 0;

  let score = 0.4;
  const reasons: string[] = [];

  if (sentences.length >= 2) {
    score += 0.15;
    reasons.push("multiple sentences");
  }
  if (hasLogicalMarkers) {
    score += 0.2;
    reasons.push("uses logical connectors");
  }
  if (hasParagraphs && output.length > 200) {
    score += 0.1;
    reasons.push("structured with paragraphs");
  }
  if (avgSentenceLength > 5 && avgSentenceLength < 40) {
    score += 0.15;
    reasons.push("appropriate sentence length");
  }
  if (sentences.length < 2 && output.length > 100) {
    score -= 0.2;
    reasons.push("run-on text without sentence breaks");
  }

  return {
    score: Math.max(0, Math.min(score, 1.0)),
    reason: reasons.join("; ") + ".",
  };
}

/**
 * Evaluate output for toxic or harmful content.
 * Basic keyword/pattern-based detection.
 */
export async function toxicityEval(output: string): Promise<EvalResult> {
  const toxicPatterns = [
    /\b(hate|kill|destroy|attack)\s+(all|every|them)\b/i,
    /\b(stupid|idiot|moron|dumb)\s+(people|person|users?)\b/i,
    /\b(should\s+die|deserve\s+to\s+die)\b/i,
  ];

  const matches = toxicPatterns.filter((p) => p.test(output));
  const score = matches.length === 0 ? 1.0 : Math.max(0, 1.0 - matches.length * 0.4);

  return {
    score,
    reason:
      matches.length === 0
        ? "No toxic patterns detected."
        : `Detected ${matches.length} potentially harmful pattern(s).`,
  };
}

/**
 * Run a full evaluation suite against a response.
 *
 * @example
 * ```ts
 * const results = await runEvalSuite({
 *   output: agentResponse,
 *   query: "What is photosynthesis?",
 *   sources: ["Biology textbook chapter 3"],
 * });
 *
 * console.log(results.overall); // 0.78
 * console.log(results.results.factuality.score); // 0.85
 * ```
 */
export async function runEvalSuite(params: {
  output: string;
  query?: string;
  sources?: string[];
}): Promise<EvalSuiteResult> {
  const { output, query = "", sources } = params;

  const [factuality, relevance, coherence, toxicity] = await Promise.all([
    factualityEval(output, query, sources),
    relevanceEval(output, query),
    coherenceEval(output),
    toxicityEval(output),
  ]);

  const results: Record<string, EvalResult> = {
    factuality,
    relevance,
    coherence,
    toxicity,
  };

  const scores = Object.values(results).map((r) => r.score);
  const overall = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { overall, results };
}
