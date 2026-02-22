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
//! - install_git_hooks_internal - Internal function for hook installation (used by onboarding)
//! - get_hook_status - Check if hooks are installed
//! - check_hooks_configured - Check if Claude Code PostToolUse hooks are configured
//! - get_enforcement_events - List recent enforcement events
//! - get_ci_snippets - Generate CI integration templates
//! - get_enforcement_score - Calculate enforcement score (0-10) for health
//! - get_hook_health - Read hook self-healing health status
//! - reset_hook_health - Reset hook health and optionally reinstall hook
//! - export_api_key_for_hook - (internal) Export decrypted API key to JSON for auto-update hook
//!
//! PATTERNS:
//! - install_git_hooks writes a shell script to .git/hooks/pre-commit
//! - Hook checks for @module/@description headers in staged source files
//! - CI snippets are returned as copyable template strings
//! - Enforcement score: 5 for hooks installed, 5 for CI config present
//!
//! CLAUDE NOTES:
//! - Hook modes: "block" (exit 1), "warn" (exit 0 with message), "auto-update" (always exit 0)
//! - Auto-update mode NEVER blocks commits — all errors become warnings + exit 0
//! - Auto-update mode reads API key from ~/.project-jumpstart/settings.json
//! - Model ID for hook comes from settings.json "claude_model" key (set by export_api_key_for_hook)
//! - When installing auto-update hook, API key + model are exported from encrypted SQLite to JSON
//! - The settings.json file has 0600 permissions (owner read/write only)
//! - Husky detection: checks for .husky/ directory
//! - CI detection: checks for .github/workflows/ or .gitlab-ci.yml
//! - Enforcement events are logged to the DB for the event log UI

use std::path::Path;
use tauri::State;

use crate::core::{ai, crypto};
use crate::db::{self, AppState};
use crate::models::enforcement::{CiSnippet, EnforcementEvent, HookHealth, HookStatus};

/// Current hook version - increment when hook logic changes
/// Format: MAJOR.MINOR.PATCH
/// - MAJOR: Breaking changes (requires jq, different behavior)
/// - MINOR: New features (backward compatible)
/// - PATCH: Bug fixes
pub const HOOK_VERSION: &str = "4.0.0";

/// Parse version from hook script content
fn parse_hook_version(content: &str) -> Option<String> {
    // Look for "# Version: X.Y.Z" comment
    for line in content.lines() {
        if let Some(version) = line.strip_prefix("# Version: ") {
            return Some(version.trim().to_string());
        }
    }
    // Legacy hooks without version are 1.0.0
    if content.contains("Project Jumpstart") || content.contains("Claude Code Copilot") {
        return Some("1.0.0".to_string());
    }
    None
}

/// Compare semantic versions, returns true if installed < current
fn is_version_outdated(installed: &str, current: &str) -> bool {
    let parse_version = |v: &str| -> (u32, u32, u32) {
        let parts: Vec<u32> = v.split('.')
            .filter_map(|p| p.parse().ok())
            .collect();
        (
            parts.first().copied().unwrap_or(0),
            parts.get(1).copied().unwrap_or(0),
            parts.get(2).copied().unwrap_or(0),
        )
    };

    let (i_major, i_minor, i_patch) = parse_version(installed);
    let (c_major, c_minor, c_patch) = parse_version(current);

    (i_major, i_minor, i_patch) < (c_major, c_minor, c_patch)
}

/// Export the decrypted API key to a JSON file for the auto-update hook.
/// The hook script reads this file since it can't decrypt the SQLite-stored key.
fn export_api_key_for_hook(db: &rusqlite::Connection) -> Result<(), String> {
    // Read the encrypted API key from the database
    let encrypted_value: String = db
        .query_row(
            "SELECT value FROM settings WHERE key = 'anthropic_api_key'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "No API key configured. Please add your Anthropic API key in Settings.")?;

    // Decrypt the API key
    let api_key = if let Some(stripped) = encrypted_value.strip_prefix("enc:") {
        crypto::decrypt(stripped)
            .map_err(|e| format!("Failed to decrypt API key: {}", e))?
    } else {
        encrypted_value
    };

    if api_key.is_empty() {
        return Err("API key is empty. Please configure your Anthropic API key in Settings.".to_string());
    }

    // Write to ~/.project-jumpstart/settings.json
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let settings_dir = home.join(".project-jumpstart");
    std::fs::create_dir_all(&settings_dir)
        .map_err(|e| format!("Failed to create settings directory: {}", e))?;

    let settings_path = settings_dir.join("settings.json");
    let json = serde_json::json!({
        "anthropic_api_key": api_key,
        "claude_model": ai::MODEL
    });
    let json_bytes = serde_json::to_string_pretty(&json)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    // Write file with restrictive permissions from the start (no race condition)
    #[cfg(unix)]
    {
        use std::fs::OpenOptions;
        use std::io::Write;
        use std::os::unix::fs::OpenOptionsExt;

        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .mode(0o600) // Owner read/write only - set at creation time
            .open(&settings_path)
            .map_err(|e| format!("Failed to create settings.json: {}", e))?;

        file.write_all(json_bytes.as_bytes())
            .map_err(|e| format!("Failed to write settings.json: {}", e))?;
    }

    #[cfg(not(unix))]
    {
        // On Windows, just write normally (no mode support)
        std::fs::write(&settings_path, json_bytes)
            .map_err(|e| format!("Failed to write settings.json: {}", e))?;
    }

    Ok(())
}

/// Install a pre-commit git hook that checks documentation headers.
/// Creates .git/hooks/pre-commit with a doc-checking script.
#[tauri::command]
pub async fn install_git_hooks(
    project_path: String,
    mode: String,
    state: State<'_, AppState>,
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

    // For auto-update mode, export the API key to a JSON file
    if mode == "auto-update" {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        export_api_key_for_hook(&db)?;
    }

    let hook_script = if mode == "auto-update" {
        generate_auto_update_hook_script()
    } else {
        let exit_code = if mode == "block" { "1" } else { "0" };
        format!(
            r#"#!/bin/sh
# Project Jumpstart — Documentation Enforcement Hook
# Version: {version}
# Mode: {mode}
# Auto-generated. Edit via Project Jumpstart settings.

EXTENSIONS="ts tsx js jsx rs py go"
MISSING_FILE=$(mktemp "${{TMPDIR:-/tmp}}/jumpstart-hook.XXXXXX") || exit 0
trap 'rm -f "$MISSING_FILE"' EXIT

# Use null-delimited output to handle filenames with spaces/special chars
git diff --cached --name-only --diff-filter=ACM -z | while IFS= read -r -d '' file; do
    ext="${{file##*.}}"
    case " $EXTENSIONS " in
        *" $ext "*)
            head -30 "$file" 2>/dev/null | grep -q "@module\|@description\|//! @module" || {{
                echo "WARNING: Missing documentation header in $file"
                printf '%s\n' "$file" >> "$MISSING_FILE"
            }}
            ;;
    esac
done

if [ -s "$MISSING_FILE" ]; then
    MISSING_DOCS=$(wc -l < "$MISSING_FILE" | tr -d ' ')
    echo ""
    echo "Found $MISSING_DOCS file(s) without documentation headers."
    echo "Run Project Jumpstart to generate missing docs."
    exit {exit_code}
fi

exit 0
"#,
            version = HOOK_VERSION,
            mode = mode,
            exit_code = exit_code,
        )
    };

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

    // Log activity (best-effort, non-critical)
    match state.db.lock() {
        Ok(db) => {
            if let Ok(pid) = db.query_row(
                "SELECT id FROM projects WHERE path = ?1",
                [&project_path],
                |row| row.get::<_, String>(0),
            ) {
                let _ = db::log_activity_db(
                    &db,
                    &pid,
                    "enforcement",
                    &format!("Installed git hooks ({})", &mode),
                );
            }
        }
        Err(e) => eprintln!("Failed to lock DB for activity logging: {}", e),
    }

    Ok(HookStatus {
        installed: true,
        hook_path: hook_path.to_string_lossy().to_string(),
        mode,
        has_husky,
        has_git: true,
        version: Some(HOOK_VERSION.to_string()),
        outdated: false,
        current_version: HOOK_VERSION.to_string(),
    })
}

