//! @module commands/session_handoff
//! @description Tauri IPC commands for Smart Session Handoff
//!
//! PURPOSE:
//! - Capture session state (summary, pending items, next steps) via AI analysis
//! - Store/retrieve session snapshots for zero-ramp-up session starts
//! - Generate SessionStart hook script for automatic context injection
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection and HTTP client
//! - core::ai - Claude API for session analysis
//! - commands::session_analysis - Reused transcript helpers (pub(crate))
//! - models::session_handoff - SessionSnapshot type
//! - std::process::Command - Git state detection
//!
//! EXPORTS:
//! - generate_handoff_context - Analyze session transcript, save snapshot, return it
//! - get_latest_snapshot - Query most recent snapshot for a project
//! - generate_session_start_script - Create hook script + register in settings.json
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - Reuses session_analysis helpers for transcript reading
//! - Snapshot stored with JSON-serialized arrays for pending_items, next_steps, files_modified
//!
//! CLAUDE NOTES:
//! - generate_handoff_context requires API key (calls Claude for summary extraction)
//! - git state captured via std::process::Command (branch + porcelain status)
//! - Hook script reads DB via sqlite3 CLI for portability
//! - settings.json is at .claude/settings.json relative to project root

use std::fs;
use std::path::Path;
use std::process::Command as ProcessCommand;

use serde::Deserialize;
use tauri::State;

use crate::commands::session_analysis::{find_session_transcript, read_recent_messages};
use crate::db::AppState;
use crate::models::session_handoff::SessionSnapshot;

/// Analyze the current session transcript and capture a handoff snapshot.
/// Saves to DB and returns the snapshot.
#[tauri::command]
pub async fn generate_handoff_context(
    project_path: String,
    project_id: String,
    state: State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    // Get API key
    let api_key = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("DB lock error: {}", e))?;
        crate::core::ai::get_api_key(&db)?
    };

    // Find and read session transcript
    let transcript_path = find_session_transcript(&project_path)
        .ok_or_else(|| "No session transcript found. Start a Claude Code session first.".to_string())?;

    let messages = read_recent_messages(&transcript_path, 40);
    if messages.is_empty() {
        return Err("No recent messages found in session transcript.".to_string());
    }

    let transcript_excerpt = messages.join("\n\n");

    // Get git state
    let git_state = get_git_state(&project_path);

    // Get list of recently modified files from git
    let git_modified = get_git_modified_files(&project_path);

    // Call AI to extract handoff context
    let system = r#"You are analyzing a Claude Code session transcript to create a handoff summary for the next session.
Extract structured context so the next session can start with zero ramp-up time.

Return ONLY a JSON object (no markdown, no explanation):

{
  "summary": "1-2 sentence summary of what was accomplished and the current state",
  "pending_items": ["item 1 that is unfinished or needs follow-up", "item 2..."],
  "next_steps": ["suggested action 1 for the next session", "suggested action 2..."],
  "files_modified": ["path/to/file1.rs", "path/to/file2.tsx"]
}

GUIDELINES:
- summary should capture WHAT was done and WHERE things stand
- pending_items: things explicitly mentioned as TODO, unfinished, or broken
- next_steps: 2-4 actionable suggestions based on session context
- files_modified: files that were created, edited, or discussed for modification
- Keep items concise and specific (not generic advice)
- If the session was just exploration, say so and suggest next concrete actions"#;

    let prompt = format!(
        "Git state: {}\nRecently modified files: {}\n\nSession transcript:\n\n{}",
        git_state,
        git_modified.join(", "),
        transcript_excerpt
    );

    let response =
        crate::core::ai::call_claude(&state.http_client, &api_key, system, &prompt).await?;

    // Parse AI response
    let parsed = parse_handoff_response(&response)?;

    // Determine session ID from transcript path
    let session_id = transcript_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();

    let snapshot_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let snapshot = SessionSnapshot {
        id: snapshot_id.clone(),
        project_id: project_id.clone(),
        session_id,
        summary: parsed.summary.unwrap_or_else(|| "Session context captured.".to_string()),
        pending_items: parsed.pending_items.unwrap_or_default(),
        git_state: git_state.clone(),
        next_steps: parsed.next_steps.unwrap_or_default(),
        files_modified: parsed.files_modified.unwrap_or_default(),
        created_at: now.clone(),
    };

    // Save to database
    {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("DB lock error: {}", e))?;

        db.execute(
            "INSERT INTO session_snapshots (id, project_id, session_id, summary, pending_items, git_state, next_steps, files_modified, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                snapshot.id,
                snapshot.project_id,
                snapshot.session_id,
                snapshot.summary,
                serde_json::to_string(&snapshot.pending_items).unwrap_or_else(|_| "[]".to_string()),
                snapshot.git_state,
                serde_json::to_string(&snapshot.next_steps).unwrap_or_else(|_| "[]".to_string()),
                serde_json::to_string(&snapshot.files_modified).unwrap_or_else(|_| "[]".to_string()),
                snapshot.created_at,
            ],
        )
        .map_err(|e| format!("Failed to save snapshot: {}", e))?;
    }

    Ok(snapshot)
}

