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
//! - Deploy output matches real Claude Code Agent Teams behavior (natural language prompts)
//!
//! CLAUDE NOTES:
//! - Mirrors agents.rs command pattern exactly
//! - Timestamps use chrono::Utc::now() in RFC 3339 format
//! - Agent Teams are started via natural language — no CLI flags like --team-spawn
//! - The lead agent uses TeammateTool.spawnTeam internally to create teammates
//! - Tasks use TaskCreate/TaskUpdate with addBlockedBy for dependencies
//! - Communication: write (to one teammate), broadcast (to all)

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
        "script" => Ok(generate_script_output(&template.name, &template.description, &template.orchestration_pattern, &template.teammates, &template.tasks, &template.hooks, &template.lead_spawn_instructions)),
        "config" => Ok(generate_config_output(&template.name, &template.description, &template.orchestration_pattern, &template.teammates, &template.tasks, &template.lead_spawn_instructions)),
        _ => Err(format!("Unknown format: {}", format)),
    }
}

// ---------------------------------------------------------------------------
// Output generators (pure string templating)
//
// These generate output that matches real Claude Code Agent Teams behavior.
// Agent Teams are started via natural language prompts — the lead agent uses
// TeammateTool.spawnTeam internally to create teammates, and TaskCreate/
// TaskUpdate for task management. There are no CLI flags like --team-spawn.
// ---------------------------------------------------------------------------

/// Resolve a task blocker ID to its human-readable title.
fn resolve_blocker_title(blocker_id: &str, tasks: &[TeamTaskDef]) -> String {
    tasks
        .iter()
        .find(|t| t.id == blocker_id)
        .map(|t| t.title.clone())
        .unwrap_or_else(|| blocker_id.to_string())
}

/// Describe an orchestration pattern in plain English.
fn pattern_description(pattern: &str) -> &str {
    match pattern {
        "leader" => "one lead agent coordinates specialists",
        "pipeline" => "agents work sequentially, each building on the previous",
        "parallel" => "agents work simultaneously on independent tasks",
        "swarm" => "agents self-organize around available work",
        "council" => "agents provide independent assessments, then reconcile",
        _ => "agents coordinate to complete the work",
    }
}

/// Generate a paste-ready natural language prompt for Claude Code Agent Teams.
///
/// The user pastes this into an active Claude Code session (with Agent Teams
/// enabled). Claude interprets the prompt and uses TeammateTool.spawnTeam to
/// create teammates, TaskCreate for tasks, and addBlockedBy for dependencies.
fn generate_prompt_output(
    name: &str,
    description: &str,
    pattern: &str,
    teammates: &[TeammateDef],
    tasks: &[TeamTaskDef],
    _hooks: &[TeamHookDef],
    lead_instructions: &str,
) -> String {
    let mut out = String::new();

    // Prerequisites
    out.push_str("> **Setup:** Enable Agent Teams by adding `\"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\": \"1\"` to the `env` section of `~/.claude/settings.json`, then start a new Claude Code session and paste this prompt.\n\n");
    out.push_str("---\n\n");

    // Core team request
    out.push_str(&format!(
        "Create an agent team called **{}**.\n\n",
        name
    ));
    out.push_str(&format!(
        "**Goal:** {}\n\n",
        description
    ));
    out.push_str(&format!(
        "**Pattern:** {} — {}\n\n",
        pattern,
        pattern_description(pattern)
    ));

    // Teammates
    out.push_str(&format!("## Spawn {} Teammates\n\n", teammates.len()));
    for (i, mate) in teammates.iter().enumerate() {
        out.push_str(&format!(
            "### {}. {} — {}\n\n",
            i + 1,
            mate.role,
            mate.description
        ));
        out.push_str("Spawn this teammate with the following prompt:\n\n");
        for line in mate.spawn_prompt.lines() {
            out.push_str(&format!("> {}\n", line));
        }
        out.push_str("\n");
    }

    // Tasks
    if !tasks.is_empty() {
        out.push_str("## Create Tasks\n\n");
        out.push_str("Create these tasks with `TaskCreate`. Use `addBlockedBy` to set dependencies so tasks run in the correct order.\n\n");
        for (i, task) in tasks.iter().enumerate() {
            out.push_str(&format!(
                "{}. **{}** — assign to **{}**\n",
                i + 1,
                task.title,
                task.assigned_to
            ));
            if !task.blocked_by.is_empty() {
                let blockers: Vec<String> = task
                    .blocked_by
                    .iter()
                    .map(|b| format!("\"{}\"", resolve_blocker_title(b, tasks)))
                    .collect();
                out.push_str(&format!("   - Blocked by: {}\n", blockers.join(", ")));
            }
            out.push_str(&format!("   - {}\n\n", task.description));
        }
    }

    // Lead instructions
    if !lead_instructions.is_empty() {
        out.push_str("## Your Role as Lead\n\n");
        out.push_str(lead_instructions);
        out.push_str("\n\n");
    }

    // Tips
    out.push_str("## Coordination Tips\n\n");
    out.push_str("- Press **Shift+Tab** to enter Delegate mode (lead coordinates only, does not write code)\n");
    out.push_str("- Monitor progress with `TaskList` to see which tasks are pending, in-progress, or complete\n");
    out.push_str("- Send a message to one teammate with `write`, or all teammates with `broadcast`\n");
    out.push_str("- When all tasks are done, use `requestShutdown` to wind down the team\n");

    out
}

