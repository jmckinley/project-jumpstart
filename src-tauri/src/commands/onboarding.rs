//! @module commands/onboarding
//! @description Tauri IPC commands for the project setup wizard
//!
//! PURPOSE:
//! - Handle project scanning and auto-detection via scan_project
//! - Save completed onboarding setup via save_project
//! - Bridge between frontend wizard UI and core scanner/database
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - core::scanner - Project detection logic
//! - db - AppState with database connection
//! - models::project - DetectionResult, ProjectSetup types
//!
//! EXPORTS:
//! - scan_project - Scan a directory and return detection results
//! - save_project - Save a fully configured project to the database
//!
//! PATTERNS:
//! - scan_project is called when a user selects a folder
//! - save_project is called when the user completes the wizard
//! - Both commands are async and return Result<T, String>
//!
//! CLAUDE NOTES:
//! - scan_project does NOT modify any files or database
//! - save_project creates the database record
//! - See spec Part 2 for the full onboarding flow

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::core::scanner;
use crate::db::AppState;
use crate::models::project::{DetectionResult, Project, ProjectSetup};

#[tauri::command]
pub async fn scan_project(path: String) -> Result<DetectionResult, String> {
    scanner::scan_project_dir(&path)
}

#[tauri::command]
pub async fn save_project(
    setup: ProjectSetup,
    state: State<'_, AppState>,
) -> Result<Project, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = Utc::now();
    let id = Uuid::new_v4().to_string();

    db.execute(
        "INSERT INTO projects (id, name, path, description, project_type, language, framework, database_tech, testing, styling, health_score, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![
            &id,
            &setup.name,
            &setup.path,
            &setup.description,
            &setup.project_type,
            &setup.language,
            &setup.framework,
            &setup.database,
            &setup.testing,
            &setup.styling,
            0,
            now.to_rfc3339(),
        ],
    )
    .map_err(|e| format!("Failed to insert project: {}", e))?;

    Ok(Project {
        id,
        name: setup.name,
        path: setup.path,
        description: setup.description,
        project_type: setup.project_type,
        language: setup.language,
        framework: setup.framework,
        database: setup.database,
        testing: setup.testing,
        styling: setup.styling,
        health_score: 0,
        created_at: now,
    })
}
