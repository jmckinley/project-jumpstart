/**
 * @module lib/agentRelevance
 * @description Agent relevance scoring based on project tech stack
 *
 * PURPOSE:
 * - Score library agents based on tag matches with project tech stack
 * - Rank agents by relevance for display in the library
 * - Provide recommendation flags for relevant agents
 *
 * DEPENDENCIES:
 * - @/types/project - Project type for tech stack fields
 * - @/types/agent - LibraryAgent type
 * - @/types/skill - TechTag type
 * - @/lib/skillRelevance - getProjectTags for extracting project tags
 *
 * EXPORTS:
 * - scoreAgentRelevance - Calculate relevance score for an agent
 * - rankLibraryAgents - Sort agents by relevance with scores
 * - ScoredAgent - A LibraryAgent with relevance score and recommendation flag
 *
 * PATTERNS:
 * - Reuses getProjectTags from skillRelevance for consistency
 * - "universal" agents always get score 60 (recommended)
 * - Other agents: 40 + (matchedCount / totalTags) * 60 if any match, else 0
 * - isRecommended = score >= 50
 * - Sorting: recommended first (descending score), then alphabetical
 *
 * CLAUDE NOTES:
 * - Score range is 0-100, but only 0, 60, or 40-100 are produced
 * - Universal agents are always recommended but sorted below exact matches
 * - This is nearly identical to skillRelevance.ts - intentionally parallel
 */

import type { Project } from "@/types/project";
import type { LibraryAgent } from "@/types/agent";
import type { TechTag } from "@/types/skill";
import { getProjectTags } from "./skillRelevance";

export interface ScoredAgent {
  agent: LibraryAgent;
  score: number;
  isRecommended: boolean;
  matchedTags: TechTag[];
}

/**
 * Calculate relevance score for an agent based on project tags.
 * Returns score (0-100), isRecommended flag, and matched tags.
 */
export function scoreAgentRelevance(
  agent: LibraryAgent,
  projectTags: TechTag[],
): { score: number; isRecommended: boolean; matchedTags: TechTag[] } {
  // Universal agents always score 60
  if (agent.tags.includes("universal")) {
    return { score: 60, isRecommended: true, matchedTags: ["universal"] };
  }

  // Find matching tags
  const matchedTags = agent.tags.filter((tag) => projectTags.includes(tag));

  // No matches = not relevant
  if (matchedTags.length === 0) {
    return { score: 0, isRecommended: false, matchedTags: [] };
  }

  // Score: 40 base + up to 60 based on match ratio
  const matchRatio = matchedTags.length / agent.tags.length;
  const score = Math.round(40 + matchRatio * 60);

  return {
    score,
    isRecommended: score >= 50,
    matchedTags,
  };
}

/**
 * Rank library agents by relevance to a project.
 * Returns agents sorted: recommended first (by score desc), then non-recommended alphabetically.
 */
export function rankLibraryAgents(
  agents: LibraryAgent[],
  project: Project | null,
): ScoredAgent[] {
  const projectTags = getProjectTags(project);

  const scored: ScoredAgent[] = agents.map((agent) => {
    const { score, isRecommended, matchedTags } = scoreAgentRelevance(
      agent,
      projectTags,
    );
    return { agent, score, isRecommended, matchedTags };
  });

  // Sort: recommended first (by score desc), then non-recommended alphabetically
  return scored.sort((a, b) => {
    // Recommended comes first
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;

    // Within same recommended status
    if (a.isRecommended && b.isRecommended) {
      // Higher score first
      if (b.score !== a.score) return b.score - a.score;
    }

    // Alphabetical by name
    return a.agent.name.localeCompare(b.agent.name);
  });
}
