//! @module commands/memory
//! @description Tauri IPC commands for memory management
//!
//! PURPOSE:
//! - List all memory sources (CLAUDE.md, rules, skills, auto-memory files)
//! - Parse and manage learnings from CLAUDE.local.md and the database
//! - Analyze CLAUDE.md quality and provide improvement suggestions
//! - Calculate overall memory health metrics
//! - Promote learnings from local files to shared targets
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection state
//! - models::memory - MemorySource, Learning, MemoryHealth, ClaudeMdAnalysis, etc.
//! - chrono - Timestamp generation
//! - uuid - Unique ID generation
//! - std::fs - File system operations
//!
//! EXPORTS:
//! - list_memory_sources - Scan filesystem for all memory-related files
//! - list_learnings - Parse CLAUDE.local.md and DB for learnings
//! - update_learning_status - Change a learning's status in DB
//! - analyze_claude_md - Analyze CLAUDE.md quality and suggest improvements
//! - get_memory_health - Aggregate health metrics from all memory sources
//! - promote_learning - Move a learning from local to a target file
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - File scanning uses std::fs for cross-platform compatibility
//! - Learnings are stored in both CLAUDE.local.md (file) and learnings table (DB)
//! - CLAUDE.md analysis uses heuristic scoring (no AI required)
//!
//! CLAUDE NOTES:
//! - Memory sources are discovered by scanning known paths relative to project_path
//! - Auto-memory files live under ~/.claude/projects/*/memory/
//! - Learning parsing supports the format: "- [Category] Content | topic:TOPIC | confidence:LEVEL"
//! - CLAUDE.md score: 100 if <=100 lines, -1 per line over 100 (floor 0)
//! - Self-evident phrases trigger removal suggestions
//! - Code blocks in CLAUDE.md trigger move-to-rules suggestions

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use std::fs;
use std::path::{Path, PathBuf};

use crate::db::AppState;
use crate::models::memory::{
    AnalysisSuggestion, ClaudeMdAnalysis, Learning, LineMoveTarget, LineRemovalSuggestion,
    MemoryHealth, MemorySource,
};

// ---------------------------------------------------------------------------
// Self-evident phrases that add no value to CLAUDE.md
// ---------------------------------------------------------------------------
const SELF_EVIDENT_PHRASES: &[&str] = &[
    "write clean code",
    "follow best practices",
    "use meaningful variable names",
    "add comments where necessary",
    "keep functions small",
    "don't repeat yourself",
    "write readable code",
    "handle errors properly",
    "use proper indentation",
    "follow coding standards",
    "write maintainable code",
    "use descriptive names",
];

// ---------------------------------------------------------------------------
// list_memory_sources
// ---------------------------------------------------------------------------

