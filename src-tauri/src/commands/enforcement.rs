//! @module commands/enforcement
//! @description Tauri IPC commands for documentation enforcement (git hooks, CI)
//!
//! PURPOSE:
//! - Install and check git pre-commit hooks for documentation enforcement
//! - Generate CI integration snippets (GitHub Actions, GitLab CI)
//! - Track and list enforcement events (blocks, warnings)
//! - Calculate enforcement score for health integration
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for events persistence
//! - models::enforcement - EnforcementEvent, HookStatus, CiSnippet types
//! - std::fs - File system for hook installation
//! - std::path::Path - Path operations
//!
//! EXPORTS:
//! - install_git_hooks - Install pre-commit hook for doc enforcement
//! - get_hook_status - Check if hooks are installed
//! - get_enforcement_events - List recent enforcement events
//! - get_ci_snippets - Generate CI integration templates
//! - get_enforcement_score - Calculate enforcement score (0-10) for health
//!
//! PATTERNS:
//! - install_git_hooks writes a shell script to .git/hooks/pre-commit
//! - Hook checks for @module/@description headers in staged source files
//! - CI snippets are returned as copyable template strings
//! - Enforcement score: 5 for hooks installed, 5 for CI config present
//!
//! CLAUDE NOTES:
//! - Hook mode: "block" (exit 1) or "warn" (exit 0 with message)
//! - Husky detection: checks for .husky/ directory
//! - CI detection: checks for .github/workflows/ or .gitlab-ci.yml
//! - Enforcement events are logged to the DB for the event log UI

use std::path::Path;
use tauri::State;

use crate::db::AppState;
use crate::models::enforcement::{CiSnippet, EnforcementEvent, HookStatus};

/// Install a pre-commit git hook that checks documentation headers.
/// Creates .git/hooks/pre-commit with a doc-checking script.
#[tauri::command]
pub async fn install_git_hooks(
    project_path: String,
    mode: String,
) -> Result<HookStatus, String> {
    let path = Path::new(&project_path);
    let git_dir = path.join(".git");

    if !git_dir.exists() {
        return Err("Not a git repository. Initialize git first.".to_string());
    }

    let hooks_dir = git_dir.join("hooks");
    if !hooks_dir.exists() {
        std::fs::create_dir_all(&hooks_dir)
            .map_err(|e| format!("Failed to create hooks directory: {}", e))?;
    }

    let hook_path = hooks_dir.join("pre-commit");
    let exit_code = if mode == "block" { "1" } else { "0" };

    let hook_script = format!(
        r#"#!/bin/sh
# Claude Code Copilot — Documentation Enforcement Hook
# Mode: {mode}
# Auto-generated. Edit via Claude Code Copilot settings.

MISSING_DOCS=0
EXTENSIONS="ts tsx js jsx rs py go"

for file in $(git diff --cached --name-only --diff-filter=ACM); do
    # Check if file has a documentable extension
    ext="${{file##*.}}"
    case " $EXTENSIONS " in
        *" $ext "*)
            # Check for doc header in first 30 lines
            head -30 "$file" 2>/dev/null | grep -q "@module\|@description\|//! @module" || {{
                echo "WARNING: Missing documentation header in $file"
                MISSING_DOCS=$((MISSING_DOCS + 1))
            }}
            ;;
    esac
done

if [ $MISSING_DOCS -gt 0 ]; then
    echo ""
    echo "Found $MISSING_DOCS file(s) without documentation headers."
    echo "Run Claude Code Copilot to generate missing docs."
    exit {exit_code}
fi

exit 0
"#,
        mode = mode,
        exit_code = exit_code,
    );

    std::fs::write(&hook_path, &hook_script)
        .map_err(|e| format!("Failed to write hook: {}", e))?;

    // Make executable (Unix)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o755);
        std::fs::set_permissions(&hook_path, perms)
            .map_err(|e| format!("Failed to set hook permissions: {}", e))?;
    }

    let has_husky = path.join(".husky").exists();

    Ok(HookStatus {
        installed: true,
        hook_path: hook_path.to_string_lossy().to_string(),
        mode,
        has_husky,
    })
}

/// Check the current status of git hooks for a project.
#[tauri::command]
pub async fn get_hook_status(project_path: String) -> Result<HookStatus, String> {
    let path = Path::new(&project_path);
    let hook_path = path.join(".git").join("hooks").join("pre-commit");
    let has_husky = path.join(".husky").exists();

    if !hook_path.exists() {
        return Ok(HookStatus {
            installed: false,
            hook_path: hook_path.to_string_lossy().to_string(),
            mode: "none".to_string(),
            has_husky,
        });
    }

    // Read hook to determine mode
    let content = std::fs::read_to_string(&hook_path)
        .map_err(|e| format!("Failed to read hook: {}", e))?;

    let is_copilot_hook = content.contains("Claude Code Copilot");
    let mode = if !is_copilot_hook {
        "external".to_string()
    } else if content.contains("Mode: block") {
        "block".to_string()
    } else {
        "warn".to_string()
    };

    Ok(HookStatus {
        installed: is_copilot_hook,
        hook_path: hook_path.to_string_lossy().to_string(),
        mode,
        has_husky,
    })
}

