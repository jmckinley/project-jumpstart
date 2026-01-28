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
 * - getProjectTags - Extract TechTags from a project
 * - scoreSkillRelevance - Calculate relevance score for a skill
 * - rankLibrarySkills - Sort skills by relevance with scores
 * - ScoredSkill - A LibrarySkill with relevance score and recommendation flag
 *
 * PATTERNS:
 * - Project field values are normalized to TechTag via TECH_TAG_MAP
 * - "universal" skills always get score 60 (recommended)
 * - Other skills: 40 + (matchedCount / totalTags) * 60 if any match, else 0
 * - isRecommended = score >= 50
 * - Sorting: recommended first (descending score), then alphabetical
 *
 * CLAUDE NOTES:
 * - Add new mappings to TECH_TAG_MAP when project options expand
 * - Score range is 0-100, but only 0, 60, or 40-100 are produced
 * - Universal skills are always recommended but sorted below exact matches
 */

import type { Project } from "@/types/project";
import type { LibrarySkill, TechTag } from "@/types/skill";

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
 */
export function scoreSkillRelevance(
  skill: LibrarySkill,
  projectTags: TechTag[],
): { score: number; isRecommended: boolean; matchedTags: TechTag[] } {
  // Universal skills always score 60
  if (skill.tags.includes("universal")) {
    return { score: 60, isRecommended: true, matchedTags: ["universal"] };
  }

  // Find matching tags
  const matchedTags = skill.tags.filter((tag) => projectTags.includes(tag));

  // No matches = not relevant
  if (matchedTags.length === 0) {
    return { score: 0, isRecommended: false, matchedTags: [] };
  }

  // Score: 40 base + up to 60 based on match ratio
  const matchRatio = matchedTags.length / skill.tags.length;
  const score = Math.round(40 + matchRatio * 60);

  return {
    score,
    isRecommended: score >= 50,
    matchedTags,
  };
}

/**
 * Rank library skills by relevance to a project.
 * Returns skills sorted: recommended first (by score desc), then non-recommended alphabetically.
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
    return a.skill.name.localeCompare(b.skill.name);
  });
}
