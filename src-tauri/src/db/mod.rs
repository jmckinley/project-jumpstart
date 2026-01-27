//! @module db/mod
//! @description Database layer for SQLite operations
//!
//! PURPOSE:
//! - Initialize and manage the SQLite database connection
//! - Provide database access to command handlers via AppState
//! - Run migrations on startup
//!
//! EXPORTS:
//! - schema - Database schema and migrations
//! - init_db - Initialize the database at the standard location
//! - AppState - Shared application state holding the DB connection
//!
//! DEPENDENCIES:
//! - rusqlite - SQLite database driver
//! - std::sync::Mutex - Thread-safe DB access
//! - std::fs - Create data directory
//!
//! PATTERNS:
//! - Database file location: ~/.claude-code-copilot/copilot.db
//! - Migrations run automatically on init_db()
//! - AppState is managed via Tauri's State<AppState>
//!
//! CLAUDE NOTES:
//! - Database is local-first, no server dependency
//! - All timestamps stored in UTC as ISO 8601 strings
//! - Mutex is used because rusqlite::Connection is not Send+Sync
//! - See spec Part 6.2 for table definitions

pub mod schema;

use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;

/// Shared application state, managed by Tauri
pub struct AppState {
    pub db: Mutex<Connection>,
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
