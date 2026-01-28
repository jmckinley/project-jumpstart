//! @module db/mod
//! @description Database layer for SQLite operations and shared application state
//!
//! PURPOSE:
//! - Initialize and manage the SQLite database connection
//! - Provide database access to command handlers via AppState
//! - Hold shared HTTP client for API calls
//! - Run migrations on startup
//! - Provide direct DB activity logging for command-level side effects
//!
//! EXPORTS:
//! - schema - Database schema and migrations
//! - init_db - Initialize the database at the standard location
//! - AppState - Shared application state holding the DB connection and HTTP client
//! - log_activity_db - Direct DB insert for activity logging (avoids IPC)
//!
//! DEPENDENCIES:
//! - rusqlite - SQLite database driver
//! - reqwest - HTTP client for API calls
//! - std::sync::Mutex - Thread-safe DB access
//! - std::fs - Create data directory
//! - uuid - Activity ID generation
//! - chrono - Timestamp generation
//!
//! PATTERNS:
//! - Database file location: ~/.claude-code-copilot/copilot.db
//! - Migrations run automatically on init_db()
//! - AppState is managed via Tauri's State<AppState>
//! - log_activity_db is called directly by commands, not via IPC
//!
//! CLAUDE NOTES:
//! - Database is local-first, no server dependency
//! - All timestamps stored in UTC as ISO 8601 strings
//! - Mutex is used because rusqlite::Connection is not Send+Sync
//! - reqwest::Client is internally Arc'd, no Mutex needed
//! - See spec Part 6.2 for table definitions

pub mod schema;

use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;

/// Shared application state, managed by Tauri
pub struct AppState {
    pub db: Mutex<Connection>,
    pub http_client: reqwest::Client,
    pub watcher: Mutex<Option<crate::core::watcher::ProjectWatcher>>,
}

/// Log an activity directly to the database.
/// Used by command handlers as a fire-and-forget side effect.
/// Errors are silently ignored (activity logging should never block main operations).
pub fn log_activity_db(
    db: &Connection,
    project_id: &str,
    activity_type: &str,
    message: &str,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO activities (id, project_id, activity_type, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, project_id, activity_type, message, created_at],
    )
    .map_err(|e| format!("Failed to log activity: {}", e))?;

    Ok(())
}

/// Initialize the database at ~/.claude-code-copilot/copilot.db
/// Creates the directory and database file if they don't exist.
/// Runs all schema migrations.
pub fn init_db() -> Result<Connection, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let data_dir = home.join(".claude-code-copilot");

    fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    let db_path = data_dir.join("copilot.db");
    let conn =
        Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .map_err(|e| format!("Failed to set WAL mode: {}", e))?;

    schema::create_tables(&conn).map_err(|e| format!("Failed to create tables: {}", e))?;

    Ok(conn)
}
