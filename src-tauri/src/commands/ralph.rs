//! @module commands/ralph
//! @description Tauri IPC commands for RALPH loop management and prompt analysis
//!
//! PURPOSE:
//! - Analyze prompt quality for RALPH loops (clarity, specificity, context, scope)
//! - Start and pause RALPH loops with DB persistence
//! - Execute RALPH loops via Claude Code CLI in background with iterative refinement
//! - Extract issues from Claude output using AI and feed to next iteration
//! - List loop history for the active project
//! - Provide auto-enhanced prompts based on quality analysis
//! - AI-powered prompt enhancement when API key is available
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection for loop persistence
//! - models::ralph - RalphLoop, PromptAnalysis, PromptCriterion types
//! - uuid - Loop ID generation
//! - chrono - Timestamp handling
//! - core::ai - Claude API for AI-powered enhancement and issue extraction
//! - std::process::Command - Execute Claude CLI
//! - tokio - Async runtime for background execution
//! - reqwest - HTTP client for AI API calls in background tasks
//!
//! EXPORTS:
//! - analyze_ralph_prompt - Score prompt quality and generate suggestions (heuristic)
//! - analyze_ralph_prompt_with_ai - AI-powered prompt analysis and enhancement
//! - start_ralph_loop - Create loop and execute via Claude CLI in background
//! - pause_ralph_loop - Pause an active loop
//! - resume_ralph_loop - Resume a paused loop
//! - kill_ralph_loop - Kill a running or paused loop and mark as failed
//! - list_ralph_loops - Get loops for a project
//! - list_ralph_mistakes - Get mistakes for a project (for UI display)
//! - get_ralph_context - Get CLAUDE.md summary, recent mistakes, and project patterns
//! - record_ralph_mistake - Record a mistake from a RALPH loop for learning
//! - update_claude_md_with_pattern - Append learned pattern to CLAUDE.md CLAUDE NOTES section
//!
//! PATTERNS:
//! - analyze_ralph_prompt uses fast heuristics for immediate feedback
//! - analyze_ralph_prompt_with_ai uses Claude for deeper analysis (when API key available)
//! - start_ralph_loop stores loop in DB then spawns background task to execute claude CLI
//! - execute_ralph_loop runs iteratively: up to 5 iterations, extracting issues via AI after each
//! - pause_ralph_loop transitions "running" to "paused"
//! - Loop statuses: idle -> running -> paused/completed/failed
//! - Failed/killed loops automatically record mistakes for learning (categorized by error type)
//! - Iteration count updates in real-time for UI progress display
//!
//! CLAUDE NOTES:
//! - RALPH = Review, Analyze, List, Plan, Handoff
//! - Quality score is sum of 4 criteria (clarity, specificity, context, scope), each 0-25
//! - Heuristic analysis is instant; AI analysis takes 2-5 seconds
//! - AI enhancement provides project-aware suggestions when context is provided
//! - Claude CLI is executed with: claude -p "prompt" --allowedTools ... in project directory
//! - Iterative refinement: after each Claude run, AI extracts issues → feeds to next iteration
//! - MAX_ITERATIONS = 5 prevents infinite loops; exits early if no issues found
//! - Each iteration's issues are stored as mistakes for learning
//! - Prior issues are included in subsequent prompts for context-aware fixing
//! - get_ralph_context reads CLAUDE.md from project path and fetches recent mistakes from DB
//! - update_claude_md_with_pattern appends to CLAUDE NOTES section in CLAUDE.md file

use chrono::Utc;
use rusqlite::Connection;
use tauri::State;

use std::fs;
use std::path::Path;
use std::process::Command;

/// Get the database path for opening new connections in background tasks.
fn get_db_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    Ok(home.join(".project-jumpstart").join("jumpstart.db"))
}

