//! @module commands/team_templates
//! @description Tauri IPC commands for team template management
//!
//! PURPOSE:
//! - List, create, update, and delete team templates via IPC
//! - Track template usage analytics
//! - Generate deploy output (paste-ready prompt, script, or config)
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection state
//! - models::team_template - TeamTemplate, TeammateDef, TeamTaskDef, TeamHookDef
//! - chrono - Timestamp generation
//! - uuid - Unique ID generation
//!
//! EXPORTS:
//! - list_team_templates - List all templates for a project
//! - create_team_template - Create a new template
//! - update_team_template - Update an existing template
//! - delete_team_template - Delete a template by ID
//! - increment_team_template_usage - Bump usage count
//! - generate_team_deploy_output - Generate deploy output string
//!
//! PATTERNS:
//! - All commands use AppState for DB access
//! - Templates are scoped to a project_id (or global if None)
//! - JSON fields (teammates, tasks, hooks) are serialized/deserialized
//! - generate_team_deploy_output uses pure string templating, no AI
//!
//! CLAUDE NOTES:
//! - Mirrors agents.rs command pattern exactly
//! - Timestamps use chrono::Utc::now() in RFC 3339 format

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::db::{self, AppState};
use crate::models::team_template::{TeamTemplate, TeammateDef, TeamTaskDef, TeamHookDef};

/// List all team templates for a project (or global if project_id is None).
#[tauri::command]
pub async fn list_team_templates(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<TeamTemplate>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = if project_id.is_some() {
        db.prepare(
            "SELECT id, project_id, name, description, orchestration_pattern, category,
                    teammates, tasks, hooks, lead_spawn_instructions, usage_count, created_at, updated_at
             FROM team_templates WHERE project_id = ?1 OR project_id IS NULL
             ORDER BY usage_count DESC, name ASC",
        )
    } else {
        db.prepare(
            "SELECT id, project_id, name, description, orchestration_pattern, category,
                    teammates, tasks, hooks, lead_spawn_instructions, usage_count, created_at, updated_at
             FROM team_templates ORDER BY usage_count DESC, name ASC",
        )
    }
    .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = if let Some(ref pid) = project_id {
        stmt.query_map([pid], map_template_row)
    } else {
        stmt.query_map([], map_template_row)
    }
    .map_err(|e| format!("Failed to query team templates: {}", e))?;

    let templates: Vec<TeamTemplate> = rows.filter_map(|r| r.ok()).collect();
    Ok(templates)
}

/// Create a new team template.
#[tauri::command]
pub async fn create_team_template(
    name: String,
    description: String,
    orchestration_pattern: String,
    category: String,
    teammates_json: String,
    tasks_json: String,
    hooks_json: String,
    lead_spawn_instructions: String,
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<TeamTemplate, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // Parse JSON to validate
    let teammates: Vec<TeammateDef> =
        serde_json::from_str(&teammates_json).map_err(|e| format!("Invalid teammates JSON: {}", e))?;
    let tasks: Vec<TeamTaskDef> =
        serde_json::from_str(&tasks_json).map_err(|e| format!("Invalid tasks JSON: {}", e))?;
    let hooks: Vec<TeamHookDef> =
        serde_json::from_str(&hooks_json).map_err(|e| format!("Invalid hooks JSON: {}", e))?;

    db.execute(
        "INSERT INTO team_templates (id, project_id, name, description, orchestration_pattern, category,
                        teammates, tasks, hooks, lead_spawn_instructions, usage_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12)",
        rusqlite::params![
            id,
            project_id,
            name,
            description,
            orchestration_pattern,
            category,
            teammates_json,
            tasks_json,
            hooks_json,
            lead_spawn_instructions,
            now_str,
            now_str
        ],
    )
    .map_err(|e| format!("Failed to insert team template: {}", e))?;

    // Log activity
    if let Some(ref pid) = project_id {
        let _ = db::log_activity_db(&db, pid, "team", &format!("Created team template: {}", &name));
    }

    Ok(TeamTemplate {
        id,
        name,
        description,
        orchestration_pattern,
        category,
        teammates,
        tasks,
        hooks,
        lead_spawn_instructions,
        project_id,
        usage_count: 0,
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing team template.
#[tauri::command]
pub async fn update_team_template(
    id: String,
    name: String,
    description: String,
    orchestration_pattern: String,
    category: String,
    teammates_json: String,
    tasks_json: String,
    hooks_json: String,
    lead_spawn_instructions: String,
    state: State<'_, AppState>,
) -> Result<TeamTemplate, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // Validate JSON
    let _: Vec<TeammateDef> =
        serde_json::from_str(&teammates_json).map_err(|e| format!("Invalid teammates JSON: {}", e))?;
    let _: Vec<TeamTaskDef> =
        serde_json::from_str(&tasks_json).map_err(|e| format!("Invalid tasks JSON: {}", e))?;
    let _: Vec<TeamHookDef> =
        serde_json::from_str(&hooks_json).map_err(|e| format!("Invalid hooks JSON: {}", e))?;

    let rows_affected = db
        .execute(
            "UPDATE team_templates SET name = ?1, description = ?2, orchestration_pattern = ?3,
             category = ?4, teammates = ?5, tasks = ?6, hooks = ?7, lead_spawn_instructions = ?8,
             updated_at = ?9 WHERE id = ?10",
            rusqlite::params![
                name,
                description,
                orchestration_pattern,
                category,
                teammates_json,
                tasks_json,
                hooks_json,
                lead_spawn_instructions,
                now_str,
                id
            ],
        )
        .map_err(|e| format!("Failed to update team template: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Team template not found: {}", id));
    }

    let template = db
        .query_row(
            "SELECT id, project_id, name, description, orchestration_pattern, category,
                    teammates, tasks, hooks, lead_spawn_instructions, usage_count, created_at, updated_at
             FROM team_templates WHERE id = ?1",
            [&id],
            map_template_row,
        )
        .map_err(|e| format!("Failed to fetch updated template: {}", e))?;

    Ok(template)
}