/// Get the most recent session snapshot for a project.
#[tauri::command]
pub async fn get_latest_snapshot(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Option<SessionSnapshot>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("DB lock error: {}", e))?;

    let result = db.query_row(
        "SELECT id, project_id, session_id, summary, pending_items, git_state, next_steps, files_modified, created_at FROM session_snapshots WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
        [&project_id],
        |row| {
            Ok(SessionSnapshot {
                id: row.get(0)?,
                project_id: row.get(1)?,
                session_id: row.get(2)?,
                summary: row.get(3)?,
                pending_items: serde_json::from_str::<Vec<String>>(
                    &row.get::<_, String>(4)?
                ).unwrap_or_default(),
                git_state: row.get(5)?,
                next_steps: serde_json::from_str::<Vec<String>>(
                    &row.get::<_, String>(6)?
                ).unwrap_or_default(),
                files_modified: serde_json::from_str::<Vec<String>>(
                    &row.get::<_, String>(7)?
                ).unwrap_or_default(),
                created_at: row.get(8)?,
            })
        },
    );

    match result {
        Ok(snapshot) => Ok(Some(snapshot)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query snapshot: {}", e)),
    }
}

/// Generate a SessionStart hook script and register it in .claude/settings.json.
/// Returns the path to the generated script.
#[tauri::command]
pub async fn generate_session_start_script(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Verify we have a snapshot first
    let has_snapshot = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("DB lock error: {}", e))?;

        let project_id: Option<String> = db
            .query_row(
                "SELECT id FROM projects WHERE path = ?1",
                [&project_path],
                |row| row.get(0),
            )
            .ok();

        if let Some(pid) = &project_id {
            db.query_row(
                "SELECT COUNT(*) FROM session_snapshots WHERE project_id = ?1",
                [pid],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
                > 0
        } else {
            false
        }
    };

    if !has_snapshot {
        return Err("No snapshot found. Capture a snapshot first.".to_string());
    }

    // Ensure .claude/hooks/ directory exists
    let hooks_dir = Path::new(&project_path).join(".claude").join("hooks");
    fs::create_dir_all(&hooks_dir)
        .map_err(|e| format!("Failed to create hooks directory: {}", e))?;

    // Write the hook script
    let script_path = hooks_dir.join("session-handoff.sh");
    let script_content = generate_hook_script_content();

    fs::write(&script_path, &script_content)
        .map_err(|e| format!("Failed to write hook script: {}", e))?;

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = fs::Permissions::from_mode(0o755);
        fs::set_permissions(&script_path, perms)
            .map_err(|e| format!("Failed to set script permissions: {}", e))?;
    }

    // Update .claude/settings.json to register the hook
    let settings_path = Path::new(&project_path)
        .join(".claude")
        .join("settings.json");

    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings.json: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // Add/update the SessionStart hook
    let hooks = settings
        .as_object_mut()
        .ok_or("settings.json is not an object")?
        .entry("hooks")
        .or_insert_with(|| serde_json::json!({}));

    let session_start = hooks
        .as_object_mut()
        .ok_or("hooks is not an object")?
        .entry("SessionStart")
        .or_insert_with(|| serde_json::json!([]));

    // Check if our hook is already registered
    let hook_command = "bash .claude/hooks/session-handoff.sh";
    let already_registered = session_start
        .as_array()
        .map(|arr| {
            arr.iter().any(|h| {
                h.get("command")
                    .and_then(|c| c.as_str())
                    .map(|c| c == hook_command)
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false);

    if !already_registered {
        if let Some(arr) = session_start.as_array_mut() {
            arr.push(serde_json::json!({
                "type": "command",
                "command": hook_command
            }));
        }
    }

    // Write updated settings
    let settings_str = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, settings_str)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    Ok(script_path.to_string_lossy().to_string())
}

// ---------- Helpers ----------

fn get_git_state(project_path: &str) -> String {
    let branch = ProcessCommand::new("git")
        .args(["branch", "--show-current"])
        .current_dir(project_path)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());

    let status = ProcessCommand::new("git")
        .args(["status", "--porcelain"])
        .current_dir(project_path)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let output = String::from_utf8_lossy(&o.stdout).to_string();
                let trimmed = output.trim();
                if trimmed.is_empty() {
                    Some("clean".to_string())
                } else {
                    let count = trimmed.lines().count();
                    Some(format!("{} modified", count))
                }
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());

    format!("{} ({})", branch, status)
}