/// Open a new database connection for background tasks.
fn open_db_connection() -> Result<Connection, String> {
    let db_path = get_db_path()?;
    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

use crate::core::ai;
use crate::db::{self, AppState};
use crate::models::ralph::{PromptAnalysis, PromptCriterion, RalphLoop, RalphMistake, RalphLoopContext};

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

/// AI-powered prompt analysis and enhancement.
/// Provides deeper analysis and project-aware suggestions when context is provided.
/// Falls back to heuristic analysis if API call fails.
#[tauri::command]
pub async fn analyze_ralph_prompt_with_ai(
    prompt: String,
    project_name: Option<String>,
    project_language: Option<String>,
    project_framework: Option<String>,
    project_files: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<PromptAnalysis, String> {
    // Try to get API key
    let api_key = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        ai::get_api_key(&db).ok()
    };

    // If no API key, fall back to heuristic analysis
    let Some(api_key) = api_key else {
        return analyze_ralph_prompt(prompt).await;
    };

    let system = r#"You are an expert at analyzing prompts for AI coding assistants. Your job is to:
1. Score the prompt quality (0-100) based on clarity, specificity, context, and scope
2. Provide specific, actionable suggestions to improve weak areas
3. Generate an enhanced version of the prompt that would get better results

SCORING CRITERIA (each 0-25 points):

**Clarity (0-25):** Does the prompt clearly state what needs to be done?
- 20-25: Clear action verb, specific outcome, well-structured
- 10-19: Has action but vague about outcome or approach
- 0-9: Unclear what is being requested

**Specificity (0-25):** Does the prompt reference specific code elements?
- 20-25: Names files, functions, types, or line numbers
- 10-19: Mentions general areas but not specific elements
- 0-9: No code references, too abstract

**Context (0-25):** Does the prompt explain the current state and motivation?
- 20-25: Explains why the change is needed, current behavior, constraints
- 10-19: Some context but missing motivation or current state
- 0-9: No context about why or what exists

**Scope (0-25):** Are boundaries and deliverables defined?
- 20-25: Clear boundaries (what to change AND what not to change), expected outcome
- 10-19: Some boundaries but incomplete
- 0-9: Open-ended, no boundaries

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "qualityScore": <0-100>,
  "criteria": [
    {"name": "Clarity", "score": <0-25>, "maxScore": 25, "feedback": "<specific feedback>"},
    {"name": "Specificity", "score": <0-25>, "maxScore": 25, "feedback": "<specific feedback>"},
    {"name": "Context", "score": <0-25>, "maxScore": 25, "feedback": "<specific feedback>"},
    {"name": "Scope", "score": <0-25>, "maxScore": 25, "feedback": "<specific feedback>"}
  ],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>"],
  "enhancedPrompt": "<the improved version of the prompt with RALPH structure>"
}

ENHANCED PROMPT REQUIREMENTS:
- Keep the original intent but add structure
- Add specific file references if the project context mentions relevant files
- Include a "Review" step to examine relevant code first
- Include explicit scope boundaries (what NOT to change)
- End with verification/handoff step"#;

    // Build context-aware prompt
    let mut user_prompt = format!("Analyze this prompt for a RALPH coding loop:\n\n```\n{}\n```\n", prompt);

    // Add project context if available
    if project_name.is_some() || project_language.is_some() || project_framework.is_some() {
        user_prompt.push_str("\n## Project Context\n");
        if let Some(ref name) = project_name {
            user_prompt.push_str(&format!("- Project: {}\n", name));
        }
        if let Some(ref lang) = project_language {
            user_prompt.push_str(&format!("- Language: {}\n", lang));
        }
        if let Some(ref fw) = project_framework {
            user_prompt.push_str(&format!("- Framework: {}\n", fw));
        }
    }

    // Add relevant files if provided
    if let Some(ref files) = project_files {
        if !files.is_empty() {
            user_prompt.push_str("\n## Relevant Project Files\n");
            for file in files.iter().take(20) {
                user_prompt.push_str(&format!("- {}\n", file));
            }
            user_prompt.push_str("\nUse these file paths in your enhanced prompt if relevant.\n");
        }
    }

    user_prompt.push_str("\nProvide your analysis as JSON only.");

    // Call Claude API
    let response = match ai::call_claude(&state.http_client, &api_key, system, &user_prompt).await {
        Ok(r) => r,
        Err(_) => {
            // Fall back to heuristic on API error
            return analyze_ralph_prompt(prompt).await;
        }
    };

    // Parse AI response
    match serde_json::from_str::<serde_json::Value>(&response) {
        Ok(val) => {
            let quality_score = val.get("qualityScore")
                .and_then(|v| v.as_u64())
                .unwrap_or(50) as u32;

            let criteria = val.get("criteria")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter().map(|c| PromptCriterion {
                        name: c.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
                        score: c.get("score").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        max_score: 25,
                        feedback: c.get("feedback").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    }).collect()
                })
                .unwrap_or_else(|| {
                    // Fallback criteria
                    vec![
                        PromptCriterion { name: "Clarity".to_string(), score: quality_score / 4, max_score: 25, feedback: "AI analysis".to_string() },
                        PromptCriterion { name: "Specificity".to_string(), score: quality_score / 4, max_score: 25, feedback: "AI analysis".to_string() },
                        PromptCriterion { name: "Context".to_string(), score: quality_score / 4, max_score: 25, feedback: "AI analysis".to_string() },
                        PromptCriterion { name: "Scope".to_string(), score: quality_score / 4, max_score: 25, feedback: "AI analysis".to_string() },
                    ]
                });

            let suggestions = val.get("suggestions")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|s| s.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();

            let enhanced_prompt = val.get("enhancedPrompt")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            Ok(PromptAnalysis {
                quality_score,
                criteria,
                suggestions,
                enhanced_prompt,
            })
        }
        Err(_) => {
            // AI returned non-JSON, fall back to heuristic
            analyze_ralph_prompt(prompt).await
        }
    }
}

/// Start a new RALPH loop for a project (iterative mode).
/// Creates a loop record in the DB with "running" status and executes via Claude CLI.
#[tauri::command]
pub async fn start_ralph_loop(
    project_id: String,
    prompt: String,
    enhanced_prompt: Option<String>,
    quality_score: u32,
    state: State<'_, AppState>,
) -> Result<RalphLoop, String> {
    // Get project path first
    let project_path = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let mut stmt = db
            .prepare("SELECT path FROM projects WHERE id = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        stmt.query_row(rusqlite::params![&project_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Project not found: {}", e))?
    };

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Insert loop record
    {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        db.execute(
            "INSERT INTO ralph_loops (id, project_id, prompt, enhanced_prompt, status, quality_score, iterations, outcome, started_at, created_at, mode) VALUES (?1, ?2, ?3, ?4, 'running', ?5, 0, NULL, ?6, ?6, 'iterative')",
            rusqlite::params![&id, &project_id, &prompt, &enhanced_prompt, quality_score, &now],
        )
        .map_err(|e| format!("Failed to create RALPH loop: {}", e))?;

        // Log activity
        let _ = db::log_activity_db(&db, &project_id, "generate", "Started RALPH loop (iterative mode)");
    }

    // Create the loop result to return immediately
    let loop_result = RalphLoop {
        id: id.clone(),
        project_id: project_id.clone(),
        prompt: prompt.clone(),
        enhanced_prompt: enhanced_prompt.clone(),
        status: "running".to_string(),
        quality_score,
        iterations: 0,
        outcome: None,
        started_at: Some(now.clone()),
        paused_at: None,
        completed_at: None,
        created_at: now,
        mode: "iterative".to_string(),
        current_story: None,
        total_stories: None,
    };

    // Prepare data for background task
    let loop_id = id.clone();
    let final_prompt = enhanced_prompt.unwrap_or(prompt);

    // Spawn background task to execute Claude CLI
    tokio::spawn(async move {
        execute_ralph_loop(loop_id, project_id, project_path, final_prompt).await;
    });

    Ok(loop_result)
}

