//! @module commands/performance
//! @description Tauri IPC commands for performance engineering analysis and remediation
//!
//! PURPOSE:
//! - Run full-stack performance analysis on a project
//! - Store and retrieve performance reviews from database
//! - List and delete performance review history
//! - Auto-remediate performance issues via AI for a single file
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection
//! - core::performance - Analysis engine
//! - core::ai - Claude API calls for remediation
//! - models::performance - PerformanceReview, PerformanceIssue, RemediationResult types
//!
//! EXPORTS:
//! - analyze_performance - Run analysis, store result, return review
//! - list_performance_reviews - List reviews for a project
//! - get_performance_review - Get a single review by ID
//! - delete_performance_review - Delete a review by ID
//! - remediate_performance_file - Fix performance issues in a single file via AI
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - Reviews are stored in performance_reviews table with JSON columns
//! - Remediation reads source, calls AI, writes corrected code back
//!
//! CLAUDE NOTES:
//! - analyze_performance needs project_path for scanning and project_id for DB storage
//! - Components, issues, and architecture are stored as JSON text
//! - remediate_performance_file skips files > 500KB
//! - strip_code_fences removes markdown code blocks from AI output

use tauri::State;

use crate::core::performance;
use crate::db::AppState;
use crate::models::performance::{PerformanceIssue, PerformanceReview, RemediationResult};

/// Run performance analysis on a project, store the result, and return it.
#[tauri::command]
pub async fn analyze_performance(
    project_path: String,
    state: State<'_, AppState>,
) -> Result<PerformanceReview, String> {
    let mut review = performance::analyze_project(&project_path);

    // Look up project ID from path
    let project_id = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        db.query_row(
            "SELECT id FROM projects WHERE path = ?1",
            [&project_path],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_default()
    };

    review.project_id = project_id.clone();

    // Store in database
    {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;

        let components_json =
            serde_json::to_string(&review.components).map_err(|e| e.to_string())?;
        let issues_json =
            serde_json::to_string(&review.issues).map_err(|e| e.to_string())?;
        let architecture_json =
            serde_json::to_string(&review.architecture_findings).map_err(|e| e.to_string())?;

        db.execute(
            "INSERT INTO performance_reviews (id, project_id, overall_score, components, issues, architecture, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                review.id,
                review.project_id,
                review.overall_score,
                components_json,
                issues_json,
                architecture_json,
                review.created_at,
            ],
        )
        .map_err(|e| format!("Failed to store performance review: {}", e))?;

        // Log activity
        let _ = crate::db::log_activity_db(
            &db,
            &review.project_id,
            "analyze",
            &format!("Performance analysis completed (score: {})", review.overall_score),
        );
    }

    Ok(review)
}

