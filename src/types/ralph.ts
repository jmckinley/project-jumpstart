/**
 * @module types/ralph
 * @description TypeScript type definitions for RALPH loop management
 *
 * PURPOSE:
 * - Define RalphLoop interface for loop execution records
 * - Define PromptAnalysis interface for prompt quality scoring
 * - Define PromptCriterion interface for individual score criteria
 *
 * EXPORTS:
 * - RalphLoop - A RALPH loop execution record with status tracking
 * - PromptAnalysis - Quality analysis result with criteria breakdown and suggestions
 * - PromptCriterion - Individual quality criterion (clarity, specificity, context, scope)
 * - RalphMistake - A recorded mistake from a RALPH loop for learning
 * - RalphLoopContext - Context data (CLAUDE.md summary, mistakes, patterns) for enhanced analysis
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/ralph.rs
 * - Loop status: "idle" | "running" | "paused" | "completed" | "failed"
 * - Quality score is 0-100, each criterion is 0-25
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/ralph.rs
 * - RALPH = Review, Analyze, List, Plan, Handoff
 * - Timestamps are ISO strings serialized by Tauri
 * - RalphMistake.mistakeType: "implementation" | "logic" | "scope" | "testing" | "other"
 * - RalphLoopContext is returned by getRalphContext for enhanced AI analysis
 */

export interface RalphLoop {
  id: string;
  projectId: string;
  prompt: string;
  enhancedPrompt: string | null;
  status: "idle" | "running" | "paused" | "completed" | "failed";
  qualityScore: number;
  iterations: number;
  outcome: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface PromptAnalysis {
  qualityScore: number;
  criteria: PromptCriterion[];
  suggestions: string[];
  enhancedPrompt: string | null;
}

export interface PromptCriterion {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface RalphMistake {
  id: string;
  projectId: string;
  loopId: string | null;
  mistakeType: "implementation" | "logic" | "scope" | "testing" | "other";
  description: string;
  context: string | null;
  resolution: string | null;
  learnedPattern: string | null;
  createdAt: string;
}

export interface RalphLoopContext {
  claudeMdSummary: string;
  recentMistakes: RalphMistake[];
  projectPatterns: string[];
}
