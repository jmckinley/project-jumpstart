//! @module commands/session_analysis
//! @description AI-powered session transcript analysis for smart recommendations
//!
//! PURPOSE:
//! - Read Claude Code session transcripts from ~/.claude/projects/
//! - Analyze recent activity with AI to suggest actions
//! - Return structured recommendations (agents, tests, patterns, docs)
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection and HTTP client
//! - core::ai - Claude API caller
//! - serde_json - JSON parsing
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - analyze_session - Analyze session transcript and return recommendations
//! - get_session_transcript - Read recent transcript content
//!
//! PATTERNS:
//! - Reads JSONL transcript files from Claude Code's storage
//! - Uses AI to extract actionable insights
//! - Returns typed SessionRecommendations struct
//!
//! CLAUDE NOTES:
//! - Session transcripts are in ~/.claude/projects/{project-hash}/*.jsonl
//! - Only analyze last N messages to control costs
//! - Cache results to avoid redundant API calls
//! - User should opt-in to this feature (privacy)

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

use crate::db::AppState;

/// A single AI-generated recommendation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecommendation {
    /// Type: "agent", "test", "pattern", "doc", "skill"
    pub rec_type: String,
    /// Short title for the recommendation
    pub title: String,
    /// Why this is recommended (from session context)
    pub reason: String,
    /// Specific action details (agent name, test description, etc.)
    pub details: String,
    /// Priority: 1 (high) to 5 (low)
    pub priority: u32,
}

/// Full analysis result from session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionAnalysis {
    /// List of recommendations
    pub recommendations: Vec<SessionRecommendation>,
    /// Summary of what user has been working on
    pub session_summary: String,
    /// Timestamp of analysis
    pub analyzed_at: String,
    /// Number of messages analyzed
    pub messages_analyzed: u32,
}

/// Find the most recent session transcript for a project
///
/// Claude Code stores transcripts in ~/.claude/projects/{path-with-dashes}/*.jsonl
/// where the folder name is the project path with "/" replaced by "-"
/// Example: /Users/john/my-project -> -Users-john-my-project
fn find_session_transcript(project_path: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let claude_projects = home.join(".claude").join("projects");

    if !claude_projects.exists() {
        return None;
    }

    // Claude Code uses exact path with "/" replaced by "-"
    // /Users/johnmckinley/project-jumpstart -> -Users-johnmckinley-project-jumpstart
    let expected_folder_name = project_path.replace("/", "-");

    // Try exact match first
    let exact_folder = claude_projects.join(&expected_folder_name);
    if exact_folder.exists() && exact_folder.is_dir() {
        return find_most_recent_jsonl(&exact_folder).map(|(path, _)| path);
    }

    // Fallback: search for folders that end with our project name
    // This handles cases where the path might be slightly different
    let project_name = std::path::Path::new(project_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if project_name.is_empty() {
        return None;
    }

    let mut best_match: Option<(PathBuf, std::time::SystemTime)> = None;

    if let Ok(entries) = fs::read_dir(&claude_projects) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let folder_name = match path.file_name().and_then(|n| n.to_str()) {
                    Some(name) => name,
                    None => continue,
                };

                // Check if folder ends with project name (handles different base paths)
                if folder_name.ends_with(&format!("-{}", project_name)) {
                    if let Some((file_path, modified)) = find_most_recent_jsonl(&path) {
                        if best_match.as_ref().map(|(_, t)| modified > *t).unwrap_or(true) {
                            best_match = Some((file_path, modified));
                        }
                    }
                }
            }
        }
    }

    best_match.map(|(path, _)| path)
}

/// Find the most recently modified .jsonl file in a directory
fn find_most_recent_jsonl(dir: &PathBuf) -> Option<(PathBuf, std::time::SystemTime)> {
    let mut best: Option<(PathBuf, std::time::SystemTime)> = None;

    if let Ok(files) = fs::read_dir(dir) {
        for file in files.flatten() {
            let file_path = file.path();
            if file_path.extension().map(|e| e == "jsonl").unwrap_or(false) {
                if let Ok(metadata) = file.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if best.as_ref().map(|(_, t)| modified > *t).unwrap_or(true) {
                            best = Some((file_path, modified));
                        }
                    }
                }
            }
        }
    }

    best
}

