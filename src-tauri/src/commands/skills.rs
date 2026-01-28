//! @module commands/skills
//! @description Tauri IPC commands for skills management and pattern detection
//!
//! PURPOSE:
//! - List, create, update, and delete skills via IPC
//! - Detect project patterns that could become reusable skills
//! - Track skill usage analytics
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection state
//! - models::skill - Skill, Pattern data types
//! - chrono - Timestamp generation
//! - uuid - Unique ID generation
//!
//! EXPORTS:
//! - list_skills - List all skills for a project
//! - create_skill - Create a new skill
//! - update_skill - Update an existing skill
//! - delete_skill - Delete a skill by ID
//! - detect_patterns - Analyze project to suggest skills
//! - increment_skill_usage - Bump usage count for a skill
//!
//! PATTERNS:
//! - All commands use AppState for DB access
//! - Skills are scoped to a project_id (or global if None)
//! - detect_patterns analyzes project structure and tech stack
//!
//! CLAUDE NOTES:
//! - Skills reduce token usage by capturing reusable patterns
//! - Pattern detection is heuristic-based (not AI-powered yet)
//! - Timestamps use chrono::Utc::now() in RFC 3339 format

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::db::AppState;
use crate::models::skill::{Pattern, Skill};

/// List all skills for a project (or global skills if project_id is None).
#[tauri::command]
pub async fn list_skills(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Skill>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = if project_id.is_some() {
        db.prepare(
            "SELECT id, project_id, name, description, content, usage_count, created_at, updated_at
             FROM skills WHERE project_id = ?1 OR project_id IS NULL
             ORDER BY usage_count DESC, name ASC",
        )
    } else {
        db.prepare(
            "SELECT id, project_id, name, description, content, usage_count, created_at, updated_at
             FROM skills ORDER BY usage_count DESC, name ASC",
        )
    }
    .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = if let Some(ref pid) = project_id {
        stmt.query_map([pid], map_skill_row)
    } else {
        stmt.query_map([], map_skill_row)
    }
    .map_err(|e| format!("Failed to query skills: {}", e))?;

    let skills: Vec<Skill> = rows
        .filter_map(|r| r.ok())
        .collect();

    Ok(skills)
}

/// Create a new skill and persist it to the database.
#[tauri::command]
pub async fn create_skill(
    name: String,
    description: String,
    content: String,
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Skill, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    db.execute(
        "INSERT INTO skills (id, project_id, name, description, content, usage_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7)",
        rusqlite::params![id, project_id, name, description, content, now_str, now_str],
    )
    .map_err(|e| format!("Failed to insert skill: {}", e))?;

    Ok(Skill {
        id,
        name,
        description,
        content,
        project_id,
        usage_count: 0,
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing skill's name, description, and content.
#[tauri::command]
pub async fn update_skill(
    id: String,
    name: String,
    description: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Skill, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let now = Utc::now();
    let now_str = now.to_rfc3339();

    let rows_affected = db
        .execute(
            "UPDATE skills SET name = ?1, description = ?2, content = ?3, updated_at = ?4 WHERE id = ?5",
            rusqlite::params![name, description, content, now_str, id],
        )
        .map_err(|e| format!("Failed to update skill: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Skill not found: {}", id));
    }

    // Fetch the updated skill
    let skill = db
        .query_row(
            "SELECT id, project_id, name, description, content, usage_count, created_at, updated_at
             FROM skills WHERE id = ?1",
            [&id],
            map_skill_row,
        )
        .map_err(|e| format!("Failed to fetch updated skill: {}", e))?;

    Ok(skill)
}

/// Delete a skill by ID.
#[tauri::command]
pub async fn delete_skill(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let rows_affected = db
        .execute("DELETE FROM skills WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete skill: {}", e))?;

    if rows_affected == 0 {
        return Err(format!("Skill not found: {}", id));
    }

    Ok(())
}

/// Increment the usage count for a skill.
#[tauri::command]
pub async fn increment_skill_usage(
    id: String,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.execute(
        "UPDATE skills SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![Utc::now().to_rfc3339(), id],
    )
    .map_err(|e| format!("Failed to increment usage: {}", e))?;

    let count: u32 = db
        .query_row(
            "SELECT usage_count FROM skills WHERE id = ?1",
            [&id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to fetch usage count: {}", e))?;

    Ok(count)
}

/// Detect patterns in a project that could become reusable skills.
/// Analyzes project structure, tech stack, and common file patterns.
#[tauri::command]
pub async fn detect_patterns(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<Pattern>, String> {
    let path = std::path::Path::new(&project_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", project_path));
    }

    let mut patterns = Vec::new();

    // Detect tech-stack-based patterns
    detect_tech_patterns(path, &mut patterns);

    // Detect structural patterns
    detect_structural_patterns(path, &mut patterns);

    // Persist detected patterns to DB (get project_id first)
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let project_id: Option<String> = db
        .query_row(
            "SELECT id FROM projects WHERE path = ?1",
            [&project_path],
            |row| row.get(0),
        )
        .ok();

    if let Some(pid) = &project_id {
        let now_str = Utc::now().to_rfc3339();
        for pattern in &patterns {
            // Upsert: only insert if description doesn't already exist for this project
            db.execute(
                "INSERT OR IGNORE INTO patterns (id, project_id, description, frequency, suggested_skill, detected_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    pattern.id,
                    pid,
                    pattern.description,
                    pattern.frequency,
                    pattern.suggested_skill,
                    now_str,
                ],
            )
            .map_err(|e| format!("Failed to save pattern: {}", e))?;
        }
    }

    Ok(patterns)
}

// ---------------------------------------------------------------------------
// Pattern detection heuristics
// ---------------------------------------------------------------------------

fn detect_tech_patterns(path: &std::path::Path, patterns: &mut Vec<Pattern>) {
    // Check for package.json (Node.js/React patterns)
    if path.join("package.json").exists() {
        let pkg_content = std::fs::read_to_string(path.join("package.json")).unwrap_or_default();

        if pkg_content.contains("\"react\"") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "React component creation pattern".to_string(),
                frequency: 5,
                suggested_skill: Some(
                    "Create new React components following the project's conventions: \
                     functional components, TypeScript props interface, Tailwind CSS styling."
                        .to_string(),
                ),
            });
        }

        if pkg_content.contains("\"vitest\"") || pkg_content.contains("\"jest\"") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "Test file creation pattern".to_string(),
                frequency: 4,
                suggested_skill: Some(
                    "Create test files following the project's testing conventions. \
                     Use describe/it blocks, mock dependencies, and test both happy and error paths."
                        .to_string(),
                ),
            });
        }

        if pkg_content.contains("\"zustand\"") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "Zustand store creation pattern".to_string(),
                frequency: 3,
                suggested_skill: Some(
                    "Create Zustand stores following the project pattern: \
                     interface for state + actions, create() with set function, typed selectors."
                        .to_string(),
                ),
            });
        }

        if pkg_content.contains("tailwindcss") {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: "Tailwind CSS utility class patterns".to_string(),
                frequency: 3,
                suggested_skill: Some(
                    "Use Tailwind CSS utility classes for all styling. \
                     Follow the project's dark theme: neutral-950 background, neutral-800 borders, \
                     neutral-400 text."
                        .to_string(),
                ),
            });
        }
    }

    // Check for Cargo.toml (Rust patterns)
    if path.join("Cargo.toml").exists() || path.join("src-tauri/Cargo.toml").exists() {
        patterns.push(Pattern {
            id: Uuid::new_v4().to_string(),
            description: "Tauri command creation pattern".to_string(),
            frequency: 4,
            suggested_skill: Some(
                "Create Tauri commands: async fn with #[tauri::command], \
                 return Result<T, String>, use State<AppState> for DB access, \
                 register in lib.rs invoke_handler."
                    .to_string(),
            ),
        });
    }

    // Check for Python
    if path.join("requirements.txt").exists() || path.join("pyproject.toml").exists() {
        patterns.push(Pattern {
            id: Uuid::new_v4().to_string(),
            description: "Python module creation pattern".to_string(),
            frequency: 3,
            suggested_skill: Some(
                "Create Python modules with docstrings, type hints, and proper __init__.py exports."
                    .to_string(),
            ),
        });
    }
}

