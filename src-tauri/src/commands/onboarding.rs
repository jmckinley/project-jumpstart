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
//! - save_project - Save a fully configured project to the database (also auto-adds Skeptical Reviewer agent)
//!
//! PATTERNS:
//! - scan_project is called when a user selects a folder
//! - save_project is called when the user completes the wizard
//! - Both commands are async and return Result<T, String>
//!
//! CLAUDE NOTES:
//! - scan_project does NOT modify any files or database
//! - save_project creates the database record and auto-adds the Skeptical Reviewer agent
//! - See spec Part 2 for the full onboarding flow
//! - Skeptical Reviewer is auto-added to help catch issues in every new project

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::core::scanner;
use crate::db::{self, AppState};
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

    // Serialize stack_extras to JSON if present
    let extras_json: Option<String> = setup
        .stack_extras
        .as_ref()
        .map(|e| serde_json::to_string(e).unwrap_or_default());

    db.execute(
        "INSERT INTO projects (id, name, path, description, project_type, language, framework, database_tech, testing, styling, stack_extras, health_score, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
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
            &extras_json,
            0,
            now.to_rfc3339(),
        ],
    )
    .map_err(|e| format!("Failed to insert project: {}", e))?;

    let project = Project {
        id: id.clone(),
        name: setup.name,
        path: setup.path,
        description: setup.description,
        project_type: setup.project_type,
        language: setup.language,
        framework: setup.framework,
        database: setup.database,
        testing: setup.testing,
        styling: setup.styling,
        stack_extras: setup.stack_extras,
        health_score: 0,
        created_at: now,
    };

    // Log activity
    let _ = db::log_activity_db(&db, &id, "scan", &format!("Project added: {}", &project.name));

    // Auto-add the Skeptical Reviewer agent to new projects
    let _ = add_default_agents(&db, &id);

    Ok(project)
}

/// Add default agents to a newly created project.
/// Currently adds the Skeptical Reviewer agent for code review.
fn add_default_agents(db: &rusqlite::Connection, project_id: &str) -> Result<(), String> {
    let agent_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let instructions = r#"## Purpose
Challenge implementations from a skeptical perspective. Assume bugs exist and systematically find them.

## Approach
1. **Read CLAUDE.md first** to understand project patterns and past mistakes
2. **Examine changes** with suspicion - look for what could go wrong
3. **Trace edge cases** - empty inputs, null values, boundary conditions
4. **Challenge assumptions** - what if the happy path fails?
5. **Check test coverage** - are failure modes tested?
6. **Report findings** with severity and reproduction steps

## Questions to Ask
- What happens if this input is empty? Null? Extremely large?
- Are all error paths handled?
- Could this cause a race condition?
- What if the external service is down?
- Are there any security implications?
- Does this match the existing patterns in CLAUDE.md?

## Output Format
For each issue found:
1. **Severity**: Critical / High / Medium / Low
2. **Location**: File and line number
3. **Issue**: What's wrong
4. **Reproduction**: Steps to trigger the bug
5. **Suggestion**: How to fix it"#;

    let workflow = serde_json::json!([
        {"step": 1, "action": "read_context", "description": "Read CLAUDE.md and recent mistakes to understand project patterns"},
        {"step": 2, "action": "examine_changes", "description": "Review the code changes with a critical eye"},
        {"step": 3, "action": "trace_edge_cases", "description": "Test boundary conditions and error paths"},
        {"step": 4, "action": "challenge_assumptions", "description": "Question what could go wrong"},
        {"step": 5, "action": "check_tests", "description": "Verify test coverage for failure modes"},
        {"step": 6, "action": "report", "description": "Document findings with severity and fixes"}
    ]);

    let tools = serde_json::json!([
        {"name": "file_read", "description": "Read source files and CLAUDE.md", "required": true},
        {"name": "git_diff", "description": "View recent changes", "required": true},
        {"name": "test_runner", "description": "Run tests to verify behavior", "required": false}
    ]);

    let trigger_patterns = serde_json::json!(["review", "check", "critique", "grill", "find bugs"]);

    db.execute(
        "INSERT INTO agents (id, project_id, name, description, tier, category, instructions, workflow, tools, trigger_patterns, usage_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?11)",
        rusqlite::params![
            agent_id,
            project_id,
            "Skeptical Reviewer",
            "Reviews code with skepticism, actively looking for bugs, edge cases, and potential issues",
            "advanced",
            "code-review",
            instructions,
            workflow.to_string(),
            tools.to_string(),
            trigger_patterns.to_string(),
            now
        ],
    )
    .map_err(|e| format!("Failed to add default agent: {}", e))?;

    let _ = db::log_activity_db(db, project_id, "generate", "Auto-added Skeptical Reviewer agent");

    Ok(())
}
