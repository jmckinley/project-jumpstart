//! @module commands/agents
//! @description Tauri IPC commands for agents management
//!
//! PURPOSE:
//! - List, create, update, and delete agents via IPC
//! - Track agent usage analytics
//! - AI-powered agent instructions enhancement
//! - Count agents for health score calculation
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection state
//! - models::agent - Agent, WorkflowStep, AgentTool data types
//! - chrono - Timestamp generation
//! - uuid - Unique ID generation
//! - core::ai - Claude API caller for enhancement
//!
//! EXPORTS:
//! - list_agents - List all agents for a project
//! - create_agent - Create a new agent
//! - update_agent - Update an existing agent
//! - delete_agent - Delete an agent by ID
//! - increment_agent_usage - Bump usage count for an agent
//! - enhance_agent_instructions - AI-enhance an agent's instructions
//! - count_agents - Count agents for a project (used in health scoring)
//!
//! PATTERNS:
//! - All commands use AppState for DB access
//! - Agents are scoped to a project_id (or global if None)
//! - JSON fields (workflow, tools, trigger_patterns) are serialized/deserialized
//! - enhance_agent_instructions calls Claude API for improvement
//!
//! CLAUDE NOTES:
//! - Agents support advanced workflows with steps, tools, and triggers
//! - Timestamps use chrono::Utc::now() in RFC 3339 format
//! - enhance_agent_instructions requires API key in settings
//! - count_agents is called from health calculation

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::db::{self, AppState};
use crate::models::agent::{Agent, AgentTool, WorkflowStep};

/// List all agents for a project (or global agents if project_id is None).
#[tauri::command]
pub async fn list_agents(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Agent>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = if project_id.is_some() {
        db.prepare(
            "SELECT id, project_id, name, description, tier, category, instructions,
                    workflow, tools, trigger_patterns, usage_count, created_at, updated_at
             FROM agents WHERE project_id = ?1 OR project_id IS NULL
             ORDER BY usage_count DESC, name ASC",
        )
    } else {
        db.prepare(
            "SELECT id, project_id, name, description, tier, category, instructions,
                    workflow, tools, trigger_patterns, usage_count, created_at, updated_at
             FROM agents ORDER BY usage_count DESC, name ASC",
        )
    }
    .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = if let Some(ref pid) = project_id {
        stmt.query_map([pid], map_agent_row)
    } else {
        stmt.query_map([], map_agent_row)
    }
    .map_err(|e| format!("Failed to query agents: {}", e))?;

    let agents: Vec<Agent> = rows.filter_map(|r| r.ok()).collect();

    Ok(agents)
}

/// Create a new agent and persist it to the database.
#[tauri::command]
pub async fn create_agent(
    name: String,
    description: String,
    tier: String,
    category: String,
    instructions: String,
    workflow: Option<Vec<WorkflowStep>>,
    tools: Option<Vec<AgentTool>>,
    trigger_patterns: Option<Vec<String>>,
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Agent, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // Serialize optional JSON fields
    let workflow_json = workflow
        .as_ref()
        .map(|w| serde_json::to_string(w).unwrap_or_default());
    let tools_json = tools
        .as_ref()
        .map(|t| serde_json::to_string(t).unwrap_or_default());
    let trigger_json = trigger_patterns
        .as_ref()
        .map(|tp| serde_json::to_string(tp).unwrap_or_default());

    db.execute(
        "INSERT INTO agents (id, project_id, name, description, tier, category, instructions,
                            workflow, tools, trigger_patterns, usage_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, ?11, ?12)",
        rusqlite::params![
            id,
            project_id,
            name,
            description,
            tier,
            category,
            instructions,
            workflow_json,
            tools_json,
            trigger_json,
            now_str,
            now_str
        ],
    )
    .map_err(|e| format!("Failed to insert agent: {}", e))?;

    // Log activity
    if let Some(ref pid) = project_id {
        let _ = db::log_activity_db(&db, pid, "agent", &format!("Created agent: {}", &name));
    }

    Ok(Agent {
        id,
        name,
        description,
        tier,
        category,
        instructions,
        workflow,
        tools,
        trigger_patterns,
        project_id,
        usage_count: 0,
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing agent.
#[tauri::command]
pub async fn update_agent(
    id: String,
    name: String,
    description: String,
    tier: String,
    category: String,
    instructions: String,
    workflow: Option<Vec<WorkflowStep>>,
    tools: Option<Vec<AgentTool>>,
    trigger_patterns: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Agent, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // Serialize optional JSON fields
    let workflow_json = workflow
        .as_ref()
        .map(|w| serde_json::to_string(w).unwrap_or_default());
    let tools_json = tools
        .as_ref()
        .map(|t| serde_json::to_string(t).unwrap_or_default());
    let trigger_json = trigger_patterns
        .as_ref()
        .map(|tp| serde_json::to_string(tp).unwrap_or_default());

    let rows_affected = db
        .execute(
            "UPDATE agents SET name = ?1, description = ?2, tier = ?3, category = ?4,
             instructions = ?5, workflow = ?6, tools = ?7, trigger_patterns = ?8, updated_at = ?9
             WHERE id = ?10",
            rusqlite::params![
                name,
                description,
                tier,
                category,
                instructions,
                workflow_json,
                tools_json,
                trigger_json,
                now_str,
                id
            ],
        )
        .map_err(|e| format!("Failed to update agent: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Agent not found: {}", id));
    }

    // Fetch the updated agent
    let agent = db
        .query_row(
            "SELECT id, project_id, name, description, tier, category, instructions,
                    workflow, tools, trigger_patterns, usage_count, created_at, updated_at
             FROM agents WHERE id = ?1",
            [&id],
            map_agent_row,
        )
        .map_err(|e| format!("Failed to fetch updated agent: {}", e))?;

    Ok(agent)
}

/// Delete an agent by ID.
#[tauri::command]
pub async fn delete_agent(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get agent name and project_id before deleting
    let agent_info: Option<(String, Option<String>)> = db
        .query_row(
            "SELECT name, project_id FROM agents WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    let rows_affected = db
        .execute("DELETE FROM agents WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete agent: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Agent not found: {}", id));
    }

    // Log activity
    if let Some((name, Some(pid))) = agent_info {
        let _ = db::log_activity_db(&db, &pid, "agent", &format!("Deleted agent: {}", name));
    }

    Ok(())
}

