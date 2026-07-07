/**
 * @module research/search/meta-search-types
 * @description Shared types for the MetaSearchAgent.
 */

/** A `[role, content]` tuple used for few-shot prompt examples. */
export type FewShotExample = [role: "user" | "assistant", content: string];
