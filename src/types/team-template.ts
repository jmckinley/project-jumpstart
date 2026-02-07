/**
 * @module types/team-template
 * @description TypeScript type definitions for team templates, orchestration patterns, and team library
 *
 * PURPOSE:
 * - Define TeamTemplate interface for saved team configurations
 * - Define LibraryTeamTemplate for pre-built team catalog
 * - Define OrchestrationPattern for team coordination styles
 * - Define teammate, task, and hook sub-types
 *
 * EXPORTS:
 * - OrchestrationPattern - "leader" | "pipeline" | "parallel" | "swarm" | "council"
 * - TeamCategory - Categories for organizing teams in the library
 * - TeammateDef - Definition of a single teammate in a team
 * - TeamTaskDef - Definition of a task with dependencies
 * - TeamHookDef - Definition of a hook for team coordination
 * - LibraryTeamTemplate - A pre-defined team from the library catalog
 * - TeamTemplate - A saved team template with database fields
 * - ScoredTeamTemplate - A LibraryTeamTemplate with relevance score
 * - TeamCategoryInfo - Metadata about a team category (label, description, icon)
 * - ProjectContext - Active project tech stack context for personalizing deploy output
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/team_template.rs
 * - Team templates have usage analytics (usageCount)
 * - LibraryTeamTemplate has tags for tech-stack-based relevance scoring
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/team_template.rs
 * - DateTime fields are serialized as ISO strings by Tauri
 * - TechTag is imported from skill.ts for consistency
 * - Orchestration patterns define how teammates coordinate
 */

import type { TechTag } from "./skill";

export type OrchestrationPattern = "leader" | "pipeline" | "parallel" | "swarm" | "council";

export type TeamCategory =
  | "feature-development"
  | "testing"
  | "code-review"
  | "refactoring"
  | "migration"
  | "documentation"
  | "devops";

export interface TeammateDef {
  role: string;
  description: string;
  spawnPrompt: string;
}

export interface TeamTaskDef {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  blockedBy: string[];
}

export interface TeamHookDef {
  event: string;
  command: string;
  description: string;
}

export interface LibraryTeamTemplate {
  slug: string;
  name: string;
  description: string;
  orchestrationPattern: OrchestrationPattern;
  category: TeamCategory;
  tags: TechTag[];
  teammates: TeammateDef[];
  tasks: TeamTaskDef[];
  hooks: TeamHookDef[];
  leadSpawnInstructions: string;
}

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  orchestrationPattern: OrchestrationPattern;
  category: TeamCategory;
  teammates: TeammateDef[];
  tasks: TeamTaskDef[];
  hooks: TeamHookDef[];
  leadSpawnInstructions: string;
  projectId: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredTeamTemplate {
  template: LibraryTeamTemplate;
  score: number;
  isRecommended: boolean;
  matchedTags: TechTag[];
}

export interface TeamCategoryInfo {
  id: TeamCategory;
  label: string;
  description: string;
  icon: string;
}

export interface ProjectContext {
  name: string;
  language: string | null;
  framework: string | null;
  testFramework: string | null;
  buildTool: string | null;
  styling: string | null;
  database: string | null;
}