/// Increment the usage count for an agent.
#[tauri::command]
pub async fn increment_agent_usage(id: String, state: State<'_, AppState>) -> Result<u32, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.execute(
        "UPDATE agents SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![Utc::now().to_rfc3339(), id],
    )
    .map_err(|e| format!("Failed to increment usage: {}", e))?;

    let count: u32 = db
        .query_row(
            "SELECT usage_count FROM agents WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to fetch usage count: {}", e))?;

    Ok(count)
}

/// Count the number of agents for a project (used in health score calculation).
#[tauri::command]
pub async fn count_agents(project_id: Option<String>, state: State<'_, AppState>) -> Result<u32, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let count: u32 = if let Some(pid) = project_id {
        db.query_row(
            "SELECT COUNT(*) FROM agents WHERE project_id = ?1 OR project_id IS NULL",
            [&pid],
            |row| row.get(0),
        )
    } else {
        db.query_row("SELECT COUNT(*) FROM agents", [], |row| row.get(0))
    }
    .map_err(|e| format!("Failed to count agents: {}", e))?;

    Ok(count)
}

/// Count agents for health scoring (sync helper function).
pub fn count_agents_sync(db: &rusqlite::Connection, project_id: &str) -> Result<u32, String> {
    let count: u32 = db
        .query_row(
            "SELECT COUNT(*) FROM agents WHERE project_id = ?1 OR project_id IS NULL",
            [project_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to count agents: {}", e))?;

    Ok(count)
}

/// Enhance an agent's instructions using AI.
#[tauri::command]
pub async fn enhance_agent_instructions(
    name: String,
    description: String,
    instructions: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Get API key from settings
    let api_key = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        crate::core::ai::get_api_key(&db)?
    };

    let system = "You are an expert at writing Claude Code agents. \
        An agent is a specialized configuration that tells Claude how to \
        perform a specific category of task (testing, debugging, etc.). \
        Agents should be clear, actionable, and include: a brief description \
        of when to use the agent, step-by-step instructions, templates or \
        examples if applicable, and important rules to follow. \
        Format as markdown. Keep the enhanced version concise but thorough. \
        Return ONLY the enhanced agent instructions as markdown, no preamble.";

    let prompt = format!(
        "Enhance this Claude Code agent:\n\n\
         Name: {}\nDescription: {}\n\nCurrent instructions:\n{}\n\n\
         Improve the instructions to be more useful, add structure \
         (## Purpose, ## Instructions, ## Template, ## Rules), \
         fill in any gaps, and make the instructions clearer and more actionable. \
         Keep the same intent and scope.",
        name, description, instructions
    );

    crate::core::ai::call_claude(&state.http_client, &api_key, system, &prompt).await
}

// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------

fn map_agent_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Agent> {
    let created_str: String = row.get(11)?;
    let updated_str: String = row.get(12)?;

    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    // Parse JSON fields
    let workflow_json: Option<String> = row.get(7)?;
    let tools_json: Option<String> = row.get(8)?;
    let trigger_json: Option<String> = row.get(9)?;

    let workflow: Option<Vec<WorkflowStep>> = workflow_json
        .and_then(|s| serde_json::from_str(&s).ok());
    let tools: Option<Vec<AgentTool>> = tools_json
        .and_then(|s| serde_json::from_str(&s).ok());
    let trigger_patterns: Option<Vec<String>> = trigger_json
        .and_then(|s| serde_json::from_str(&s).ok());

    Ok(Agent {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        tier: row.get(4)?,
        category: row.get(5)?,
        instructions: row.get(6)?,
        workflow,
        tools,
        trigger_patterns,
        usage_count: row.get(10)?,
        created_at,
        updated_at,
    })
}