/// Generate a shell script that enables Agent Teams, saves the team prompt,
/// copies it to clipboard, and launches Claude Code in interactive mode.
fn generate_script_output(
    name: &str,
    description: &str,
    pattern: &str,
    teammates: &[TeammateDef],
    tasks: &[TeamTaskDef],
    _hooks: &[TeamHookDef],
    lead_instructions: &str,
) -> String {
    let mut out = String::new();
    let slug = name.to_lowercase().replace(' ', "-");

    out.push_str("#!/bin/bash\n");
    out.push_str(&format!("# {} — Agent Team Deployment Script\n", name));
    out.push_str("# Generated by Project Jumpstart\n");
    out.push_str("#\n");
    out.push_str("# This script:\n");
    out.push_str("#   1. Enables the Agent Teams experimental feature\n");
    out.push_str("#   2. Saves the team prompt to a temp file\n");
    out.push_str("#   3. Copies the prompt to your clipboard\n");
    out.push_str("#   4. Launches Claude Code — paste the prompt to start the team\n");
    out.push_str("\nset -e\n\n");

    // Enable Agent Teams
    out.push_str("# ── Enable Agent Teams ──────────────────────────────────────────────\n");
    out.push_str("export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1\n\n");

    // Build the prompt (without prerequisites since the script handles setup)
    let mut prompt = String::new();
    prompt.push_str(&format!("Create an agent team called **{}**.\n\n", name));
    prompt.push_str(&format!("**Goal:** {}\n\n", description));
    prompt.push_str(&format!(
        "**Pattern:** {} — {}\n\n",
        pattern,
        pattern_description(pattern)
    ));

    prompt.push_str(&format!("## Spawn {} Teammates\n\n", teammates.len()));
    for (i, mate) in teammates.iter().enumerate() {
        prompt.push_str(&format!(
            "### {}. {} — {}\n\nSpawn this teammate with the following prompt:\n\n",
            i + 1,
            mate.role,
            mate.description
        ));
        for line in mate.spawn_prompt.lines() {
            prompt.push_str(&format!("> {}\n", line));
        }
        prompt.push_str("\n");
    }

    if !tasks.is_empty() {
        prompt.push_str("## Create Tasks\n\nCreate these tasks with `TaskCreate`. Use `addBlockedBy` for dependencies.\n\n");
        for (i, task) in tasks.iter().enumerate() {
            prompt.push_str(&format!(
                "{}. **{}** — assign to **{}**\n",
                i + 1,
                task.title,
                task.assigned_to
            ));
            if !task.blocked_by.is_empty() {
                let blockers: Vec<String> = task
                    .blocked_by
                    .iter()
                    .map(|b| format!("\"{}\"", resolve_blocker_title(b, tasks)))
                    .collect();
                prompt.push_str(&format!("   - Blocked by: {}\n", blockers.join(", ")));
            }
            prompt.push_str(&format!("   - {}\n\n", task.description));
        }
    }

    if !lead_instructions.is_empty() {
        prompt.push_str("## Your Role as Lead\n\n");
        prompt.push_str(lead_instructions);
        prompt.push_str("\n");
    }

    // Embed the prompt as a heredoc
    out.push_str("# ── Save team prompt ───────────────────────────────────────────────\n");
    out.push_str(&format!(
        "PROMPT_FILE=\"/tmp/{}-team-prompt.md\"\n",
        slug
    ));
    out.push_str("cat > \"$PROMPT_FILE\" <<'TEAM_PROMPT'\n");
    out.push_str(&prompt);
    out.push_str("TEAM_PROMPT\n\n");

    // Copy to clipboard
    out.push_str("# ── Copy prompt to clipboard ───────────────────────────────────────\n");
    out.push_str("if command -v pbcopy &> /dev/null; then\n");
    out.push_str("  cat \"$PROMPT_FILE\" | pbcopy\n");
    out.push_str("  echo \"Team prompt copied to clipboard.\"\n");
    out.push_str("elif command -v xclip &> /dev/null; then\n");
    out.push_str("  cat \"$PROMPT_FILE\" | xclip -selection clipboard\n");
    out.push_str("  echo \"Team prompt copied to clipboard.\"\n");
    out.push_str("else\n");
    out.push_str("  echo \"Team prompt saved to: $PROMPT_FILE\"\n");
    out.push_str("  echo \"Copy it manually and paste into Claude Code.\"\n");
    out.push_str("fi\n\n");

    // Launch Claude Code
    out.push_str("# ── Launch Claude Code ─────────────────────────────────────────────\n");
    out.push_str("echo \"\"\n");
    out.push_str(&format!(
        "echo \"Starting Claude Code for {}...\"\n",
        name
    ));
    out.push_str("echo \"Paste the prompt (Cmd+V / Ctrl+V) to deploy the team.\"\n");
    out.push_str("echo \"Press Shift+Tab to enter Delegate mode (lead coordinates only).\"\n");
    out.push_str("echo \"\"\n\n");
    out.push_str("claude\n");

    out
}

