//! @module models/context
//! @description Data models for context health monitoring and checkpoints
//!
//! PURPOSE:
//! - Define ContextHealth struct for overall context usage and risk
//! - Define TokenBreakdown for token usage by category
//! - Define McpServerStatus for MCP server monitoring
//! - Define Checkpoint for context state snapshots
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//!
//! EXPORTS:
//! - ContextHealth - Context usage summary with token breakdown and risk level
//! - TokenBreakdown - Token counts by category (conversation, code, mcp, skills)
//! - McpServerStatus - Individual MCP server status and recommendations
//! - Checkpoint - Context checkpoint record
//!
//! PATTERNS:
//! - ContextHealth.rot_risk: "low" (>=70%), "medium" (40-69%), "high" (<40%)
//! - TokenBreakdown categories should sum to total_tokens
//! - McpServerStatus.recommendation: "keep" | "optimize" | "disable"
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/health.ts
//! - Context budget is assumed as 200k tokens (Claude's context window)
//! - MCP overhead is estimated from server configuration files
//! - Checkpoints persist context state snapshots for recovery

use serde::{Deserialize, Serialize};

/// Overall context health summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextHealth {
    pub total_tokens: u32,
    pub usage_percent: f64,
    pub breakdown: TokenBreakdown,
    pub rot_risk: String,
}

/// Token usage breakdown by category.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBreakdown {
    pub conversation: u32,
    pub code: u32,
    pub mcp: u32,
    pub skills: u32,
}

/// Status and recommendation for an MCP server.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerStatus {
    pub name: String,
    pub status: String,
    pub token_overhead: u32,
    pub recommendation: String,
    pub description: String,
}

/// Context checkpoint — a snapshot of context state at a point in time.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    pub id: String,
    pub project_id: String,
    pub label: String,
    pub summary: String,
    pub token_snapshot: u32,
    pub context_percent: f64,
    pub created_at: String,
}
