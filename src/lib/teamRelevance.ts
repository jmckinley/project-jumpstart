/**
 * @module lib/teamRelevance
 * @description Team template relevance scoring based on project tech stack
 *
 * PURPOSE:
 * - Score library team templates based on tag matches with project tech stack
 * - Rank templates by relevance for display in the library
 * - Provide recommendation flags for relevant templates
 *
 * DEPENDENCIES:
 * - @/types/project - Project type for tech stack fields
 * - @/types/team-template - LibraryTeamTemplate, ScoredTeamTemplate types
 * - @/types/skill - TechTag type
 * - @/lib/skillRelevance - getProjectTags for extracting project tags
 *
 * EXPORTS:
 * - MAX_RECOMMENDED_TEAMS - Cap on recommended teams (3, teams are expensive)
 * - scoreTeamRelevance - Calculate relevance score for a template
 * - rankLibraryTeams - Sort templates by relevance with scores (capped)
 *
 * PATTERNS:
 * - Reuses getProjectTags from skillRelevance for consistency
 * - Scoring: 30 base + 20 per match (cap 60) + 10 specificity bonus
 * - Universal templates always score 75
 * - isRecommended = score >= 50
 * - Max 3 templates can be recommended (teams are expensive)
 *
 * CLAUDE NOTES:
 * - Scoring formula identical to agentRelevance.ts for consistency
 * - Lower MAX_RECOMMENDED than agents (3 vs 5) since teams are heavier
 */

import type { Project } from "@/types/project";
import type { LibraryTeamTemplate, ScoredTeamTemplate } from "@/types/team-template";
import type { TechTag } from "@/types/skill";
import { getProjectTags } from "./skillRelevance";

/** Maximum number of teams that can be recommended (lower than agents since teams are expensive) */
export const MAX_RECOMMENDED_TEAMS = 3;

/**
 * Calculate relevance score for a team template based on project tags.
 * Same formula as agentRelevance.ts.
 */
export function scoreTeamRelevance(
  template: LibraryTeamTemplate,
  projectTags: TechTag[],
): { score: number; isRecommended: boolean; matchedTags: TechTag[] } {
  if (template.tags.includes("universal")) {
    return { score: 75, isRecommended: true, matchedTags: ["universal"] };
  }

  const matchedTags = template.tags.filter((tag) => projectTags.includes(tag));

  if (matchedTags.length === 0) {
    return { score: 0, isRecommended: false, matchedTags: [] };
  }

  const matchBonus = Math.min(matchedTags.length * 20, 60);
  const matchRatio = matchedTags.length / template.tags.length;
  const specificityBonus = matchRatio >= 0.5 ? 10 : 0;
  const score = 30 + matchBonus + specificityBonus;

  return {
    score: Math.min(score, 100),
    isRecommended: score >= 50,
    matchedTags,
  };
}

/**
 * Rank library team templates by relevance to a project.
 * Returns templates sorted: recommended first (by score desc), then non-recommended alphabetically.
 */
export function rankLibraryTeams(
  templates: LibraryTeamTemplate[],
  project: Project | null,
): ScoredTeamTemplate[] {
  const projectTags = getProjectTags(project);

  const scored: ScoredTeamTemplate[] = templates.map((template) => {
    const { score, isRecommended, matchedTags } = scoreTeamRelevance(
      template,
      projectTags,
    );
    return { template, score, isRecommended, matchedTags };
  });

  scored.sort((a, b) => b.score - a.score);

  let recommendedCount = 0;
  for (const item of scored) {
    if (item.isRecommended) {
      if (recommendedCount >= MAX_RECOMMENDED_TEAMS) {
        item.isRecommended = false;
      } else {
        recommendedCount++;
      }
    }
  }

  return scored.sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;

    if (a.isRecommended && b.isRecommended) {
      if (b.score !== a.score) return b.score - a.score;
    }

    return a.template.name.localeCompare(b.template.name);
  });
}
