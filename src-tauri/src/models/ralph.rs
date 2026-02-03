//! @module models/ralph
//! @description Data models for RALPH loop management and prompt analysis
//!
//! PURPOSE:
//! - Define RalphLoop struct for loop tracking and history
//! - Define PromptAnalysis for prompt quality scoring
//! - Define PromptCriterion for individual quality criteria
//! - Define PRD types for PRD-driven execution mode
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//!
//! EXPORTS:
//! - RalphLoop - A RALPH loop execution record
//! - PromptAnalysis - Quality analysis result for a prompt
//! - PromptCriterion - Individual scored criterion (clarity, specificity, context, scope)
//! - RalphMistake - A recorded mistake from a RALPH loop for learning
//! - RalphLoopContext - Context data (CLAUDE.md summary, mistakes, patterns) for enhanced analysis
//! - PrdStory - A single story/task in a PRD file
//! - PrdFile - Full PRD document with metadata and stories
//!
//! PATTERNS:
//! - RalphLoop status: "idle" | "running" | "paused" | "completed" | "failed"
//! - RalphLoop mode: "iterative" (default) | "prd" (PRD-driven fresh context per story)
//! - PromptAnalysis quality_score is 0-100
//! - Each PromptCriterion scores 0-25 (four criteria sum to 100 max)
//!
//! CLAUDE NOTES:
//! - RALPH = Review, Analyze, List, Plan, Handoff (our interpretation)
//! - Original "Ralph" is named after Ralph Wiggum from The Simpsons
//! - PRD mode: fresh context per story, git commits between, like original Ralph
//! - Iterative mode: accumulated context with AI-powered issue extraction
//! - Keep in sync with TypeScript types in src/types/ralph.ts
//! - Loop status transitions: idle -> running -> paused/completed/failed
//! - RalphMistake.mistake_type: "implementation" | "logic" | "scope" | "testing" | "other"
//! - RalphLoopContext is returned by get_ralph_context for enhanced AI analysis

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RalphLoop {
    pub id: String,
    pub project_id: String,
    pub prompt: String,
    pub enhanced_prompt: Option<String>,
    pub status: String,
    pub quality_score: u32,
    pub iterations: u32,
    pub outcome: Option<String>,
    pub started_at: Option<String>,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    /// Execution mode: "iterative" (default) or "prd"
    #[serde(default = "default_mode")]
    pub mode: String,
    /// Current story index for PRD mode (0-indexed)
    pub current_story: Option<u32>,
    /// Total stories for PRD mode
    pub total_stories: Option<u32>,
}

fn default_mode() -> String {
    "iterative".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptAnalysis {
    pub quality_score: u32,
    pub criteria: Vec<PromptCriterion>,
    pub suggestions: Vec<String>,
    pub enhanced_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptCriterion {
    pub name: String,
    pub score: u32,
    pub max_score: u32,
    pub feedback: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RalphMistake {
    pub id: String,
    pub project_id: String,
    pub loop_id: Option<String>,
    pub mistake_type: String,
    pub description: String,
    pub context: Option<String>,
    pub resolution: Option<String>,
    pub learned_pattern: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RalphLoopContext {
    pub claude_md_summary: String,
    pub recent_mistakes: Vec<RalphMistake>,
    pub project_patterns: Vec<String>,
}

/// A single story/task in a PRD file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrdStory {
    /// Unique identifier for the story
    pub id: String,
    /// Story title/summary
    pub title: String,
    /// Detailed description of what needs to be done
    pub description: String,
    /// Acceptance criteria or test commands to verify completion
    pub acceptance_criteria: Option<String>,
    /// Priority (1 = highest)
    #[serde(default = "default_priority")]
    pub priority: u32,
    /// Whether this story has been completed
    #[serde(default)]
    pub completed: bool,
    /// Git commit hash when completed (if any)
    pub commit_hash: Option<String>,
}

fn default_priority() -> u32 {
    1
}

/// Full PRD document with metadata and stories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrdFile {
    /// PRD name/title
    pub name: String,
    /// Optional description of the overall goal
    pub description: Option<String>,
    /// Branch name to work on
    #[serde(default = "default_branch")]
    pub branch: String,
    /// Command to run for validation (e.g., "pnpm test")
    pub test_command: Option<String>,
    /// Command to run for type checking (e.g., "pnpm tsc --noEmit")
    pub typecheck_command: Option<String>,
    /// Maximum iterations per story before moving on
    #[serde(default = "default_max_iterations")]
    pub max_iterations_per_story: u32,
    /// List of stories to implement
    pub stories: Vec<PrdStory>,
}

fn default_branch() -> String {
    "main".to_string()
}

fn default_max_iterations() -> u32 {
    3
}

/// Progress update during PRD execution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct PrdProgress {
    /// Current story being worked on (0-indexed)
    pub current_story_index: u32,
    /// Total number of stories
    pub total_stories: u32,
    /// Number of completed stories
    pub completed_stories: u32,
    /// Current iteration within the story
    pub current_iteration: u32,
    /// Status message
    pub status_message: String,
}