/// List all performance reviews for a project, most recent first.
#[tauri::command]
pub async fn list_performance_reviews(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<PerformanceReview>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, overall_score, components, issues, architecture, created_at
             FROM performance_reviews
             WHERE project_id = ?1
             ORDER BY created_at DESC
             LIMIT 20",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let reviews = stmt
        .query_map([&project_id], |row| {
            let components_json: String = row.get(3)?;
            let issues_json: String = row.get(4)?;
            let architecture_json: String = row.get(5)?;

            let components = serde_json::from_str(&components_json).unwrap_or(
                crate::models::performance::PerformanceComponents {
                    query_patterns: 0,
                    rendering: 0,
                    memory: 0,
                    bundle: 0,
                    caching: 0,
                    api_design: 0,
                },
            );
            let issues = serde_json::from_str(&issues_json).unwrap_or_default();
            let architecture_findings =
                serde_json::from_str(&architecture_json).unwrap_or_default();

            Ok(PerformanceReview {
                id: row.get(0)?,
                project_id: row.get(1)?,
                overall_score: row.get(2)?,
                components,
                issues,
                architecture_findings,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query reviews: {}", e))?;

    let mut result = Vec::new();
    for review in reviews {
        if let Ok(r) = review {
            result.push(r);
        }
    }

    Ok(result)
}

/// Get a single performance review by ID.
#[tauri::command]
pub async fn get_performance_review(
    review_id: String,
    state: State<'_, AppState>,
) -> Result<PerformanceReview, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    db.query_row(
        "SELECT id, project_id, overall_score, components, issues, architecture, created_at
         FROM performance_reviews
         WHERE id = ?1",
        [&review_id],
        |row| {
            let components_json: String = row.get(3)?;
            let issues_json: String = row.get(4)?;
            let architecture_json: String = row.get(5)?;

            let components = serde_json::from_str(&components_json).unwrap_or(
                crate::models::performance::PerformanceComponents {
                    query_patterns: 0,
                    rendering: 0,
                    memory: 0,
                    bundle: 0,
                    caching: 0,
                    api_design: 0,
                },
            );
            let issues = serde_json::from_str(&issues_json).unwrap_or_default();
            let architecture_findings =
                serde_json::from_str(&architecture_json).unwrap_or_default();

            Ok(PerformanceReview {
                id: row.get(0)?,
                project_id: row.get(1)?,
                overall_score: row.get(2)?,
                components,
                issues,
                architecture_findings,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| format!("Performance review not found: {}", e))
}

/// Delete a performance review by ID.
#[tauri::command]
pub async fn delete_performance_review(
    review_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    db.execute(
        "DELETE FROM performance_reviews WHERE id = ?1",
        [&review_id],
    )
    .map_err(|e| format!("Failed to delete review: {}", e))?;

    Ok(())
}

/// Strip markdown code fences from AI response.
/// Handles ```lang\n...\n``` and bare ``` fences.
fn strip_code_fences(text: &str) -> String {
    let trimmed = text.trim();

    // Check if it starts with ``` (with optional language tag)
    if !trimmed.starts_with("```") {
        return trimmed.to_string();
    }

    // Find the end of the first line (skip the opening fence + lang)
    let after_opening = match trimmed.find('\n') {
        Some(pos) => &trimmed[pos + 1..],
        None => return trimmed.to_string(),
    };

    // Strip trailing ``` if present
    let result = if after_opening.trim_end().ends_with("```") {
        let end = after_opening.rfind("```").unwrap_or(after_opening.len());
        &after_opening[..end]
    } else {
        after_opening
    };

    result.trim_end().to_string()
}

const MAX_FILE_SIZE: u64 = 500_000; // 500KB

/// Auto-remediate performance issues in a single file using AI.
/// Reads the file, sends it with the issues to Claude, writes corrected code back.
#[tauri::command]
pub async fn remediate_performance_file(
    file_path: String,
    issues: Vec<PerformanceIssue>,
    project_path: String,
    state: State<'_, AppState>,
) -> Result<Vec<RemediationResult>, String> {
    use crate::core::ai;

    // Get API key
    let api_key = {
        let db = state
            .db
            .lock()
            .map_err(|e| format!("Failed to lock database: {}", e))?;
        ai::get_api_key(&db)?
    };

    // Build absolute path
    let abs_path = if file_path.starts_with('/') || file_path.starts_with('\\') {
        file_path.clone()
    } else {
        format!("{}/{}", project_path, file_path)
    };

    // Check file size
    let metadata = std::fs::metadata(&abs_path)
        .map_err(|e| format!("Cannot read file {}: {}", abs_path, e))?;

    if metadata.len() > MAX_FILE_SIZE {
        return Ok(issues
            .iter()
            .map(|issue| RemediationResult {
                issue_id: issue.id.clone(),
                file_path: file_path.clone(),
                status: "skipped".to_string(),
                message: format!("File too large ({} bytes, max {})", metadata.len(), MAX_FILE_SIZE),
            })
            .collect());
    }

    // Read source file
    let file_content = std::fs::read_to_string(&abs_path)
        .map_err(|e| format!("Failed to read {}: {}", abs_path, e))?;

    // Build the prompt
    let system_prompt = "You are a senior performance engineer. You are given a source code file and a list of performance issues detected in it. For each issue, apply the suggested fix directly to the code. Return ONLY the complete corrected file content with no explanation, no markdown fences, and no commentary. Preserve all existing functionality, imports, and formatting. Only change what is necessary to fix the listed performance issues.";

    let mut issues_text = String::new();
    for (i, issue) in issues.iter().enumerate() {
        issues_text.push_str(&format!(
            "{}. [Line {}] {}: {}\n   Suggested fix: {}\n",
            i + 1,
            issue.line_number.unwrap_or(0),
            issue.title,
            issue.description,
            issue.suggestion,
        ));
    }

    let user_prompt = format!(
        "FILE: {}\n\nISSUES TO FIX:\n{}\nCURRENT FILE CONTENT:\n{}\n\nReturn the complete corrected file. Make ONLY the changes needed to fix the listed issues.",
        file_path, issues_text, file_content
    );

    // Call AI
    let response = ai::call_claude_long(
        &state.http_client,
        &api_key,
        system_prompt,
        &user_prompt,
    )
    .await?;

    // Strip code fences if present
    let corrected = strip_code_fences(&response);

    // Write corrected content back to disk
    std::fs::write(&abs_path, &corrected)
        .map_err(|e| format!("Failed to write {}: {}", abs_path, e))?;

    // Return success for all issues
    Ok(issues
        .iter()
        .map(|issue| RemediationResult {
            issue_id: issue.id.clone(),
            file_path: file_path.clone(),
            status: "fixed".to_string(),
            message: "Applied AI fix".to_string(),
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_code_fences_no_fences() {
        let input = "const x = 1;\nconst y = 2;";
        assert_eq!(strip_code_fences(input), input);
    }

    #[test]
    fn test_strip_code_fences_with_language() {
        let input = "```typescript\nconst x = 1;\nconst y = 2;\n```";
        assert_eq!(strip_code_fences(input), "const x = 1;\nconst y = 2;");
    }

    #[test]
    fn test_strip_code_fences_bare() {
        let input = "```\nconst x = 1;\n```";
        assert_eq!(strip_code_fences(input), "const x = 1;");
    }

    #[test]
    fn test_strip_code_fences_with_whitespace() {
        let input = "  ```rust\nfn main() {}\n```  ";
        assert_eq!(strip_code_fences(input), "fn main() {}");
    }

    #[test]
    fn test_remediation_result_serialization() {
        let result = RemediationResult {
            issue_id: "issue-1".to_string(),
            file_path: "src/main.rs".to_string(),
            status: "fixed".to_string(),
            message: "Applied fix".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"issueId\""));
        assert!(json.contains("\"filePath\""));
        assert!(json.contains("\"status\""));
        assert!(json.contains("\"message\""));
    }

    #[test]
    fn test_performance_issue_deserialization() {
        let json = r#"{
            "id": "issue-1",
            "category": "rendering",
            "severity": "warning",
            "title": "Inline handlers",
            "description": "Multiple inline handlers found",
            "filePath": "src/App.tsx",
            "lineNumber": 10,
            "suggestion": "Use useCallback"
        }"#;

        let issue: PerformanceIssue = serde_json::from_str(json).unwrap();
        assert_eq!(issue.id, "issue-1");
        assert_eq!(issue.file_path, Some("src/App.tsx".to_string()));
        assert_eq!(issue.line_number, Some(10));
    }
}