/// Internal function to install git hooks without State (used by onboarding).
/// This is a synchronous version that takes the db connection directly.
pub fn install_git_hooks_internal(
    project_path: &str,
    mode: &str,
    db: Option<&rusqlite::Connection>,
) -> Result<(), String> {
    let path = Path::new(project_path);
    let git_dir = path.join(".git");

    if !git_dir.exists() {
        // Not a git repository - skip silently (don't fail onboarding)
        return Ok(());
    }

    let hooks_dir = git_dir.join("hooks");
    if !hooks_dir.exists() {
        std::fs::create_dir_all(&hooks_dir)
            .map_err(|e| format!("Failed to create hooks directory: {}", e))?;
    }

    let hook_path = hooks_dir.join("pre-commit");

    // For auto-update mode, export the API key (requires db)
    if mode == "auto-update" {
        if let Some(conn) = db {
            export_api_key_for_hook(conn)?;
        } else {
            return Err("Auto-update mode requires database access".to_string());
        }
    }

    let hook_script = if mode == "auto-update" {
        generate_auto_update_hook_script()
    } else {
        let exit_code = if mode == "block" { "1" } else { "0" };
        format!(
            r#"#!/bin/sh
# Project Jumpstart — Documentation Enforcement Hook
# Version: {version}
# Mode: {mode}
# Auto-generated. Edit via Project Jumpstart settings.

EXTENSIONS="ts tsx js jsx rs py go"
MISSING_FILE=$(mktemp "${{TMPDIR:-/tmp}}/jumpstart-hook.XXXXXX") || exit 0
trap 'rm -f "$MISSING_FILE"' EXIT

# Use null-delimited output to handle filenames with spaces/special chars
git diff --cached --name-only --diff-filter=ACM -z | while IFS= read -r -d '' file; do
    ext="${{file##*.}}"
    case " $EXTENSIONS " in
        *" $ext "*)
            head -30 "$file" 2>/dev/null | grep -q "@module\|@description\|//! @module" || {{
                echo "WARNING: Missing documentation header in $file"
                printf '%s\n' "$file" >> "$MISSING_FILE"
            }}
            ;;
    esac
done

if [ -s "$MISSING_FILE" ]; then
    MISSING_DOCS=$(wc -l < "$MISSING_FILE" | tr -d ' ')
    echo ""
    echo "Found $MISSING_DOCS file(s) without documentation headers."
    echo "Run Project Jumpstart to generate missing docs."
    exit {exit_code}
fi

exit 0
"#,
            version = HOOK_VERSION,
            mode = mode,
            exit_code = exit_code,
        )
    };

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

    Ok(())
}

/// Initialize a git repository in the project directory.
#[tauri::command]
pub async fn init_git(project_path: String) -> Result<(), String> {
    let path = Path::new(&project_path);

    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    if path.join(".git").exists() {
        return Ok(()); // Already a git repo
    }

    // Run git init
    let output = std::process::Command::new("git")
        .arg("init")
        .current_dir(path)
        .output()
        .map_err(|e| format!("Failed to run git init: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git init failed: {}", stderr));
    }

    Ok(())
}

/// Check the current status of git hooks for a project.
#[tauri::command]
pub async fn get_hook_status(project_path: String) -> Result<HookStatus, String> {
    let path = Path::new(&project_path);
    let git_dir = path.join(".git");
    let has_git = git_dir.exists();
    let hook_path = git_dir.join("hooks").join("pre-commit");
    let has_husky = path.join(".husky").exists();

    if !has_git || !hook_path.exists() {
        return Ok(HookStatus {
            installed: false,
            hook_path: hook_path.to_string_lossy().to_string(),
            mode: "none".to_string(),
            has_husky,
            has_git,
            version: None,
            outdated: false,
            current_version: HOOK_VERSION.to_string(),
        });
    }

    // Read hook to determine mode
    let content = std::fs::read_to_string(&hook_path)
        .map_err(|e| format!("Failed to read hook: {}", e))?;

    // Check for our hook (support both old and new app names)
    let is_jumpstart_hook = content.contains("Project Jumpstart") || content.contains("Claude Code Copilot");
    let mode = if !is_jumpstart_hook {
        "external".to_string()
    } else if content.contains("Mode: block") {
        "block".to_string()
    } else if content.contains("Mode: auto-update") {
        "auto-update".to_string()
    } else {
        "warn".to_string()
    };

    // Parse version from hook content
    let version = if is_jumpstart_hook {
        parse_hook_version(&content)
    } else {
        None
    };

    // Check if outdated
    let outdated = if let Some(ref v) = version {
        is_version_outdated(v, HOOK_VERSION)
    } else {
        false
    };

    Ok(HookStatus {
        installed: is_jumpstart_hook,
        hook_path: hook_path.to_string_lossy().to_string(),
        mode,
        has_husky,
        has_git,
        version,
        outdated,
        current_version: HOOK_VERSION.to_string(),
    })
}