/// Delete a team template by ID.
#[tauri::command]
pub async fn delete_team_template(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let template_info: Option<(String, Option<String>)> = db
        .query_row(
            "SELECT name, project_id FROM team_templates WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    let rows_affected = db
        .execute("DELETE FROM team_templates WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete team template: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Team template not found: {}", id));
    }

    if let Some((name, Some(pid))) = template_info {
        let _ = db::log_activity_db(&db, &pid, "team", &format!("Deleted team template: {}", name));
    }

    Ok(())
}

/// Increment the usage count for a team template.
#[tauri::command]
pub async fn increment_team_template_usage(id: String, state: State<'_, AppState>) -> Result<u32, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.execute(
        "UPDATE team_templates SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![Utc::now().to_rfc3339(), id],
    )
    .map_err(|e| format!("Failed to increment usage: {}", e))?;

    let count: u32 = db
        .query_row(
            "SELECT usage_count FROM team_templates WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to fetch usage count: {}", e))?;

    Ok(count)
}

/// Generate deploy output for a team template.
/// Format: "prompt" (paste-ready lead prompt), "script" (shell script), or "config" (directory config)
#[tauri::command]
pub async fn generate_team_deploy_output(
    template_json: String,
    format: String,
    _state: State<'_, AppState>,
) -> Result<String, String> {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct TemplateInput {
        name: String,
        description: String,
        orchestration_pattern: String,
        teammates: Vec<TeammateDef>,
        tasks: Vec<TeamTaskDef>,
        hooks: Vec<TeamHookDef>,
        lead_spawn_instructions: String,
    }

    let template: TemplateInput =
        serde_json::from_str(&template_json).map_err(|e| format!("Invalid template JSON: {}", e))?;

    match format.as_str() {
        "prompt" => Ok(generate_prompt_output(&template.name, &template.description, &template.orchestration_pattern, &template.teammates, &template.tasks, &template.hooks, &template.lead_spawn_instructions)),
        "script" => Ok(generate_script_output(&template.name, &template.teammates, &template.tasks)),
        "config" => Ok(generate_config_output(&template.name, &template.teammates, &template.lead_spawn_instructions)),
        _ => Err(format!("Unknown format: {}", format)),
    }
}

// ---------------------------------------------------------------------------
// Output generators (pure string templating)
// ---------------------------------------------------------------------------

fn generate_prompt_output(
    name: &str,
    description: &str,
    pattern: &str,
    teammates: &[TeammateDef],
    tasks: &[TeamTaskDef],
    hooks: &[TeamHookDef],
    lead_instructions: &str,
) -> String {
    let mut output = String::new();

    output.push_str(&format!("# {} Team\n\n", name));
    output.push_str(&format!("{}\n\n", description));
    output.push_str(&format!("**Orchestration Pattern:** {}\n\n", pattern));
    output.push_str("---\n\n");

    // Lead instructions
    if !lead_instructions.is_empty() {
        output.push_str("## Lead Agent Instructions\n\n");
        output.push_str(lead_instructions);
        output.push_str("\n\n---\n\n");
    }

    // Spawn teammates
    output.push_str("## Step 1: Spawn Teammates\n\n");
    for (i, mate) in teammates.iter().enumerate() {
        output.push_str(&format!("### Teammate {}: {} ({})\n\n", i + 1, mate.role, mate.description));
        output.push_str("```\n");
        output.push_str(&format!("TeamCreate: {}\n", mate.role));
        output.push_str(&format!("Prompt: {}\n", mate.spawn_prompt));
        output.push_str("```\n\n");
    }

    // Create tasks
    if !tasks.is_empty() {
        output.push_str("## Step 2: Create Tasks\n\n");
        for task in tasks {
            output.push_str(&format!("### Task: {}\n\n", task.title));
            output.push_str(&format!("- **Assigned to:** {}\n", task.assigned_to));
            if !task.blocked_by.is_empty() {
                output.push_str(&format!("- **Blocked by:** {}\n", task.blocked_by.join(", ")));
            }
            output.push_str(&format!("- **Description:** {}\n\n", task.description));
            output.push_str("```\n");
            output.push_str(&format!("TaskCreate: {}\n", task.title));
            output.push_str(&format!("Description: {}\n", task.description));
            output.push_str(&format!("AssignTo: {}\n", task.assigned_to));
            if !task.blocked_by.is_empty() {
                output.push_str(&format!("BlockedBy: {}\n", task.blocked_by.join(", ")));
            }
            output.push_str("```\n\n");
        }
    }

    // Setup hooks
    if !hooks.is_empty() {
        output.push_str("## Step 3: Configure Hooks\n\n");
        for hook in hooks {
            output.push_str(&format!("- **{}**: `{}` — {}\n", hook.event, hook.command, hook.description));
        }
        output.push_str("\n");
    }

    output
}

