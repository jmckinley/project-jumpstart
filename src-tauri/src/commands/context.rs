//! @module commands/context
//! @description Tauri IPC commands for context health monitoring and checkpoint management
//!
//! PURPOSE:
//! - Calculate context health with token breakdown by category
//! - Detect and report MCP server overhead
//! - Create and list context checkpoints for recovery
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for project/skills/checkpoint queries
//! - core::health - Token estimation utility
//! - models::context - ContextHealth, TokenBreakdown, McpServerStatus, Checkpoint types
//! - std::path::Path - File system checks for MCP config
//!
//! EXPORTS:
//! - get_context_health - Calculate context token usage and rot risk
//! - get_mcp_status - List MCP servers with overhead and recommendations
//! - create_checkpoint - Save a context state snapshot
//! - list_checkpoints - Get checkpoints for a project
//!
//! PATTERNS:
//! - Context budget is 200k tokens (Claude's context window)
//! - Token breakdown: code (CLAUDE.md + module docs), skills, mcp (server configs), conversation (estimated)
//! - MCP servers are detected from .mcp.json or mcp_servers in project root
//! - Rot risk: low (<50% usage), medium (50-80%), high (>80%)
//!
//! CLAUDE NOTES:
//! - Token estimation uses ~4 chars per token (same as core::health::estimate_tokens)
//! - Context health drives the status bar "Context: XX%" indicator
//! - Checkpoints are manually created snapshots for context recovery
//! - MCP detection reads project-level config files using serde_json
//! - Conversation tokens scale with code_tokens (min 2000, +10% of code tokens)
//! - MCP token estimation: config content tokens + 400 per server for tool schemas

use chrono::Utc;
use tauri::State;

use crate::core::health;
use crate::db::AppState;
use crate::models::context::{Checkpoint, ContextHealth, McpServerStatus, TokenBreakdown};

/// Maximum context budget in tokens (Claude's context window).
const CONTEXT_BUDGET: u32 = 200_000;

