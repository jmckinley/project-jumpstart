//! @module commands/project
//! @description Tauri IPC commands for project management (CRUD operations)
//!
//! PURPOSE:
//! - List all registered projects
//! - Get a single project by ID
//! - Remove a project from the database
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - rusqlite - Database queries
//! - chrono - Timestamp parsing
//! - models::project - Project type
//! - db - AppState with database connection
//!
//! EXPORTS:
//! - list_projects - Fetch all projects ordered by creation date
//! - get_project - Fetch a single project by ID
//! - remove_project - Delete a project record
//!
//! PATTERNS:
//! - All commands are async, return Result<T, String>
//! - Use State<'_, AppState> for database access
//! - Timestamps are parsed from ISO 8601 strings
//!
//! CLAUDE NOTES:
//! - list_projects returns newest first
//! - remove_project only deletes the DB record, not project files
//! - Row mapping uses column indices for performance

use chrono::DateTime;
use tauri::State;

use crate::db::AppState;
use crate::models::project::Project;

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, path, description, project_type, language, framework, database_tech, testing, styling, stack_extras, health_score, created_at
             FROM projects ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Query prepare error: {}", e))?;

    let projects = stmt
        .query_map([], |row| {
            let extras_str: Option<String> = row.get(10)?;
            let stack_extras = extras_str.and_then(|s| serde_json::from_str(&s).ok());

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
        })
        .map_err(|e| format!("Query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Row mapping error: {}", e))?;

    Ok(projects)
}

#[tauri::command]
pub async fn get_project(id: String, state: State<'_, AppState>) -> Result<Project, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, path, description, project_type, language, framework, database_tech, testing, styling, stack_extras, health_score, created_at
             FROM projects WHERE id = ?1",
        )
        .map_err(|e| format!("Query prepare error: {}", e))?;

    stmt.query_row(rusqlite::params![&id], |row| {
        let extras_str: Option<String> = row.get(10)?;
        let stack_extras = extras_str.and_then(|s| serde_json::from_str(&s).ok());

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
    })
    .map_err(|e| format!("Project not found: {}", e))
}

#[tauri::command]
pub async fn remove_project(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.execute("DELETE FROM projects WHERE id = ?1", rusqlite::params![&id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}
