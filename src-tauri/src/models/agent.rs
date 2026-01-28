//! @module models/agent
//! @description Data models for agents and workflows
//!
//! PURPOSE:
//! - Define Agent struct for reusable Claude Code agent configurations
//! - Define WorkflowStep for advanced agent workflows
//! - Define AgentTool for agent tool definitions
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - Agent - A reusable Claude Code agent configuration
//! - WorkflowStep - A step in an advanced agent workflow
//! - AgentTool - A tool definition for advanced agents
//!
//! PATTERNS:
//! - Agents have markdown instructions and optional workflow definitions
//! - Advanced agents have workflow steps, tools, and trigger patterns
//! - JSON fields (workflow, tools, trigger_patterns) are serialized/deserialized
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/agent.ts
//! - workflow, tools, trigger_patterns are Option<Vec<T>> for basic agents
//! - tier is "basic" or "advanced"

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: String,
    pub tier: String,
    pub category: String,
    pub instructions: String,
    pub workflow: Option<Vec<WorkflowStep>>,
    pub tools: Option<Vec<AgentTool>>,
    pub trigger_patterns: Option<Vec<String>>,
    pub project_id: Option<String>,
    pub usage_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStep {
    pub step: u32,
    pub action: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTool {
    pub name: String,
    pub description: String,
    pub required: bool,
}
