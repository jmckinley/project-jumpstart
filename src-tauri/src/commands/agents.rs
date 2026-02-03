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
#[allow(dead_code)]
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
#[allow(dead_code)]
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
/// Optionally includes project context for more relevant enhancement.
#[tauri::command]
pub async fn enhance_agent_instructions(
    name: String,
    description: String,
    instructions: String,
    tier: Option<String>,
    category: Option<String>,
    project_language: Option<String>,
    project_framework: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Get API key from settings
    let api_key = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        crate::core::ai::get_api_key(&db)?
    };

    let tier_str = tier.as_deref().unwrap_or("standard");
    let category_str = category.as_deref().unwrap_or("general");

    let system = format!(
        "You are an expert at writing Claude Code agents. An agent is a specialized \
        configuration that tells Claude how to perform a specific category of task. \
        \
        AGENT TIERS: \
        - Basic: Simple, focused agents for routine tasks. 50-150 words. Single clear purpose. \
        - Standard: Balanced agents with workflow steps. 150-300 words. Include decision points. \
        - Advanced: Comprehensive agents with tool integration. 300-500 words. Include error handling. \
        \
        CATEGORY-SPECIFIC GUIDANCE: \
        - testing: Include test file naming, assertion patterns, coverage expectations \
        - debugging: Include diagnostic steps, logging patterns, common pitfalls \
        - documentation: Include format templates, update triggers, examples \
        - refactoring: Include safety checks, scope boundaries, rollback steps \
        - code-review: Include checklist items, severity levels, feedback format \
        - api-design: Include REST/GraphQL patterns, versioning, error responses \
        \
        REQUIRED STRUCTURE: \
        ## Purpose \
        One paragraph explaining when to use this agent and what it accomplishes. \
        \
        ## Instructions \
        Numbered steps the AI should follow. Be specific about tools, commands, and decisions. \
        \
        ## Template (if applicable) \
        Code template or output format the agent should produce. \
        \
        ## Rules \
        - Critical constraints (what NOT to do) \
        - Quality requirements \
        - Edge case handling \
        \
        EXAMPLE OF A WELL-STRUCTURED {} TIER AGENT: \
        {} \
        \
        Return ONLY the enhanced markdown, no preamble or explanation.",
        tier_str.to_uppercase(),
        get_tier_example(tier_str, category_str)
    );

    // Build context-aware prompt
    let mut prompt = format!(
        "Enhance this Claude Code agent:\n\n\
         **Name:** {}\n\
         **Description:** {}\n\
         **Tier:** {}\n\
         **Category:** {}\n",
        name, description, tier_str, category_str
    );

    // Add project context if available
    if let Some(ref lang) = project_language {
        prompt.push_str(&format!("**Project Language:** {}\n", lang));
    }
    if let Some(ref fw) = project_framework {
        prompt.push_str(&format!("**Project Framework:** {}\n", fw));
    }

    prompt.push_str(&format!(
        "\n**Current Instructions:**\n{}\n\n\
         Enhance these instructions following the {} tier guidelines. \
         Make them specific to {} projects if applicable. \
         Add missing sections, improve clarity, and ensure actionability.",
        instructions,
        tier_str,
        project_language.as_deref().unwrap_or("any")
    ));

    crate::core::ai::call_claude(&state.http_client, &api_key, &system, &prompt).await
}

/// Get a tier-appropriate example for agent enhancement.
fn get_tier_example(tier: &str, category: &str) -> &'static str {
    match (tier, category) {
        ("basic", _) => r#"
## Purpose
Run unit tests for modified files and report failures clearly.

## Instructions
1. Identify files changed in the current session
2. Run the project's test command (npm test, cargo test, pytest)
3. Report failures with file:line references
4. Suggest fixes for common failure patterns

## Rules
- Only run tests, never modify test files
- Stop after 3 consecutive failures"#,

        ("advanced", "testing") => r#"
## Purpose
Comprehensive test coverage agent that writes, runs, and validates tests for new code.

## Instructions
1. Analyze the target function/component for testable behaviors
2. Identify edge cases: null inputs, empty arrays, boundary values, error conditions
3. Generate test file following project conventions (*.test.ts, *_test.py, etc.)
4. Write tests using the project's testing framework (detect from package.json/Cargo.toml)
5. Run tests and iterate on failures up to 3 times
6. Calculate coverage delta and report uncovered paths

## Template
```typescript
describe('[ComponentName]', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Rules
- Match existing test style in the project
- Include at least one error/edge case test
- Never mock external services unless explicitly requested
- Add JSDoc/docstring explaining test intent"#,

        ("advanced", _) => r#"
## Purpose
[Clear statement of what this agent does and when to use it]

## Instructions
1. [First step with specific tool or command]
2. [Decision point: if X then Y, else Z]
3. [Validation step]
4. [Output or handoff step]

## Template
[Code or output template if applicable]

## Rules
- [Critical constraint]
- [Quality requirement]
- [Error handling approach]"#,

        _ => r#"
## Purpose
[One paragraph explaining the agent's role]

## Instructions
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Rules
- [Key constraint]
- [Quality standard]"#,
    }
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