/// Start a new RALPH loop in PRD mode (fresh context per story, git commits between).
/// Parses the PRD JSON and executes each story sequentially.
#[tauri::command]
pub async fn start_ralph_loop_prd(
    project_id: String,
    prd_json: String,
    state: State<'_, AppState>,
) -> Result<RalphLoop, String> {
    use crate::models::ralph::PrdFile;

    // Parse the PRD JSON
    let prd: PrdFile = serde_json::from_str(&prd_json)
        .map_err(|e| format!("Invalid PRD JSON: {}", e))?;

    if prd.stories.is_empty() {
        return Err("PRD must contain at least one story".to_string());
    }

    let total_stories = prd.stories.len() as u32;

    // Get project path
    let project_path = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let mut stmt = db
            .prepare("SELECT path FROM projects WHERE id = ?1")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        stmt.query_row(rusqlite::params![&project_id], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Project not found: {}", e))?
    };

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Create a summary prompt for display
    let prompt_summary = format!(
        "PRD: {} ({} stories)\n{}",
        prd.name,
        total_stories,
        prd.description.as_deref().unwrap_or("No description")
    );

    // Insert loop record
    {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        db.execute(
            "INSERT INTO ralph_loops (id, project_id, prompt, enhanced_prompt, status, quality_score, iterations, outcome, started_at, created_at, mode, current_story, total_stories) VALUES (?1, ?2, ?3, ?4, 'running', 100, 0, NULL, ?5, ?5, 'prd', 0, ?6)",
            rusqlite::params![&id, &project_id, &prompt_summary, &prd_json, &now, total_stories],
        )
        .map_err(|e| format!("Failed to create RALPH loop: {}", e))?;

        // Log activity
        let _ = db::log_activity_db(&db, &project_id, "generate", &format!("Started RALPH PRD loop: {}", prd.name));
    }

    // Create the loop result to return immediately
    let loop_result = RalphLoop {
        id: id.clone(),
        project_id: project_id.clone(),
        prompt: prompt_summary,
        enhanced_prompt: Some(prd_json.clone()),
        status: "running".to_string(),
        quality_score: 100,
        iterations: 0,
        outcome: None,
        started_at: Some(now.clone()),
        paused_at: None,
        completed_at: None,
        created_at: now,
        mode: "prd".to_string(),
        current_story: Some(0),
        total_stories: Some(total_stories),
    };

    // Spawn background task to execute PRD
    let loop_id = id.clone();
    tokio::spawn(async move {
        execute_ralph_loop_prd(loop_id, project_id, project_path, prd).await;
    });

    Ok(loop_result)
}

/// Maximum iterations for a RALPH loop (prevents infinite loops)
const MAX_ITERATIONS: u32 = 5;

/// Execute a RALPH loop via the Claude CLI in a background task.
/// Runs iteratively: after each execution, uses AI to extract issues and feeds them
/// to the next iteration until no issues remain or max iterations reached.
/// Updates iteration count in real-time for UI progress display.
async fn execute_ralph_loop(
    loop_id: String,
    project_id: String,
    project_path: String,
    initial_prompt: String,
) {
    // Open a fresh database connection for this background task
    let db = match open_db_connection() {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("RALPH: Failed to open database connection: {}", e);
            return;
        }
    };

    // Create HTTP client for AI calls
    let http_client = reqwest::Client::new();

    // Try to get API key for AI-powered issue extraction
    let api_key = ai::get_api_key(&db).ok();

    // Check if claude CLI is available
    let claude_check = Command::new("which")
        .arg("claude")
        .output();

    let claude_path = match claude_check {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).trim().to_string()
        }
        _ => {
            // Try common paths
            if Path::new("/usr/local/bin/claude").exists() {
                "/usr/local/bin/claude".to_string()
            } else if Path::new("/opt/homebrew/bin/claude").exists() {
                "/opt/homebrew/bin/claude".to_string()
            } else {
                // Claude CLI not found - mark as failed
                let now = Utc::now().to_rfc3339();
                let _ = db.execute(
                    "UPDATE ralph_loops SET status = 'failed', outcome = ?1, completed_at = ?2 WHERE id = ?3",
                    rusqlite::params!["Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code", &now, &loop_id],
                );
                return;
            }
        }
    };

    // Track accumulated issues across iterations
    let mut all_issues: Vec<ExtractedIssue> = Vec::new();
    let mut current_prompt = initial_prompt.clone();
    let mut final_outcome = String::new();
    let mut final_status = "completed".to_string();

    // Iterative loop
    for iteration in 1..=MAX_ITERATIONS {
        // Check if loop was paused or killed
        let loop_status: Option<String> = db
            .query_row(
                "SELECT status FROM ralph_loops WHERE id = ?1",
                rusqlite::params![&loop_id],
                |row| row.get(0),
            )
            .ok();

        if let Some(status) = loop_status {
            if status != "running" {
                // Loop was paused or killed, stop execution
                return;
            }
        }

        // Update iteration count immediately (real-time progress)
        let _ = db.execute(
            "UPDATE ralph_loops SET iterations = ?1 WHERE id = ?2",
            rusqlite::params![iteration, &loop_id],
        );

        // Execute claude with the current prompt
        let result = Command::new(&claude_path)
            .arg("-p")
            .arg(&current_prompt)
            .arg("--allowedTools")
            .arg("Read,Write,Edit,Bash,Glob,Grep")
            .current_dir(&project_path)
            .output();

        let (output_text, execution_failed) = match result {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);

                if output.status.success() {
                    (stdout.to_string(), false)
                } else {
                    let error_msg = if stderr.is_empty() {
                        format!("Claude exited with code: {:?}\n{}", output.status.code(), stdout)
                    } else {
                        format!("{}\n{}", stderr, stdout)
                    };
                    (error_msg, true)
                }
            }
            Err(e) => {
                (format!("Failed to execute Claude: {}", e), true)
            }
        };

        // If execution failed completely, mark as failed and exit
        if execution_failed && iteration == 1 {
            final_status = "failed".to_string();
            final_outcome = output_text.clone();

            // Record the failure as a mistake
            record_iteration_mistake(
                &db,
                &project_id,
                &loop_id,
                &output_text,
                &current_prompt,
            );
            break;
        }

        // Extract issues from the output using AI (if API key available)
        let extracted_issues = if let Some(ref key) = api_key {
            extract_issues_with_ai(&http_client, key, &output_text).await
        } else {
            // Fallback: simple heuristic issue extraction
            extract_issues_heuristic(&output_text)
        };

        // Record each extracted issue as a mistake for learning
        for issue in &extracted_issues {
            let mistake_id = uuid::Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            let _ = db.execute(
                "INSERT INTO ralph_mistakes (id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8)",
                rusqlite::params![
                    mistake_id,
                    project_id,
                    loop_id,
                    issue.issue_type,
                    issue.description,
                    format!("Iteration {}: {}", iteration, current_prompt),
                    issue.suggested_fix,
                    now
                ],
            );
        }

        // If no issues found, we're done successfully
        if extracted_issues.is_empty() {
            final_status = "completed".to_string();
            // Truncate output if too long
            final_outcome = if output_text.len() > 10000 {
                format!("{}...\n[Output truncated]", &output_text[..10000])
            } else {
                output_text
            };
            break;
        }

        // Add issues to accumulated list
        all_issues.extend(extracted_issues.clone());

        // If this is the last iteration, mark as completed with issues noted
        if iteration == MAX_ITERATIONS {
            final_status = "completed".to_string();
            final_outcome = format!(
                "Completed after {} iterations. {} issues addressed.\n\n{}",
                iteration,
                all_issues.len(),
                if output_text.len() > 8000 {
                    format!("{}...\n[Output truncated]", &output_text[..8000])
                } else {
                    output_text
                }
            );
            break;
        }

        // Build enhanced prompt for next iteration with context from prior issues
        current_prompt = build_iteration_prompt(&initial_prompt, &all_issues, iteration);

        // Store intermediate outcome
        final_outcome = output_text;
    }

    // Update loop record with final result
    let now = Utc::now().to_rfc3339();
    let _ = db.execute(
        "UPDATE ralph_loops SET status = ?1, outcome = ?2, completed_at = ?3 WHERE id = ?4",
        rusqlite::params![&final_status, &final_outcome, &now, &loop_id],
    );

    // Log completion activity
    let activity_msg = if final_status == "completed" {
        "RALPH loop completed successfully"
    } else {
        "RALPH loop failed"
    };
    let _ = db::log_activity_db(&db, &project_id, "generate", activity_msg);

    // Prune old mistakes (keep only most recent 50 per project)
    let _ = db.execute(
        "DELETE FROM ralph_mistakes WHERE project_id = ?1 AND id NOT IN (
            SELECT id FROM ralph_mistakes WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 50
        )",
        rusqlite::params![project_id],
    );
}