fn generate_script_output(
    name: &str,
    teammates: &[TeammateDef],
    tasks: &[TeamTaskDef],
) -> String {
    let mut output = String::new();

    output.push_str("#!/bin/bash\n");
    output.push_str(&format!("# {} - Team Deployment Script\n", name));
    output.push_str("# Generated by Project Jumpstart\n\n");
    output.push_str("set -e\n\n");

    output.push_str("echo \"Spawning teammates...\"\n\n");
    for mate in teammates {
        output.push_str(&format!("# Spawn: {}\n", mate.role));
        output.push_str(&format!(
            "claude --team-spawn \"{}\" --prompt \"{}\"\n\n",
            mate.role,
            mate.spawn_prompt.replace('"', "\\\"").replace('\n', " ")
        ));
    }

    if !tasks.is_empty() {
        output.push_str("echo \"Creating tasks...\"\n\n");
        for task in tasks {
            output.push_str(&format!("# Task: {}\n", task.title));
            output.push_str(&format!(
                "claude --team-task \"{}\" --assign \"{}\"",
                task.title, task.assigned_to
            ));
            if !task.blocked_by.is_empty() {
                output.push_str(&format!(" --blocked-by \"{}\"", task.blocked_by.join(",")));
            }
            output.push_str("\n\n");
        }
    }

    output.push_str("echo \"Team deployed successfully!\"\n");
    output
}

fn generate_config_output(
    name: &str,
    teammates: &[TeammateDef],
    lead_instructions: &str,
) -> String {
    let mut output = String::new();

    output.push_str(&format!("# .claude/teams/{}/\n\n", name.to_lowercase().replace(' ', "-")));
    output.push_str("## Directory Structure\n\n");
    output.push_str("```\n");
    output.push_str(&format!(".claude/teams/{}/\n", name.to_lowercase().replace(' ', "-")));
    output.push_str("  team.json          # Team configuration\n");
    for mate in teammates {
        output.push_str(&format!(
            "  {}.md     # {} spawn prompt\n",
            mate.role.to_lowercase().replace(' ', "-"),
            mate.role
        ));
    }
    output.push_str("```\n\n");

    // team.json
    output.push_str("## team.json\n\n```json\n");
    output.push_str("{\n");
    output.push_str(&format!("  \"name\": \"{}\",\n", name));
    output.push_str("  \"teammates\": [\n");
    for (i, mate) in teammates.iter().enumerate() {
        output.push_str(&format!(
            "    {{ \"role\": \"{}\", \"promptFile\": \"{}.md\" }}{}",
            mate.role,
            mate.role.to_lowercase().replace(' ', "-"),
            if i < teammates.len() - 1 { ",\n" } else { "\n" }
        ));
    }
    output.push_str("  ]\n}\n```\n\n");

    // Lead instructions
    if !lead_instructions.is_empty() {
        output.push_str("## lead.md\n\n```markdown\n");
        output.push_str(lead_instructions);
        output.push_str("\n```\n\n");
    }

    // Individual teammate prompts
    for mate in teammates {
        output.push_str(&format!("## {}.md\n\n```markdown\n", mate.role.to_lowercase().replace(' ', "-")));
        output.push_str(&mate.spawn_prompt);
        output.push_str("\n```\n\n");
    }

    output
}

// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------

fn map_template_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TeamTemplate> {
    let created_str: String = row.get(11)?;
    let updated_str: String = row.get(12)?;

    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    // Parse JSON fields
    let teammates_json: String = row.get(6)?;
    let tasks_json: String = row.get(7)?;
    let hooks_json: String = row.get(8)?;

    let teammates: Vec<TeammateDef> =
        serde_json::from_str(&teammates_json).unwrap_or_default();
    let tasks: Vec<TeamTaskDef> =
        serde_json::from_str(&tasks_json).unwrap_or_default();
    let hooks: Vec<TeamHookDef> =
        serde_json::from_str(&hooks_json).unwrap_or_default();

    Ok(TeamTemplate {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        orchestration_pattern: row.get(4)?,
        category: row.get(5)?,
        teammates,
        tasks,
        hooks,
        lead_spawn_instructions: row.get(9)?,
        usage_count: row.get(10)?,
        created_at,
        updated_at,
    })
}