/// Scan the filesystem for all memory-related files associated with a project.
#[tauri::command]
pub async fn list_memory_sources(
    project_path: String,
) -> Result<Vec<MemorySource>, String> {
    let project_dir = PathBuf::from(&project_path);
    let mut sources: Vec<MemorySource> = Vec::new();

    // 1. CLAUDE.md in project root
    let claude_md_path = project_dir.join("CLAUDE.md");
    if let Some(source) = read_memory_source(&claude_md_path, "claude-md", "CLAUDE.md", "Root project memory file") {
        sources.push(source);
    }

    // 2. CLAUDE.local.md in project root
    let claude_local_path = project_dir.join("CLAUDE.local.md");
    if let Some(source) = read_memory_source(&claude_local_path, "local", "CLAUDE.local.md", "Personal learnings (gitignored)") {
        sources.push(source);
    }

    // 3. All .md files in .claude/rules/
    let rules_dir = project_dir.join(".claude").join("rules");
    if rules_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&rules_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    let name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let desc = format!("Rule file: {}", &name);
                    if let Some(source) = read_memory_source(&path, "rules", &name, &desc) {
                        sources.push(source);
                    }
                }
            }
        }
    }

    // 4. All SKILL.md files in .claude/skills/*/
    let skills_dir = project_dir.join(".claude").join("skills");
    if skills_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&skills_dir) {
            for entry in entries.flatten() {
                let skill_dir = entry.path();
                if skill_dir.is_dir() {
                    let skill_md = skill_dir.join("SKILL.md");
                    if skill_md.exists() {
                        let dir_name = skill_dir
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown");
                        let name = format!("{}/SKILL.md", dir_name);
                        let desc = format!("Skill definition: {}", dir_name);
                        if let Some(source) = read_memory_source(&skill_md, "skills", &name, &desc) {
                            sources.push(source);
                        }
                    }
                }
            }
        }
    }

    // 5. Auto-memory files in ~/.claude/projects/*/memory/
    if let Some(home) = dirs::home_dir() {
        let claude_projects_dir = home.join(".claude").join("projects");
        if claude_projects_dir.is_dir() {
            if let Ok(project_entries) = fs::read_dir(&claude_projects_dir) {
                for project_entry in project_entries.flatten() {
                    let memory_dir = project_entry.path().join("memory");
                    if memory_dir.is_dir() {
                        if let Ok(mem_entries) = fs::read_dir(&memory_dir) {
                            for mem_entry in mem_entries.flatten() {
                                let mem_path = mem_entry.path();
                                if mem_path.extension().and_then(|e| e.to_str()) == Some("md") {
                                    let project_dir_name = project_entry
                                        .path()
                                        .file_name()
                                        .and_then(|n| n.to_str())
                                        .unwrap_or("unknown")
                                        .to_string();
                                    let file_name = mem_path
                                        .file_name()
                                        .and_then(|n| n.to_str())
                                        .unwrap_or("unknown")
                                        .to_string();
                                    let name = format!("{}/{}", project_dir_name, file_name);
                                    let desc = format!("Auto-memory: {}", &name);
                                    if let Some(source) =
                                        read_memory_source(&mem_path, "auto-memory", &name, &desc)
                                    {
                                        sources.push(source);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(sources)
}

/// Helper: read file metadata and create a MemorySource.
fn read_memory_source(
    path: &Path,
    source_type: &str,
    name: &str,
    description: &str,
) -> Option<MemorySource> {
    if !path.exists() {
        return None;
    }

    let metadata = fs::metadata(path).ok()?;
    let content = fs::read_to_string(path).ok()?;
    let line_count = content.lines().count() as u32;
    let size_bytes = metadata.len();
    let last_modified = metadata
        .modified()
        .ok()
        .map(|t| {
            let datetime: chrono::DateTime<Utc> = t.into();
            datetime.to_rfc3339()
        })
        .unwrap_or_default();

    Some(MemorySource {
        path: path.to_string_lossy().to_string(),
        source_type: source_type.to_string(),
        name: name.to_string(),
        line_count,
        size_bytes,
        last_modified,
        description: description.to_string(),
    })
}

// ---------------------------------------------------------------------------
// list_learnings
// ---------------------------------------------------------------------------

/// Parse CLAUDE.local.md to extract learnings and merge with DB entries.
#[tauri::command]
pub async fn list_learnings(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<Learning>, String> {
    let mut learnings: Vec<Learning> = Vec::new();

    // 1. Parse CLAUDE.local.md
    let local_md_path = PathBuf::from(&project_path).join("CLAUDE.local.md");
    if local_md_path.exists() {
        if let Ok(content) = fs::read_to_string(&local_md_path) {
            let file_learnings = parse_local_md_learnings(&content, &local_md_path);
            learnings.extend(file_learnings);
        }
    }

    // 2. Load from database
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Check if the learnings table exists (it may not in older databases)
    let table_exists: bool = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learnings'")
        .and_then(|mut stmt| {
            stmt.query_row([], |_| Ok(true))
        })
        .unwrap_or(false);

    if table_exists {
        let mut stmt = db
            .prepare(
                "SELECT id, session_id, category, content, topic, confidence, status, source_file,
                        created_at, updated_at
                 FROM learnings
                 ORDER BY created_at DESC",
            )
            .map_err(|e| format!("Failed to prepare learnings query: {}", e))?;

        let db_learnings = stmt
            .query_map([], |row| {
                Ok(Learning {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    category: row.get(2)?,
                    content: row.get(3)?,
                    topic: row.get(4)?,
                    confidence: row.get(5)?,
                    status: row.get(6)?,
                    source_file: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .map_err(|e| format!("Failed to query learnings: {}", e))?;

        for learning in db_learnings.flatten() {
            // Avoid duplicates by checking if we already have this content from the file
            let already_exists = learnings.iter().any(|l| l.content == learning.content);
            if !already_exists {
                learnings.push(learning);
            }
        }
    }

    Ok(learnings)
}

/// Parse the CLAUDE.local.md format to extract individual learnings.
///
/// Expected format:
/// ```text
/// ## Session ABC123 (2026-02-16 10:30)
///
/// - [Category] Content text | topic:TOPIC | confidence:LEVEL
/// ```
fn parse_local_md_learnings(content: &str, source_path: &Path) -> Vec<Learning> {
    let mut learnings: Vec<Learning> = Vec::new();
    let mut current_session_id = String::new();
    let mut current_date = String::new();
    let source_file = source_path.to_string_lossy().to_string();

    for line in content.lines() {
        let trimmed = line.trim();

        // Detect session header: ## Session ABC123 (2026-02-16 10:30)
        if let Some(rest) = trimmed.strip_prefix("## Session ") {
            // Extract session ID and date
            if let Some(paren_start) = rest.find('(') {
                current_session_id = rest[..paren_start].trim().to_string();
                let date_part = &rest[paren_start + 1..];
                if let Some(paren_end) = date_part.find(')') {
                    current_date = date_part[..paren_end].trim().to_string();
                }
            } else {
                current_session_id = rest.trim().to_string();
            }
            continue;
        }

        // Detect learning line: - [Category] Content | topic:TOPIC | confidence:LEVEL
        if trimmed.starts_with("- [") {
            if let Some(close_bracket) = trimmed.find(']') {
                let category = trimmed[3..close_bracket].to_string();
                let rest = trimmed[close_bracket + 1..].trim();

                // Split on | to extract metadata
                let parts: Vec<&str> = rest.split('|').collect();
                let content_text = parts[0].trim().to_string();

                let mut topic: Option<String> = None;
                let mut confidence = "medium".to_string();

                for part in parts.iter().skip(1) {
                    let kv = part.trim();
                    if let Some(t) = kv.strip_prefix("topic:") {
                        topic = Some(t.trim().to_string());
                    } else if let Some(c) = kv.strip_prefix("confidence:") {
                        confidence = c.trim().to_string();
                    }
                }

                let now = Utc::now().to_rfc3339();
                let created = if current_date.is_empty() {
                    now.clone()
                } else {
                    current_date.clone()
                };

                learnings.push(Learning {
                    id: Uuid::new_v4().to_string(),
                    session_id: current_session_id.clone(),
                    category,
                    content: content_text,
                    topic,
                    confidence,
                    status: "active".to_string(),
                    source_file: source_file.clone(),
                    created_at: created,
                    updated_at: now,
                });
            }
        }
    }

    learnings
}

// ---------------------------------------------------------------------------
// update_learning_status
// ---------------------------------------------------------------------------

/// Update a learning's status in the database.
#[tauri::command]
pub async fn update_learning_status(
    id: String,
    status: String,
    state: State<'_, AppState>,
) -> Result<Learning, String> {
    // Validate status
    let valid_statuses = ["active", "verified", "deprecated", "archived"];
    if !valid_statuses.contains(&status.as_str()) {
        return Err(format!(
            "Invalid status '{}'. Must be one of: {}",
            status,
            valid_statuses.join(", ")
        ));
    }

    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let now = Utc::now().to_rfc3339();

    let rows_affected = db
        .execute(
            "UPDATE learnings SET status = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![status, now, id],
        )
        .map_err(|e| format!("Failed to update learning status: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Learning not found: {}", id));
    }

    let learning = db
        .query_row(
            "SELECT id, session_id, category, content, topic, confidence, status, source_file,
                    created_at, updated_at
             FROM learnings WHERE id = ?1",
            [&id],
            |row| {
                Ok(Learning {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    category: row.get(2)?,
                    content: row.get(3)?,
                    topic: row.get(4)?,
                    confidence: row.get(5)?,
                    status: row.get(6)?,
                    source_file: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| format!("Failed to fetch updated learning: {}", e))?;

    Ok(learning)
}

// ---------------------------------------------------------------------------
// analyze_claude_md
// ---------------------------------------------------------------------------

/// Analyze CLAUDE.md and return quality score, sections, and improvement suggestions.
#[tauri::command]
pub async fn analyze_claude_md(
    project_path: String,
) -> Result<ClaudeMdAnalysis, String> {
    let claude_md_path = PathBuf::from(&project_path).join("CLAUDE.md");

    if !claude_md_path.exists() {
        return Ok(ClaudeMdAnalysis {
            total_lines: 0,
            estimated_tokens: 0,
            score: 0,
            sections: vec![],
            suggestions: vec![AnalysisSuggestion {
                suggestion_type: "add".to_string(),
                message: "No CLAUDE.md found. Create one to establish project memory.".to_string(),
                line_range: None,
                target: None,
            }],
            lines_to_remove: vec![],
            lines_to_move: vec![],
        });
    }

    let content = fs::read_to_string(&claude_md_path)
        .map_err(|e| format!("Failed to read CLAUDE.md: {}", e))?;

    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len() as u32;

    // Estimate tokens (~4 chars per token)
    let estimated_tokens = (content.len() as u32) / 4;

    // Score: 100 if <=100 lines, -1 per line over 100 (floor 0)
    let score = if total_lines <= 100 {
        100
    } else {
        let penalty = total_lines - 100;
        100u32.saturating_sub(penalty)
    };

    // Detect sections (## headings)
    let sections: Vec<String> = lines
        .iter()
        .filter(|line| line.starts_with("## "))
        .map(|line| line.trim_start_matches("## ").trim().to_string())
        .collect();

    let mut suggestions: Vec<AnalysisSuggestion> = Vec::new();
    let mut lines_to_remove: Vec<LineRemovalSuggestion> = Vec::new();
    let mut lines_to_move: Vec<LineMoveTarget> = Vec::new();

    // Check for self-evident phrases
    for (i, line) in lines.iter().enumerate() {
        let lower = line.to_lowercase();
        for phrase in SELF_EVIDENT_PHRASES {
            if lower.contains(phrase) {
                lines_to_remove.push(LineRemovalSuggestion {
                    line_number: (i + 1) as u32,
                    content: line.to_string(),
                    reason: format!(
                        "Self-evident: '{}' is a general best practice that doesn't need to be stated",
                        phrase
                    ),
                });
                break;
            }
        }
    }

    if !lines_to_remove.is_empty() {
        suggestions.push(AnalysisSuggestion {
            suggestion_type: "remove".to_string(),
            message: format!(
                "Found {} lines with self-evident advice that can be removed",
                lines_to_remove.len()
            ),
            line_range: None,
            target: None,
        });
    }

    // Detect code blocks and suggest moving to rules files
    let mut in_code_block = false;
    let mut code_block_start: u32 = 0;
    let mut code_block_count: u32 = 0;

    for (i, line) in lines.iter().enumerate() {
        if line.starts_with("```") {
            if in_code_block {
                // End of code block
                let line_num = (i + 1) as u32;
                let preview = lines[code_block_start as usize..=i]
                    .iter()
                    .take(3)
                    .copied()
                    .collect::<Vec<&str>>()
                    .join("\n");
                lines_to_move.push(LineMoveTarget {
                    line_range: (code_block_start + 1, line_num),
                    content_preview: preview,
                    target_file: ".claude/rules/".to_string(),
                    reason: "Code examples are better placed in rules files where they serve as reference without inflating CLAUDE.md".to_string(),
                });
                code_block_count += 1;
                in_code_block = false;
            } else {
                // Start of code block
                code_block_start = i as u32;
                in_code_block = true;
            }
        }
    }

    if code_block_count > 0 {
        suggestions.push(AnalysisSuggestion {
            suggestion_type: "move".to_string(),
            message: format!(
                "Found {} code block(s) that could be moved to .claude/rules/ files",
                code_block_count
            ),
            line_range: None,
            target: Some(".claude/rules/".to_string()),
        });
    }

    // Suggest shortening if CLAUDE.md is too long
    if total_lines > 150 {
        suggestions.push(AnalysisSuggestion {
            suggestion_type: "shorten".to_string(),
            message: format!(
                "CLAUDE.md is {} lines (target: <150). Consider moving detailed sections to rules files or skills.",
                total_lines
            ),
            line_range: None,
            target: None,
        });
    }

    // Suggest adding sections if they're missing
    let has_overview = sections.iter().any(|s| {
        let lower = s.to_lowercase();
        lower.contains("overview") || lower.contains("about")
    });
    if !has_overview && total_lines > 0 {
        suggestions.push(AnalysisSuggestion {
            suggestion_type: "add".to_string(),
            message: "Consider adding an '## Overview' section to summarize the project".to_string(),
            line_range: None,
            target: None,
        });
    }

    let has_commands = sections.iter().any(|s| {
        let lower = s.to_lowercase();
        lower.contains("command") || lower.contains("script") || lower.contains("run")
    });
    if !has_commands && total_lines > 0 {
        suggestions.push(AnalysisSuggestion {
            suggestion_type: "add".to_string(),
            message: "Consider adding a '## Commands' section with common dev commands".to_string(),
            line_range: None,
            target: None,
        });
    }

    Ok(ClaudeMdAnalysis {
        total_lines,
        estimated_tokens,
        score,
        sections,
        suggestions,
        lines_to_remove,
        lines_to_move,
    })
}

// ---------------------------------------------------------------------------
// get_memory_health
// ---------------------------------------------------------------------------

/// Calculate overall memory health from all sources.
#[tauri::command]
pub async fn get_memory_health(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<MemoryHealth, String> {
    let project_dir = PathBuf::from(&project_path);

    // Count CLAUDE.md lines
    let claude_md_path = project_dir.join("CLAUDE.md");
    let (claude_md_lines, claude_md_chars) = if claude_md_path.exists() {
        let content = fs::read_to_string(&claude_md_path).unwrap_or_default();
        (content.lines().count() as u32, content.len() as u32)
    } else {
        (0u32, 0u32)
    };

    // Score CLAUDE.md (same as analyze_claude_md)
    let claude_md_score = if claude_md_lines == 0 {
        0
    } else if claude_md_lines <= 100 {
        100
    } else {
        let penalty = claude_md_lines - 100;
        100u32.saturating_sub(penalty)
    };

    // Count rules files
    let rules_dir = project_dir.join(".claude").join("rules");
    let rules_file_count = if rules_dir.is_dir() {
        fs::read_dir(&rules_dir)
            .map(|entries| {
                entries
                    .flatten()
                    .filter(|e| {
                        e.path().extension().and_then(|ext| ext.to_str()) == Some("md")
                    })
                    .count() as u32
            })
            .unwrap_or(0)
    } else {
        0
    };

    // Count skills from DB
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let skills_count: u32 = db
        .query_row("SELECT COUNT(*) FROM skills", [], |row| row.get(0))
        .unwrap_or(0);

    // Count learnings from DB
    let table_exists: bool = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learnings'")
        .and_then(|mut stmt| stmt.query_row([], |_| Ok(true)))
        .unwrap_or(false);

    let (total_learnings, active_learnings) = if table_exists {
        let total: u32 = db
            .query_row("SELECT COUNT(*) FROM learnings", [], |row| row.get(0))
            .unwrap_or(0);
        let active: u32 = db
            .query_row(
                "SELECT COUNT(*) FROM learnings WHERE status = 'active'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        (total, active)
    } else {
        // Also parse from CLAUDE.local.md as fallback
        let local_md_path = project_dir.join("CLAUDE.local.md");
        if local_md_path.exists() {
            if let Ok(content) = fs::read_to_string(&local_md_path) {
                let learnings = parse_local_md_learnings(&content, &local_md_path);
                let count = learnings.len() as u32;
                (count, count)
            } else {
                (0, 0)
            }
        } else {
            (0, 0)
        }
    };

    // Count all sources (reuse the scan logic, but lightweight)
    let mut total_sources: u32 = 0;
    let mut total_lines: u32 = 0;

    if claude_md_path.exists() {
        total_sources += 1;
        total_lines += claude_md_lines;
    }

    let local_md_path = project_dir.join("CLAUDE.local.md");
    if local_md_path.exists() {
        total_sources += 1;
        if let Ok(content) = fs::read_to_string(&local_md_path) {
            total_lines += content.lines().count() as u32;
        }
    }

    total_sources += rules_file_count;
    // Read lines from rules files
    if rules_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&rules_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        total_lines += content.lines().count() as u32;
                    }
                }
            }
        }
    }

    // Estimate total token usage (~4 chars per token for all files)
    let mut total_chars = claude_md_chars;
    if local_md_path.exists() {
        if let Ok(content) = fs::read_to_string(&local_md_path) {
            total_chars += content.len() as u32;
        }
    }
    if rules_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&rules_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        total_chars += content.len() as u32;
                    }
                }
            }
        }
    }
    let estimated_token_usage = total_chars / 4;

    // Calculate health rating
    let health_rating = calculate_health_rating(
        claude_md_lines,
        claude_md_score,
        rules_file_count,
        total_learnings,
        active_learnings,
        skills_count,
    );

    Ok(MemoryHealth {
        total_sources,
        total_lines,
        total_learnings,
        active_learnings,
        claude_md_lines,
        claude_md_score,
        rules_file_count,
        skills_count,
        estimated_token_usage,
        health_rating,
    })
}

/// Calculate the health rating string based on memory metrics.
fn calculate_health_rating(
    claude_md_lines: u32,
    claude_md_score: u32,
    rules_file_count: u32,
    total_learnings: u32,
    active_learnings: u32,
    skills_count: u32,
) -> String {
    let mut points: u32 = 0;

    // CLAUDE.md quality (0-30 points)
    if claude_md_lines > 0 {
        points += (claude_md_score * 30) / 100;
    }

    // Modular rules (0-25 points)
    // More rules files = better organization
    points += std::cmp::min(rules_file_count * 5, 25);

    // Learnings activity (0-25 points)
    if total_learnings > 0 {
        let active_ratio = if total_learnings > 0 {
            (active_learnings * 100) / total_learnings
        } else {
            0
        };
        // Points for having learnings (up to 15) + active ratio (up to 10)
        points += std::cmp::min(total_learnings * 3, 15);
        points += (active_ratio * 10) / 100;
    }

    // Skills defined (0-20 points)
    points += std::cmp::min(skills_count * 4, 20);

    match points {
        80..=u32::MAX => "excellent".to_string(),
        60..=79 => "good".to_string(),
        30..=59 => "needs-attention".to_string(),
        _ => "poor".to_string(),
    }
}

// ---------------------------------------------------------------------------
// promote_learning
// ---------------------------------------------------------------------------

/// Move a learning from CLAUDE.local.md into a target file and mark as verified in DB.
#[tauri::command]
pub async fn promote_learning(
    id: String,
    target: String,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Check if the learnings table exists
    let table_exists: bool = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learnings'")
        .and_then(|mut stmt| stmt.query_row([], |_| Ok(true)))
        .unwrap_or(false);

    // Try to find the learning in DB
    let learning_content: Option<String> = if table_exists {
        db.query_row(
            "SELECT content FROM learnings WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .ok()
    } else {
        None
    };

    let content_to_promote = if let Some(content) = learning_content {
        content
    } else {
        return Err(format!(
            "Learning not found in database: {}. It may only exist in CLAUDE.local.md file.",
            id
        ));
    };

    // Resolve target path
    let target_path = if target.starts_with('/') || target.starts_with('\\') {
        PathBuf::from(&target)
    } else {
        PathBuf::from(&project_path).join(&target)
    };

    // Ensure parent directory exists
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory for target: {}", e))?;
    }

    // Append to target file
    let existing_content = if target_path.exists() {
        fs::read_to_string(&target_path)
            .map_err(|e| format!("Failed to read target file: {}", e))?
    } else {
        String::new()
    };

    let new_content = if existing_content.is_empty() {
        format!("- {}\n", content_to_promote)
    } else if existing_content.ends_with('\n') {
        format!("{}- {}\n", existing_content, content_to_promote)
    } else {
        format!("{}\n- {}\n", existing_content, content_to_promote)
    };

    fs::write(&target_path, new_content)
        .map_err(|e| format!("Failed to write to target file: {}", e))?;

    // Mark as verified in DB
    if table_exists {
        let now = Utc::now().to_rfc3339();
        let _ = db.execute(
            "UPDATE learnings SET status = 'verified', updated_at = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        );
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// append_to_project_file
// ---------------------------------------------------------------------------

/// Append content to a file relative to the project root (creating it if needed).
/// Used by the "Move" action in CLAUDE.md analysis to relocate lines to rules files.
#[tauri::command]
pub async fn append_to_project_file(
    project_path: String,
    relative_path: String,
    content: String,
) -> Result<(), String> {
    let target = PathBuf::from(&project_path).join(&relative_path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&target)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    use std::io::Write;
    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write: {}", e))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_local_md_learnings_basic() {
        let content = r#"# Session Learnings

## Session ABC123 (2026-02-16 10:30)

- [Pattern] Always use pnpm not npm | topic:tools | confidence:high
- [Gotcha] Tauri commands must be async | topic:project | confidence:medium
"#;
        let path = PathBuf::from("/test/CLAUDE.local.md");
        let learnings = parse_local_md_learnings(content, &path);

        assert_eq!(learnings.len(), 2);

        assert_eq!(learnings[0].category, "Pattern");
        assert_eq!(learnings[0].content, "Always use pnpm not npm");
        assert_eq!(learnings[0].topic, Some("tools".to_string()));
        assert_eq!(learnings[0].confidence, "high");
        assert_eq!(learnings[0].session_id, "ABC123");
        assert_eq!(learnings[0].status, "active");

        assert_eq!(learnings[1].category, "Gotcha");
        assert_eq!(learnings[1].content, "Tauri commands must be async");
        assert_eq!(learnings[1].topic, Some("project".to_string()));
        assert_eq!(learnings[1].confidence, "medium");
    }

    #[test]
    fn test_parse_local_md_learnings_no_metadata() {
        let content = r#"## Session XYZ789 (2026-02-17 14:00)

- [Solution] Fixed the build by updating deps
"#;
        let path = PathBuf::from("/test/CLAUDE.local.md");
        let learnings = parse_local_md_learnings(content, &path);

        assert_eq!(learnings.len(), 1);
        assert_eq!(learnings[0].category, "Solution");
        assert_eq!(learnings[0].content, "Fixed the build by updating deps");
        assert_eq!(learnings[0].topic, None);
        assert_eq!(learnings[0].confidence, "medium");
    }

    #[test]
    fn test_parse_local_md_learnings_empty() {
        let content = "# Session Learnings\n\nNo learnings yet.\n";
        let path = PathBuf::from("/test/CLAUDE.local.md");
        let learnings = parse_local_md_learnings(content, &path);
        assert_eq!(learnings.len(), 0);
    }

    #[test]
    fn test_parse_local_md_learnings_multiple_sessions() {
        let content = r#"## Session S1 (2026-01-01 09:00)

- [Preference] Dark mode preferred | topic:workflow | confidence:high

## Session S2 (2026-01-02 10:00)

- [Pattern] Use zustand for state | topic:patterns | confidence:high
- [Gotcha] Vitest mocks must be top level | topic:debugging | confidence:medium
"#;
        let path = PathBuf::from("/test/CLAUDE.local.md");
        let learnings = parse_local_md_learnings(content, &path);

        assert_eq!(learnings.len(), 3);
        assert_eq!(learnings[0].session_id, "S1");
        assert_eq!(learnings[1].session_id, "S2");
        assert_eq!(learnings[2].session_id, "S2");
    }

    #[test]
    fn test_calculate_health_rating_excellent() {
        let rating = calculate_health_rating(80, 100, 5, 10, 8, 5);
        assert_eq!(rating, "excellent");
    }

    #[test]
    fn test_calculate_health_rating_good() {
        let rating = calculate_health_rating(120, 80, 3, 5, 4, 3);
        assert_eq!(rating, "good");
    }

    #[test]
    fn test_calculate_health_rating_needs_attention() {
        // claude_md_score=50 => 15 pts, rules=2 => 10 pts, learnings 3/3 => 9+10=19 pts, skills=0 => 0
        // total = 15 + 10 + 19 + 0 = 44 => needs-attention (30-59)
        let rating = calculate_health_rating(150, 50, 2, 3, 3, 0);
        assert_eq!(rating, "needs-attention");
    }

    #[test]
    fn test_calculate_health_rating_poor() {
        let rating = calculate_health_rating(0, 0, 0, 0, 0, 0);
        assert_eq!(rating, "poor");
    }

    #[test]
    fn test_self_evident_phrases_detection() {
        let content = "## Rules\n\n- Always write clean code\n- Use pnpm for packages\n- Follow best practices always\n";
        let lines: Vec<&str> = content.lines().collect();
        let mut found = Vec::new();

        for (i, line) in lines.iter().enumerate() {
            let lower = line.to_lowercase();
            for phrase in SELF_EVIDENT_PHRASES {
                if lower.contains(phrase) {
                    found.push((i + 1, phrase.to_string()));
                    break;
                }
            }
        }

        assert_eq!(found.len(), 2);
        assert_eq!(found[0].1, "write clean code");
        assert_eq!(found[1].1, "follow best practices");
    }

    #[test]
    fn test_claude_md_score_under_100_lines() {
        let total_lines: u32 = 50;
        let score = if total_lines <= 100 {
            100
        } else {
            let penalty = total_lines - 100;
            if penalty >= 100 { 0 } else { 100 - penalty }
        };
        assert_eq!(score, 100);
    }

    #[test]
    fn test_claude_md_score_at_100_lines() {
        let total_lines: u32 = 100;
        let score = if total_lines <= 100 {
            100
        } else {
            let penalty = total_lines - 100;
            if penalty >= 100 { 0 } else { 100 - penalty }
        };
        assert_eq!(score, 100);
    }

    #[test]
    fn test_claude_md_score_150_lines() {
        let total_lines: u32 = 150;
        let score = if total_lines <= 100 {
            100
        } else {
            let penalty = total_lines - 100;
            if penalty >= 100 { 0 } else { 100 - penalty }
        };
        assert_eq!(score, 50);
    }

    #[test]
    fn test_claude_md_score_200_plus_lines() {
        let total_lines: u32 = 250;
        let score = if total_lines <= 100 {
            100
        } else {
            let penalty = total_lines - 100;
            if penalty >= 100 { 0 } else { 100 - penalty }
        };
        assert_eq!(score, 0);
    }

    #[test]
    fn test_read_memory_source_nonexistent() {
        let path = PathBuf::from("/nonexistent/file.md");
        let result = read_memory_source(&path, "test", "test.md", "test");
        assert!(result.is_none());
    }

    #[test]
    fn test_append_to_project_file_creates_and_appends() {
        let dir = tempfile::tempdir().unwrap();
        let project_path = dir.path().to_string_lossy().to_string();
        let relative = "subdir/appended.md";
        let target = dir.path().join(relative);

        // File doesn't exist yet
        assert!(!target.exists());

        // First write creates the file
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(append_to_project_file(
            project_path.clone(),
            relative.to_string(),
            "line1\n".to_string(),
        ))
        .unwrap();
        assert!(target.exists());
        assert_eq!(fs::read_to_string(&target).unwrap(), "line1\n");

        // Second write appends
        rt.block_on(append_to_project_file(
            project_path,
            relative.to_string(),
            "line2\n".to_string(),
        ))
        .unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "line1\nline2\n");
    }

    #[test]
    fn test_read_memory_source_existing() {
        let dir = tempfile::tempdir().unwrap();
        let file_path = dir.path().join("test.md");
        fs::write(&file_path, "line 1\nline 2\nline 3\n").unwrap();

        let result = read_memory_source(&file_path, "rules", "test.md", "A test file");
        assert!(result.is_some());

        let source = result.unwrap();
        assert_eq!(source.source_type, "rules");
        assert_eq!(source.name, "test.md");
        assert_eq!(source.line_count, 3);
        assert_eq!(source.description, "A test file");
        assert!(source.size_bytes > 0);
        assert!(!source.last_modified.is_empty());
    }
}