/// Execute a RALPH loop in PRD mode (fresh context per story).
/// Like the original "Ralph Wiggum" approach: each story gets a fresh Claude context,
/// git commits between stories, validation runs after each story.
async fn execute_ralph_loop_prd(
    loop_id: String,
    project_id: String,
    project_path: String,
    prd: crate::models::ralph::PrdFile,
) {
    use std::process::Command as StdCommand;

    // Open a fresh database connection
    let db = match open_db_connection() {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("RALPH PRD: Failed to open database connection: {}", e);
            return;
        }
    };

    // Check if claude CLI is available
    let claude_path = match find_claude_cli() {
        Some(path) => path,
        None => {
            let now = Utc::now().to_rfc3339();
            let _ = db.execute(
                "UPDATE ralph_loops SET status = 'failed', outcome = ?1, completed_at = ?2 WHERE id = ?3",
                rusqlite::params!["Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code", &now, &loop_id],
            );
            return;
        }
    };

    let total_stories = prd.stories.len();
    let mut completed_count = 0;
    let mut outcomes: Vec<String> = Vec::new();

    // Create or checkout branch if specified
    if prd.branch != "main" && prd.branch != "master" {
        let _ = StdCommand::new("git")
            .args(["checkout", "-B", &prd.branch])
            .current_dir(&project_path)
            .output();
    }

    // Process each story
    for (index, story) in prd.stories.iter().enumerate() {
        // Check if loop was paused or killed
        let loop_status: Option<String> = db
            .query_row(
                "SELECT status FROM ralph_loops WHERE id = ?1",
                rusqlite::params![&loop_id],
                |row| row.get(0),
            )
            .ok();

        if let Some(status) = loop_status {
            if status != "running" {
                return;
            }
        }

        // Update current story progress
        let _ = db.execute(
            "UPDATE ralph_loops SET current_story = ?1, iterations = ?2 WHERE id = ?3",
            rusqlite::params![index as u32, index as u32 + 1, &loop_id],
        );

        // Skip completed stories
        if story.completed {
            completed_count += 1;
            continue;
        }

        // Build prompt for this story
        let story_prompt = build_story_prompt(story, &prd);

        // Execute Claude with fresh context for this story
        let mut story_iterations = 0;
        let max_story_iterations = prd.max_iterations_per_story;
        let mut story_success = false;

        while story_iterations < max_story_iterations && !story_success {
            story_iterations += 1;

            let result = Command::new(&claude_path)
                .arg("-p")
                .arg(&story_prompt)
                .arg("--allowedTools")
                .arg("Read,Write,Edit,Bash,Glob,Grep")
                .current_dir(&project_path)
                .output();

            let (output_text, execution_success) = match result {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    (stdout.to_string(), output.status.success())
                }
                Err(e) => {
                    (format!("Failed to execute: {}", e), false)
                }
            };

            // Run validation if configured
            let validation_passed = if execution_success {
                run_prd_validation(&project_path, &prd)
            } else {
                false
            };

            if validation_passed {
                story_success = true;

                // Git commit the changes
                let commit_msg = format!("feat: {} [RALPH PRD]", story.title);
                let _ = StdCommand::new("git")
                    .args(["add", "-A"])
                    .current_dir(&project_path)
                    .output();
                let commit_output = StdCommand::new("git")
                    .args(["commit", "-m", &commit_msg])
                    .current_dir(&project_path)
                    .output();

                let commit_hash = if let Ok(output) = commit_output {
                    if output.status.success() {
                        // Get the commit hash
                        StdCommand::new("git")
                            .args(["rev-parse", "--short", "HEAD"])
                            .current_dir(&project_path)
                            .output()
                            .ok()
                            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                    } else {
                        None
                    }
                } else {
                    None
                };

                outcomes.push(format!(
                    "✓ Story {}: {} (commit: {})",
                    index + 1,
                    story.title,
                    commit_hash.as_deref().unwrap_or("no commit")
                ));
                completed_count += 1;
            } else {
                // Record the failure as a mistake
                let mistake_id = uuid::Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                let _ = db.execute(
                    "INSERT INTO ralph_mistakes (id, project_id, loop_id, mistake_type, description, context, created_at)
                     VALUES (?1, ?2, ?3, 'implementation', ?4, ?5, ?6)",
                    rusqlite::params![
                        mistake_id,
                        project_id,
                        loop_id,
                        format!("Story '{}' iteration {} failed validation", story.title, story_iterations),
                        output_text.chars().take(500).collect::<String>(),
                        now
                    ],
                );

                if story_iterations >= max_story_iterations {
                    outcomes.push(format!(
                        "✗ Story {}: {} (failed after {} iterations)",
                        index + 1, story.title, story_iterations
                    ));
                }
            }
        }
    }

    // Final outcome
    let final_status = if completed_count > 0 {
        "completed"
    } else {
        "failed"
    };

    let final_outcome = format!(
        "PRD: {}\nCompleted: {}/{} stories\n\n{}",
        prd.name,
        completed_count,
        total_stories,
        outcomes.join("\n")
    );

    let now = Utc::now().to_rfc3339();
    let _ = db.execute(
        "UPDATE ralph_loops SET status = ?1, outcome = ?2, completed_at = ?3, current_story = ?4 WHERE id = ?5",
        rusqlite::params![final_status, final_outcome, now, total_stories as u32, loop_id],
    );

    // Log completion
    let _ = db::log_activity_db(
        &db,
        &project_id,
        "generate",
        &format!("RALPH PRD completed: {}/{} stories", completed_count, total_stories),
    );
}