/// Generate reusable setup files: settings.json snippet, saved team prompt,
/// and individual teammate spawn prompts for reference.
fn generate_config_output(
    name: &str,
    description: &str,
    pattern: &str,
    teammates: &[TeammateDef],
    tasks: &[TeamTaskDef],
    lead_instructions: &str,
) -> String {
    let mut out = String::new();
    let slug = name.to_lowercase().replace(' ', "-");

    out.push_str(&format!("# {} — Setup Files\n\n", name));
    out.push_str("Save these files to your project to reuse this team configuration.\n\n");
    out.push_str("---\n\n");

    // 1. Enable Agent Teams
    out.push_str("## 1. Enable Agent Teams\n\n");
    out.push_str("Add to `~/.claude/settings.json`:\n\n");
    out.push_str("```json\n");
    out.push_str("{\n");
    out.push_str("  \"env\": {\n");
    out.push_str("    \"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\": \"1\"\n");
    out.push_str("  }\n");
    out.push_str("}\n");
    out.push_str("```\n\n");

    // 2. Team prompt file
    out.push_str(&format!(
        "## 2. Team Prompt — `team-prompts/{}.md`\n\n",
        slug
    ));
    out.push_str("Save this file and paste its contents into Claude Code to deploy the team:\n\n");
    out.push_str("```markdown\n");
    out.push_str(&format!(
        "Create an agent team called **{}**.\n\n",
        name
    ));
    out.push_str(&format!("**Goal:** {}\n\n", description));
    out.push_str(&format!(
        "**Pattern:** {} — {}\n\n",
        pattern,
        pattern_description(pattern)
    ));

    out.push_str(&format!("Spawn {} teammates:\n\n", teammates.len()));
    for (i, mate) in teammates.iter().enumerate() {
        out.push_str(&format!(
            "{}. **{}** — {}\n",
            i + 1,
            mate.role,
            mate.description
        ));
    }
    out.push_str("\n");

    if !tasks.is_empty() {
        out.push_str("Tasks:\n\n");
        for (i, task) in tasks.iter().enumerate() {
            out.push_str(&format!(
                "{}. **{}** → {}",
                i + 1,
                task.title,
                task.assigned_to
            ));
            if !task.blocked_by.is_empty() {
                let blockers: Vec<String> = task
                    .blocked_by
                    .iter()
                    .map(|b| resolve_blocker_title(b, tasks))
                    .collect();
                out.push_str(&format!(" (after: {})", blockers.join(", ")));
            }
            out.push_str("\n");
        }
        out.push_str("\n");
    }

    if !lead_instructions.is_empty() {
        out.push_str(lead_instructions);
        out.push_str("\n");
    }
    out.push_str("```\n\n");

    // 3. Individual teammate spawn prompts
    out.push_str("## 3. Teammate Spawn Prompts\n\n");
    out.push_str("Reference prompts for each teammate (the lead uses these when spawning):\n\n");
    for mate in teammates {
        let mate_slug = mate.role.to_lowercase().replace(' ', "-");
        out.push_str(&format!(
            "### `team-prompts/{}/{}.md`\n\n",
            slug, mate_slug
        ));
        out.push_str("```markdown\n");
        out.push_str(&mate.spawn_prompt);
        out.push_str("\n```\n\n");
    }

    // Usage
    out.push_str("---\n\n");
    out.push_str("## Usage\n\n");
    out.push_str(&format!(
        "1. Copy the team prompt from `team-prompts/{}.md`\n",
        slug
    ));
    out.push_str("2. Start a new Claude Code session in your project directory\n");
    out.push_str("3. Paste the prompt — Claude will spawn the teammates and create tasks\n");
    out.push_str("4. Press **Shift+Tab** to enter Delegate mode (lead coordinates only, does not write code)\n");
    out.push_str("5. Monitor with `TaskList` and communicate with `write` / `broadcast`\n");

    out
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