/// List recent enforcement events for a project.
#[tauri::command]
pub async fn get_enforcement_events(
    project_id: String,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<EnforcementEvent>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let max = limit.unwrap_or(50);

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, event_type, source, message, file_path, created_at FROM enforcement_events WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )
        .map_err(|e| format!("Failed to query events: {}", e))?;

    let events = stmt
        .query_map(rusqlite::params![project_id, max], |row| {
            Ok(EnforcementEvent {
                id: row.get(0)?,
                project_id: row.get(1)?,
                event_type: row.get(2)?,
                source: row.get(3)?,
                message: row.get(4)?,
                file_path: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to read events: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(events)
}

/// Generate CI integration snippets for documentation enforcement.
#[tauri::command]
pub async fn get_ci_snippets(project_path: String) -> Result<Vec<CiSnippet>, String> {
    let path = Path::new(&project_path);

    let mut snippets = Vec::new();

    // GitHub Actions snippet
    let has_github = path.join(".github").join("workflows").exists();
    snippets.push(CiSnippet {
        provider: "github_actions".to_string(),
        name: "Documentation Coverage Check".to_string(),
        description: "Checks that all source files have documentation headers on pull requests."
            .to_string(),
        filename: ".github/workflows/doc-check.yml".to_string(),
        content: generate_github_actions_snippet(),
    });

    // GitLab CI snippet
    let has_gitlab = path.join(".gitlab-ci.yml").exists();
    snippets.push(CiSnippet {
        provider: "gitlab_ci".to_string(),
        name: "Documentation Coverage Check".to_string(),
        description: "Checks documentation headers as part of the GitLab CI pipeline.".to_string(),
        filename: ".gitlab-ci.yml (add stage)".to_string(),
        content: generate_gitlab_ci_snippet(),
    });

    // Mark which ones are already configured
    if has_github {
        snippets[0].description = format!("{} (workflows directory exists)", snippets[0].description);
    }
    if has_gitlab {
        snippets[1].description = format!("{} (.gitlab-ci.yml exists)", snippets[1].description);
    }

    Ok(snippets)
}

/// Calculate the enforcement score for health integration (0-10).
/// 5 points for git hooks installed, 5 points for CI config present.
pub fn calculate_enforcement_score(project_path: &str) -> u32 {
    let path = Path::new(project_path);
    let mut score: u32 = 0;

    // Check for pre-commit hook
    let hook_path = path.join(".git").join("hooks").join("pre-commit");
    if hook_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&hook_path) {
            if content.contains("Claude Code Copilot") || content.contains("@module") {
                score += 5;
            } else {
                // External hook still gets partial credit
                score += 3;
            }
        }
    }

    // Check for CI config
    let has_github_ci = path.join(".github").join("workflows").exists();
    let has_gitlab_ci = path.join(".gitlab-ci.yml").exists();
    if has_github_ci || has_gitlab_ci {
        score += 5;
    }

    score.min(10)
}

// --- CI Template Generators ---

fn generate_github_actions_snippet() -> String {
    r#"name: Documentation Check

on:
  pull_request:
    branches: [main]

jobs:
  doc-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check documentation headers
        run: |
          MISSING=0
          EXTENSIONS="ts tsx js jsx rs py go"
          for file in $(find src -type f); do
            ext="${file##*.}"
            case " $EXTENSIONS " in
              *" $ext "*)
                if ! head -30 "$file" | grep -q "@module\|@description\|//! @module"; then
                  echo "Missing doc header: $file"
                  MISSING=$((MISSING + 1))
                fi
                ;;
            esac
          done
          if [ $MISSING -gt 0 ]; then
            echo "::error::Found $MISSING file(s) without documentation headers"
            exit 1
          fi
          echo "All source files have documentation headers"
"#
    .to_string()
}

fn generate_gitlab_ci_snippet() -> String {
    r#"doc-check:
  stage: test
  script:
    - |
      MISSING=0
      EXTENSIONS="ts tsx js jsx rs py go"
      for file in $(find src -type f); do
        ext="${file##*.}"
        case " $EXTENSIONS " in
          *" $ext "*)
            if ! head -30 "$file" | grep -q "@module\|@description\|//! @module"; then
              echo "Missing doc header: $file"
              MISSING=$((MISSING + 1))
            fi
            ;;
        esac
      done
      if [ $MISSING -gt 0 ]; then
        echo "Found $MISSING file(s) without documentation headers"
        exit 1
      fi
      echo "All source files have documentation headers"
  only:
    - merge_requests
"#
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_enforcement_score_no_git() {
        let score = calculate_enforcement_score("/nonexistent/path/12345");
        assert_eq!(score, 0);
    }

    #[test]
    fn test_github_actions_snippet() {
        let snippet = generate_github_actions_snippet();
        assert!(snippet.contains("Documentation Check"));
        assert!(snippet.contains("@module"));
        assert!(snippet.contains("pull_request"));
    }

    #[test]
    fn test_gitlab_ci_snippet() {
        let snippet = generate_gitlab_ci_snippet();
        assert!(snippet.contains("doc-check"));
        assert!(snippet.contains("@module"));
        assert!(snippet.contains("merge_requests"));
    }
}