/// Read the last N messages from a JSONL transcript
///
/// Claude Code JSONL format:
/// - type: "user" or "assistant"
/// - message.role: "user" or "assistant"
/// - message.content: string (human text) or array (tool results, thinking, tool_use)
fn read_recent_messages(transcript_path: &PathBuf, max_messages: usize) -> Vec<String> {
    let content = match fs::read_to_string(transcript_path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let lines: Vec<&str> = content.lines().collect();
    let start = if lines.len() > max_messages * 2 {
        // Read more lines than needed since we'll filter some out
        lines.len() - (max_messages * 2)
    } else {
        0
    };

    let mut messages = Vec::new();

    for line in &lines[start..] {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
            let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

            // Get the nested message object
            let message = match json.get("message") {
                Some(m) => m,
                None => continue,
            };

            let role = message.get("role").and_then(|v| v.as_str()).unwrap_or(msg_type);

            // Extract content - can be string or array
            if let Some(content) = message.get("content") {
                let text = extract_message_text(content);
                if !text.is_empty() {
                    let truncated = if text.len() > 800 {
                        format!("{}...", &text[..800])
                    } else {
                        text
                    };
                    messages.push(format!("[{}]: {}", role, truncated));
                }
            }
        }

        // Stop once we have enough meaningful messages
        if messages.len() >= max_messages {
            break;
        }
    }

    messages
}

/// Extract human-readable text from message content
/// Handles both string content and array of content blocks
fn extract_message_text(content: &serde_json::Value) -> String {
    // If content is a plain string (human messages)
    if let Some(text) = content.as_str() {
        return text.to_string();
    }

    // If content is an array (tool results, thinking blocks, etc.)
    if let Some(arr) = content.as_array() {
        let mut texts = Vec::new();

        for item in arr {
            let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");

            match item_type {
                // Plain text content
                "text" => {
                    if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                        texts.push(text.to_string());
                    }
                }
                // Tool use - extract the tool name and brief description
                "tool_use" => {
                    if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                        // Only mention tool use briefly, don't include full input
                        texts.push(format!("[Used tool: {}]", name));
                    }
                }
                // Skip tool_result and thinking blocks - they're verbose and not useful for analysis
                "tool_result" | "thinking" => {}
                _ => {}
            }
        }

        return texts.join(" ");
    }

    String::new()
}

/// Analyze the session transcript with AI
#[tauri::command]
pub async fn analyze_session(
    project_path: String,
    project_name: String,
    project_language: Option<String>,
    project_framework: Option<String>,
    state: State<'_, AppState>,
) -> Result<SessionAnalysis, String> {
    // Get API key
    let api_key = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        crate::core::ai::get_api_key(&db)?
    };

    // Find session transcript
    let transcript_path = find_session_transcript(&project_path)
        .ok_or_else(|| "No session transcript found. Start a Claude Code session first.".to_string())?;

    // Read recent messages
    let messages = read_recent_messages(&transcript_path, 30);

    if messages.is_empty() {
        return Err("No recent messages found in session transcript.".to_string());
    }

    let messages_analyzed = messages.len() as u32;
    let transcript_excerpt = messages.join("\n\n");

    // Build analysis prompt
    let system = r#"You are an expert at analyzing Claude Code session transcripts to help developers improve their workflow.

Analyze the conversation and suggest specific, actionable improvements. Return ONLY a JSON object (no markdown, no explanation):

{
  "session_summary": "1-2 sentence summary of what the developer has been working on",
  "recommendations": [
    {
      "rec_type": "agent|test|pattern|doc|skill",
      "title": "Short actionable title (5-8 words)",
      "reason": "Why this is valuable based on the session context",
      "details": "Specific implementation details",
      "priority": 1
    }
  ]
}

RECOMMENDATION TYPES:

