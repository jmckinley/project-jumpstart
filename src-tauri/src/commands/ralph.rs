//! @module commands/ralph
//! @description Tauri IPC commands for RALPH loop management and prompt analysis
//!
//! PURPOSE:
//! - Analyze prompt quality for RALPH loops (clarity, specificity, context, scope)
//! - Start and pause RALPH loops with DB persistence
//! - List loop history for the active project
//! - Provide auto-enhanced prompts based on quality analysis
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for loop persistence
//! - models::ralph - RalphLoop, PromptAnalysis, PromptCriterion types
//! - uuid - Loop ID generation
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - analyze_ralph_prompt - Score prompt quality and generate suggestions
//! - start_ralph_loop - Create a new RALPH loop record
//! - pause_ralph_loop - Pause an active loop
//! - list_ralph_loops - Get loops for a project
//!
//! PATTERNS:
//! - analyze_ralph_prompt evaluates prompt quality before starting a loop
//! - start_ralph_loop stores the loop in the DB with "running" status
//! - pause_ralph_loop transitions "running" to "paused"
//! - Loop statuses: idle -> running -> paused/completed/failed
//!
//! CLAUDE NOTES:
//! - RALPH = Review, Analyze, List, Plan, Handoff
//! - Quality score is sum of 4 criteria (clarity, specificity, context, scope), each 0-25
//! - Auto-enhance prepends structured RALPH instructions to the prompt
//! - Safety settings control loop boundaries

use chrono::Utc;
use tauri::State;

use crate::db::{self, AppState};
use crate::models::ralph::{PromptAnalysis, PromptCriterion, RalphLoop};

/// Analyze a prompt's quality for use in a RALPH loop.
/// Scores clarity, specificity, context, and scope (0-25 each, 0-100 total).
/// Returns suggestions for improvement and an optional auto-enhanced version.
#[tauri::command]
pub async fn analyze_ralph_prompt(prompt: String) -> Result<PromptAnalysis, String> {
    let clarity = score_clarity(&prompt);
    let specificity = score_specificity(&prompt);
    let context = score_context(&prompt);
    let scope = score_scope(&prompt);

    let quality_score = clarity.score + specificity.score + context.score + scope.score;

    let mut suggestions = Vec::new();

    if clarity.score < 15 {
        suggestions.push("Add clearer action verbs (e.g., 'implement', 'fix', 'refactor', 'add').".to_string());
    }
    if specificity.score < 15 {
        suggestions.push("Mention specific files, functions, or components to modify.".to_string());
    }
    if context.score < 15 {
        suggestions.push("Include context about the current state and why this change is needed.".to_string());
    }
    if scope.score < 15 {
        suggestions.push("Define clear boundaries — what should and should NOT be changed.".to_string());
    }

    let enhanced_prompt = if quality_score < 70 {
        Some(generate_enhanced_prompt(&prompt))
    } else {
        None
    };

    Ok(PromptAnalysis {
        quality_score,
        criteria: vec![clarity, specificity, context, scope],
        suggestions,
        enhanced_prompt,
    })
}

/// Start a new RALPH loop for a project.
/// Creates a loop record in the DB with "running" status.
#[tauri::command]
pub async fn start_ralph_loop(
    project_id: String,
    prompt: String,
    enhanced_prompt: Option<String>,
    quality_score: u32,
    state: State<'_, AppState>,
) -> Result<RalphLoop, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO ralph_loops (id, project_id, prompt, enhanced_prompt, status, quality_score, iterations, outcome, started_at, created_at) VALUES (?1, ?2, ?3, ?4, 'running', ?5, 0, NULL, ?6, ?6)",
        rusqlite::params![id, project_id, prompt, enhanced_prompt, quality_score, now],
    )
    .map_err(|e| format!("Failed to create RALPH loop: {}", e))?;

    // Log activity
    let _ = db::log_activity_db(&db, &project_id, "generate", "Started RALPH loop");

    Ok(RalphLoop {
        id,
        project_id,
        prompt,
        enhanced_prompt,
        status: "running".to_string(),
        quality_score,
        iterations: 0,
        outcome: None,
        started_at: Some(now.clone()),
        paused_at: None,
        completed_at: None,
        created_at: now,
    })
}

/// Pause an active RALPH loop by ID.
/// Transitions status from "running" to "paused".
#[tauri::command]
pub async fn pause_ralph_loop(
    loop_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let now = Utc::now().to_rfc3339();

    let rows_updated = db
        .execute(
            "UPDATE ralph_loops SET status = 'paused', paused_at = ?1 WHERE id = ?2 AND status = 'running'",
            rusqlite::params![now, loop_id],
        )
        .map_err(|e| format!("Failed to pause RALPH loop: {}", e))?;

    if rows_updated == 0 {
        return Err("Loop not found or not currently running.".to_string());
    }

    Ok(())
}