/// Calculate context health for a project.
/// Estimates token usage across CLAUDE.md, module docs, skills, and MCP overhead.
#[tauri::command]
pub async fn get_context_health(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<ContextHealth, String> {
    let path = std::path::Path::new(&project_path);

    // Estimate code tokens (CLAUDE.md + documented source files)
    let code_tokens = estimate_code_tokens(path);

    // Estimate skills tokens from DB
    let skills_tokens = estimate_skills_tokens(&project_path, &state)?;

    // Estimate MCP overhead from config files
    let mcp_tokens = estimate_mcp_tokens(path);

    // Conversation tokens scale with project size — larger persistent context
    // correlates with longer conversations referencing more code
    let conversation_tokens = estimate_conversation_tokens(code_tokens);

    let total_tokens = code_tokens + skills_tokens + mcp_tokens + conversation_tokens;
    let usage_percent = (total_tokens as f64 / CONTEXT_BUDGET as f64 * 100.0).min(100.0);

    let rot_risk = if usage_percent < 50.0 {
        "low".to_string()
    } else if usage_percent < 80.0 {
        "medium".to_string()
    } else {
        "high".to_string()
    };

    Ok(ContextHealth {
        total_tokens,
        usage_percent,
        breakdown: TokenBreakdown {
            conversation: conversation_tokens,
            code: code_tokens,
            mcp: mcp_tokens,
            skills: skills_tokens,
        },
        rot_risk,
    })
}

/// Get MCP server status and optimization recommendations.
/// Scans for MCP configuration files in the project directory.
#[tauri::command]
pub async fn get_mcp_status(project_path: String) -> Result<Vec<McpServerStatus>, String> {
    let path = std::path::Path::new(&project_path);
    let mut servers = Vec::new();

    // Check for .mcp.json (Claude Code's MCP config format)
    let mcp_json = path.join(".mcp.json");
    if mcp_json.exists() {
        if let Ok(content) = std::fs::read_to_string(&mcp_json) {
            parse_mcp_config(&content, &mut servers);
        }
    }

    // Check for .claude/mcp_servers.json (alternative location)
    let claude_mcp = path.join(".claude").join("mcp_servers.json");
    if claude_mcp.exists() {
        if let Ok(content) = std::fs::read_to_string(&claude_mcp) {
            parse_mcp_config(&content, &mut servers);
        }
    }

    // If no MCP configs found, return a helpful default
    if servers.is_empty() {
        servers.push(McpServerStatus {
            name: "No MCP servers detected".to_string(),
            status: "none".to_string(),
            token_overhead: 0,
            recommendation: "none".to_string(),
            description: "Add MCP servers in .mcp.json to extend Claude's capabilities."
                .to_string(),
        });
    }

    Ok(servers)
}

/// Create a context checkpoint — a snapshot of the current context state.
#[tauri::command]
pub async fn create_checkpoint(
    project_id: String,
    label: String,
    summary: String,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Checkpoint, String> {
    let path = std::path::Path::new(&project_path);
    let code_tokens = estimate_code_tokens(path);
    let skills_tokens = estimate_skills_tokens(&project_path, &state)?;
    let mcp_tokens = estimate_mcp_tokens(path);
    let conversation_tokens = estimate_conversation_tokens(code_tokens);
    let total = code_tokens + skills_tokens + mcp_tokens + conversation_tokens;
    let context_percent = (total as f64 / CONTEXT_BUDGET as f64 * 100.0).min(100.0);

    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO checkpoints (id, project_id, label, summary, token_snapshot, context_percent, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, project_id, label, summary, total, context_percent, now],
    )
    .map_err(|e| format!("Failed to create checkpoint: {}", e))?;

    Ok(Checkpoint {
        id,
        project_id,
        label,
        summary,
        token_snapshot: total,
        context_percent,
        created_at: now,
    })
}

/// List all checkpoints for a project, newest first.
#[tauri::command]
pub async fn list_checkpoints(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Checkpoint>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, label, summary, token_snapshot, context_percent, created_at FROM checkpoints WHERE project_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to query checkpoints: {}", e))?;

    let checkpoints = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(Checkpoint {
                id: row.get(0)?,
                project_id: row.get(1)?,
                label: row.get(2)?,
                summary: row.get(3)?,
                token_snapshot: row.get(4)?,
                context_percent: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to read checkpoints: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(checkpoints)
}

// --- Token Estimation Helpers ---

/// Estimate tokens used by code context (CLAUDE.md + source files with doc headers).
fn estimate_code_tokens(project_path: &std::path::Path) -> u32 {
    let mut tokens: u32 = 0;

    // CLAUDE.md
    let claude_md = project_path.join("CLAUDE.md");
    if claude_md.exists() {
        if let Ok(content) = std::fs::read_to_string(&claude_md) {
            tokens += health::estimate_tokens(&content);
        }
    }

    // Scan src/ for documented files and estimate their doc header tokens
    let src_dir = project_path.join("src");
    if src_dir.exists() {
        tokens += estimate_dir_doc_tokens(&src_dir);
    }

    tokens
}

/// Recursively estimate tokens from documentation headers in source files.
fn estimate_dir_doc_tokens(dir: &std::path::Path) -> u32 {
    let mut tokens: u32 = 0;
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return 0,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "dist"
            || name == "build"
        {
            continue;
        }

        if path.is_dir() {
            tokens += estimate_dir_doc_tokens(&path);
        } else if is_source_file(&name) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                // Only count the doc header portion (first 30 lines)
                let header: String = content.lines().take(30).collect::<Vec<_>>().join("\n");
                if header.contains("@module") || header.contains("@description") {
                    tokens += health::estimate_tokens(&header);
                }
            }
        }
    }

    tokens
}

/// Check if a file is a source file.
fn is_source_file(name: &str) -> bool {
    let extensions = [".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go"];
    extensions.iter().any(|ext| name.ends_with(ext))
}

/// Estimate tokens used by skills content from the database.
fn estimate_skills_tokens(
    project_path: &str,
    state: &State<'_, AppState>,
) -> Result<u32, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get project ID from path
    let project_id: Option<String> = db
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            [project_path],
            |row| row.get(0),
        )
        .ok();

    if let Some(pid) = project_id {
        // Sum content lengths of all skills for this project
        let total_chars: u32 = db
            .query_row(
                "SELECT COALESCE(SUM(LENGTH(content)), 0) FROM skills WHERE project_id = ?1 OR project_id IS NULL",
                [&pid],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // ~4 chars per token
        Ok((total_chars as f64 / 4.0).ceil() as u32)
    } else {
        Ok(0)
    }
}

/// Estimate MCP server overhead tokens from config files.
/// Uses JSON parsing to count servers and estimates tokens from config content size
/// plus per-server tool schema overhead (~400 tokens each).
fn estimate_mcp_tokens(project_path: &std::path::Path) -> u32 {
    let mut tokens: u32 = 0;

    for config_path in [
        project_path.join(".mcp.json"),
        project_path.join(".claude").join("mcp_servers.json"),
    ] {
        if config_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&config_path) {
                // Tokens from the config content itself
                tokens += health::estimate_tokens(&content);
                // Per-server tool schema overhead
                tokens += count_mcp_servers_in_config(&content) * 400;
            }
        }
    }

    tokens
}

