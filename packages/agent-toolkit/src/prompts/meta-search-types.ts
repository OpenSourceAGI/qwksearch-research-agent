/**
 * @module agent-toolkit/prompts/meta-search-types
 * @description Shared types for search prompt few-shot examples.
 */

/** A `[role, content]` tuple used for few-shot prompt examples. */
export type FewShotExample = [role: "user" | "assistant", content: string];
