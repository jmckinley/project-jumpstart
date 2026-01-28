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
