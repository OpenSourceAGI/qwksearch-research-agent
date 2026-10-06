/**
 * @fileoverview The data model: a college-style catalog (category → major →
 * program) of playlists, each an ordered list of self-paced items (videos and
 * courseware links) that carry a time estimate and where they came from.
 *
 * Provenance is on every item, not on the catalog, because a playlist mixes
 * sources: an official MIT record, a community-curated link and a result an
 * LLM search found are not equally fresh or authoritative, and the UI should
 * be able to say which one it is showing.
 */

/** Who publishes the material an item links to. */
export type EducationProvider =
  | 'mit_ocw'
  | 'edx'
  | 'coursera'
  | 'khan'
  | 'openstax'
  | 'youtube'
  | 'web';

/** How an item's record entered the catalog. */
export type ProvenanceMethod =
  /** Hand-picked into the bundled seed; the URL is the course's canonical page. */
  | 'curated_seed'
  /** Pulled from a provider's own API (e.g. MIT Learn via `ocw_oer_export`). */
  | 'official_api'
  /** Pulled from a third-party dataset snapshot (e.g. a Kaggle export). */
  | 'snapshot_dataset'
  /** Parsed from a community awesome-list. */
  | 'community_list'
  /** Found by the planner's web search for a custom playlist. */
  | 'llm_search'
  /** Added by hand by a playlist's owner. */
  | 'user';

export interface Provenance {
  provider: EducationProvider;
  method: ProvenanceMethod;
  /** The page or dataset the record was read from, when it differs from the item URL. */
  sourceUrl?: string;
  /** ISO date the record was last read from its source. */
  fetchedAt?: string;
  /**
   * Whether the URL itself was checked against the provider. Seed records are
   * canonical course pages; deep links (individual videos, PDFs) are not
   * marked verified until an ingestion run has confirmed them.
   */
  verified: boolean;
  note?: string;
}

/** What following an item's link gets you. */
export type PlaylistItemKind =
  | 'video_playlist'
  | 'video'
  | 'courseware'
  | 'lecture_notes'
  | 'assignment'
  | 'reading'
  | 'textbook';

export type CourseLevel = 'introductory' | 'intermediate' | 'advanced';

/** One self-paced step in a playlist. */
export interface PlaylistItem {
  /** Stable within the catalog; progress is keyed by it. */
  id: string;
  title: string;
  url: string;
  kind: PlaylistItemKind;
  /** Expected time to finish, in minutes. */
  minutes: number;
  /**
   * `exact` when the provider states a duration (a video's length); `rough`
   * when it is derived, e.g. lecture count × typical lecture length.
   */
  estimate: 'exact' | 'rough';
  /** How the estimate was reached, for a `rough` one. */
  estimateBasis?: string;
  /** Course number at the institution, e.g. "6.0001". */
  courseNumber?: string;
  institution?: string;
  level?: CourseLevel;
  description?: string;
  provenance: Provenance;
}

/**
 * - `preset`: ships with the catalog, read-only, everyone sees it.
 * - `public`: someone's playlist, readable by anyone with the link.
 * - `private`: readable only by its owner and the members they invited.
 */
export type PlaylistVisibility = 'preset' | 'public' | 'private';

export type PlaylistRole = 'owner' | 'editor' | 'viewer';

export interface PlaylistMember {
  /** Set once the invite is accepted. */
  userId?: string;
  /** Who the invite was addressed to. */
  email?: string;
  role: PlaylistRole;
  status: 'invited' | 'active';
  /** Opaque token an invite link carries; cleared when accepted. */
  inviteToken?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  majorId: string;
  programId?: string;
  level?: CourseLevel;
  visibility: PlaylistVisibility;
  ownerId?: string;
  members?: PlaylistMember[];
  items: PlaylistItem[];
  /** For a planner-built playlist: the goal and answers it was planned from. */
  plannedFrom?: { goal: string; answers: PlanAnswer[] };
  createdAt?: string;
  updatedAt?: string;
}

/** One follow-up question the planner asked, and what the learner said. */
export interface PlanAnswer {
  question: string;
  answer: string;
}

/** A track inside a major, the way a department lists concentrations. */
export interface Program {
  id: string;
  name: string;
  description?: string;
}

export interface Major {
  id: string;
  name: string;
  /** Department number at MIT, when the major maps to one (e.g. "6", "18"). */
  department?: string;
  programs: Program[];
}

export interface Category {
  id: string;
  name: string;
  majors: Major[];
}

export interface EducationCatalog {
  categories: Category[];
  playlists: Playlist[];
}