/// Check if Claude Code PostToolUse hooks are configured for the project.
/// Looks for hooks in .claude/settings.json or .claude/settings.local.json.
#[tauri::command]
pub async fn check_hooks_configured(project_path: String) -> Result<bool, String> {
    let path = Path::new(&project_path);

    let settings_paths = [
        path.join(".claude").join("settings.json"),
        path.join(".claude").join("settings.local.json"),
    ];

    for settings_path in settings_paths {
        if settings_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&settings_path) {
                // Check for hooks configuration (PostToolUse hooks for running tests)
                if content.contains("PostToolUse") || content.contains("\"hooks\"") {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
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
            if content.contains("Project Jumpstart") || content.contains("Claude Code Copilot") || content.contains("@module") {
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

/// Read the hook health file (~/.project-jumpstart/.hook-health) and return health status.
/// Returns healthy defaults if the file does not exist.
#[tauri::command]
pub async fn get_hook_health() -> Result<HookHealth, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let health_path = home.join(".project-jumpstart").join(".hook-health");

    if !health_path.exists() {
        return Ok(HookHealth {
            consecutive_failures: 0,
            last_failure_file: None,
            last_failure_reason: None,
            last_failure_time: None,
            downgraded: false,
            downgrade_time: None,
            total_successes: 0,
            total_failures: 0,
        });
    }

    let content = std::fs::read_to_string(&health_path)
        .map_err(|e| format!("Failed to read hook health file: {}", e))?;

    parse_hook_health(&content)
}

/// Parse key=value health file content into HookHealth struct.
fn parse_hook_health(content: &str) -> Result<HookHealth, String> {
    let mut health = HookHealth {
        consecutive_failures: 0,
        last_failure_file: None,
        last_failure_reason: None,
        last_failure_time: None,
        downgraded: false,
        downgrade_time: None,
        total_successes: 0,
        total_failures: 0,
    };

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();
            match key {
                "consecutive_failures" => {
                    health.consecutive_failures = value.parse().unwrap_or(0);
                }
                "last_failure_file" => {
                    if !value.is_empty() {
                        health.last_failure_file = Some(value.to_string());
                    }
                }
                "last_failure_reason" => {
                    if !value.is_empty() {
                        health.last_failure_reason = Some(value.to_string());
                    }
                }
                "last_failure_time" => {
                    if !value.is_empty() {
                        health.last_failure_time = Some(value.to_string());
                    }
                }
                "downgraded" => {
                    health.downgraded = value == "true";
                }
                "downgrade_time" => {
                    if !value.is_empty() {
                        health.downgrade_time = Some(value.to_string());
                    }
                }
                "total_successes" => {
                    health.total_successes = value.parse().unwrap_or(0);
                }
                "total_failures" => {
                    health.total_failures = value.parse().unwrap_or(0);
                }
                _ => {} // Ignore unknown keys
            }
        }
    }

    Ok(health)
}

/// Reset the hook health file to healthy defaults.
/// Optionally reinstall the auto-update hook if project_path is provided.
#[tauri::command]
pub async fn reset_hook_health(
    project_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    let health_dir = home.join(".project-jumpstart");
    std::fs::create_dir_all(&health_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let health_path = health_dir.join(".hook-health");
    let content = "consecutive_failures=0\nlast_failure_file=\nlast_failure_reason=\nlast_failure_time=\ndowngraded=false\ndowngrade_time=\ntotal_successes=0\ntotal_failures=0\n";
    std::fs::write(&health_path, content)
        .map_err(|e| format!("Failed to write hook health file: {}", e))?;

    // Optionally reinstall the auto-update hook
    if let Some(path) = project_path {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        install_git_hooks_internal(&path, "auto-update", Some(&db))?;
    }

    Ok(())
}

// --- Hook Script Generators ---

fn generate_auto_update_hook_script() -> String {
    format!(r#"#!/bin/sh
# Project Jumpstart — Documentation Enforcement Hook
# Version: {version}
# Mode: auto-update
# Auto-generated. Edit via Project Jumpstart settings.
#
# This hook automatically generates documentation for files missing headers.
# It reads the Anthropic API key from ~/.project-jumpstart/settings.json
#
# RESILIENCE POLICY: This hook NEVER blocks commits. All errors become warnings.
# SELF-HEALING: Backs up files before modification, validates after, restores on failure.
# AUTO-DOWNGRADE: After 3 consecutive failed commits, switches to warn-only mode.

# Prevent API key from appearing in debug output
set +x

# --- Configuration ---
PER_FILE_TIMEOUT=15
TOTAL_TIMEOUT=120
EXTENSIONS="ts tsx js jsx rs py go"
SETTINGS_FILE="$HOME/.project-jumpstart/settings.json"
FALLBACK_MODEL="claude-sonnet-4-5-latest"
START_TIME=$(date +%s)
HEALTH_FILE="$HOME/.project-jumpstart/.hook-health"
BACKUP_DIR=$(mktemp -d "${{TMPDIR:-/tmp}}/jumpstart-backup.XXXXXX") || BACKUP_DIR=""
MAX_CONSECUTIVE_FAILURES=3

# --- Counters ---
FILES_PROCESSED=0
FILES_SKIPPED=0
FILES_HEALED=0

# Cleanup function for temp files
cleanup() {{
    if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
        rm -f "$TEMP_FILE"
    fi
    rm -f "$HOME/.project-jumpstart/.missing_files_$$" 2>/dev/null
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        rm -rf "$BACKUP_DIR"
    fi
}}
trap cleanup EXIT

# --- Health file helpers (key=value, no jq needed) ---

init_health_file() {{
    if [ ! -f "$HEALTH_FILE" ]; then
        mkdir -p "$(dirname "$HEALTH_FILE")"
        cat > "$HEALTH_FILE" <<'HEALTH_EOF'
consecutive_failures=0
last_failure_file=
last_failure_reason=
last_failure_time=
downgraded=false
downgrade_time=
total_successes=0
total_failures=0
HEALTH_EOF
    fi
}}

read_health() {{
    local key="$1"
    if [ -f "$HEALTH_FILE" ]; then
        grep "^$key=" "$HEALTH_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-
    fi
}}

write_health() {{
    local key="$1"
    local value="$2"
    if [ -f "$HEALTH_FILE" ]; then
        if grep -q "^$key=" "$HEALTH_FILE" 2>/dev/null; then
            sed -i.bak "s|^$key=.*|$key=$value|" "$HEALTH_FILE" 2>/dev/null
            rm -f "$HEALTH_FILE.bak" 2>/dev/null
        else
            echo "$key=$value" >> "$HEALTH_FILE"
        fi
    fi
}}

check_downgraded() {{
    local dg
    dg=$(read_health "downgraded")
    [ "$dg" = "true" ]
}}

record_success() {{
    local prev
    prev=$(read_health "total_successes")
    prev=${{prev:-0}}
    write_health "total_successes" "$((prev + 1))"
}}

record_failure() {{
    local file="$1"
    local reason="$2"
    local prev
    prev=$(read_health "total_failures")
    prev=${{prev:-0}}
    write_health "total_failures" "$((prev + 1))"
    write_health "last_failure_file" "$file"
    write_health "last_failure_reason" "$reason"
    write_health "last_failure_time" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}}

# Called at end of hook: decide whether to increment or reset consecutive_failures
finalize_health() {{
    init_health_file
    if [ "$FILES_PROCESSED" -gt 0 ] || [ "$FILES_HEALED" -eq 0 ] && [ "$FILES_PROCESSED" -eq 0 ] && [ "$FILES_SKIPPED" -eq 0 ]; then
        # At least some success or nothing to do — reset
        write_health "consecutive_failures" "0"
    elif [ "$FILES_HEALED" -gt 0 ] && [ "$FILES_PROCESSED" -eq 0 ]; then
        # All files needed healing, none succeeded — increment
        local consec
        consec=$(read_health "consecutive_failures")
        consec=${{consec:-0}}
        consec=$((consec + 1))
        write_health "consecutive_failures" "$consec"
        if [ "$consec" -ge "$MAX_CONSECUTIVE_FAILURES" ]; then
            write_health "downgraded" "true"
            write_health "downgrade_time" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            echo "[Project Jumpstart] Auto-update disabled after $consec consecutive failed commits."
            echo "  The hook will now only warn about missing docs (no AI generation)."
            echo "  Re-enable via Project Jumpstart app > Enforcement > Re-enable Auto-Update."
        fi
    fi
}}

# Check if total timeout has been exceeded
check_timeout() {{
    ELAPSED=$(( $(date +%s) - START_TIME ))
    if [ "$ELAPSED" -ge "$TOTAL_TIMEOUT" ]; then
        echo "[Project Jumpstart] Total timeout (${{TOTAL_TIMEOUT}}s) exceeded. Skipping remaining files."
        return 1
    fi
    return 0
}}

# Call the Anthropic API with model fallback
# Usage: call_api MODEL PAYLOAD
# Returns response on stdout, empty string on failure
call_api() {{
    local model="$1"
    local payload="$2"

    local response
    response=$(curl -s --max-time "$PER_FILE_TIMEOUT" https://api.anthropic.com/v1/messages \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        -d "$payload" 2>/dev/null) || {{
        echo ""
        return
    }}

    # Check for model-not-found or deprecated error
    local error_type
    error_type=$(echo "$response" | jq -r '.error.type // empty' 2>/dev/null)
    if [ "$error_type" = "not_found_error" ] || [ "$error_type" = "invalid_request_error" ]; then
        local error_msg
        error_msg=$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)
        case "$error_msg" in
            *model*|*deprecated*|*not available*)
                # Model issue — retry with fallback if not already using it
                if [ "$model" != "$FALLBACK_MODEL" ]; then
                    echo "    [warn] Model $model unavailable, trying $FALLBACK_MODEL..." >&2
                    local fallback_payload
                    fallback_payload=$(echo "$payload" | jq --arg m "$FALLBACK_MODEL" '.model = $m' 2>/dev/null)
                    if [ -n "$fallback_payload" ]; then
                        response=$(curl -s --max-time "$PER_FILE_TIMEOUT" https://api.anthropic.com/v1/messages \
                            -H "Content-Type: application/json" \
                            -H "x-api-key: $API_KEY" \
                            -H "anthropic-version: 2023-06-01" \
                            -d "$fallback_payload" 2>/dev/null) || {{
                            echo ""
                            return
                        }}
                    else
                        echo ""
                        return
                    fi
                else
                    echo ""
                    return
                fi
                ;;
            *)
                echo ""
                return
                ;;
        esac
    fi

    # Check for other API errors
    local api_error
    api_error=$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)
    if [ -n "$api_error" ]; then
        echo ""
        return
    fi

    echo "$response"
}}