fn get_git_modified_files(project_path: &str) -> Vec<String> {
    ProcessCommand::new("git")
        .args(["diff", "--name-only", "HEAD"])
        .current_dir(project_path)
        .output()
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .trim()
                .lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect()
        })
        .unwrap_or_default()
}

#[derive(Deserialize)]
struct HandoffResponse {
    summary: Option<String>,
    pending_items: Option<Vec<String>>,
    next_steps: Option<Vec<String>>,
    files_modified: Option<Vec<String>>,
}

fn parse_handoff_response(response: &str) -> Result<HandoffResponse, String> {
    // Extract JSON from response (may be wrapped in markdown)
    let json_str = if let Some(start) = response.find('{') {
        if let Some(end) = response.rfind('}') {
            &response[start..=end]
        } else {
            response
        }
    } else {
        response
    };

    serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {}", e))
}

fn generate_hook_script_content() -> String {
    r####"#!/bin/bash
# Session Handoff - SessionStart hook
# Reads the latest session snapshot and outputs context for Claude Code
# Generated by Project Jumpstart

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [[ -z "$CWD" ]]; then
  exit 0
fi

DB="$HOME/.project-jumpstart/jumpstart.db"

if [[ ! -f "$DB" ]]; then
  exit 0
fi

# Query latest snapshot for this project
SNAPSHOT=$(sqlite3 -separator '|' "$DB" "SELECT s.summary, s.pending_items, s.next_steps, s.git_state, s.files_modified
  FROM session_snapshots s
  JOIN projects p ON s.project_id = p.id
  WHERE p.path = '$CWD'
  ORDER BY s.created_at DESC LIMIT 1" 2>/dev/null)

if [[ -n "$SNAPSHOT" ]]; then
  SUMMARY=$(echo "$SNAPSHOT" | awk -F'|' '{print $1}')
  PENDING=$(echo "$SNAPSHOT" | awk -F'|' '{print $2}')
  NEXT_STEPS=$(echo "$SNAPSHOT" | awk -F'|' '{print $3}')
  GIT_STATE=$(echo "$SNAPSHOT" | awk -F'|' '{print $4}')
  FILES=$(echo "$SNAPSHOT" | awk -F'|' '{print $5}')

  echo "## Session Handoff Context"
  echo ""
  echo "### Previous Session Summary"
  echo "$SUMMARY"
  echo ""

  if [[ "$PENDING" != "[]" && -n "$PENDING" ]]; then
    echo "### Pending Items"
    echo "$PENDING" | jq -r '.[]' 2>/dev/null | while read -r item; do
      echo "- $item"
    done
    echo ""
  fi

  if [[ "$NEXT_STEPS" != "[]" && -n "$NEXT_STEPS" ]]; then
    echo "### Suggested Next Steps"
    echo "$NEXT_STEPS" | jq -r '.[]' 2>/dev/null | while read -r step; do
      echo "- $step"
    done
    echo ""
  fi

  echo "### Git State"
  echo "$GIT_STATE"

  if [[ "$FILES" != "[]" && -n "$FILES" ]]; then
    echo ""
    echo "### Files Modified Last Session"
    echo "$FILES" | jq -r '.[]' 2>/dev/null | while read -r file; do
      echo "- $file"
    done
  fi
fi
"####
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_snapshot_serde() {
        let snapshot = SessionSnapshot {
            id: "test-id".to_string(),
            project_id: "proj-1".to_string(),
            session_id: "session-abc".to_string(),
            summary: "Implemented auth middleware".to_string(),
            pending_items: vec!["Add tests".to_string(), "Update docs".to_string()],
            git_state: "main (2 modified)".to_string(),
            next_steps: vec!["Write unit tests".to_string()],
            files_modified: vec!["src/auth.rs".to_string()],
            created_at: "2026-02-23T12:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&snapshot).unwrap();
        let deserialized: SessionSnapshot = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, "test-id");
        assert_eq!(deserialized.summary, "Implemented auth middleware");
        assert_eq!(deserialized.pending_items.len(), 2);
        assert_eq!(deserialized.next_steps.len(), 1);
        assert_eq!(deserialized.files_modified.len(), 1);
    }

    #[test]
    fn test_parse_handoff_response_valid() {
        let response = r#"{"summary":"Built login page","pending_items":["Add validation"],"next_steps":["Write tests"],"files_modified":["src/login.tsx"]}"#;
        let parsed = parse_handoff_response(response).unwrap();
        assert_eq!(parsed.summary.unwrap(), "Built login page");
        assert_eq!(parsed.pending_items.unwrap().len(), 1);
        assert_eq!(parsed.next_steps.unwrap().len(), 1);
    }

    #[test]
    fn test_parse_handoff_response_with_markdown() {
        let response = r#"```json
{"summary":"Refactored API","pending_items":[],"next_steps":["Deploy"],"files_modified":[]}
```"#;
        let parsed = parse_handoff_response(response).unwrap();
        assert_eq!(parsed.summary.unwrap(), "Refactored API");
    }

    #[test]
    fn test_parse_handoff_response_missing_fields() {
        let response = r#"{"summary":"Just exploring"}"#;
        let parsed = parse_handoff_response(response).unwrap();
        assert_eq!(parsed.summary.unwrap(), "Just exploring");
        assert!(parsed.pending_items.unwrap_or_default().is_empty());
    }

    #[test]
    fn test_generate_hook_script_content() {
        let content = generate_hook_script_content();
        assert!(content.contains("#!/bin/bash"));
        assert!(content.contains("session_snapshots"));
        assert!(content.contains("sqlite3"));
        assert!(content.contains("Session Handoff Context"));
    }

    #[test]
    fn test_snapshot_db_roundtrip() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::schema::create_tables(&conn).unwrap();

        // Insert a project first
        conn.execute(
            "INSERT INTO projects (id, name, path, created_at) VALUES ('p1', 'Test', '/tmp/test', '2026-01-01T00:00:00Z')",
            [],
        )
        .unwrap();

        // Insert a snapshot
        let pending = serde_json::to_string(&vec!["Fix bug"]).unwrap();
        let next_steps = serde_json::to_string(&vec!["Write tests", "Deploy"]).unwrap();
        let files = serde_json::to_string(&vec!["src/main.rs"]).unwrap();

        conn.execute(
            "INSERT INTO session_snapshots (id, project_id, session_id, summary, pending_items, git_state, next_steps, files_modified, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                "snap-1", "p1", "session-1", "Built feature X", &pending, "main (clean)", &next_steps, &files, "2026-02-23T12:00:00Z"
            ],
        ).unwrap();

        // Query it back
        let snapshot = conn.query_row(
            "SELECT id, project_id, session_id, summary, pending_items, git_state, next_steps, files_modified, created_at FROM session_snapshots WHERE project_id = 'p1' ORDER BY created_at DESC LIMIT 1",
            [],
            |row| {
                Ok(SessionSnapshot {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    session_id: row.get(2)?,
                    summary: row.get(3)?,
                    pending_items: serde_json::from_str::<Vec<String>>(
                        &row.get::<_, String>(4)?
                    ).unwrap_or_default(),
                    git_state: row.get(5)?,
                    next_steps: serde_json::from_str::<Vec<String>>(
                        &row.get::<_, String>(6)?
                    ).unwrap_or_default(),
                    files_modified: serde_json::from_str::<Vec<String>>(
                        &row.get::<_, String>(7)?
                    ).unwrap_or_default(),
                    created_at: row.get(8)?,
                })
            },
        ).unwrap();

        assert_eq!(snapshot.id, "snap-1");
        assert_eq!(snapshot.summary, "Built feature X");
        assert_eq!(snapshot.pending_items, vec!["Fix bug"]);
        assert_eq!(snapshot.next_steps, vec!["Write tests", "Deploy"]);
        assert_eq!(snapshot.files_modified, vec!["src/main.rs"]);
        assert_eq!(snapshot.git_state, "main (clean)");
    }
}
