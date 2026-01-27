//! @module models/module_doc
//! @description Data models for module documentation status and content
//!
//! PURPOSE:
//! - Define ModuleStatus for tracking documentation state per file
//! - Define ModuleDoc for documentation content
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//!
//! EXPORTS:
//! - ModuleStatus - Documentation status for a single file
//! - ModuleDoc - Parsed documentation header content
//!
//! PATTERNS:
//! - Status is one of: "current", "outdated", "missing"
//! - Freshness score is 0-100
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/module.ts
//! - changes field lists what has changed since docs were last updated

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleStatus {
    pub path: String,
    pub status: String,
    pub freshness_score: u32,
    pub changes: Option<Vec<String>>,
    pub suggested_doc: Option<ModuleDoc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleDoc {
    pub module_path: String,
    pub description: String,
    pub purpose: Vec<String>,
    pub dependencies: Vec<String>,
    pub exports: Vec<String>,
    pub patterns: Vec<String>,
    pub claude_notes: Vec<String>,
}
