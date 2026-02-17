//! @module models/memory
//! @description Data models for the Memory Management feature
//!
//! PURPOSE:
//! - Define memory source, learning, and memory health data structures
//! - Provide serialization for Tauri IPC
//!
//! DEPENDENCIES:
//! - serde - Serialization/deserialization for Tauri IPC
//!
//! EXPORTS:
//! - MemorySource - Represents a memory file (CLAUDE.md, rules, auto-memory, etc.)
//! - Learning - An extracted learning with category, topic, confidence, status
//! - MemoryHealth - Overall memory health metrics
//! - ClaudeMdAnalysis - Analysis results for CLAUDE.md quality
//! - AnalysisSuggestion - Individual suggestion for CLAUDE.md improvement
//! - LineRemovalSuggestion - Suggestion to remove a specific line
//! - LineMoveTarget - Suggestion to move lines to another file
//!
//! PATTERNS:
//! - All models derive Serialize, Deserialize for Tauri IPC
//! - Uses #[serde(rename_all = "camelCase")] for TS interop
//! - Keep in sync with TypeScript types in src/types/memory.ts
//!
//! CLAUDE NOTES:
//! - MemorySource.source_type values: "claude-md", "rules", "auto-memory", "local", "skills"
//! - MemorySource.scope values: "project", "global"
//! - Learning.category values: "Preference", "Solution", "Pattern", "Gotcha"
//! - Learning.confidence values: "high", "medium", "low"
//! - Learning.status values: "active", "verified", "deprecated", "archived"
//! - MemoryHealth.health_rating values: "excellent", "good", "needs-attention", "poor"

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySource {
    pub path: String,
    pub source_type: String,
    pub name: String,
    pub scope: String,
    pub line_count: u32,
    pub size_bytes: u64,
    pub last_modified: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Learning {
    pub id: String,
    pub session_id: String,
    pub category: String,
    pub content: String,
    pub topic: Option<String>,
    pub confidence: String,
    pub status: String,
    pub source_file: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryHealth {
    pub total_sources: u32,
    pub total_lines: u32,
    pub total_learnings: u32,
    pub active_learnings: u32,
    pub claude_md_lines: u32,
    pub claude_md_score: u32,
    pub rules_file_count: u32,
    pub skills_count: u32,
    pub estimated_token_usage: u32,
    pub health_rating: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeMdAnalysis {
    pub total_lines: u32,
    pub estimated_tokens: u32,
    pub score: u32,
    pub sections: Vec<String>,
    pub suggestions: Vec<AnalysisSuggestion>,
    pub lines_to_remove: Vec<LineRemovalSuggestion>,
    pub lines_to_move: Vec<LineMoveTarget>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisSuggestion {
    pub suggestion_type: String,
    pub message: String,
    pub line_range: Option<(u32, u32)>,
    pub target: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineRemovalSuggestion {
    pub line_number: u32,
    pub content: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LineMoveTarget {
    pub line_range: (u32, u32),
    pub content_preview: String,
    pub target_file: String,
    pub reason: String,
}
