//! @module commands/freshness
//! @description Tauri IPC commands for documentation freshness detection
//!
//! PURPOSE:
//! - Expose freshness checking for single files and entire projects
//! - Return stale files for the frontend to display
//! - Provide detailed freshness results with staleness signals
//!
//! DEPENDENCIES:
//! - tauri - Command macro
//! - core::freshness - Staleness detection engine
//! - models::module_doc - ModuleStatus type for batch results
//!
//! EXPORTS:
//! - check_freshness - Check freshness of a single file, returns FreshnessCheckResult
//! - get_stale_files - Get all files with outdated or missing docs
//!
//! PATTERNS:
//! - Commands are thin wrappers over core::freshness functions
//! - check_freshness returns detailed signal info for single-file view
//! - get_stale_files filters to only outdated/missing for quick win lists
//!
//! CLAUDE NOTES:
//! - FreshnessCheckResult is a serializable version of core FreshnessResult
//! - The core FreshnessResult doesn't derive Serialize; this wraps it for IPC

use serde::Serialize;

use crate::core::freshness;
use crate::models::module_doc::ModuleStatus;

/// Serializable freshness result for IPC.
#[derive(Debug, Clone, Serialize)]
pub struct FreshnessCheckResult {
    pub score: u32,
    pub status: String,
    pub changes: Vec<String>,
}

/// Check freshness of a single file.
/// Returns detailed freshness result with score, status, and change descriptions.
#[tauri::command]
pub async fn check_freshness(
    file_path: String,
    project_path: String,
) -> Result<FreshnessCheckResult, String> {
    let result = freshness::check_file_freshness(&file_path, &project_path);
    Ok(FreshnessCheckResult {
        score: result.score,
        status: result.status,
        changes: result.changes,
    })
}

/// Get all files with outdated or missing documentation.
/// Returns only stale files (status != "current"), useful for quick win lists.
#[tauri::command]
pub async fn get_stale_files(project_path: String) -> Result<Vec<ModuleStatus>, String> {
    let all = freshness::check_project_freshness(&project_path)?;
    let stale: Vec<ModuleStatus> = all
        .into_iter()
        .filter(|m| m.status != "current")
        .collect();
    Ok(stale)
}
