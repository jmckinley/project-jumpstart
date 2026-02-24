//! @module models/session_handoff
//! @description Data models for the Session Handoff feature
//!
//! PURPOSE:
//! - Define session snapshot data structure for persisting session context
//! - Enable zero-ramp-up handoff between Claude Code sessions
//!
//! DEPENDENCIES:
//! - serde - Serialization/deserialization for Tauri IPC
//!
//! EXPORTS:
//! - SessionSnapshot - Captured state of a session for handoff to the next
//!
//! PATTERNS:
//! - All models derive Serialize, Deserialize for Tauri IPC
//! - Uses #[serde(rename_all = "camelCase")] for TS interop
//! - Keep in sync with TypeScript types in src/types/session-handoff.ts
//!
//! CLAUDE NOTES:
//! - pending_items, next_steps, files_modified are JSON-serialized Vec<String> in DB
//! - git_state contains branch name + dirty status (e.g. "main (3 modified)")
//! - summary is AI-generated from session transcript analysis

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub id: String,
    pub project_id: String,
    pub session_id: String,
    pub summary: String,
    pub pending_items: Vec<String>,
    pub git_state: String,
    pub next_steps: Vec<String>,
    pub files_modified: Vec<String>,
    pub created_at: String,
}
