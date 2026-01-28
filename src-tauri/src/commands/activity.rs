//! @module commands/activity
//! @description Tauri IPC commands for the activity feed
//!
//! PURPOSE:
//! - Record project activities (scans, doc generation, health checks, etc.)
//! - Retrieve recent activities for the dashboard feed
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection
//! - rusqlite - SQLite queries
//! - uuid - Activity ID generation
//! - chrono - Timestamp generation
//!
//! EXPORTS:
//! - log_activity - Record a new activity event
//! - get_recent_activities - Fetch recent activities for a project
//!
//! PATTERNS:
//! - activity_type values: "scan", "generate", "edit", "health", "enforcement", "skill", "info"
//! - Activities are ordered by created_at DESC (most recent first)
//! - Default limit is 20 activities
//!
//! CLAUDE NOTES:
//! - The activities table was added in Phase 10 (schema.rs)
//! - Activities drive the RecentActivity dashboard component
//! - log_activity is called by other commands as a side effect

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub id: String,
    pub project_id: String,
    pub activity_type: String,
    pub message: String,
    pub created_at: String,
}

/// Record a new activity event for a project.
#[tauri::command]
pub async fn log_activity(
    project_id: String,
    activity_type: String,
    message: String,
    state: State<'_, AppState>,
) -> Result<Activity, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO activities (id, project_id, activity_type, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, project_id, activity_type, message, created_at],
    )
    .map_err(|e| format!("Failed to log activity: {}", e))?;

    Ok(Activity {
        id,
        project_id,
        activity_type,
        message,
        created_at,
    })
}

/// Fetch recent activities for a project, ordered by most recent first.
#[tauri::command]
pub async fn get_recent_activities(
    project_id: String,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<Activity>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let max = limit.unwrap_or(20);

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, activity_type, message, created_at FROM activities WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )
        .map_err(|e| format!("Failed to query activities: {}", e))?;

    let activities = stmt
        .query_map(rusqlite::params![project_id, max], |row| {
            Ok(Activity {
                id: row.get(0)?,
                project_id: row.get(1)?,
                activity_type: row.get(2)?,
                message: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to read activities: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(activities)
}
