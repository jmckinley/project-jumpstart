//! @module commands/settings
//! @description Tauri IPC commands for user settings persistence
//!
//! PURPOSE:
//! - Read and write user settings (key-value pairs) from SQLite
//! - Provide typed setting retrieval
//! - Support settings UI in the frontend
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for settings table
//! - rusqlite - SQLite queries
//!
//! EXPORTS:
//! - get_setting - Read a single setting by key
//! - save_setting - Write a single setting key-value pair (upsert)
//! - get_all_settings - Read all settings as a flat map
//!
//! PATTERNS:
//! - Settings are stored as TEXT key-value pairs in the settings table
//! - Keys use dot notation: "enforcement.level", "notifications.enabled"
//! - Values are always strings; the frontend converts to appropriate types
//! - save_setting uses INSERT OR REPLACE for upsert behavior
//!
//! CLAUDE NOTES:
//! - The settings table was created in Phase 1 (schema.rs) with key TEXT PRIMARY KEY, value TEXT
//! - Never store API keys in settings; use the system keychain instead
//! - Default values are handled on the frontend (settingsStore.ts), not here

use std::collections::HashMap;
use tauri::State;

use crate::db::AppState;

/// Read a single setting value by key. Returns None (null) if not found.
#[tauri::command]
pub async fn get_setting(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let result = db.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        rusqlite::params![key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to read setting: {}", e)),
    }
}

/// Write a setting key-value pair. Creates or updates (upsert).
#[tauri::command]
pub async fn save_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    db.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .map_err(|e| format!("Failed to save setting: {}", e))?;

    Ok(())
}

/// Read all settings as a HashMap.
#[tauri::command]
pub async fn get_all_settings(
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = db
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("Failed to query settings: {}", e))?;

    let settings = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to read settings: {}", e))?
        .filter_map(|r| r.ok())
        .collect::<HashMap<String, String>>();

    Ok(settings)
}

#[cfg(test)]
mod tests {
    // Settings commands require a State<AppState> which needs a full Tauri test harness.
    // The SQL queries are straightforward (single-table CRUD), so they are
    // validated through integration testing and the schema tests.
}
