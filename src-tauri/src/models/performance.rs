//! @module models/performance
//! @description Data models for performance engineering reviews
//!
//! PURPOSE:
//! - Define PerformanceReview struct for database and IPC
//! - Define PerformanceComponents for category scoring
//! - Define PerformanceIssue for code-level findings
//! - Define ArchitectureFinding for architecture-level analysis
//! - Define RemediationResult for per-issue fix results
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//!
//! EXPORTS:
//! - PerformanceReview - Full performance review result
//! - PerformanceComponents - Score breakdown by category
//! - PerformanceIssue - Individual code-level performance issue
//! - ArchitectureFinding - Architecture-level finding with status
//! - RemediationResult - Result of auto-fixing a single performance issue
//!
//! PATTERNS:
//! - All structs derive Clone, Debug, Serialize, Deserialize
//! - Uses camelCase serialization for TypeScript compatibility
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/performance.ts
//! - Overall score range is 0-100
//! - Component max values: queryPatterns=20, rendering=20, memory=15, bundle=15, caching=15, apiDesign=15

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceReview {
    pub id: String,
    pub project_id: String,
    pub overall_score: u32,
    pub components: PerformanceComponents,
    pub issues: Vec<PerformanceIssue>,
    pub architecture_findings: Vec<ArchitectureFinding>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceComponents {
    pub query_patterns: u32,
    pub rendering: u32,
    pub memory: u32,
    pub bundle: u32,
    pub caching: u32,
    pub api_design: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceIssue {
    pub id: String,
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub file_path: Option<String>,
    pub line_number: Option<u32>,
    pub suggestion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchitectureFinding {
    pub id: String,
    pub category: String,
    pub status: String,
    pub title: String,
    pub description: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemediationResult {
    pub issue_id: String,
    pub file_path: String,
    pub status: String,
    pub message: String,
}
