/**
 * @module data/skillCategories
 * @description Static metadata for skill library categories
 *
 * PURPOSE:
 * - Define labels and descriptions for each skill category
 * - Provide category information for the skill library filter UI
 *
 * DEPENDENCIES:
 * - @/types/skill - SkillCategory, SkillCategoryInfo types
 *
 * EXPORTS:
 * - SKILL_CATEGORIES - Array of SkillCategoryInfo objects for all categories
 *
 * PATTERNS:
 * - Categories are ordered by typical usage frequency
 * - Each category has a human-readable label and description
 *
 * CLAUDE NOTES:
 * - Add new categories here when extending the SkillCategory type
 * - Keep descriptions concise (1 sentence)
 */

import type { SkillCategoryInfo } from "@/types/skill";

export const SKILL_CATEGORIES: SkillCategoryInfo[] = [
  {
    id: "documentation",
    label: "Documentation",
    description: "Skills for writing module headers, README files, and API docs.",
  },
  {
    id: "testing",
    label: "Testing",
    description: "Skills for unit tests, integration tests, and E2E testing.",
  },
  {
    id: "component-creation",
    label: "Components",
    description: "Skills for scaffolding UI components in various frameworks.",
  },
  {
    id: "state-management",
    label: "State Management",
    description: "Skills for creating stores and managing application state.",
  },
  {
    id: "api-design",
    label: "API Design",
    description: "Skills for designing REST endpoints, IPC commands, and APIs.",
  },
  {
    id: "error-handling",
    label: "Error Handling",
    description: "Skills for implementing error boundaries and error patterns.",
  },
  {
    id: "code-review",
    label: "Code Review",
    description: "Skills for PR review checklists and code quality checks.",
  },
  {
    id: "refactoring",
    label: "Refactoring",
    description: "Skills for extracting shared logic and improving code structure.",
  },
  {
    id: "debugging",
    label: "Debugging",
    description: "Skills for systematic debugging and troubleshooting.",
  },
  {
    id: "database",
    label: "Database",
    description: "Skills for SQL migrations and database schema patterns.",
  },
];
