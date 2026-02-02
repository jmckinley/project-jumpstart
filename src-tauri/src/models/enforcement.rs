//! @module models/enforcement
//! @description Data models for documentation enforcement (git hooks, CI, events)
//!
//! PURPOSE:
//! - Define EnforcementEvent for tracking hook/CI activity
//! - Define HookStatus for git hook installation state
//! - Define CiSnippet for CI integration templates
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//!
//! EXPORTS:
//! - EnforcementEvent - A hook block/warning event record
//! - HookStatus - Git hook installation status
//! - CiSnippet - CI template with provider and content
//!
//! PATTERNS:
//! - EnforcementEvent.event_type: "block" | "warning" | "info"
//! - EnforcementEvent.source: "hook" | "ci" | "watcher"
//! - HookStatus tracks pre-commit hook presence and mode
//! - CiSnippet.provider: "github_actions" | "gitlab_ci"
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/enforcement.ts
//! - Enforcement contributes 10% to the overall health score
//! - Hook modes: "block" (fail commit) or "warn" (allow but log)

use serde::{Deserialize, Serialize};

/// A recorded enforcement event (hook block, warning, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnforcementEvent {
    pub id: String,
    pub project_id: String,
    pub event_type: String,
    pub source: String,
    pub message: String,
    pub file_path: Option<String>,
    pub created_at: String,
}

/// Status of git hook installation for a project.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookStatus {
    pub installed: bool,
    pub hook_path: String,
    pub mode: String,
    pub has_husky: bool,
    pub has_git: bool,
}

/// CI integration template snippet.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CiSnippet {
    pub provider: String,
    pub name: String,
    pub description: String,
    pub filename: String,
    pub content: String,
}
