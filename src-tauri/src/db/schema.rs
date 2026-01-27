//! @module db/schema
//! @description Database schema definitions and migration logic
//!
//! PURPOSE:
//! - Define table creation SQL for all database tables
//! - Handle schema migrations between versions
//! - Provide the initial schema creation function
//!
//! DEPENDENCIES:
//! - rusqlite - SQLite connection for executing DDL
//!
//! EXPORTS:
//! - create_tables - Creates all tables if they don't exist
//!
//! PATTERNS:
//! - Uses CREATE TABLE IF NOT EXISTS for idempotent setup
//! - All timestamps stored as TEXT in ISO 8601 format (UTC)
//! - IDs are TEXT (UUID v4 strings)
//!
//! CLAUDE NOTES:
//! - Tables: projects, module_docs, freshness_history, skills, patterns,
//!   ralph_loops, checkpoints, enforcement_events, settings
//! - See spec Part 6.2 for full table definitions
//! - Add new tables here and call in create_tables()

use rusqlite::Connection;

pub fn create_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS projects (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            path            TEXT NOT NULL UNIQUE,
            description     TEXT NOT NULL DEFAULT '',
            project_type    TEXT NOT NULL DEFAULT '',
            language        TEXT NOT NULL DEFAULT '',
            framework       TEXT,
            database_tech   TEXT,
            testing         TEXT,
            styling         TEXT,
            health_score    INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS module_docs (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            file_path       TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'missing',
            freshness_score INTEGER NOT NULL DEFAULT 0,
            last_checked    TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS skills (
            id              TEXT PRIMARY KEY,
            project_id      TEXT,
            name            TEXT NOT NULL,
            description     TEXT NOT NULL DEFAULT '',
            content         TEXT NOT NULL DEFAULT '',
            usage_count     INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key             TEXT PRIMARY KEY,
            value           TEXT NOT NULL
        );
        ",
    )?;

    Ok(())
}
