//! @module commands/claude_md
//! @description Tauri IPC commands for CLAUDE.md file operations
//!
//! PURPOSE:
//! - Read existing CLAUDE.md files and return content with metadata
//! - Write CLAUDE.md content to disk
//! - Generate new CLAUDE.md from project configuration
//! - Calculate health scores for projects
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for project lookup
//! - core::generator - Template-based CLAUDE.md generation
//! - core::health - Health score calculation and token estimation
//! - std::fs - File read/write operations
//!
//! EXPORTS:
//! - read_claude_md - Read existing CLAUDE.md and return ClaudeMdInfo
//! - write_claude_md - Write content to CLAUDE.md file
//! - generate_claude_md - Generate CLAUDE.md from project data in database
//! - get_health_score - Calculate health score for a project path (uses State for skill count)
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - File paths are resolved from the project path + "CLAUDE.md"
//! - Token estimation uses ~4 chars per token approximation
//! - get_health_score queries skills count from DB for health scoring
//!
//! CLAUDE NOTES:
//! - CLAUDE.md is the most critical file for context rot prevention
//! - read_claude_md returns exists=false if file not found (not an error)
//! - generate_claude_md looks up project from DB by ID, then calls generator
//! - write_claude_md always overwrites the entire file

use std::path::PathBuf;

use chrono::DateTime;
use serde::Serialize;
use tauri::State;

use crate::core::ai;
use crate::core::generator;
use crate::core::health;
use crate::db::{self, AppState};
use crate::models::project::{HealthScore, Project};

/// Metadata about a CLAUDE.md file returned to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeMdInfo {
    pub exists: bool,
    pub content: String,
    pub token_estimate: u32,
    pub path: String,
}

/// Read the CLAUDE.md file for a given project path.
/// Returns ClaudeMdInfo with exists=false if file doesn't exist.
#[tauri::command]
pub async fn read_claude_md(project_path: String) -> Result<ClaudeMdInfo, String> {
    let file_path = PathBuf::from(&project_path).join("CLAUDE.md");
    let path_str = file_path.to_string_lossy().to_string();

    if !file_path.exists() {
        return Ok(ClaudeMdInfo {
            exists: false,
            content: String::new(),
            token_estimate: 0,
            path: path_str,
        });
    }

    let content =
        std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read CLAUDE.md: {}", e))?;

    let token_estimate = health::estimate_tokens(&content);

    Ok(ClaudeMdInfo {
        exists: true,
        content,
        token_estimate,
        path: path_str,
    })
}

/// Write content to the CLAUDE.md file at the given project path.
/// Creates the file if it doesn't exist, overwrites if it does.
#[tauri::command]
pub async fn write_claude_md(
    project_path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let file_path = PathBuf::from(&project_path).join("CLAUDE.md");

    std::fs::write(&file_path, &content).map_err(|e| format!("Failed to write CLAUDE.md: {}", e))?;

    // Log activity
    let _ = state.db.lock().map(|db| {
        if let Ok(pid) = db.query_row(
            "SELECT id FROM projects WHERE path = ?1",
            [&project_path],
            |row| row.get::<_, String>(0),
        ) {
            let _ = db::log_activity_db(&db, &pid, "edit", "Updated CLAUDE.md");
        }
    });

    Ok(())
}

/// Generate a CLAUDE.md file from project data stored in the database.
/// Tries AI generation first (if API key is configured), falls back to template.
/// Returns the generated content (does NOT write to disk).
#[tauri::command]
pub async fn generate_claude_md(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let (project, api_key_result) = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let project = db
            .query_row(
                "SELECT id, name, path, description, project_type, language, framework, database_tech, testing, styling, stack_extras, health_score, created_at FROM projects WHERE id = ?1",
                rusqlite::params![project_id],
                |row| {
                    let stack_extras_json: Option<String> = row.get(10)?;
                    let stack_extras = stack_extras_json
                        .and_then(|json| serde_json::from_str(&json).ok());

                    let created_str: String = row.get(12)?;
                    let created_at = DateTime::parse_from_rfc3339(&created_str)
                        .map(|dt| dt.with_timezone(&chrono::Utc))
                        .unwrap_or_else(|_| chrono::Utc::now());

                    Ok(Project {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        path: row.get(2)?,
                        description: row.get(3)?,
                        project_type: row.get(4)?,
                        language: row.get(5)?,
                        framework: row.get(6)?,
                        database: row.get(7)?,
                        testing: row.get(8)?,
                        styling: row.get(9)?,
                        stack_extras,
                        health_score: row.get(11)?,
                        created_at,
                    })
                },
            )
            .map_err(|e| format!("Project not found: {}", e))?;

        let api_key_result = ai::get_api_key(&db);
        (project, api_key_result)
    };

    // Try AI generation if API key is available
    if let Ok(api_key) = api_key_result {
        match generator::generate_claude_md_with_ai(&project, &state.http_client, &api_key).await {
            Ok(content) => {
                // Log activity on success
                let _ = state.db.lock().map(|db| {
                    let _ = db::log_activity_db(&db, &project.id, "generate", "Generated CLAUDE.md (AI)");
                });
                return Ok(content);
            }
            Err(_) => {
                // Fall through to template generation
            }
        }
    }

    let content = generator::generate_claude_md_content(&project);

    // Log activity
    let _ = state.db.lock().map(|db| {
        let _ = db::log_activity_db(&db, &project.id, "generate", "Generated CLAUDE.md (template)");
    });

    Ok(content)
}

/// Calculate and return the health score for a project path.
/// Queries the database for skill count and latest test metrics to include in the calculation.
#[tauri::command]
pub async fn get_health_score(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<HealthScore, String> {
    let (skill_count, test_coverage, test_pass_rate) = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        // Get project ID from path, then count skills
        let project_id: Option<String> = db
            .query_row(
                "SELECT id FROM projects WHERE path = ?1",
                [&project_path],
                |row| row.get(0),
            )
            .ok();

        if let Some(pid) = &project_id {
            let skills = db
                .query_row(
                    "SELECT COUNT(*) FROM skills WHERE project_id = ?1 OR project_id IS NULL",
                    [pid],
                    |row| row.get::<_, u32>(0),
                )
                .unwrap_or(0);

            // Get latest test run metrics for this project
            let test_metrics: Option<(f64, f64)> = db
                .query_row(
                    "SELECT tr.coverage_percent,
                            CASE WHEN tr.total_tests > 0
                                 THEN (tr.passed_tests * 100.0 / tr.total_tests)
                                 ELSE 0.0 END as pass_rate
                     FROM test_runs tr
                     JOIN test_plans tp ON tr.plan_id = tp.id
                     WHERE tp.project_id = ?1 AND tr.status = 'completed'
                     ORDER BY tr.completed_at DESC
                     LIMIT 1",
                    [pid],
                    |row| Ok((row.get::<_, f64>(0).unwrap_or(0.0), row.get::<_, f64>(1).unwrap_or(0.0))),
                )
                .ok();

            let (coverage, pass_rate) = test_metrics.unwrap_or((0.0, 0.0));
            (skills, Some(coverage), Some(pass_rate))
        } else {
            (0, None, None)
        }
    };

    Ok(health::calculate_health_with_tests(
        &project_path,
        skill_count,
        test_coverage,
        test_pass_rate,
    ))
}