fn detect_structural_patterns(path: &std::path::Path, patterns: &mut Vec<Pattern>) {
    // Check for common directory structures
    let src_dir = path.join("src");
    if !src_dir.exists() {
        return;
    }

    // Components directory → component creation is frequent
    if src_dir.join("components").exists() {
        let component_count = count_files_in_dir(&src_dir.join("components"));
        if component_count > 5 {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: format!("Large component library ({} files)", component_count),
                frequency: component_count.min(10) as u32,
                suggested_skill: Some(
                    "When creating new components, follow the existing patterns: \
                     one component per file, exported as named export, \
                     props interface defined above the component."
                        .to_string(),
                ),
            });
        }
    }

    // Hooks directory → hook creation pattern
    if src_dir.join("hooks").exists() {
        let hook_count = count_files_in_dir(&src_dir.join("hooks"));
        if hook_count > 2 {
            patterns.push(Pattern {
                id: Uuid::new_v4().to_string(),
                description: format!("Custom hooks pattern ({} hooks)", hook_count),
                frequency: hook_count.min(8) as u32,
                suggested_skill: Some(
                    "Create custom React hooks following the use* naming convention. \
                     Return typed objects with state and actions. Use useCallback for memoized actions."
                        .to_string(),
                ),
            });
        }
    }

    // Check for CLAUDE.md → documentation pattern
    if path.join("CLAUDE.md").exists() {
        patterns.push(Pattern {
            id: Uuid::new_v4().to_string(),
            description: "Module documentation header pattern".to_string(),
            frequency: 5,
            suggested_skill: Some(
                "Every source file must have a documentation header with: \
                 @module, @description, PURPOSE, DEPENDENCIES, EXPORTS, PATTERNS, CLAUDE NOTES. \
                 Update the header whenever exports or dependencies change."
                    .to_string(),
            ),
        });
    }
}

fn count_files_in_dir(dir: &std::path::Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                count += 1;
            } else if path.is_dir() {
                count += count_files_in_dir(&path);
            }
        }
    }
    count
}

// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------

fn map_skill_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Skill> {
    let created_str: String = row.get(6)?;
    let updated_str: String = row.get(7)?;

    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(Skill {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        content: row.get(4)?,
        usage_count: row.get(5)?,
        created_at,
        updated_at,
    })
}