/// List all RALPH loops for a project, ordered by creation time (newest first).
#[tauri::command]
pub async fn list_ralph_loops(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<RalphLoop>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, prompt, enhanced_prompt, status, quality_score, iterations, outcome, started_at, paused_at, completed_at, created_at FROM ralph_loops WHERE project_id = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to query loops: {}", e))?;

    let loops = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(RalphLoop {
                id: row.get(0)?,
                project_id: row.get(1)?,
                prompt: row.get(2)?,
                enhanced_prompt: row.get(3)?,
                status: row.get(4)?,
                quality_score: row.get(5)?,
                iterations: row.get(6)?,
                outcome: row.get(7)?,
                started_at: row.get(8)?,
                paused_at: row.get(9)?,
                completed_at: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| format!("Failed to read loops: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(loops)
}

// --- Scoring Heuristics ---

/// Score prompt clarity (0-25).
/// Looks for action verbs, sentence structure, and absence of ambiguity.
fn score_clarity(prompt: &str) -> PromptCriterion {
    let mut score: u32 = 0;
    let lower = prompt.to_lowercase();

    // Has action verbs
    let action_verbs = [
        "implement", "add", "create", "fix", "update", "refactor", "remove", "delete",
        "change", "modify", "build", "write", "test", "move", "rename", "extract",
        "optimize", "improve", "migrate", "convert", "replace",
    ];
    let verb_count = action_verbs.iter().filter(|v| lower.contains(**v)).count();
    if verb_count >= 2 {
        score += 10;
    } else if verb_count >= 1 {
        score += 7;
    } else {
        score += 2;
    }

    // Reasonable length (not too short or vague)
    if prompt.len() > 100 {
        score += 8;
    } else if prompt.len() > 40 {
        score += 5;
    } else {
        score += 2;
    }

    // Has sentence structure (periods, line breaks, numbered items)
    let has_structure = prompt.contains('.') || prompt.contains('\n') || prompt.contains("1.");
    if has_structure {
        score += 7;
    } else {
        score += 2;
    }

    PromptCriterion {
        name: "Clarity".to_string(),
        score: score.min(25),
        max_score: 25,
        feedback: if score >= 20 {
            "Prompt is clear and well-structured.".to_string()
        } else if score >= 12 {
            "Prompt could be clearer. Consider adding action verbs and more detail.".to_string()
        } else {
            "Prompt is vague. Start with a clear action verb and describe the desired outcome.".to_string()
        },
    }
}

/// Score prompt specificity (0-25).
/// Looks for file paths, function names, and technical references.
fn score_specificity(prompt: &str) -> PromptCriterion {
    let mut score: u32 = 0;

    // Contains file paths or extensions
    let has_paths = prompt.contains('/') || prompt.contains(".ts") || prompt.contains(".rs")
        || prompt.contains(".tsx") || prompt.contains(".py") || prompt.contains(".js");
    if has_paths {
        score += 10;
    }

    // Contains function/component/type names (CamelCase or snake_case)
    let has_identifiers = prompt.chars().any(|c| c == '_')
        || prompt.split_whitespace().any(|word| {
            word.len() > 2
                && word.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
                && word.chars().any(|c| c.is_lowercase())
                && word.chars().filter(|c| c.is_uppercase()).count() >= 2
        });
    if has_identifiers {
        score += 8;
    }

    // Contains technical terms
    let tech_terms = [
        "component", "function", "struct", "type", "interface", "hook", "store",
        "module", "endpoint", "route", "query", "table", "column", "field",
        "prop", "state", "parameter", "argument", "return",
    ];
    let tech_count = tech_terms.iter().filter(|t| prompt.to_lowercase().contains(**t)).count();
    if tech_count >= 3 {
        score += 7;
    } else if tech_count >= 1 {
        score += 4;
    }

    PromptCriterion {
        name: "Specificity".to_string(),
        score: score.min(25),
        max_score: 25,
        feedback: if score >= 20 {
            "Prompt references specific code elements.".to_string()
        } else if score >= 12 {
            "Add specific file paths or function names for better results.".to_string()
        } else {
            "Prompt is too generic. Mention specific files, functions, or components.".to_string()
        },
    }
}

/// Score prompt context (0-25).
/// Looks for background information, reasoning, and current state description.
fn score_context(prompt: &str) -> PromptCriterion {
    let mut score: u32 = 0;
    let lower = prompt.to_lowercase();

    // Contains context keywords
    let context_words = [
        "because", "currently", "right now", "existing", "already", "the current",
        "before", "after", "when", "so that", "in order to", "needs to", "should",
    ];
    let ctx_count = context_words.iter().filter(|w| lower.contains(**w)).count();
    if ctx_count >= 3 {
        score += 12;
    } else if ctx_count >= 1 {
        score += 7;
    } else {
        score += 2;
    }

    // Contains constraints or requirements
    let constraint_words = [
        "must", "should not", "don't", "without", "ensure", "make sure",
        "avoid", "keep", "maintain", "preserve",
    ];
    let constraint_count = constraint_words.iter().filter(|w| lower.contains(**w)).count();
    if constraint_count >= 2 {
        score += 8;
    } else if constraint_count >= 1 {
        score += 5;
    }

    // Multi-line (indicates structured thought)
    let line_count = prompt.lines().count();
    if line_count >= 3 {
        score += 5;
    } else if line_count >= 2 {
        score += 3;
    }

    PromptCriterion {
        name: "Context".to_string(),
        score: score.min(25),
        max_score: 25,
        feedback: if score >= 20 {
            "Prompt provides good context about the current state and goals.".to_string()
        } else if score >= 12 {
            "Add more context about why this change is needed and the current state.".to_string()
        } else {
            "Prompt lacks context. Explain the current situation and motivation.".to_string()
        },
    }
}

/// Score prompt scope (0-25).
/// Looks for clear boundaries and defined deliverables.
fn score_scope(prompt: &str) -> PromptCriterion {
    let mut score: u32 = 0;
    let lower = prompt.to_lowercase();

    // Has numbered steps or bullet points
    let has_list = lower.contains("1.") || lower.contains("- ") || lower.contains("* ");
    if has_list {
        score += 10;
    }

    // Defines boundaries
    let boundary_words = [
        "only", "just", "scope", "limit", "focus on", "don't change",
        "leave", "ignore", "skip", "specifically",
    ];
    let boundary_count = boundary_words.iter().filter(|w| lower.contains(**w)).count();
    if boundary_count >= 2 {
        score += 8;
    } else if boundary_count >= 1 {
        score += 5;
    }

    // Defines acceptance criteria or expected outcome
    let outcome_words = [
        "result", "expect", "outcome", "output", "should return", "should render",
        "should display", "will produce", "test", "verify",
    ];
    let outcome_count = outcome_words.iter().filter(|w| lower.contains(**w)).count();
    if outcome_count >= 2 {
        score += 7;
    } else if outcome_count >= 1 {
        score += 4;
    }

    PromptCriterion {
        name: "Scope".to_string(),
        score: score.min(25),
        max_score: 25,
        feedback: if score >= 20 {
            "Prompt has well-defined scope and boundaries.".to_string()
        } else if score >= 12 {
            "Consider adding numbered steps or boundaries for what should/shouldn't change.".to_string()
        } else {
            "Prompt scope is undefined. Add steps, boundaries, or expected outcomes.".to_string()
        },
    }
}

/// Generate an auto-enhanced prompt by adding RALPH structure.
fn generate_enhanced_prompt(original: &str) -> String {
    format!(
        "## RALPH Loop Task\n\n\
        ### Review\n\
        Before making changes, review the relevant files and understand the current state.\n\n\
        ### Analyze\n\
        {}\n\n\
        ### List\n\
        List all files that need to be modified and the specific changes required.\n\n\
        ### Plan\n\
        Create a step-by-step plan before implementing any changes.\n\n\
        ### Handoff\n\
        After completing changes, verify everything works and document what was done.",
        original
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_short_prompt() {
        // A very short, vague prompt should score low
        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(analyze_ralph_prompt("fix bug".to_string()))
            .unwrap();

        assert!(result.quality_score < 50);
        assert_eq!(result.criteria.len(), 4);
        assert!(!result.suggestions.is_empty());
        assert!(result.enhanced_prompt.is_some());
    }

    #[test]
    fn test_analyze_detailed_prompt() {
        let detailed = "Implement a new function `calculate_trend` in src/core/health.rs that \
            takes a Vec<HealthScore> and returns the percentage change over the last 7 days. \
            Currently the dashboard only shows the current score. This should not modify \
            the existing calculate_health function. \
            1. Add the new function with proper documentation header. \
            2. Add tests in the existing test module. \
            3. Export it from the module. \
            The function should return an f64 representing the trend percentage.";

        let result = tokio::runtime::Runtime::new()
            .unwrap()
            .block_on(analyze_ralph_prompt(detailed.to_string()))
            .unwrap();

        assert!(result.quality_score >= 50);
        assert_eq!(result.criteria.len(), 4);
    }

    #[test]
    fn test_generate_enhanced_prompt() {
        let enhanced = generate_enhanced_prompt("fix the login bug");
        assert!(enhanced.contains("## RALPH Loop Task"));
        assert!(enhanced.contains("### Review"));
        assert!(enhanced.contains("### Analyze"));
        assert!(enhanced.contains("fix the login bug"));
        assert!(enhanced.contains("### Handoff"));
    }

    #[test]
    fn test_score_clarity_with_verbs() {
        let good = "Implement a new component and add tests for it.";
        let bad = "thing";
        let good_score = score_clarity(good);
        let bad_score = score_clarity(bad);
        assert!(good_score.score > bad_score.score);
    }

    #[test]
    fn test_score_specificity_with_paths() {
        let specific = "Update the calculate_health function in src/core/health.rs";
        let vague = "update the thing";
        let specific_score = score_specificity(specific);
        let vague_score = score_specificity(vague);
        assert!(specific_score.score > vague_score.score);
    }
}
