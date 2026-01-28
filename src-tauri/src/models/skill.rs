//! @module models/skill
//! @description Data models for skills and detected patterns
//!
//! PURPOSE:
//! - Define Skill struct for reusable Claude Code patterns
//! - Define Pattern for detected request patterns
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - Skill - A reusable Claude Code skill/pattern
//! - Pattern - A detected recurring request pattern
//!
//! PATTERNS:
//! - Skills have markdown content and usage analytics
//! - Patterns are detected from request history
//!
//! CLAUDE NOTES:
//! - Skills reduce token usage by avoiding re-explanation
//! - Keep in sync with TypeScript types in src/types/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
    pub project_id: Option<String>,
    pub usage_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pattern {
    pub id: String,
    pub description: String,
    pub frequency: u32,
    pub suggested_skill: Option<String>,
}