/// Find the Claude CLI path
fn find_claude_cli() -> Option<String> {
    // Check if claude CLI is available via which
    let claude_check = Command::new("which")
        .arg("claude")
        .output();

    match claude_check {
        Ok(output) if output.status.success() => {
            Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
        }
        _ => {
            // Try common paths
            if Path::new("/usr/local/bin/claude").exists() {
                Some("/usr/local/bin/claude".to_string())
            } else if Path::new("/opt/homebrew/bin/claude").exists() {
                Some("/opt/homebrew/bin/claude".to_string())
            } else {
                None
            }
        }
    }
}

/// Build a prompt for a single PRD story
fn build_story_prompt(story: &crate::models::ralph::PrdStory, prd: &crate::models::ralph::PrdFile) -> String {
    let mut prompt = format!("## Task: {}\n\n", story.title);
    prompt.push_str(&story.description);
    prompt.push_str("\n\n");

    if let Some(ref criteria) = story.acceptance_criteria {
        prompt.push_str("### Acceptance Criteria\n");
        prompt.push_str(criteria);
        prompt.push_str("\n\n");
    }

    prompt.push_str("### Instructions\n");
    prompt.push_str("1. Implement the task described above\n");
    prompt.push_str("2. Make sure all code compiles/type-checks\n");
    if prd.test_command.is_some() {
        prompt.push_str("3. Ensure all tests pass\n");
    }
    prompt.push_str("4. Keep changes focused on this single task\n");

    prompt
}

/// Run validation commands for PRD (typecheck and tests)
fn run_prd_validation(project_path: &str, prd: &crate::models::ralph::PrdFile) -> bool {
    use std::process::Command as StdCommand;

    // Run typecheck if configured
    if let Some(ref cmd) = prd.typecheck_command {
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        if !parts.is_empty() {
            let result = StdCommand::new(parts[0])
                .args(&parts[1..])
                .current_dir(project_path)
                .output();

            if let Ok(output) = result {
                if !output.status.success() {
                    return false;
                }
            }
        }
    }

    // Run tests if configured
    if let Some(ref cmd) = prd.test_command {
        let parts: Vec<&str> = cmd.split_whitespace().collect();
        if !parts.is_empty() {
            let result = StdCommand::new(parts[0])
                .args(&parts[1..])
                .current_dir(project_path)
                .output();

            if let Ok(output) = result {
                if !output.status.success() {
                    return false;
                }
            }
        }
    }

    true
}

/// Extracted issue from Claude output
#[derive(Clone)]
struct ExtractedIssue {
    issue_type: String,
    description: String,
    suggested_fix: Option<String>,
}

/// Extract issues from Claude output using AI
async fn extract_issues_with_ai(
    client: &reqwest::Client,
    api_key: &str,
    output: &str,
) -> Vec<ExtractedIssue> {
    let system = r#"You analyze Claude Code CLI output to extract issues that need to be addressed.
Look for:
- Errors or exceptions
- Failed tests
- Type errors or lint warnings
- Missing files or dependencies
- Incomplete implementations
- TODOs or FIXMEs that were introduced

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "issues": [
    {
      "type": "error|warning|incomplete|test_failure|type_error|missing_dependency",
      "description": "Brief description of the issue",
      "suggestedFix": "How to fix it (optional)"
    }
  ]
}

If there are no issues and the output looks successful, return: {"issues": []}
Be conservative - only extract clear issues, not general observations."#;

    let user_prompt = format!(
        "Analyze this Claude Code output and extract any issues:\n\n```\n{}\n```",
        if output.len() > 8000 { &output[..8000] } else { output }
    );

    match ai::call_claude(client, api_key, system, &user_prompt).await {
        Ok(response) => {
            // Parse the JSON response
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&response) {
                if let Some(issues) = val.get("issues").and_then(|v| v.as_array()) {
                    return issues.iter().filter_map(|issue| {
                        let issue_type = issue.get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("implementation")
                            .to_string();
                        let description = issue.get("description")
                            .and_then(|v| v.as_str())?
                            .to_string();
                        let suggested_fix = issue.get("suggestedFix")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());

                        Some(ExtractedIssue {
                            issue_type,
                            description,
                            suggested_fix,
                        })
                    }).collect();
                }
            }
            Vec::new()
        }
        Err(_) => {
            // Fall back to heuristic extraction on API error
            extract_issues_heuristic(output)
        }
    }
}

/// Heuristic issue extraction when AI is not available
fn extract_issues_heuristic(output: &str) -> Vec<ExtractedIssue> {
    let mut issues = Vec::new();
    let lower = output.to_lowercase();

    // Check for test failures FIRST - these have specific patterns that shouldn't be caught as generic errors
    // Patterns: "test ... FAILED", "test failed", "tests failed", "assertion"
    let is_test_failure = lower.contains("test failed")
        || lower.contains("tests failed")
        || lower.contains("assertion")
        || (lower.contains("... failed") && lower.contains("test"));

    if is_test_failure {
        issues.push(ExtractedIssue {
            issue_type: "test_failure".to_string(),
            description: "One or more tests failed".to_string(),
            suggested_fix: Some("Review test output and fix failing tests".to_string()),
        });
        return issues; // Test failures are a specific category, don't mix with generic errors
    }

    // Check for common error patterns (excluding test failure patterns)
    if lower.contains("error:") || lower.contains("error]") {
        // Try to extract the error line
        for line in output.lines() {
            let line_lower = line.to_lowercase();
            if line_lower.contains("error:") || line_lower.contains("error]") {
                issues.push(ExtractedIssue {
                    issue_type: "error".to_string(),
                    description: line.trim().chars().take(200).collect(),
                    suggested_fix: None,
                });
                break; // Just capture first error to avoid noise
            }
        }
    }

    if lower.contains("warning:") {
        for line in output.lines() {
            if line.to_lowercase().contains("warning:") {
                issues.push(ExtractedIssue {
                    issue_type: "warning".to_string(),
                    description: line.trim().chars().take(200).collect(),
                    suggested_fix: None,
                });
                break;
            }
        }
    }

    issues
}

