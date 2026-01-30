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
//! - Tables: projects, module_docs, freshness_history (Phase 5), skills, patterns, agents,
//!   ralph_loops (Phase 7), checkpoints (Phase 8), enforcement_events (Phase 9), settings,
//!   activities (Phase 10)
//! - freshness_history stores per-file freshness snapshots for trend analysis
//! - ralph_loops tracks RALPH loop execution with status (idle/running/paused/completed/failed)
//! - See spec Part 6.2 for full table definitions
//! - Add new tables here and call in create_tables()
//! - stack_extras column stores JSON for additional services (auth, hosting, payments, etc.)

use rusqlite::Connection;

/// Migrate existing database to add stack_extras column if it doesn't exist.
/// Called after create_tables to ensure the column exists for existing databases.
pub fn migrate_add_stack_extras(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Check if column exists by trying to select from it
    let has_column = conn
        .prepare("SELECT stack_extras FROM projects LIMIT 1")
        .is_ok();

    if !has_column {
        conn.execute("ALTER TABLE projects ADD COLUMN stack_extras TEXT", [])?;
    }
    Ok(())
}

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
            stack_extras    TEXT,
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

        CREATE TABLE IF NOT EXISTS freshness_history (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            file_path       TEXT NOT NULL,
            freshness_score INTEGER NOT NULL DEFAULT 0,
            status          TEXT NOT NULL DEFAULT 'missing',
            changes         TEXT,
            checked_at      TEXT NOT NULL,
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

        CREATE TABLE IF NOT EXISTS patterns (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            description     TEXT NOT NULL DEFAULT '',
            frequency       INTEGER NOT NULL DEFAULT 1,
            suggested_skill TEXT,
            detected_at     TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS agents (
            id                TEXT PRIMARY KEY,
            project_id        TEXT,
            name              TEXT NOT NULL,
            description       TEXT NOT NULL DEFAULT '',
            tier              TEXT NOT NULL DEFAULT 'basic',
            category          TEXT NOT NULL DEFAULT 'feature-development',
            instructions      TEXT NOT NULL DEFAULT '',
            workflow          TEXT,
            tools             TEXT,
            trigger_patterns  TEXT,
            usage_count       INTEGER NOT NULL DEFAULT 0,
            created_at        TEXT NOT NULL,
            updated_at        TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS ralph_loops (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            prompt          TEXT NOT NULL,
            enhanced_prompt TEXT,
            status          TEXT NOT NULL DEFAULT 'idle',
            quality_score   INTEGER NOT NULL DEFAULT 0,
            iterations      INTEGER NOT NULL DEFAULT 0,
            outcome         TEXT,
            started_at      TEXT,
            paused_at       TEXT,
            completed_at    TEXT,
            created_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS checkpoints (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            label           TEXT NOT NULL DEFAULT '',
            summary         TEXT NOT NULL DEFAULT '',
            token_snapshot   INTEGER NOT NULL DEFAULT 0,
            context_percent  REAL NOT NULL DEFAULT 0.0,
            created_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS enforcement_events (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            event_type      TEXT NOT NULL DEFAULT 'warning',
            source          TEXT NOT NULL DEFAULT 'hook',
            message         TEXT NOT NULL DEFAULT '',
            file_path       TEXT,
            created_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key             TEXT PRIMARY KEY,
            value           TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activities (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            activity_type   TEXT NOT NULL DEFAULT 'info',
            message         TEXT NOT NULL DEFAULT '',
            created_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );
        ",
    )?;

    Ok(())
}