1. "agent" - Specialized Claude Code agent (subagent) for complex workflows
   - Look for: repeated multi-step tasks, domain-specific work, error-prone processes
   - Details should include: agent name, what it automates, key steps
   - Example: "tdd-agent" for test-driven development workflow

2. "test" - Specific test cases for code being written
   - Look for: new functions, bug fixes, edge cases mentioned, error handling
   - Details should include: test name, what it verifies, input/output expectations
   - Example: "Test parseModuleDoc returns null for files without headers"

3. "pattern" - Pattern to add to CLAUDE.md for future sessions
   - Look for: solutions discovered, workarounds found, conventions established, mistakes corrected
   - Details should include: the pattern text to add (concise, actionable)
   - Example: "Always use getSetting('anthropic_api_key') not getSetting('api_key')"

4. "doc" - Documentation updates needed for modified files
   - Look for: files edited without doc updates, new exports added, changed behavior
   - Details should include: file path and what needs documenting
   - Example: "Update EXPORTS section in useHealth.ts to include new refresh() function"

5. "skill" - Reusable prompt template for repeated tasks
   - Look for: similar prompts repeated, common task patterns, boilerplate requests
   - Details should include: skill name and the prompt template
   - Example: "component-creator: Create a new React component with TypeScript, tests, and docs"

GUIDELINES:
- Only suggest 2-4 HIGH-VALUE recommendations (quality over quantity)
- Be SPECIFIC - use actual names, paths, and details from the session
- Priority 1 = immediate impact, 3 = would be helpful, 5 = nice to have
- Skip obvious or trivial suggestions
- If the session is just exploration/reading, it's OK to return fewer recommendations
- Focus on things that would SAVE TIME or PREVENT MISTAKES in future sessions"#;

    let lang_info = match (project_language.as_deref(), project_framework.as_deref()) {
        (Some(lang), Some(fw)) => format!("{} with {}", lang, fw),
        (Some(lang), None) => lang.to_string(),
        (None, Some(fw)) => fw.to_string(),
        (None, None) => "Unknown stack".to_string(),
    };

    let prompt = format!(
        "Project: {} ({})\n\nRecent Claude Code session transcript:\n\n{}\n\nAnalyze and provide recommendations as JSON.",
        project_name,
        lang_info,
        transcript_excerpt
    );

    // Call Claude API
    let response = crate::core::ai::call_claude(&state.http_client, &api_key, system, &prompt).await?;

    // Parse response
    let analysis: SessionAnalysis = parse_analysis_response(&response, messages_analyzed)?;

    Ok(analysis)
}

/// Parse the AI response into structured analysis
fn parse_analysis_response(response: &str, messages_analyzed: u32) -> Result<SessionAnalysis, String> {
    // Try to extract JSON from the response
    let json_str = if let Some(start) = response.find('{') {
        if let Some(end) = response.rfind('}') {
            &response[start..=end]
        } else {
            response
        }
    } else {
        response
    };

    #[derive(Deserialize)]
    struct RawAnalysis {
        session_summary: Option<String>,
        recommendations: Option<Vec<SessionRecommendation>>,
    }

    let raw: RawAnalysis = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {}. Response: {}", e, &response[..response.len().min(200)]))?;

    Ok(SessionAnalysis {
        recommendations: raw.recommendations.unwrap_or_default(),
        session_summary: raw.session_summary.unwrap_or_else(|| "Session analysis complete.".to_string()),
        analyzed_at: chrono::Utc::now().to_rfc3339(),
        messages_analyzed,
    })
}

/// Get raw transcript content (for debugging)
#[tauri::command]
pub async fn get_session_transcript(
    project_path: String,
    max_messages: Option<usize>,
) -> Result<Vec<String>, String> {
    let transcript_path = find_session_transcript(&project_path)
        .ok_or_else(|| "No session transcript found.".to_string())?;

    let messages = read_recent_messages(&transcript_path, max_messages.unwrap_or(20));

    if messages.is_empty() {
        return Err("No messages found in transcript.".to_string());
    }

    Ok(messages)
}
