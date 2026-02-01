//! @module models/ralph
//! @description Data models for RALPH loop management and prompt analysis
//!
//! PURPOSE:
//! - Define RalphLoop struct for loop tracking and history
//! - Define PromptAnalysis for prompt quality scoring
//! - Define PromptCriterion for individual quality criteria
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
//!
//! PATTERNS:
//! - RalphLoop status: "idle" | "running" | "paused" | "completed" | "failed"
//! - PromptAnalysis quality_score is 0-100
//! - Each PromptCriterion scores 0-25 (four criteria sum to 100 max)
//!
//! CLAUDE NOTES:
//! - RALPH = Review, Analyze, List, Plan, Handoff
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
