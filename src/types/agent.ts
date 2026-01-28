/**
 * @module types/agent
 * @description TypeScript type definitions for agents, workflows, and agent library
 *
 * PURPOSE:
 * - Define Agent interface for reusable Claude Code agent configurations
 * - Define LibraryAgent for pre-built agent catalog
 * - Define AgentTier for basic vs advanced complexity
 * - Define workflow and tool types for advanced agents
 *
 * EXPORTS:
 * - AgentTier - "basic" | "advanced" complexity level
 * - AgentCategory - Categories for organizing agents in the library
 * - AgentTool - Tool definition for advanced agents
 * - AgentWorkflowStep - Workflow step for advanced agents
 * - LibraryAgent - A pre-defined agent from the agent library catalog
 * - Agent - A saved agent with database fields
 * - AgentCategoryInfo - Metadata about an agent category (label, description, icon)
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/agent.rs
 * - Agents have usage analytics (usageCount)
 * - Basic agents have instructions only, advanced have workflow + tools
 * - LibraryAgent has tags for tech-stack-based relevance scoring
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/agent.rs
 * - DateTime fields are serialized as ISO strings by Tauri
 * - TechTag is imported from skill.ts for consistency
 * - Advanced agents have workflow steps, tools, and trigger patterns
 */

import type { TechTag } from "./skill";

export type AgentTier = "basic" | "advanced";

export type AgentCategory =
  | "testing"
  | "code-review"
  | "documentation"
  | "debugging"
  | "refactoring"
  | "feature-development";

export interface AgentTool {
  name: string;
  description: string;
  required: boolean;
}

export interface AgentWorkflowStep {
  step: number;
  action: string;
  description: string;
}

export interface LibraryAgent {
  slug: string;
  name: string;
  description: string;
  tier: AgentTier;
  category: AgentCategory;
  tags: TechTag[];

  // Basic tier: instruction content
  instructions: string;

  // Advanced tier: workflow definition
  workflow?: AgentWorkflowStep[];
  tools?: AgentTool[];
  triggerPatterns?: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  tier: AgentTier;
  category: AgentCategory;
  instructions: string;
  workflow: AgentWorkflowStep[] | null;
  tools: AgentTool[] | null;
  triggerPatterns: string[] | null;
  projectId: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCategoryInfo {
  id: AgentCategory;
  label: string;
  description: string;
  icon: string;
}