/// Count MCP server entries in a JSON config string using proper JSON parsing.
fn count_mcp_servers_in_config(content: &str) -> u32 {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(content) {
        let mcp_obj = value
            .get("mcpServers")
            .or_else(|| value.get("mcp_servers"))
            .or(Some(&value));

        if let Some(obj) = mcp_obj {
            if let Some(map) = obj.as_object() {
                return map.len() as u32;
            }
        }
    }
    0
}

/// Estimate conversation tokens based on project size.
/// Larger persistent context correlates with longer conversations.
/// Uses a minimum of 2000 tokens plus 10% of code tokens as a baseline.
fn estimate_conversation_tokens(code_tokens: u32) -> u32 {
    let proportional = code_tokens / 10;
    2000_u32.max(proportional)
}

/// Parse MCP config JSON to extract server entries.
/// Uses serde_json to parse the config and extract server definitions.
fn parse_mcp_config(content: &str, servers: &mut Vec<McpServerStatus>) {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(content) {
        // Look for mcpServers object
        let mcp_obj = value
            .get("mcpServers")
            .or_else(|| value.get("mcp_servers"))
            .or(Some(&value));

        if let Some(obj) = mcp_obj {
            if let Some(map) = obj.as_object() {
                for (name, config) in map {
                    let command = config
                        .get("command")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");

                    let has_args = config.get("args").is_some();

                    // Estimate token overhead based on server type
                    let token_overhead = if command.contains("npx") || command.contains("node") {
                        800
                    } else if command.contains("python") {
                        600
                    } else {
                        500
                    };

                    let recommendation = if token_overhead > 700 {
                        "optimize"
                    } else {
                        "keep"
                    };

                    servers.push(McpServerStatus {
                        name: name.clone(),
                        status: "configured".to_string(),
                        token_overhead,
                        recommendation: recommendation.to_string(),
                        description: format!(
                            "Command: {}{}",
                            command,
                            if has_args { " (with args)" } else { "" }
                        ),
                    });
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_conversation_tokens() {
        // Minimum is 2000
        assert_eq!(estimate_conversation_tokens(0), 2000);
        assert_eq!(estimate_conversation_tokens(10_000), 2000); // 10_000/10 = 1000 < 2000
        // Proportional kicks in above 20k code tokens
        assert_eq!(estimate_conversation_tokens(40_000), 4000); // 40_000/10 = 4000 > 2000
    }

    #[test]
    fn test_is_source_file() {
        assert!(is_source_file("App.tsx"));
        assert!(is_source_file("health.rs"));
        assert!(is_source_file("main.py"));
        assert!(!is_source_file("README.md"));
        assert!(!is_source_file("config.json"));
    }

    #[test]
    fn test_estimate_mcp_tokens_no_config() {
        let tokens = estimate_mcp_tokens(std::path::Path::new("/nonexistent/path"));
        assert_eq!(tokens, 0);
    }

    #[test]
    fn test_estimate_code_tokens_no_project() {
        let tokens = estimate_code_tokens(std::path::Path::new("/nonexistent/path"));
        assert_eq!(tokens, 0);
    }

    #[test]
    fn test_parse_mcp_config_valid() {
        let config = r#"{
            "mcpServers": {
                "filesystem": {
                    "command": "npx",
                    "args": ["-y", "@anthropic/mcp-server-filesystem"]
                },
                "custom": {
                    "command": "python",
                    "args": ["server.py"]
                }
            }
        }"#;
        let mut servers = Vec::new();
        parse_mcp_config(config, &mut servers);
        assert_eq!(servers.len(), 2);
        assert_eq!(servers[0].name, "custom");
        assert_eq!(servers[1].name, "filesystem");
    }

    #[test]
    fn test_parse_mcp_config_empty() {
        let mut servers = Vec::new();
        parse_mcp_config("{}", &mut servers);
        assert!(servers.is_empty());
    }

    #[test]
    fn test_count_mcp_servers_in_config() {
        let config = r#"{"mcpServers":{"fs":{"command":"npx"},"db":{"command":"python"}}}"#;
        assert_eq!(count_mcp_servers_in_config(config), 2);
        assert_eq!(count_mcp_servers_in_config("{}"), 0);
        assert_eq!(count_mcp_servers_in_config("invalid json"), 0);
    }
}
