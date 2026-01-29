/**
 * @module lib/skillRelevance
 * @description Skill relevance scoring based on project tech stack
 *
 * PURPOSE:
 * - Extract TechTags from a project's tech stack
 * - Score library skills based on tag matches
 * - Rank skills by relevance for display in the library
 *
 * DEPENDENCIES:
 * - @/types/project - Project type for tech stack fields
 * - @/types/skill - LibrarySkill, TechTag types
 *
 * EXPORTS:
 * - MAX_RECOMMENDED_SKILLS - Cap on recommended skills (5)
 * - getProjectTags - Extract TechTags from a project
 * - scoreSkillRelevance - Calculate relevance score for a skill
 * - rankLibrarySkills - Sort skills by relevance with scores (capped)
 * - ScoredSkill - A LibrarySkill with relevance score and recommendation flag
 *
 * PATTERNS:
 * - Project field values are normalized to TechTag via TECH_TAG_MAP
 * - Scoring: 30 base + 20 per match (cap 60) + 10 specificity bonus
 * - Universal skills always score 75 (recommended, ranked with 2-match skills)
 * - isRecommended = score >= 50
 * - Max 5 skills can be recommended (prevents context bloat)
 * - Sorting: recommended first (descending score), then alphabetical
 *
 * CLAUDE NOTES:
 * - Add new mappings to TECH_TAG_MAP when project options expand
 * - Score outcomes: 0 (no match), 50-60 (1 match), 70-80 (2 matches), 90-100 (3+ matches)
 * - Specificity bonus rewards focused skills without penalizing comprehensive ones
 * - Match count is primary driver, not match ratio
 */

import type { Project } from "@/types/project";
import type { LibrarySkill, TechTag } from "@/types/skill";

/** Maximum number of skills that can be recommended to prevent context bloat */
export const MAX_RECOMMENDED_SKILLS = 5;

export interface ScoredSkill {
  skill: LibrarySkill;
  score: number;
  isRecommended: boolean;
  matchedTags: TechTag[];
}

/**
 * Maps project field values to TechTag values.
 * Keys are lowercase for case-insensitive matching.
 */
const TECH_TAG_MAP: Record<string, TechTag> = {
  // Languages
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  rust: "rust",
  go: "go",
  java: "java",

  // Frameworks
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  vue: "vue",
  angular: "angular",
  svelte: "svelte",
  express: "express",
  fastify: "fastify",
  nestjs: "nestjs",
  django: "django",
  fastapi: "fastapi",
  flask: "flask",
  tauri: "tauri",
  electron: "electron",

  // Testing
  vitest: "vitest",
  jest: "jest",
  pytest: "pytest",
  playwright: "playwright",
  "testing library": "vitest", // Associates with vitest ecosystem

  // Styling
  "tailwind css": "tailwind",
  tailwind: "tailwind",
  "sass/scss": "sass",
  sass: "sass",
  scss: "sass",
  "css modules": "css-modules",

  // State Management
  zustand: "zustand",
  redux: "redux",
  pinia: "pinia",

  // Databases
  postgresql: "postgresql",
  mysql: "mysql",
  sqlite: "sqlite",
  mongodb: "mongodb",
};

/**
 * Extract TechTags from a project's tech stack.
 */
export function getProjectTags(project: Project | null): TechTag[] {
  if (!project) return [];

  const tags: TechTag[] = [];
  const fields = [
    project.language,
    project.framework,
    project.database,
    project.testing,
    project.styling,
  ];

  for (const field of fields) {
    if (!field) continue;
    const normalized = field.toLowerCase();
    const tag = TECH_TAG_MAP[normalized];
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Calculate relevance score for a skill based on project tags.
 * Returns score (0-100), isRecommended flag, and matched tags.
 *
 * Scoring formula:
 * - Universal skills: 75 (always recommended, ranked with 2-match skills)
 * - Others: 30 base + 20 per match (capped at 60) + 10 specificity bonus
 * - Specificity bonus: awarded if ≥50% of skill's tags are matched
 *
 * Score outcomes:
 * - 0 matches: 0 (not recommended)
 * - 1 match, low specificity: 50 (borderline recommended)
 * - 1 match, high specificity: 60 (recommended)
 * - 2 matches: 70-80 (highly recommended)
 * - 3+ matches: 90-100 (top recommended)
 */
export function scoreSkillRelevance(
  skill: LibrarySkill,
  projectTags: TechTag[],
): { score: number; isRecommended: boolean; matchedTags: TechTag[] } {
  // Universal skills always score 75 - high enough to be recommended,
  // but below 2+ match tech-specific skills
  if (skill.tags.includes("universal")) {
    return { score: 75, isRecommended: true, matchedTags: ["universal"] };
  }

  // Find matching tags
  const matchedTags = skill.tags.filter((tag) => projectTags.includes(tag));

  // No matches = not relevant
  if (matchedTags.length === 0) {
    return { score: 0, isRecommended: false, matchedTags: [] };
  }

  // Base score + match bonus (20 per match, capped at 60 for 3+ matches)
  const matchBonus = Math.min(matchedTags.length * 20, 60);

  // Specificity bonus: +10 if skill is focused (≥50% of its tags matched)
  const matchRatio = matchedTags.length / skill.tags.length;
  const specificityBonus = matchRatio >= 0.5 ? 10 : 0;

  const score = 30 + matchBonus + specificityBonus;

  return {
    score: Math.min(score, 100),
    isRecommended: score >= 50,
    matchedTags,
  };
}

/**
 * Rank library skills by relevance to a project.
 * Returns skills sorted: recommended first (by score desc), then non-recommended alphabetically.
 * Only the top MAX_RECOMMENDED_SKILLS skills are marked as recommended to prevent context bloat.
 */
export function rankLibrarySkills(
  skills: LibrarySkill[],
  project: Project | null,
): ScoredSkill[] {
  const projectTags = getProjectTags(project);

  const scored: ScoredSkill[] = skills.map((skill) => {
    const { score, isRecommended, matchedTags } = scoreSkillRelevance(
      skill,
      projectTags,
    );
    return { skill, score, isRecommended, matchedTags };
  });

  // Sort by score descending first to determine top recommendations
  scored.sort((a, b) => b.score - a.score);

  // Cap recommendations at MAX_RECOMMENDED_SKILLS
  let recommendedCount = 0;
  for (const item of scored) {
    if (item.isRecommended) {
      if (recommendedCount >= MAX_RECOMMENDED_SKILLS) {
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
    return a.skill.name.localeCompare(b.skill.name);
  });
}
