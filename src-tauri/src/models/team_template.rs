//! @module models/team_template
//! @description Data models for team templates and orchestration patterns
//!
//! PURPOSE:
//! - Define TeamTemplate struct for saved team configurations
//! - Define TeammateDef, TeamTaskDef, TeamHookDef sub-types
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - TeamTemplate - A saved team template configuration
//! - TeammateDef - Definition of a single teammate
//! - TeamTaskDef - Definition of a task with dependencies
//! - TeamHookDef - Definition of a hook for coordination
//! - ProjectContext - Active project tech stack context for deploy output personalization
//!
//! PATTERNS:
//! - Team templates have JSON-serialized teammates, tasks, hooks
//! - Pattern field is a string enum (leader/pipeline/parallel/swarm/council)
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/team-template.ts
//! - teammates, tasks, hooks are stored as JSON text in SQLite

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeammateDef {
    pub role: String,
    pub description: String,
    pub spawn_prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamTaskDef {
    pub id: String,
    pub title: String,
    pub description: String,
    pub assigned_to: String,
    pub blocked_by: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamHookDef {
    pub event: String,
    pub command: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContext {
    pub name: Option<String>,
    pub language: Option<String>,
    pub framework: Option<String>,
    pub test_framework: Option<String>,
    pub build_tool: Option<String>,
    pub styling: Option<String>,
    pub database: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub orchestration_pattern: String,
    pub category: String,
    pub teammates: Vec<TeammateDef>,
    pub tasks: Vec<TeamTaskDef>,
    pub hooks: Vec<TeamHookDef>,
    pub lead_spawn_instructions: String,
    pub project_id: Option<String>,
    pub usage_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