/// Build an enhanced prompt for the next iteration, including context from prior issues
fn build_iteration_prompt(original_prompt: &str, prior_issues: &[ExtractedIssue], iteration: u32) -> String {
    let mut prompt = format!(
        "## RALPH Loop - Iteration {} (Addressing Prior Issues)\n\n",
        iteration + 1
    );

    prompt.push_str("### Prior Issues to Address\n");
    prompt.push_str("The previous iteration(s) identified these issues that need to be fixed:\n\n");

    for (i, issue) in prior_issues.iter().enumerate() {
        prompt.push_str(&format!("{}. **[{}]** {}\n", i + 1, issue.issue_type, issue.description));
        if let Some(ref fix) = issue.suggested_fix {
            prompt.push_str(&format!("   - Suggested fix: {}\n", fix));
        }
    }

    prompt.push_str("\n### Original Task\n");
    prompt.push_str(original_prompt);
    prompt.push_str("\n\n### Instructions\n");
    prompt.push_str("1. First, address all the prior issues listed above\n");
    prompt.push_str("2. Then continue with the original task if needed\n");
    prompt.push_str("3. Verify your changes work correctly before finishing\n");

    prompt
}

/// Record a mistake from a failed iteration
fn record_iteration_mistake(
    db: &Connection,
    project_id: &str,
    loop_id: &str,
    error_output: &str,
    prompt: &str,
) {
    let mistake_id = uuid::Uuid::new_v4().to_string();
    let mistake_type = categorize_mistake(error_output);
    let description = if error_output.len() > 500 {
        format!("{}...", &error_output[..500])
    } else {
        error_output.to_string()
    };
    let now = Utc::now().to_rfc3339();

    let _ = db.execute(
        "INSERT INTO ralph_mistakes (id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, ?7)",
        rusqlite::params![
            mistake_id,
            project_id,
            loop_id,
            mistake_type,
            description,
            prompt,
            now
        ],
    );
}

/// Categorize a mistake based on error message content.
fn categorize_mistake(error: &str) -> &'static str {
    let lower = error.to_lowercase();

    if lower.contains("not found") || lower.contains("no such file") || lower.contains("doesn't exist") {
        "file_not_found"
    } else if lower.contains("permission") || lower.contains("access denied") {
        "permission_error"
    } else if lower.contains("syntax") || lower.contains("parse") || lower.contains("unexpected token") {
        "syntax_error"
    } else if lower.contains("type") || lower.contains("cannot assign") || lower.contains("incompatible") {
        "type_error"
    } else if lower.contains("timeout") || lower.contains("timed out") {
        "timeout"
    } else if lower.contains("network") || lower.contains("connection") || lower.contains("api") {
        "network_error"
    } else if lower.contains("memory") || lower.contains("heap") || lower.contains("stack overflow") {
        "resource_error"
    } else if lower.contains("killed") || lower.contains("terminated") || lower.contains("cancelled") {
        "user_cancelled"
    } else {
        "implementation"
    }
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

/// Resume a paused RALPH loop by ID.
/// Transitions status from "paused" back to "running" and re-executes the loop.
#[tauri::command]
pub async fn resume_ralph_loop(
    loop_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Get loop details and project info
    let (project_id, project_path, prompt) = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let mut stmt = db
            .prepare("SELECT rl.project_id, p.path, COALESCE(rl.enhanced_prompt, rl.prompt) FROM ralph_loops rl JOIN projects p ON rl.project_id = p.id WHERE rl.id = ?1 AND rl.status = 'paused'")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        stmt.query_row(rusqlite::params![&loop_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|_| "Loop not found or not currently paused.".to_string())?
    };

    // Update status to running
    {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        db.execute(
            "UPDATE ralph_loops SET status = 'running', paused_at = NULL WHERE id = ?1",
            rusqlite::params![&loop_id],
        )
        .map_err(|e| format!("Failed to resume RALPH loop: {}", e))?;
    }

    // Re-execute in background
    let lid = loop_id.clone();
    let pid = project_id.clone();
    tokio::spawn(async move {
        execute_ralph_loop(lid, pid, project_path, prompt).await;
    });

    Ok(())
}