# --- Pre-flight checks (all graceful) ---

init_health_file

if ! command -v jq >/dev/null 2>&1; then
    echo "[Project Jumpstart] Warning: jq not installed. Skipping auto-update."
    echo "  Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 0
fi

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "[Project Jumpstart] Warning: Settings not found at $SETTINGS_FILE. Skipping auto-update."
    echo "  Please run Project Jumpstart to configure your API key."
    exit 0
fi

API_KEY=$(jq -r '.anthropic_api_key // empty' "$SETTINGS_FILE" 2>/dev/null)
if [ -z "$API_KEY" ]; then
    echo "[Project Jumpstart] Warning: No API key found in settings. Skipping auto-update."
    exit 0
fi

case "$API_KEY" in
    sk-ant-*)
        ;;
    *)
        echo "[Project Jumpstart] Warning: Invalid API key format. Skipping auto-update."
        exit 0
        ;;
esac

# Read model from settings.json (with hardcoded fallback)
CLAUDE_MODEL=$(jq -r '.claude_model // empty' "$SETTINGS_FILE" 2>/dev/null)
if [ -z "$CLAUDE_MODEL" ]; then
    CLAUDE_MODEL="$FALLBACK_MODEL"
fi

# --- Downgrade check: if auto-update has been disabled, use warn-only mode ---

if check_downgraded; then
    echo "[Project Jumpstart] Auto-update is disabled (self-healed after repeated failures)."
    echo "  Re-enable via Project Jumpstart app > Enforcement > Re-enable Auto-Update."
    echo ""
    # Warn-only fallback: just report missing files
    git diff --cached --name-only --diff-filter=ACM -z | while IFS= read -r -d '' file; do
        ext="${{file##*.}}"
        case " $EXTENSIONS " in
            *" $ext "*)
                if ! head -30 "$file" 2>/dev/null | grep -q "@module\|@description\|//! @module"; then
                    echo "  [warn] Missing documentation header in $file"
                fi
                ;;
        esac
    done
    exit 0
fi

# --- Find files missing documentation ---

git diff --cached --name-only --diff-filter=ACM -z | while IFS= read -r -d '' file; do
    ext="${{file##*.}}"
    case " $EXTENSIONS " in
        *" $ext "*)
            if ! head -30 "$file" 2>/dev/null | grep -q "@module\|@description\|//! @module"; then
                printf '%s\0' "$file" >> "$HOME/.project-jumpstart/.missing_files_$$"
            fi
            ;;
    esac
done

