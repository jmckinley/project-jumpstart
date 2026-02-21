//! @module commands/performance
//! @description Tauri IPC commands for performance engineering analysis
//!
//! PURPOSE:
//! - Run full-stack performance analysis on a project
//! - Store and retrieve performance reviews from database
//! - List and delete performance review history
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection
//! - core::performance - Analysis engine
//! - models::performance - PerformanceReview type
//!
//! EXPORTS:
//! - analyze_performance - Run analysis, store result, return review
//! - list_performance_reviews - List reviews for a project
//! - get_performance_review - Get a single review by ID
//! - delete_performance_review - Delete a review by ID
//!
//! PATTERNS:
//! - All commands are async and return Result<T, String>
//! - Reviews are stored in performance_reviews table with JSON columns
//!
//! CLAUDE NOTES:
//! - analyze_performance needs project_path for scanning and project_id for DB storage
//! - Components, issues, and architecture are stored as JSON text

use tauri::State;

use crate::core::performance;
use crate::db::AppState;
use crate::models::performance::PerformanceReview;

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
