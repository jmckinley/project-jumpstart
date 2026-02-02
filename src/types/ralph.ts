/**
 * @module types/ralph
 * @description TypeScript type definitions for RALPH loop management
 *
 * PURPOSE:
 * - Define RalphLoop interface for loop execution records
 * - Define PromptAnalysis interface for prompt quality scoring
 * - Define PromptCriterion interface for individual score criteria
 * - Define PRD types for PRD-driven execution mode
 *
 * EXPORTS:
 * - RalphLoop - A RALPH loop execution record with status tracking
 * - PromptAnalysis - Quality analysis result with criteria breakdown and suggestions
 * - PromptCriterion - Individual quality criterion (clarity, specificity, context, scope)
 * - RalphMistake - A recorded mistake from a RALPH loop for learning
 * - RalphLoopContext - Context data (CLAUDE.md summary, mistakes, patterns) for enhanced analysis
 * - PrdStory - A single story/task in a PRD file
 * - PrdFile - Full PRD document with metadata and stories
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/ralph.rs
 * - Loop status: "idle" | "running" | "paused" | "completed" | "failed"
 * - Loop mode: "iterative" (default) | "prd" (PRD-driven fresh context per story)
 * - Quality score is 0-100, each criterion is 0-25
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/ralph.rs
 * - RALPH = Review, Analyze, List, Plan, Handoff (our interpretation)
 * - Original "Ralph" is named after Ralph Wiggum from The Simpsons
 * - PRD mode: fresh context per story, git commits between, like original Ralph
 * - Iterative mode: accumulated context with AI-powered issue extraction
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
  /** Execution mode: "iterative" (default) or "prd" */
  mode: "iterative" | "prd";
  /** Current story index for PRD mode (0-indexed) */
  currentStory: number | null;
  /** Total stories for PRD mode */
  totalStories: number | null;
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

/** A single story/task in a PRD file */
export interface PrdStory {
  /** Unique identifier for the story */
  id: string;
  /** Story title/summary */
  title: string;
  /** Detailed description of what needs to be done */
  description: string;
  /** Acceptance criteria or test commands to verify completion */
  acceptanceCriteria?: string;
  /** Priority (1 = highest) */
  priority: number;
  /** Whether this story has been completed */
  completed: boolean;
  /** Git commit hash when completed (if any) */
  commitHash?: string;
}

/** Full PRD document with metadata and stories */
export interface PrdFile {
  /** PRD name/title */
  name: string;
  /** Optional description of the overall goal */
  description?: string;
  /** Branch name to work on */
  branch: string;
  /** Command to run for validation (e.g., "pnpm test") */
  testCommand?: string;
  /** Command to run for type checking (e.g., "pnpm tsc --noEmit") */
  typecheckCommand?: string;
  /** Maximum iterations per story before moving on */
  maxIterationsPerStory: number;
  /** List of stories to implement */
  stories: PrdStory[];
}
