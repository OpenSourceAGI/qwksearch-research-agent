/**
 * @module app-types/team
 * @description TypeScript interfaces for teams, organizations, team members,
 * and the UserRole union used in the TeamManagement feature.
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  /** Unique team member identifier. */
  id: string;
  /** Display name shown in team and organization views. */
  name: string;
  /** Primary email used for invitations and notifications. */
  email: string;
  /** Permission level assigned to the member. */
  role: UserRole;
  /** Optional avatar image URL for UI profile rendering. */
  avatarUrl?: string;
  /** Timestamp when the user joined the team. */
  joinedAt: Date;
}

export interface Team {
  /** Unique team identifier. */
  id: string;
  /** Human-readable team name. */
  name: string;
  /** Optional summary of the team purpose or scope. */
  description?: string;
  /** Members currently assigned to this team. */
  members: TeamMember[];
  /** Timestamp when the team was created. */
  createdAt: Date;
  /** Timestamp of the most recent team update. */
  updatedAt: Date;
}

export interface Organization {
  /** Unique organization identifier. */
  id: string;
  /** Human-readable organization name. */
  name: string;
  /** URL-friendly organization handle used in routes. */
  slug: string;
  /** Optional description of the organization. */
  description?: string;
  /** Optional URL for the organization logo image. */
  logoUrl?: string;
  /** Teams that belong to this organization. */
  teams: Team[];
  /** Timestamp when the organization was created. */
  createdAt: Date;
  /** Timestamp of the most recent organization update. */
  updatedAt: Date;
}
