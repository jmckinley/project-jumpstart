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
 * - MAX_RECOMMENDED_AGENTS - Cap on recommended agents (5)
 * - scoreAgentRelevance - Calculate relevance score for an agent
 * - rankLibraryAgents - Sort agents by relevance with scores (capped)
 * - ScoredAgent - A LibraryAgent with relevance score and recommendation flag
 *
 * PATTERNS:
 * - Reuses getProjectTags from skillRelevance for consistency
 * - Scoring: 30 base + 20 per match (cap 60) + 10 specificity bonus
 * - Universal agents always score 75 (recommended, ranked with 2-match agents)
 * - isRecommended = score >= 50
 * - Max 5 agents can be recommended (prevents context bloat)
 * - Sorting: recommended first (descending score), then alphabetical
 *
 * CLAUDE NOTES:
 * - Score outcomes: 0 (no match), 50-60 (1 match), 70-80 (2 matches), 90-100 (3+ matches)
 * - Universal agents score 75, ranking with 2-match agents
 * - Scoring formula is identical to skillRelevance.ts for consistency
 */

import type { Project } from "@/types/project";
import type { LibraryAgent } from "@/types/agent";
import type { TechTag } from "@/types/skill";
import { getProjectTags } from "./skillRelevance";

/** Maximum number of agents that can be recommended to prevent context bloat */
export const MAX_RECOMMENDED_AGENTS = 5;

export interface ScoredAgent {
  agent: LibraryAgent;
  score: number;
  isRecommended: boolean;
  matchedTags: TechTag[];
}

/**
 * Calculate relevance score for an agent based on project tags.
 * Returns score (0-100), isRecommended flag, and matched tags.
 *
 * Scoring formula (identical to skillRelevance):
 * - Universal agents: 75 (always recommended, ranked with 2-match agents)
 * - Others: 30 base + 20 per match (capped at 60) + 10 specificity bonus
 * - Specificity bonus: awarded if ≥50% of agent's tags are matched
 *
 * Score outcomes:
 * - 0 matches: 0 (not recommended)
 * - 1 match, low specificity: 50 (borderline recommended)
 * - 1 match, high specificity: 60 (recommended)
 * - 2 matches: 70-80 (highly recommended)
 * - 3+ matches: 90-100 (top recommended)
 */
export function scoreAgentRelevance(
  agent: LibraryAgent,
  projectTags: TechTag[],
): { score: number; isRecommended: boolean; matchedTags: TechTag[] } {
  // Universal agents always score 75 - high enough to be recommended,
  // but below 2+ match tech-specific agents
  if (agent.tags.includes("universal")) {
    return { score: 75, isRecommended: true, matchedTags: ["universal"] };
  }

  // Find matching tags
  const matchedTags = agent.tags.filter((tag) => projectTags.includes(tag));

  // No matches = not relevant
  if (matchedTags.length === 0) {
    return { score: 0, isRecommended: false, matchedTags: [] };
  }

  // Base score + match bonus (20 per match, capped at 60 for 3+ matches)
  const matchBonus = Math.min(matchedTags.length * 20, 60);

  // Specificity bonus: +10 if agent is focused (≥50% of its tags matched)
  const matchRatio = matchedTags.length / agent.tags.length;
  const specificityBonus = matchRatio >= 0.5 ? 10 : 0;

  const score = 30 + matchBonus + specificityBonus;

  return {
    score: Math.min(score, 100),
    isRecommended: score >= 50,
    matchedTags,
  };
}

/**
 * Rank library agents by relevance to a project.
 * Returns agents sorted: recommended first (by score desc), then non-recommended alphabetically.
 * Only the top MAX_RECOMMENDED_AGENTS agents are marked as recommended to prevent context bloat.
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

  // Sort by score descending first to determine top recommendations
  scored.sort((a, b) => b.score - a.score);

  // Cap recommendations at MAX_RECOMMENDED_AGENTS
  let recommendedCount = 0;
  for (const item of scored) {
    if (item.isRecommended) {
      if (recommendedCount >= MAX_RECOMMENDED_AGENTS) {
        item.isRecommended = false; // Demote to non-recommended
      } else {
        recommendedCount++;
      }
    }
  }

  // Re-sort: recommended first (by score desc), then non-recommended alphabetically
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