MISSING_LIST="$HOME/.project-jumpstart/.missing_files_$$"
if [ ! -f "$MISSING_LIST" ] || [ ! -s "$MISSING_LIST" ]; then
    rm -f "$MISSING_LIST" 2>/dev/null
    finalize_health
    exit 0
fi

echo "[Project Jumpstart] Auto-generating documentation for files with missing headers..."

# --- Process each file (with per-file resilience + self-healing) ---

while IFS= read -r -d '' file; do
    # Check total timeout before each file
    if ! check_timeout; then
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    echo "  Generating docs for: $file"

    FILENAME=$(basename "$file")
    EXT="${{file##*.}}"

    # Determine comment style based on extension
    case "$EXT" in
        rs)
            COMMENT_STYLE="rust (//! doc comments)"
            ;;
        py)
            COMMENT_STYLE="python (triple-quote docstrings)"
            ;;
        go)
            COMMENT_STYLE="go (// comments)"
            ;;
        *)
            COMMENT_STYLE="typescript/javascript (/** JSDoc */)"
            ;;
    esac

    # --- SELF-HEALING: Backup before modification ---
    BACKUP_FILE=""
    if [ -n "$BACKUP_DIR" ]; then
        BACKUP_FILE="$BACKUP_DIR/$(echo "$file" | shasum | cut -d' ' -f1)"
        cp "$file" "$BACKUP_FILE" 2>/dev/null || BACKUP_FILE=""
    fi
    ORIGINAL_SIZE=$(wc -c < "$file" | tr -d ' ')

    # Build JSON payload safely using jq (model from variable)
    PAYLOAD=$(jq -n \
        --arg model "$CLAUDE_MODEL" \
        --arg content "Generate ONLY a documentation header for this $EXT file named $FILENAME. Use $COMMENT_STYLE style comments. Include @module, @description, PURPOSE, EXPORTS, and CLAUDE NOTES sections. Output ONLY the comment block, nothing else:\n\n$(cat "$file")" \
        '{{
            model: $model,
            max_tokens: 1024,
            messages: [{{role: "user", content: $content}}]
        }}') || {{
        echo "    [warn] Failed to build request payload, skipping $file"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    }}

    # Call API with model fallback
    RESPONSE=$(call_api "$CLAUDE_MODEL" "$PAYLOAD")

    if [ -z "$RESPONSE" ]; then
        echo "    [warn] API request failed, skipping $file"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    # Extract documentation header
    DOC_HEADER=$(echo "$RESPONSE" | jq -r '.content[0].text // empty' 2>/dev/null)

    if [ -z "$DOC_HEADER" ] || [ "$DOC_HEADER" = "null" ]; then
        echo "    [warn] Empty response from API, skipping $file"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    # Strip markdown code fences that AI may include (e.g. ```typescript ... ```)
    DOC_HEADER=$(echo "$DOC_HEADER" | sed '1{{/^```/d;}}' | sed '${{/^```/d;}}')

    # Safety check: skip if response looks like full file content (> 3KB is suspicious for a header)
    HEADER_SIZE=${{#DOC_HEADER}}
    if [ "$HEADER_SIZE" -gt 3072 ]; then
        echo "    [warn] API response too large ($HEADER_SIZE bytes) — likely not just a header, skipping $file"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    # Verify response looks like a documentation comment (must contain @module or @description)
    if ! echo "$DOC_HEADER" | grep -q "@module\|@description\|//! @module"; then
        echo "    [warn] API response does not look like a doc header, skipping $file"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    # Safety check: reject AI prompt leakage / XML tags that don't belong in code
    if echo "$DOC_HEADER" | grep -qE '</?(budget|token_budget|system|tool_use|tool_result|antml|function_calls|invoke|parameter|result|thinking)[^>]*>'; then
        echo "    [warn] API response contains prompt leakage tags, skipping $file"
        record_failure "$file" "PROMPT_LEAKAGE: response contains XML/prompt tags"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    # Create temp file in same directory as target (same filesystem for atomic mv)
    TEMP_FILE=$(mktemp "$(dirname "$file")/.doc_gen_XXXXXX") || {{
        echo "    [warn] Failed to create temp file, skipping $file"
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    }}

    # Write new content
    if ! printf '%s\n\n' "$DOC_HEADER" > "$TEMP_FILE" 2>/dev/null; then
        echo "    [warn] Failed to write documentation, skipping $file"
        rm -f "$TEMP_FILE"
        TEMP_FILE=""
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    if ! cat "$file" >> "$TEMP_FILE" 2>/dev/null; then
        echo "    [warn] Failed to append original content, skipping $file"
        rm -f "$TEMP_FILE"
        TEMP_FILE=""
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi

    # Atomic move (same filesystem)
    if ! mv "$TEMP_FILE" "$file" 2>/dev/null; then
        echo "    [warn] Failed to update file, skipping $file"
        rm -f "$TEMP_FILE"
        TEMP_FILE=""
        FILES_SKIPPED=$((FILES_SKIPPED + 1))
        continue
    fi
    TEMP_FILE=""

    # --- SELF-HEALING: Post-modification validation ---
    HEAL_NEEDED=""

    # Check 1: SIZE_DELTA — header shouldn't add more than 3KB
    NEW_SIZE=$(wc -c < "$file" | tr -d ' ')
    SIZE_DELTA=$((NEW_SIZE - ORIGINAL_SIZE))
    if [ "$SIZE_DELTA" -gt 3072 ]; then
        HEAL_NEEDED="SIZE_DELTA: grew by $SIZE_DELTA bytes (max 3072)"
    fi

    # Check 2: ORIG_TAIL / NEW_TAIL — last 5 lines of original must still be at end
    if [ -z "$HEAL_NEEDED" ] && [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        ORIG_TAIL=$(tail -5 "$BACKUP_FILE" | shasum | cut -d' ' -f1)
        NEW_TAIL=$(tail -5 "$file" | shasum | cut -d' ' -f1)
        if [ "$ORIG_TAIL" != "$NEW_TAIL" ]; then
            HEAL_NEEDED="TAIL_MISMATCH: original file content not preserved at end"
        fi
    fi

    # Check 3: DUPE_COUNT — if original starts with a known code line, it shouldn't appear >1x in first 50 lines
    if [ -z "$HEAL_NEEDED" ] && [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        FIRST_CODE_LINE=$(head -1 "$BACKUP_FILE" 2>/dev/null)
        case "$FIRST_CODE_LINE" in
            '#!'*|import*|use\ *|from\ *|package\ *|export\ *|const\ *|'#include'*)
                DUPE_COUNT=$(head -50 "$file" 2>/dev/null | grep -cF "$FIRST_CODE_LINE" 2>/dev/null)
                if [ "$DUPE_COUNT" -gt 1 ]; then
                    HEAL_NEEDED="DUPE_FIRST_LINE: '$FIRST_CODE_LINE' appears $DUPE_COUNT times in first 50 lines"
                fi
                ;;
        esac
    fi

    # Check 4: PROMPT_LEAKAGE — scan for AI/XML prompt tags that don't belong in source code
    if [ -z "$HEAL_NEEDED" ]; then
        if head -50 "$file" 2>/dev/null | grep -qE '</?(budget|token_budget|system|tool_use|tool_result|antml|function_calls|invoke|parameter|result|thinking)[^>]*>'; then
            HEAL_NEEDED="PROMPT_LEAKAGE: AI prompt/XML tags found in generated header"
        fi
    fi

    # --- SELF-HEALING: Restore if validation failed ---
    if [ -n "$HEAL_NEEDED" ]; then
        echo "    [HEAL] Corruption detected: $HEAL_NEEDED"
        if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
            cp "$BACKUP_FILE" "$file"
            git add "$file"
            echo "    [HEAL] Restored original file from backup"
            record_failure "$file" "$HEAL_NEEDED"
            FILES_HEALED=$((FILES_HEALED + 1))
        else
            echo "    [warn] No backup available, file may be corrupted"
            record_failure "$file" "NO_BACKUP: $HEAL_NEEDED"
            FILES_HEALED=$((FILES_HEALED + 1))
        fi
        continue
    fi

    # Re-stage the file
    git add "$file"
    echo "    ✓ Documentation added and staged"
    record_success
    FILES_PROCESSED=$((FILES_PROCESSED + 1))
done < "$MISSING_LIST"

# --- Summary ---

rm -f "$MISSING_LIST"

if [ "$FILES_PROCESSED" -gt 0 ]; then
    echo "[Project Jumpstart] Auto-generated docs for $FILES_PROCESSED file(s)."
fi

if [ "$FILES_HEALED" -gt 0 ]; then
    echo "[Project Jumpstart] Self-healed $FILES_HEALED file(s) — originals restored."
fi

if [ "$FILES_SKIPPED" -gt 0 ]; then
    echo "[Project Jumpstart] Skipped $FILES_SKIPPED file(s) due to errors (commit will proceed)."
fi

finalize_health

exit 0
"#,
        version = HOOK_VERSION
    )
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

    #[test]
    fn test_auto_update_hook_script() {
        let script = generate_auto_update_hook_script();
        // Check it contains auto-update mode marker
        assert!(script.contains("Mode: auto-update"));
        // Check it reads API key from settings
        assert!(script.contains("project-jumpstart/settings.json"));
        assert!(script.contains("anthropic_api_key"));
        // Check it calls Anthropic API
        assert!(script.contains("api.anthropic.com"));
        // Check it stages files after generating docs
        assert!(script.contains("git add"));
        // Check model is read from settings (not hardcoded in payload)
        assert!(script.contains("claude_model"));
        // Check fallback model is present
        assert!(script.contains("claude-sonnet-4-5-latest"));
        // Check total timeout is present
        assert!(script.contains("TOTAL_TIMEOUT"));
        // Check set -e is NOT present (would cause premature exit)
        assert!(!script.contains("set -e"));
    }

    #[test]
    fn test_auto_update_hook_never_blocks() {
        let script = generate_auto_update_hook_script();
        // Scan every non-comment line for "exit 1" — there should be NONE
        for line in script.lines() {
            let trimmed = line.trim();
            // Skip comment lines and empty lines
            if trimmed.starts_with('#') || trimmed.is_empty() {
                continue;
            }
            assert!(
                !trimmed.contains("exit 1"),
                "Found 'exit 1' in non-comment line: {}",
                line
            );
        }
    }

    #[test]
    fn test_auto_update_hook_no_hardcoded_model_in_payload() {
        let script = generate_auto_update_hook_script();
        // The model should NOT be hardcoded as a jq --arg literal in the payload builder.
        // It should use the $CLAUDE_MODEL variable instead.
        // Check that there's no `--arg model "claude-sonnet-` pattern
        assert!(
            !script.contains(r#"--arg model "claude-sonnet-4-5-20250929""#),
            "Model ID should not be hardcoded in the jq payload"
        );
    }

    #[test]
    fn test_install_hooks_no_git_dir() {
        // No .git directory - should return Ok without installing (graceful skip)
        let temp = tempfile::TempDir::new().unwrap();
        let result = install_git_hooks_internal(temp.path().to_str().unwrap(), "warn", None);
        assert!(result.is_ok());
        // Hook file should not exist
        assert!(!temp.path().join(".git/hooks/pre-commit").exists());
    }

    #[test]
    fn test_install_hooks_warn_mode() {
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();

        let result = install_git_hooks_internal(temp.path().to_str().unwrap(), "warn", None);
        assert!(result.is_ok());

        let hook_path = temp.path().join(".git/hooks/pre-commit");
        assert!(hook_path.exists());

        let hook = std::fs::read_to_string(&hook_path).unwrap();
        assert!(hook.contains("Mode: warn"));
        assert!(hook.contains("exit 0")); // warn mode exits 0, not 1
    }

    #[test]
    fn test_install_hooks_block_mode() {
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();

        let result = install_git_hooks_internal(temp.path().to_str().unwrap(), "block", None);
        assert!(result.is_ok());

        let hook = std::fs::read_to_string(temp.path().join(".git/hooks/pre-commit")).unwrap();
        assert!(hook.contains("Mode: block"));
        assert!(hook.contains("exit 1")); // block mode exits 1
    }

    #[test]
    fn test_install_hooks_creates_hooks_dir() {
        let temp = tempfile::TempDir::new().unwrap();
        // Only create .git, not .git/hooks
        std::fs::create_dir(temp.path().join(".git")).unwrap();

        let result = install_git_hooks_internal(temp.path().to_str().unwrap(), "warn", None);
        assert!(result.is_ok());

        // hooks dir should be created automatically
        assert!(temp.path().join(".git/hooks").exists());
        assert!(temp.path().join(".git/hooks/pre-commit").exists());
    }

    #[test]
    fn test_install_hooks_auto_update_requires_db() {
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();

        // auto-update without db should fail
        let result = install_git_hooks_internal(temp.path().to_str().unwrap(), "auto-update", None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("requires database"));
    }

    #[test]
    fn test_parse_hook_version_with_version() {
        let content = r#"#!/bin/sh
# Project Jumpstart — Documentation Enforcement Hook
# Version: 2.0.0
# Mode: warn
"#;
        let version = parse_hook_version(content);
        assert_eq!(version, Some("2.0.0".to_string()));
    }

    #[test]
    fn test_parse_hook_version_legacy() {
        let content = r#"#!/bin/sh
# Project Jumpstart — Documentation Enforcement Hook
# Mode: warn
"#;
        let version = parse_hook_version(content);
        assert_eq!(version, Some("1.0.0".to_string())); // Legacy hooks get 1.0.0
    }

    #[test]
    fn test_parse_hook_version_external() {
        let content = r#"#!/bin/sh
# Some other hook
echo "Hello"
"#;
        let version = parse_hook_version(content);
        assert_eq!(version, None); // External hooks have no version
    }

    #[test]
    fn test_is_version_outdated() {
        assert!(is_version_outdated("1.0.0", "2.0.0"));
        assert!(is_version_outdated("1.9.9", "2.0.0"));
        assert!(is_version_outdated("2.0.0", "2.0.1"));
        assert!(!is_version_outdated("2.0.0", "2.0.0"));
        assert!(!is_version_outdated("2.0.1", "2.0.0"));
        assert!(!is_version_outdated("3.0.0", "2.0.0"));
    }

    #[test]
    fn test_hook_version_constant() {
        // Ensure version is valid semver format
        let parts: Vec<&str> = HOOK_VERSION.split('.').collect();
        assert_eq!(parts.len(), 3);
        for part in parts {
            assert!(part.parse::<u32>().is_ok());
        }
    }

    #[test]
    fn test_generated_hook_includes_version() {
        let script = generate_auto_update_hook_script();
        assert!(script.contains(&format!("# Version: {}", HOOK_VERSION)));
    }

    // --- Hook reliability tests ---

    #[test]
    fn test_warn_hook_uses_null_delimited_git_diff() {
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();
        install_git_hooks_internal(temp.path().to_str().unwrap(), "warn", None).unwrap();

        let hook = std::fs::read_to_string(temp.path().join(".git/hooks/pre-commit")).unwrap();

        // Must use -z flag for null-delimited output (handles spaces in filenames)
        assert!(
            hook.contains("git diff --cached --name-only --diff-filter=ACM -z"),
            "Warn hook must use -z flag for null-delimited output"
        );
        // Must use while IFS= read (not for...in which word-splits)
        assert!(
            hook.contains("while IFS= read -r -d '' file"),
            "Warn hook must use null-delimited read loop, not word-splitting for loop"
        );
        // Must NOT use broken for-in loop
        assert!(
            !hook.contains("for file in $(git diff"),
            "Warn hook must not use 'for file in $(...)' which breaks on spaces"
        );
    }

    #[test]
    fn test_block_hook_uses_null_delimited_git_diff() {
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();
        install_git_hooks_internal(temp.path().to_str().unwrap(), "block", None).unwrap();

        let hook = std::fs::read_to_string(temp.path().join(".git/hooks/pre-commit")).unwrap();

        assert!(
            hook.contains("git diff --cached --name-only --diff-filter=ACM -z"),
            "Block hook must use -z flag for null-delimited output"
        );
        assert!(
            hook.contains("while IFS= read -r -d '' file"),
            "Block hook must use null-delimited read loop"
        );
        assert!(
            !hook.contains("for file in $(git diff"),
            "Block hook must not use 'for file in $(...)'"
        );
    }

    #[test]
    fn test_auto_update_hook_strips_markdown_fences() {
        let script = generate_auto_update_hook_script();
        // Must strip leading/trailing markdown code fences from AI response
        assert!(
            script.contains("Strip markdown code fences"),
            "Auto-update hook must strip markdown code fences from AI response"
        );
        assert!(
            script.contains("sed") && script.contains("```"),
            "Auto-update hook must use sed to strip ``` fences"
        );
    }

    #[test]
    fn test_auto_update_hook_validates_response_size() {
        let script = generate_auto_update_hook_script();
        // Must reject oversized responses (likely full file content, not just header)
        assert!(
            script.contains("3072"),
            "Auto-update hook must check response size (3KB limit)"
        );
        assert!(
            script.contains("too large") || script.contains("not just a header"),
            "Auto-update hook must warn about oversized responses"
        );
    }

    #[test]
    fn test_auto_update_hook_validates_response_is_doc_header() {
        let script = generate_auto_update_hook_script();
        // Must verify the response actually looks like a doc header
        assert!(
            script.contains("does not look like a doc header"),
            "Auto-update hook must validate response contains @module or @description"
        );
    }

    #[test]
    fn test_auto_update_hook_uses_null_delimited_git_diff() {
        let script = generate_auto_update_hook_script();
        // Must also use -z for the file discovery loop
        assert!(
            script.contains("git diff --cached --name-only --diff-filter=ACM -z"),
            "Auto-update hook must use -z flag for null-delimited output"
        );
        assert!(
            !script.contains("for file in $(git diff"),
            "Auto-update hook must not use 'for file in $(...)'"
        );
    }

    #[test]
    fn test_warn_hook_uses_temp_file_for_counting() {
        // Piped while loops run in subshells — variables don't propagate back.
        // The hook must use a temp file to count warnings reliably.
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();
        install_git_hooks_internal(temp.path().to_str().unwrap(), "warn", None).unwrap();

        let hook = std::fs::read_to_string(temp.path().join(".git/hooks/pre-commit")).unwrap();

        assert!(
            hook.contains("mktemp"),
            "Warn hook must use temp file for counting (subshell variable scoping)"
        );
        assert!(
            hook.contains("wc -l"),
            "Warn hook must count warnings from temp file"
        );
        assert!(
            hook.contains("trap") && hook.contains("rm -f"),
            "Warn hook must clean up temp file on exit"
        );
    }

    #[test]
    fn test_warn_hook_checks_all_source_extensions() {
        let temp = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(temp.path().join(".git/hooks")).unwrap();
        install_git_hooks_internal(temp.path().to_str().unwrap(), "warn", None).unwrap();

        let hook = std::fs::read_to_string(temp.path().join(".git/hooks/pre-commit")).unwrap();

        // All supported extensions must be listed
        for ext in &["ts", "tsx", "js", "jsx", "rs", "py", "go"] {
            assert!(
                hook.contains(ext),
                "Warn hook must check .{} files",
                ext
            );
        }
    }

    #[test]
    fn test_auto_update_hook_resilience_policy() {
        let script = generate_auto_update_hook_script();
        // RESILIENCE POLICY comment must be present
        assert!(
            script.contains("RESILIENCE POLICY"),
            "Auto-update hook must document resilience policy"
        );
        // Must have per-file timeout
        assert!(
            script.contains("PER_FILE_TIMEOUT"),
            "Auto-update hook must have per-file timeout"
        );
        // Must have total timeout
        assert!(
            script.contains("TOTAL_TIMEOUT"),
            "Auto-update hook must have total timeout"
        );
        // Must have model fallback
        assert!(
            script.contains("FALLBACK_MODEL"),
            "Auto-update hook must have model fallback"
        );
        // API key must never be exposed in debug output
        assert!(
            script.contains("set +x"),
            "Auto-update hook must suppress debug output to protect API key"
        );
    }

    #[test]
    fn test_auto_update_hook_atomic_file_operations() {
        let script = generate_auto_update_hook_script();
        // Must use temp file + atomic mv (not direct write) to prevent corruption
        assert!(
            script.contains("mktemp") && script.contains("mv"),
            "Auto-update hook must use atomic temp file + mv for file updates"
        );
        // Must clean up temp files on failure
        assert!(
            script.contains("rm -f \"$TEMP_FILE\""),
            "Auto-update hook must clean up temp files on failure"
        );
    }

    // --- Self-healing tests ---

    #[test]
    fn test_hook_version_is_4() {
        assert_eq!(HOOK_VERSION, "4.0.0");
    }

    #[test]
    fn test_auto_update_hook_has_backup_and_restore() {
        let script = generate_auto_update_hook_script();
        // Must create backup directory
        assert!(
            script.contains("BACKUP_DIR"),
            "Auto-update hook must have BACKUP_DIR for file backups"
        );
        // Must create per-file backups
        assert!(
            script.contains("BACKUP_FILE"),
            "Auto-update hook must create per-file BACKUP_FILE"
        );
        // Must have restore logic
        assert!(
            script.contains("[HEAL] Restored original file from backup") || script.contains("[HEAL] restore"),
            "Auto-update hook must restore files from backup on corruption"
        );
    }

    #[test]
    fn test_auto_update_hook_has_post_modification_validation() {
        let script = generate_auto_update_hook_script();
        // Check 1: Size delta validation
        assert!(
            script.contains("SIZE_DELTA"),
            "Auto-update hook must validate SIZE_DELTA after modification"
        );
        // Check 2: Tail match
        assert!(
            script.contains("ORIG_TAIL") && script.contains("NEW_TAIL"),
            "Auto-update hook must compare ORIG_TAIL and NEW_TAIL"
        );
        // Check 3: Duplicate first line detection
        assert!(
            script.contains("DUPE_COUNT"),
            "Auto-update hook must check DUPE_COUNT for duplicate first lines"
        );
        // Check 4: Prompt leakage detection
        assert!(
            script.contains("PROMPT_LEAKAGE"),
            "Auto-update hook must check for PROMPT_LEAKAGE (AI/XML tags in header)"
        );
    }

    #[test]
    fn test_auto_update_hook_rejects_prompt_leakage() {
        let script = generate_auto_update_hook_script();
        // Pre-write check: must scan DOC_HEADER for leakage before writing
        assert!(
            script.contains("token_budget") && script.contains("tool_use"),
            "Auto-update hook must detect common prompt leakage patterns like token_budget, tool_use"
        );
        // Must check for budget tag specifically (the reported real-world case)
        assert!(
            script.contains("budget"),
            "Auto-update hook must detect budget tags (real-world prompt leakage case)"
        );
        // Must skip the file when leakage is detected (pre-write)
        assert!(
            script.contains("API response contains prompt leakage tags"),
            "Auto-update hook must skip files when prompt leakage is detected in API response"
        );
        // Post-write safety net: must also check after file modification
        assert!(
            script.contains("AI prompt/XML tags found in generated header"),
            "Auto-update hook must have post-write validation for prompt leakage"
        );
    }

    #[test]
    fn test_auto_update_hook_has_health_tracking() {
        let script = generate_auto_update_hook_script();
        // Must reference health file
        assert!(
            script.contains("HEALTH_FILE"),
            "Auto-update hook must use HEALTH_FILE for tracking"
        );
        // Must track consecutive failures
        assert!(
            script.contains("consecutive_failures"),
            "Auto-update hook must track consecutive_failures"
        );
        // Must finalize health at end
        assert!(
            script.contains("finalize_health"),
            "Auto-update hook must call finalize_health at end"
        );
    }

    #[test]
    fn test_auto_update_hook_has_downgrade_check() {
        let script = generate_auto_update_hook_script();
        // Must check if downgraded
        assert!(
            script.contains("check_downgraded"),
            "Auto-update hook must call check_downgraded"
        );
        // Must have warn-only fallback when downgraded
        assert!(
            script.contains("warn-only") || script.contains("Auto-update is disabled"),
            "Auto-update hook must have warn-only fallback when downgraded"
        );
    }

    #[test]
    fn test_auto_update_hook_still_never_blocks() {
        let script = generate_auto_update_hook_script();
        // Same check as existing test — scan every non-comment line for "exit 1"
        for line in script.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('#') || trimmed.is_empty() {
                continue;
            }
            assert!(
                !trimmed.contains("exit 1"),
                "Found 'exit 1' in non-comment line: {}",
                line
            );
        }
    }

    #[test]
    fn test_get_hook_health_no_file() {
        // parse_hook_health with empty content should return healthy defaults
        let health = parse_hook_health("").unwrap();
        assert_eq!(health.consecutive_failures, 0);
        assert_eq!(health.downgraded, false);
        assert_eq!(health.total_successes, 0);
        assert_eq!(health.total_failures, 0);
        assert!(health.last_failure_file.is_none());
        assert!(health.last_failure_reason.is_none());
    }

    #[test]
    fn test_get_hook_health_parses_file() {
        let content = "consecutive_failures=3\nlast_failure_file=src/main.ts\nlast_failure_reason=SIZE_DELTA: grew by 5000 bytes\nlast_failure_time=2026-02-22T10:00:00Z\ndowngraded=true\ndowngrade_time=2026-02-22T10:05:00Z\ntotal_successes=10\ntotal_failures=5\n";
        let health = parse_hook_health(content).unwrap();
        assert_eq!(health.consecutive_failures, 3);
        assert_eq!(health.last_failure_file, Some("src/main.ts".to_string()));
        assert_eq!(health.last_failure_reason, Some("SIZE_DELTA: grew by 5000 bytes".to_string()));
        assert_eq!(health.last_failure_time, Some("2026-02-22T10:00:00Z".to_string()));
        assert_eq!(health.downgraded, true);
        assert_eq!(health.downgrade_time, Some("2026-02-22T10:05:00Z".to_string()));
        assert_eq!(health.total_successes, 10);
        assert_eq!(health.total_failures, 5);
    }
}
