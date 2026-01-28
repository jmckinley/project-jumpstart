/**
 * @module data/agentCategories
 * @description Static metadata for agent library categories
 *
 * PURPOSE:
 * - Define labels and descriptions for each agent category
 * - Provide category information for the agent library filter UI
 * - Assign icons to each category for visual identification
 *
 * DEPENDENCIES:
 * - @/types/agent - AgentCategoryInfo type
 *
 * EXPORTS:
 * - AGENT_CATEGORIES - Array of AgentCategoryInfo objects for all categories
 *
 * PATTERNS:
 * - Categories are ordered by typical workflow usage
 * - Each category has a human-readable label, description, and icon name
 * - Icons are Lucide icon names for consistency with the UI
 *
 * CLAUDE NOTES:
 * - Add new categories here when extending the AgentCategory type
 * - Keep descriptions concise (1 sentence)
 * - Icons should match the category's purpose
 */

import type { AgentCategoryInfo } from "@/types/agent";

export const AGENT_CATEGORIES: AgentCategoryInfo[] = [
  {
    id: "testing",
    label: "Testing",
    description: "Agents for writing tests, analyzing coverage, and test automation.",
    icon: "test-tube",
  },
  {
    id: "code-review",
    label: "Code Review",
    description: "Agents for reviewing code, security audits, and quality checks.",
    icon: "search-code",
  },
  {
    id: "documentation",
    label: "Documentation",
    description: "Agents for generating docs, API documentation, and README files.",
    icon: "file-text",
  },
  {
    id: "debugging",
    label: "Debugging",
    description: "Agents for finding bugs, root cause analysis, and troubleshooting.",
    icon: "bug",
  },
  {
    id: "refactoring",
    label: "Refactoring",
    description: "Agents for improving code structure, simplifying logic, and optimization.",
    icon: "refresh-cw",
  },
  {
    id: "feature-development",
    label: "Feature Dev",
    description: "Agents for implementing features, building components, and scaffolding.",
    icon: "code",
  },
];