/// Kill a running or paused RALPH loop by ID.
/// Marks the loop as failed, records a mistake, and attempts to kill any associated Claude process.
#[tauri::command]
pub async fn kill_ralph_loop(
    loop_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Get loop info before updating (for mistake recording)
    let loop_info: Option<(String, String)> = db
        .query_row(
            "SELECT project_id, prompt FROM ralph_loops WHERE id = ?1 AND status IN ('running', 'paused')",
            rusqlite::params![&loop_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    let now = Utc::now().to_rfc3339();

    let rows_updated = db
        .execute(
            "UPDATE ralph_loops SET status = 'failed', outcome = 'Killed by user', completed_at = ?1 WHERE id = ?2 AND status IN ('running', 'paused')",
            rusqlite::params![now, loop_id],
        )
        .map_err(|e| format!("Failed to kill RALPH loop: {}", e))?;

    if rows_updated == 0 {
        return Err("Loop not found or already completed/failed.".to_string());
    }

    // Record as a user-cancelled mistake for tracking
    if let Some((project_id, prompt)) = loop_info {
        let mistake_id = uuid::Uuid::new_v4().to_string();
        let _ = db.execute(
            "INSERT INTO ralph_mistakes (id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, created_at)
             VALUES (?1, ?2, ?3, 'user_cancelled', 'Loop was manually killed by user', ?4, NULL, NULL, ?5)",
            rusqlite::params![mistake_id, project_id, loop_id, prompt, now],
        );
    }

    // Try to kill any Claude processes that might be running for this loop
    // Note: This is a best-effort attempt - we can't guarantee we kill the right process
    // since we don't track PIDs. In the future, we could store PIDs in the DB.
    #[cfg(unix)]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-f", "claude -p"])
            .output();
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
            "SELECT id, project_id, prompt, enhanced_prompt, status, quality_score, iterations, outcome, started_at, paused_at, completed_at, created_at, COALESCE(mode, 'iterative'), current_story, total_stories FROM ralph_loops WHERE project_id = ?1 ORDER BY created_at DESC",
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
                mode: row.get(12)?,
                current_story: row.get(13)?,
                total_stories: row.get(14)?,
            })
        })
        .map_err(|e| format!("Failed to read loops: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(loops)
}

/// List all RALPH mistakes for a project, ordered by creation time (newest first).
#[tauri::command]
pub async fn list_ralph_mistakes(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<RalphMistake>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, created_at
             FROM ralph_mistakes
             WHERE project_id = ?1
             ORDER BY created_at DESC
             LIMIT 50",
        )
        .map_err(|e| format!("Failed to query mistakes: {}", e))?;

    let mistakes = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(RalphMistake {
                id: row.get(0)?,
                project_id: row.get(1)?,
                loop_id: row.get(2)?,
                mistake_type: row.get(3)?,
                description: row.get(4)?,
                context: row.get(5)?,
                resolution: row.get(6)?,
                learned_pattern: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to read mistakes: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(mistakes)
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

/// Get RALPH loop context including CLAUDE.md summary, recent mistakes, and project patterns.
/// Used to enhance AI prompt analysis with project-specific learning.
#[tauri::command]
pub async fn get_ralph_context(
    project_id: String,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<RalphLoopContext, String> {
    // Read CLAUDE.md summary
    let claude_md_path = Path::new(&project_path).join("CLAUDE.md");
    let claude_md_summary = if claude_md_path.exists() {
        let content = fs::read_to_string(&claude_md_path)
            .map_err(|e| format!("Failed to read CLAUDE.md: {}", e))?;
        // Extract first 500 chars or up to first ## section as summary
        let summary = content
            .lines()
            .take(20)
            .collect::<Vec<_>>()
            .join("\n");
        if summary.len() > 500 {
            format!("{}...", &summary[..500])
        } else {
            summary
        }
    } else {
        "No CLAUDE.md found".to_string()
    };

    // Get recent mistakes from DB (exclude user_cancelled - those are just operational messages)
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let mut stmt = db
        .prepare(
            "SELECT id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, created_at
             FROM ralph_mistakes
             WHERE project_id = ?1 AND mistake_type != 'user_cancelled'
             ORDER BY created_at DESC
             LIMIT 10",
        )
        .map_err(|e| format!("Failed to query mistakes: {}", e))?;

    let recent_mistakes: Vec<RalphMistake> = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(RalphMistake {
                id: row.get(0)?,
                project_id: row.get(1)?,
                loop_id: row.get(2)?,
                mistake_type: row.get(3)?,
                description: row.get(4)?,
                context: row.get(5)?,
                resolution: row.get(6)?,
                learned_pattern: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to read mistakes: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Extract project patterns from CLAUDE NOTES section
    let project_patterns = if claude_md_path.exists() {
        let content = fs::read_to_string(&claude_md_path).unwrap_or_default();
        extract_claude_notes_patterns(&content)
    } else {
        Vec::new()
    };

    Ok(RalphLoopContext {
        claude_md_summary,
        recent_mistakes,
        project_patterns,
    })
}

/// Extract patterns from the CLAUDE NOTES section of CLAUDE.md
fn extract_claude_notes_patterns(content: &str) -> Vec<String> {
    let mut patterns = Vec::new();
    let mut in_claude_notes = false;

    for line in content.lines() {
        if line.starts_with("## CLAUDE NOTES") || line.starts_with("### CLAUDE NOTES") {
            in_claude_notes = true;
            continue;
        }
        if in_claude_notes {
            // Stop at next section
            if line.starts_with("## ") || line.starts_with("### ") {
                break;
            }
            // Extract bullet points
            let trimmed = line.trim();
            if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
                patterns.push(trimmed[2..].to_string());
            }
        }
    }

    patterns
}

/// Maximum number of mistakes to keep per project (prevents DB bloat)
const MAX_MISTAKES_PER_PROJECT: i64 = 50;

/// Record a mistake from a RALPH loop for future learning.
/// Automatically prunes old mistakes to keep only the most recent 50 per project.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn record_ralph_mistake(
    project_id: String,
    loop_id: Option<String>,
    mistake_type: String,
    description: String,
    context: Option<String>,
    resolution: Option<String>,
    learned_pattern: Option<String>,
    state: State<'_, AppState>,
) -> Result<RalphMistake, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO ralph_mistakes (id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, project_id, loop_id, mistake_type, description, context, resolution, learned_pattern, now],
    )
    .map_err(|e| format!("Failed to record mistake: {}", e))?;

    // Prune old mistakes to prevent DB bloat (keep only the most recent N per project)
    let _ = db.execute(
        "DELETE FROM ralph_mistakes WHERE project_id = ?1 AND id NOT IN (
            SELECT id FROM ralph_mistakes WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2
        )",
        rusqlite::params![project_id, MAX_MISTAKES_PER_PROJECT],
    );

    // Log activity
    let _ = db::log_activity_db(&db, &project_id, "learn", &format!("Recorded RALPH mistake: {}", &description));

    Ok(RalphMistake {
        id,
        project_id,
        loop_id,
        mistake_type,
        description,
        context,
        resolution,
        learned_pattern,
        created_at: now,
    })
}

/// Append a learned pattern to the CLAUDE NOTES section of CLAUDE.md.
#[tauri::command]
pub async fn update_claude_md_with_pattern(
    project_path: String,
    pattern: String,
) -> Result<(), String> {
    let claude_md_path = Path::new(&project_path).join("CLAUDE.md");

    if !claude_md_path.exists() {
        return Err("CLAUDE.md does not exist in project".to_string());
    }

    let content = fs::read_to_string(&claude_md_path)
        .map_err(|e| format!("Failed to read CLAUDE.md: {}", e))?;

    // Find CLAUDE NOTES section and append pattern
    let updated_content = append_pattern_to_claude_notes(&content, &pattern);

    fs::write(&claude_md_path, updated_content)
        .map_err(|e| format!("Failed to write CLAUDE.md: {}", e))?;

    Ok(())
}

/// Append a pattern to the CLAUDE NOTES section, creating it if necessary.
fn append_pattern_to_claude_notes(content: &str, pattern: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let mut result = Vec::new();
    let mut found_claude_notes = false;
    let mut inserted = false;

    for (i, line) in lines.iter().enumerate() {
        result.push(line.to_string());

        // Check if this is the CLAUDE NOTES section header
        if line.starts_with("## CLAUDE NOTES") || line.starts_with("### CLAUDE NOTES") {
            found_claude_notes = true;
            continue;
        }

        // If we're in CLAUDE NOTES and hit the next section or end, insert before
        if found_claude_notes && !inserted {
            let is_next_section = line.starts_with("## ") || line.starts_with("### ");
            let is_last_line = i == lines.len() - 1;

            if is_next_section {
                // Insert before this section header
                result.pop(); // Remove the section header we just added
                result.push(format!("- {} (learned from RALPH loop)", pattern));
                result.push(String::new());
                result.push(line.to_string()); // Re-add the section header
                inserted = true;
            } else if is_last_line {
                // Append at end
                result.push(format!("- {} (learned from RALPH loop)", pattern));
                inserted = true;
            }
        }
    }

    // If CLAUDE NOTES wasn't found, append a new section
    if !found_claude_notes {
        result.push(String::new());
        result.push("## CLAUDE NOTES".to_string());
        result.push(String::new());
        result.push(format!("- {} (learned from RALPH loop)", pattern));
    }

    result.join("\n")
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

    #[test]
    fn test_extract_issues_heuristic_finds_errors() {
        let output_with_error = "Compiling project...\nerror: cannot find value `foo` in this scope\n  --> src/main.rs:10:5";
        let issues = extract_issues_heuristic(output_with_error);
        assert!(!issues.is_empty());
        assert_eq!(issues[0].issue_type, "error");
    }

    #[test]
    fn test_extract_issues_heuristic_finds_warnings() {
        let output_with_warning = "Compiling project...\nwarning: unused variable: `x`\n  --> src/lib.rs:5:9";
        let issues = extract_issues_heuristic(output_with_warning);
        assert!(!issues.is_empty());
        assert_eq!(issues[0].issue_type, "warning");
    }

    #[test]
    fn test_extract_issues_heuristic_finds_test_failures() {
        let output_with_test_failure = "running 5 tests\ntest my_test ... FAILED\n\ntest result: FAILED. 4 passed; 1 failed";
        let issues = extract_issues_heuristic(output_with_test_failure);
        assert!(!issues.is_empty());
        assert_eq!(issues[0].issue_type, "test_failure");
    }

    #[test]
    fn test_extract_issues_heuristic_no_issues_on_success() {
        let clean_output = "Compiling project...\nFinished dev [unoptimized + debuginfo] target(s) in 2.5s\nAll tests passed!";
        let issues = extract_issues_heuristic(clean_output);
        assert!(issues.is_empty());
    }

    #[test]
    fn test_build_iteration_prompt_includes_prior_issues() {
        let original = "Fix the bug in login";
        let issues = vec![
            ExtractedIssue {
                issue_type: "error".to_string(),
                description: "undefined variable 'user'".to_string(),
                suggested_fix: Some("Define user before using".to_string()),
            },
        ];
        let prompt = build_iteration_prompt(original, &issues, 1);

        assert!(prompt.contains("Iteration 2"));
        assert!(prompt.contains("Prior Issues"));
        assert!(prompt.contains("undefined variable 'user'"));
        assert!(prompt.contains("Define user before using"));
        assert!(prompt.contains("Fix the bug in login"));
    }

    #[test]
    fn test_prd_parsing() {
        use crate::models::ralph::PrdFile;

        let prd_json = r#"{
            "name": "Test Feature",
            "description": "A test PRD",
            "branch": "feature/test",
            "testCommand": "cargo test",
            "maxIterationsPerStory": 3,
            "stories": [
                {
                    "id": "story-1",
                    "title": "First story",
                    "description": "Do the first thing",
                    "priority": 1,
                    "completed": false
                }
            ]
        }"#;

        let prd: PrdFile = serde_json::from_str(prd_json).expect("PRD should parse");
        assert_eq!(prd.name, "Test Feature");
        assert_eq!(prd.branch, "feature/test");
        assert_eq!(prd.stories.len(), 1);
        assert_eq!(prd.stories[0].title, "First story");
        assert!(!prd.stories[0].completed);
    }

    #[test]
    fn test_build_story_prompt() {
        use crate::models::ralph::{PrdFile, PrdStory};

        let story = PrdStory {
            id: "test-1".to_string(),
            title: "Add login form".to_string(),
            description: "Create a login form component".to_string(),
            acceptance_criteria: Some("Form renders with email and password fields".to_string()),
            priority: 1,
            completed: false,
            commit_hash: None,
        };

        let prd = PrdFile {
            name: "Auth Feature".to_string(),
            description: None,
            branch: "main".to_string(),
            test_command: Some("pnpm test".to_string()),
            typecheck_command: None,
            max_iterations_per_story: 3,
            stories: vec![story.clone()],
        };

        let prompt = build_story_prompt(&story, &prd);

        assert!(prompt.contains("Add login form"));
        assert!(prompt.contains("Create a login form component"));
        assert!(prompt.contains("Acceptance Criteria"));
        assert!(prompt.contains("Form renders with email and password fields"));
        assert!(prompt.contains("Ensure all tests pass"));
    }

    #[test]
    fn test_categorize_mistake() {
        assert_eq!(categorize_mistake("file not found: src/main.rs"), "file_not_found");
        assert_eq!(categorize_mistake("permission denied"), "permission_error");
        assert_eq!(categorize_mistake("syntax error on line 5"), "syntax_error");
        assert_eq!(categorize_mistake("type mismatch: expected i32"), "type_error");
        assert_eq!(categorize_mistake("connection timeout"), "timeout");
        assert_eq!(categorize_mistake("network error: failed to connect"), "network_error");
        assert_eq!(categorize_mistake("out of memory"), "resource_error");
        assert_eq!(categorize_mistake("process killed by user"), "user_cancelled");
        assert_eq!(categorize_mistake("something went wrong"), "implementation");
    }
}
