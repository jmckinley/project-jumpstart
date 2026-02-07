/**
 * @module data/teamCategories
 * @description Static metadata for team template library categories
 *
 * PURPOSE:
 * - Define labels and descriptions for each team category
 * - Provide category information for the team template library filter UI
 * - Assign icons to each category for visual identification
 *
 * DEPENDENCIES:
 * - @/types/team-template - TeamCategoryInfo type
 *
 * EXPORTS:
 * - TEAM_CATEGORIES - Array of TeamCategoryInfo objects for all categories
 *
 * PATTERNS:
 * - Categories are ordered by typical workflow usage
 * - Each category has a human-readable label, description, and icon name
 *
 * CLAUDE NOTES:
 * - Add new categories here when extending the TeamCategory type
 * - Keep descriptions concise (1 sentence)
 */

import type { TeamCategoryInfo } from "@/types/team-template";

export const TEAM_CATEGORIES: TeamCategoryInfo[] = [
  {
    id: "feature-development",
    label: "Feature Dev",
    description: "Teams for building features with coordinated frontend, backend, and testing.",
    icon: "code",
  },
  {
    id: "testing",
    label: "Testing",
    description: "Teams for comprehensive test coverage with parallel test writers.",
    icon: "test-tube",
  },
  {
    id: "code-review",
    label: "Code Review",
    description: "Teams for multi-perspective code review including security and performance.",
    icon: "search-code",
  },
  {
    id: "refactoring",
    label: "Refactoring",
    description: "Teams for large-scale code restructuring with dependency tracking.",
    icon: "refresh-cw",
  },
  {
    id: "migration",
    label: "Migration",
    description: "Teams for framework upgrades, API migrations, and tech stack transitions.",
    icon: "arrow-right-left",
  },
  {
    id: "documentation",
    label: "Documentation",
    description: "Teams for comprehensive documentation sprints across the codebase.",
    icon: "file-text",
  },
  {
    id: "devops",
    label: "DevOps",
    description: "Teams for CI/CD setup, containerization, and deployment configuration.",
    icon: "server",
  },
];
