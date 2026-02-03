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
//! - migrate_add_stack_extras - Migration for stack_extras column
//! - migrate_add_prd_columns - Migration for PRD mode columns (mode, current_story, total_stories)
//!
//! PATTERNS:
//! - Uses CREATE TABLE IF NOT EXISTS for idempotent setup
//! - All timestamps stored as TEXT in ISO 8601 format (UTC)
//! - IDs are TEXT (UUID v4 strings)
//!
//! CLAUDE NOTES:
//! - Tables: projects, module_docs, freshness_history (Phase 5), skills, patterns, agents,
//!   ralph_loops (Phase 7), checkpoints (Phase 8), enforcement_events (Phase 9), settings,
//!   activities (Phase 10), ralph_mistakes (for learning from loop errors),
//!   test_plans, test_cases, test_runs, test_case_results, tdd_sessions (Test Plan Manager)
//! - freshness_history stores per-file freshness snapshots for trend analysis
//! - ralph_loops tracks RALPH loop execution with status (idle/running/paused/completed/failed)
//! - ralph_loops.mode: "iterative" (default, accumulated context) or "prd" (fresh context per story)
//! - ralph_mistakes stores mistakes and learned patterns for RALPH context enhancement
//! - test_plans: Organize test cases by feature with target coverage
//! - test_cases: Individual test cases linked to files with type/priority/status
//! - test_runs: Test execution history with pass/fail counts and coverage
//! - test_case_results: Per-case results for each run
//! - tdd_sessions: Track TDD workflow phases (red/green/refactor)
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

/// Migrate existing database to add PRD mode columns to ralph_loops.
/// Adds: mode, current_story, total_stories
pub fn migrate_add_prd_columns(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Check if mode column exists
    let has_mode = conn
        .prepare("SELECT mode FROM ralph_loops LIMIT 1")
        .is_ok();

    if !has_mode {
        conn.execute(
            "ALTER TABLE ralph_loops ADD COLUMN mode TEXT NOT NULL DEFAULT 'iterative'",
            [],
        )?;
        conn.execute(
            "ALTER TABLE ralph_loops ADD COLUMN current_story INTEGER",
            [],
        )?;
        conn.execute(
            "ALTER TABLE ralph_loops ADD COLUMN total_stories INTEGER",
            [],
        )?;
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
            mode            TEXT NOT NULL DEFAULT 'iterative',
            current_story   INTEGER,
            total_stories   INTEGER,
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

        CREATE TABLE IF NOT EXISTS ralph_mistakes (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            loop_id         TEXT,
            mistake_type    TEXT NOT NULL DEFAULT 'implementation',
            description     TEXT NOT NULL,
            context         TEXT,
            resolution      TEXT,
            learned_pattern TEXT,
            created_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id),
            FOREIGN KEY (loop_id) REFERENCES ralph_loops(id)
        );

        CREATE INDEX IF NOT EXISTS idx_ralph_mistakes_project ON ralph_mistakes(project_id);

        -- Test Plan Manager tables
        CREATE TABLE IF NOT EXISTS test_plans (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            name            TEXT NOT NULL,
            description     TEXT NOT NULL DEFAULT '',
            status          TEXT NOT NULL DEFAULT 'draft',
            target_coverage INTEGER NOT NULL DEFAULT 80,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS test_cases (
            id              TEXT PRIMARY KEY,
            plan_id         TEXT NOT NULL,
            name            TEXT NOT NULL,
            description     TEXT NOT NULL DEFAULT '',
            file_path       TEXT,
            test_type       TEXT NOT NULL DEFAULT 'unit',
            priority        TEXT NOT NULL DEFAULT 'medium',
            status          TEXT NOT NULL DEFAULT 'pending',
            last_run_at     TEXT,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            FOREIGN KEY (plan_id) REFERENCES test_plans(id)
        );

        CREATE TABLE IF NOT EXISTS test_runs (
            id              TEXT PRIMARY KEY,
            plan_id         TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'running',
            total_tests     INTEGER NOT NULL DEFAULT 0,
            passed_tests    INTEGER NOT NULL DEFAULT 0,
            failed_tests    INTEGER NOT NULL DEFAULT 0,
            skipped_tests   INTEGER NOT NULL DEFAULT 0,
            duration_ms     INTEGER,
            coverage_percent REAL,
            stdout          TEXT,
            stderr          TEXT,
            started_at      TEXT NOT NULL,
            completed_at    TEXT,
            FOREIGN KEY (plan_id) REFERENCES test_plans(id)
        );

        CREATE TABLE IF NOT EXISTS test_case_results (
            id              TEXT PRIMARY KEY,
            run_id          TEXT NOT NULL,
            case_id         TEXT NOT NULL,
            status          TEXT NOT NULL DEFAULT 'pending',
            duration_ms     INTEGER,
            error_message   TEXT,
            stack_trace     TEXT,
            FOREIGN KEY (run_id) REFERENCES test_runs(id),
            FOREIGN KEY (case_id) REFERENCES test_cases(id)
        );

        CREATE TABLE IF NOT EXISTS tdd_sessions (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL,
            feature_name    TEXT NOT NULL,
            test_file_path  TEXT,
            current_phase   TEXT NOT NULL DEFAULT 'red',
            phase_status    TEXT NOT NULL DEFAULT 'pending',
            red_prompt      TEXT,
            red_output      TEXT,
            green_prompt    TEXT,
            green_output    TEXT,
            refactor_prompt TEXT,
            refactor_output TEXT,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            completed_at    TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE INDEX IF NOT EXISTS idx_test_plans_project ON test_plans(project_id);
        CREATE INDEX IF NOT EXISTS idx_test_cases_plan ON test_cases(plan_id);
        CREATE INDEX IF NOT EXISTS idx_test_runs_plan ON test_runs(plan_id);
        CREATE INDEX IF NOT EXISTS idx_test_case_results_run ON test_case_results(run_id);
        CREATE INDEX IF NOT EXISTS idx_tdd_sessions_project ON tdd_sessions(project_id);
        ",
    )?;

    Ok(())
}
