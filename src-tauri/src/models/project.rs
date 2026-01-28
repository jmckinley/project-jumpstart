//! @module models/project
//! @description Data models for projects, detection results, and health scores
//!
//! PURPOSE:
//! - Define the Project struct for database and IPC
//! - Define HealthScore and component breakdown types
//! - Define DetectionResult with full tech stack detection
//! - Define ProjectSetup for onboarding configuration
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - Project - Core project metadata stored in database
//! - HealthScore - Overall project health with component breakdown
//! - HealthComponents - Individual health component scores
//! - QuickWin - Prioritized improvement suggestion
//! - DetectionResult - Full auto-detection output from project scanning
//! - DetectedValue - A detected value with confidence and source
//! - ProjectSetup - Configuration collected during onboarding
//!
//! PATTERNS:
//! - All structs derive Clone, Debug, Serialize, Deserialize
//! - IDs use UUID v4 strings
//! - Timestamps use chrono::DateTime<Utc>
//! - Detection confidence: "high" (config files), "medium" (deps), "low" (extensions)
//!
//! CLAUDE NOTES:
//! - Keep in sync with TypeScript types in src/types/project.ts
//! - Health score range is always 0-100
//! - DetectionResult expanded in Phase 2 to include database, testing, styling

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub description: String,
    pub project_type: String,
    pub language: String,
    pub framework: Option<String>,
    pub database: Option<String>,
    pub testing: Option<String>,
    pub styling: Option<String>,
    pub health_score: u32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthScore {
    pub total: u32,
    pub components: HealthComponents,
    pub quick_wins: Vec<QuickWin>,
    pub context_rot_risk: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthComponents {
    pub claude_md: u32,
    pub module_docs: u32,
    pub freshness: u32,
    pub skills: u32,
    pub context: u32,
    pub enforcement: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickWin {
    pub title: String,
    pub description: String,
    pub impact: u32,
    pub effort: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionResult {
    pub confidence: String,
    pub language: Option<DetectedValue>,
    pub framework: Option<DetectedValue>,
    pub database: Option<DetectedValue>,
    pub testing: Option<DetectedValue>,
    pub styling: Option<DetectedValue>,
    pub project_name: Option<String>,
    pub project_type: Option<String>,
    pub file_count: u32,
    pub has_existing_claude_md: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedValue {
    pub value: String,
    pub confidence: f64,
    pub source: String,
}

/// Configuration collected during onboarding wizard
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSetup {
    pub path: String,
    pub name: String,
    pub description: String,
    pub project_type: String,
    pub language: String,
    pub framework: Option<String>,
    pub database: Option<String>,
    pub testing: Option<String>,
    pub styling: Option<String>,
    pub goals: Vec<String>,
    pub generate_module_docs: bool,
    pub setup_enforcement: bool,
}
