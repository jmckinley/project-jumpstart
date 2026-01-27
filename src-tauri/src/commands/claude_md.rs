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
//! - get_health_score - Calculate health score for a project path
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - File paths are resolved from the project path + "CLAUDE.md"
//! - Token estimation uses ~4 chars per token approximation
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

use crate::core::generator;
use crate::core::health;
use crate::db::AppState;
use crate::models::project::{HealthScore, Project};

/// Metadata about a CLAUDE.md file returned to the frontend.
#[derive(Debug, Clone, Serialize)]
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
pub async fn write_claude_md(project_path: String, content: String) -> Result<(), String> {
    let file_path = PathBuf::from(&project_path).join("CLAUDE.md");

    std::fs::write(&file_path, &content).map_err(|e| format!("Failed to write CLAUDE.md: {}", e))?;

    Ok(())
}

/// Generate a CLAUDE.md file from project data stored in the database.
/// Looks up the project by ID, generates content using the template engine,
/// and returns the generated content (does NOT write to disk).
#[tauri::command]
pub async fn generate_claude_md(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let project = db
        .query_row(
            "SELECT id, name, path, description, project_type, language, framework, database_tech, testing, styling, health_score, created_at FROM projects WHERE id = ?1",
            rusqlite::params![project_id],
            |row| {
                let created_str: String = row.get(11)?;
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
                    health_score: row.get(10)?,
                    created_at,
                })
            },
        )
        .map_err(|e| format!("Project not found: {}", e))?;

    let content = generator::generate_claude_md_content(&project);
    Ok(content)
}

/// Calculate and return the health score for a project path.
#[tauri::command]
pub async fn get_health_score(project_path: String) -> Result<HealthScore, String> {
    Ok(health::calculate_health(&project_path))
}
