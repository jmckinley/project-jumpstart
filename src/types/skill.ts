/**
 * @module types/skill
 * @description TypeScript type definitions for skills and detected patterns
 *
 * PURPOSE:
 * - Define Skill interface for reusable Claude Code patterns
 * - Define Pattern interface for detected request patterns
 *
 * EXPORTS:
 * - Skill - A reusable Claude Code skill with markdown content
 * - Pattern - A detected recurring pattern with suggested skill
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/skill.rs
 * - Skills have usage analytics (usageCount)
 * - Patterns have frequency and optional suggested skill content
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/skill.rs
 * - DateTime fields are serialized as ISO strings by Tauri
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  projectId: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pattern {
  id: string;
  description: string;
  frequency: number;
  suggestedSkill: string | null;
}

/**
 * Technology tags for skill relevance scoring.
 * Used to match skills to project tech stacks.
 */
export type TechTag =
  | "universal"
  | "typescript"
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "kotlin"
  | "swift"
  | "react"
  | "nextjs"
  | "vue"
  | "angular"
  | "svelte"
  | "express"
  | "fastify"
  | "nestjs"
  | "django"
  | "fastapi"
  | "flask"
  | "tauri"
  | "electron"
  | "android"
  | "ios"
  | "swiftui"
  | "vitest"
  | "jest"
  | "pytest"
  | "playwright"
  | "tailwind"
  | "sass"
  | "css-modules"
  | "zustand"
  | "redux"
  | "pinia"
  | "postgresql"
  | "mysql"
  | "sqlite"
  | "mongodb";

/**
 * Categories for organizing skills in the library.
 */
export type SkillCategory =
  | "documentation"
  | "testing"
  | "component-creation"
  | "state-management"
  | "api-design"
  | "error-handling"
  | "code-review"
  | "refactoring"
  | "debugging"
  | "database"
  | "language-patterns"
  | "ui-ux";

/**
 * Metadata for a skill category (for UI display).
 */
export interface SkillCategoryInfo {
  id: SkillCategory;
  label: string;
  description: string;
}

/**
 * A skill from the pre-defined library catalog.
 */
export interface LibrarySkill {
  slug: string;
  name: string;
  description: string;
  category: SkillCategory;
  tags: TechTag[];
  content: string;
}
