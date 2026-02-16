//! @module commands/test_plans
//! @description Tauri IPC commands for test plan management and TDD workflow
//!
//! PURPOSE:
//! - CRUD operations for test plans, test cases, and test runs
//! - Execute tests via detected framework
//! - Generate AI-powered test suggestions
//! - Manage TDD workflow sessions (red/green/refactor)
//!
//! DEPENDENCIES:
//! - tauri - Command macro and State
//! - db::AppState - Database connection state
//! - models::test_plan - Test plan data types
//! - core::test_runner - Test framework detection and execution
//! - chrono - Timestamp generation
//! - uuid - Unique ID generation
//!
//! EXPORTS:
//! - list_test_plans - List all test plans for a project
//! - get_test_plan - Get a single test plan with summary stats
//! - create_test_plan - Create a new test plan
//! - update_test_plan - Update an existing test plan
//! - delete_test_plan - Delete a test plan and its cases
//! - list_test_cases - List test cases for a plan
//! - create_test_case - Create a new test case
//! - update_test_case - Update an existing test case
//! - delete_test_case - Delete a test case
//! - run_test_plan - Execute tests for a plan
//! - get_test_runs - Get test run history for a plan
//! - detect_test_framework - Detect test framework for a project
//! - generate_test_suggestions - AI-powered test case generation
//! - create_tdd_session - Start a new TDD workflow session
//! - update_tdd_session - Update TDD session phase/status
//! - get_tdd_session - Get current TDD session
//! - list_tdd_sessions - List TDD sessions for a project
//! - check_test_staleness - Detect stale tests by comparing source vs test modification
//! - generate_subagent_config - Generate Claude Code subagent markdown
//! - generate_hooks_config - Generate PostToolUse hooks JSON
//!
//! PATTERNS:
//! - All commands use AppState for DB access
//! - Test plans are scoped to a project_id
//! - Test runs track historical execution results
//! - TDD sessions guide users through red/green/refactor cycle
//!
//! CLAUDE NOTES:
//! - TestPlanStatus: draft, active, archived
//! - TestType: unit, integration, e2e
//! - TestPriority: low, medium, high, critical
//! - TDDPhase: red (failing test), green (minimal pass), refactor (cleanup)
//! - AI suggestions require API key from settings

use chrono::Utc;
use tauri::State;
use uuid::Uuid;

use crate::db::{self, AppState};
use crate::core::test_runner::{self};
use crate::models::test_plan::{
    GeneratedTestSuggestion, TDDPhase, TDDPhaseStatus, TDDSession, TestCase,
    TestCaseStatus, TestFrameworkInfo, TestPlan, TestPlanStatus, TestPlanSummary, TestPriority,
    TestRun, TestRunStatus, TestStalenessReport, TestStalenessResult, TestType,
};

// =============================================================================
// Test Plan CRUD
// =============================================================================

/// List all test plans for a project.
#[tauri::command]
pub async fn list_test_plans(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TestPlan>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, project_id, name, description, status, target_coverage, created_at, updated_at
             FROM test_plans WHERE project_id = ?1
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map([&project_id], map_test_plan_row)
        .map_err(|e| format!("Failed to query test plans: {}", e))?;

    let plans: Vec<TestPlan> = rows.filter_map(|r| r.ok()).collect();
    Ok(plans)
}

/// Get a test plan with aggregated summary statistics.
#[tauri::command]
pub async fn get_test_plan(
    plan_id: String,
    state: State<'_, AppState>,
) -> Result<TestPlanSummary, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get the plan
    let plan: TestPlan = db
        .query_row(
            "SELECT id, project_id, name, description, status, target_coverage, created_at, updated_at
             FROM test_plans WHERE id = ?1",
            [&plan_id],
            map_test_plan_row,
        )
        .map_err(|e| format!("Test plan not found: {}", e))?;

    // Get case counts by status
    let (total, passing, failing, pending, skipped) = db
        .query_row(
            "SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'passing' THEN 1 ELSE 0 END) as passing,
                SUM(CASE WHEN status = 'failing' THEN 1 ELSE 0 END) as failing,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
             FROM test_cases WHERE plan_id = ?1",
            [&plan_id],
            |row| {
                Ok((
                    row.get::<_, u32>(0)?,
                    row.get::<_, u32>(1)?,
                    row.get::<_, u32>(2)?,
                    row.get::<_, u32>(3)?,
                    row.get::<_, u32>(4)?,
                ))
            },
        )
        .unwrap_or((0, 0, 0, 0, 0));

    // Get last run
    let last_run: Option<TestRun> = db
        .query_row(
            "SELECT id, plan_id, status, total_tests, passed_tests, failed_tests, skipped_tests,
                    duration_ms, coverage_percent, stdout, stderr, started_at, completed_at
             FROM test_runs WHERE plan_id = ?1
             ORDER BY started_at DESC LIMIT 1",
            [&plan_id],
            map_test_run_row,
        )
        .ok();

    // Get coverage trend (last 10 runs)
    let mut coverage_stmt = db
        .prepare(
            "SELECT coverage_percent FROM test_runs
             WHERE plan_id = ?1 AND coverage_percent IS NOT NULL
             ORDER BY started_at DESC LIMIT 10",
        )
        .map_err(|e| format!("Failed to prepare coverage query: {}", e))?;

    let coverage_trend: Vec<f64> = coverage_stmt
        .query_map([&plan_id], |row| row.get::<_, f64>(0))
        .map_err(|e| format!("Failed to query coverage: {}", e))?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();

    let current_coverage = last_run.as_ref().and_then(|r| r.coverage_percent);

    Ok(TestPlanSummary {
        plan,
        total_cases: total,
        passing_cases: passing,
        failing_cases: failing,
        pending_cases: pending,
        skipped_cases: skipped,
        last_run,
        current_coverage,
        coverage_trend,
    })
}

/// Create a new test plan.
#[tauri::command]
pub async fn create_test_plan(
    project_id: String,
    name: String,
    description: String,
    target_coverage: Option<u32>,
    state: State<'_, AppState>,
) -> Result<TestPlan, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let coverage = target_coverage.unwrap_or(80);

    db.execute(
        "INSERT INTO test_plans (id, project_id, name, description, status, target_coverage, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'draft', ?5, ?6, ?7)",
        rusqlite::params![id, project_id, name, description, coverage, now_str, now_str],
    )
    .map_err(|e| format!("Failed to create test plan: {}", e))?;

    // Log activity
    let _ = db::log_activity_db(&db, &project_id, "test_plan", &format!("Created test plan: {}", &name));

    Ok(TestPlan {
        id,
        project_id,
        name,
        description,
        status: TestPlanStatus::Draft,
        target_coverage: coverage,
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing test plan.
#[tauri::command]
pub async fn update_test_plan(
    id: String,
    name: Option<String>,
    description: Option<String>,
    status: Option<String>,
    target_coverage: Option<u32>,
    state: State<'_, AppState>,
) -> Result<TestPlan, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get current values
    let current: TestPlan = db
        .query_row(
            "SELECT id, project_id, name, description, status, target_coverage, created_at, updated_at
             FROM test_plans WHERE id = ?1",
            [&id],
            map_test_plan_row,
        )
        .map_err(|e| format!("Test plan not found: {}", e))?;

    let new_name = name.unwrap_or(current.name);
    let new_desc = description.unwrap_or(current.description);
    let new_status = status.unwrap_or_else(|| current.status.to_string());
    let new_coverage = target_coverage.unwrap_or(current.target_coverage);
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    db.execute(
        "UPDATE test_plans SET name = ?1, description = ?2, status = ?3, target_coverage = ?4, updated_at = ?5
         WHERE id = ?6",
        rusqlite::params![new_name, new_desc, new_status, new_coverage, now_str, id],
    )
    .map_err(|e| format!("Failed to update test plan: {}", e))?;

    let parsed_status: TestPlanStatus = new_status.parse().unwrap_or(TestPlanStatus::Draft);

    Ok(TestPlan {
        id,
        project_id: current.project_id,
        name: new_name,
        description: new_desc,
        status: parsed_status,
        target_coverage: new_coverage,
        created_at: current.created_at,
        updated_at: now,
    })
}

/// Delete a test plan and all its test cases.
#[tauri::command]
pub async fn delete_test_plan(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get plan info for activity log
    let plan_info: Option<(String, String)> = db
        .query_row(
            "SELECT name, project_id FROM test_plans WHERE id = ?1",
            [&id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();

    // Delete test case results first (FK constraint)
    db.execute(
        "DELETE FROM test_case_results WHERE case_id IN (SELECT id FROM test_cases WHERE plan_id = ?1)",
        [&id],
    )
    .map_err(|e| format!("Failed to delete test case results: {}", e))?;

    // Delete test runs
    db.execute("DELETE FROM test_runs WHERE plan_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete test runs: {}", e))?;

    // Delete test cases
    db.execute("DELETE FROM test_cases WHERE plan_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete test cases: {}", e))?;

    // Delete the plan
    let rows = db
        .execute("DELETE FROM test_plans WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete test plan: {}", e))?;

    if rows == 0 {
        return Err(format!("Test plan not found: {}", id));
    }

    // Log activity
    if let Some((name, project_id)) = plan_info {
        let _ = db::log_activity_db(&db, &project_id, "test_plan", &format!("Deleted test plan: {}", name));
    }

    Ok(())
}

// =============================================================================
// Test Case CRUD
// =============================================================================

/// List all test cases for a plan.
#[tauri::command]
pub async fn list_test_cases(
    plan_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TestCase>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = db
        .prepare(
            "SELECT id, plan_id, name, description, file_path, test_type, priority, status, last_run_at, created_at, updated_at
             FROM test_cases WHERE plan_id = ?1
             ORDER BY
                CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                name ASC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map([&plan_id], map_test_case_row)
        .map_err(|e| format!("Failed to query test cases: {}", e))?;

    let cases: Vec<TestCase> = rows.filter_map(|r| r.ok()).collect();
    Ok(cases)
}

/// Create a new test case.
#[tauri::command]
pub async fn create_test_case(
    plan_id: String,
    name: String,
    description: String,
    file_path: Option<String>,
    test_type: Option<String>,
    priority: Option<String>,
    state: State<'_, AppState>,
) -> Result<TestCase, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let tt = test_type.unwrap_or_else(|| "unit".to_string());
    let prio = priority.unwrap_or_else(|| "medium".to_string());

    db.execute(
        "INSERT INTO test_cases (id, plan_id, name, description, file_path, test_type, priority, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9)",
        rusqlite::params![id, plan_id, name, description, file_path, tt, prio, now_str, now_str],
    )
    .map_err(|e| format!("Failed to create test case: {}", e))?;

    let parsed_type: TestType = tt.parse().unwrap_or(TestType::Unit);
    let parsed_priority: TestPriority = prio.parse().unwrap_or(TestPriority::Medium);

    Ok(TestCase {
        id,
        plan_id,
        name,
        description,
        file_path,
        test_type: parsed_type,
        priority: parsed_priority,
        status: TestCaseStatus::Pending,
        last_run_at: None,
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing test case.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_test_case(
    id: String,
    name: Option<String>,
    description: Option<String>,
    file_path: Option<String>,
    test_type: Option<String>,
    priority: Option<String>,
    status: Option<String>,
    state: State<'_, AppState>,
) -> Result<TestCase, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get current values
    let current: TestCase = db
        .query_row(
            "SELECT id, plan_id, name, description, file_path, test_type, priority, status, last_run_at, created_at, updated_at
             FROM test_cases WHERE id = ?1",
            [&id],
            map_test_case_row,
        )
        .map_err(|e| format!("Test case not found: {}", e))?;

    let new_name = name.unwrap_or(current.name);
    let new_desc = description.unwrap_or(current.description);
    let new_path = file_path.or(current.file_path);
    let new_type = test_type.unwrap_or_else(|| current.test_type.to_string());
    let new_priority = priority.unwrap_or_else(|| current.priority.to_string());
    let new_status = status.unwrap_or_else(|| current.status.to_string());
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    db.execute(
        "UPDATE test_cases SET name = ?1, description = ?2, file_path = ?3, test_type = ?4, priority = ?5, status = ?6, updated_at = ?7
         WHERE id = ?8",
        rusqlite::params![new_name, new_desc, new_path, new_type, new_priority, new_status, now_str, id],
    )
    .map_err(|e| format!("Failed to update test case: {}", e))?;

    let parsed_type: TestType = new_type.parse().unwrap_or(TestType::Unit);
    let parsed_priority: TestPriority = new_priority.parse().unwrap_or(TestPriority::Medium);
    let parsed_status: TestCaseStatus = new_status.parse().unwrap_or(TestCaseStatus::Pending);

    Ok(TestCase {
        id,
        plan_id: current.plan_id,
        name: new_name,
        description: new_desc,
        file_path: new_path,
        test_type: parsed_type,
        priority: parsed_priority,
        status: parsed_status,
        last_run_at: current.last_run_at,
        created_at: current.created_at,
        updated_at: now,
    })
}

/// Delete a test case.
#[tauri::command]
pub async fn delete_test_case(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Delete associated results
    db.execute("DELETE FROM test_case_results WHERE case_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete test case results: {}", e))?;

    let rows = db
        .execute("DELETE FROM test_cases WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete test case: {}", e))?;

    if rows == 0 {
        return Err(format!("Test case not found: {}", id));
    }

    Ok(())
}

// =============================================================================
// Test Execution
// =============================================================================

/// Detect the test framework for a project.
#[tauri::command]
pub async fn detect_project_test_framework(
    project_path: String,
) -> Result<Option<TestFrameworkInfo>, String> {
    Ok(test_runner::detect_test_framework(&project_path))
}

/// Run tests for a test plan.
#[tauri::command]
pub async fn run_test_plan(
    plan_id: String,
    project_path: String,
    with_coverage: bool,
    state: State<'_, AppState>,
) -> Result<TestRun, String> {
    // Detect framework
    let framework = test_runner::detect_test_framework(&project_path)
        .ok_or_else(|| "No test framework detected".to_string())?;

    // Create a test run record
    let run_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        db.execute(
            "INSERT INTO test_runs (id, plan_id, status, started_at)
             VALUES (?1, ?2, 'running', ?3)",
            rusqlite::params![run_id, plan_id, now_str],
        )
        .map_err(|e| format!("Failed to create test run: {}", e))?;
    }

    // Run tests (this can take a while)
    let result = test_runner::run_tests(&project_path, &framework, with_coverage);

    // Update the run record with results
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let completed_at = Utc::now();
    let completed_str = completed_at.to_rfc3339();

    match result {
        Ok(exec_result) => {
            let status = if exec_result.success { "passed" } else { "failed" };

            db.execute(
                "UPDATE test_runs SET status = ?1, total_tests = ?2, passed_tests = ?3, failed_tests = ?4,
                 skipped_tests = ?5, duration_ms = ?6, coverage_percent = ?7, stdout = ?8, stderr = ?9, completed_at = ?10
                 WHERE id = ?11",
                rusqlite::params![
                    status,
                    exec_result.total,
                    exec_result.passed,
                    exec_result.failed,
                    exec_result.skipped,
                    exec_result.duration_ms as i64,
                    exec_result.coverage_percent,
                    exec_result.stdout,
                    exec_result.stderr,
                    completed_str,
                    run_id,
                ],
            )
            .map_err(|e| format!("Failed to update test run: {}", e))?;

            // Update test case statuses based on results
            for test_result in &exec_result.test_results {
                let case_status = if test_result.passed { "passing" } else { "failing" };

                // Try to match by name (best effort)
                db.execute(
                    "UPDATE test_cases SET status = ?1, last_run_at = ?2, updated_at = ?2
                     WHERE plan_id = ?3 AND name LIKE ?4",
                    rusqlite::params![case_status, completed_str, plan_id, format!("%{}%", test_result.name)],
                )
                .ok();
            }

            // Log activity
            if let Ok(project_id) = db.query_row::<String, _, _>(
                "SELECT project_id FROM test_plans WHERE id = ?1",
                [&plan_id],
                |row| row.get(0),
            ) {
                let msg = format!(
                    "Test run completed: {} passed, {} failed",
                    exec_result.passed, exec_result.failed
                );
                let _ = db::log_activity_db(&db, &project_id, "test_run", &msg);
            }

            // Return the completed run
            let run = db
                .query_row(
                    "SELECT id, plan_id, status, total_tests, passed_tests, failed_tests, skipped_tests,
                            duration_ms, coverage_percent, stdout, stderr, started_at, completed_at
                     FROM test_runs WHERE id = ?1",
                    [&run_id],
                    map_test_run_row,
                )
                .map_err(|e| format!("Failed to fetch test run: {}", e))?;

            Ok(run)
        }
        Err(e) => {
            db.execute(
                "UPDATE test_runs SET status = 'failed', stderr = ?1, completed_at = ?2 WHERE id = ?3",
                rusqlite::params![e, completed_str, run_id],
            )
            .ok();

            Err(format!("Test execution failed: {}", e))
        }
    }
}

/// Get test run history for a plan.
#[tauri::command]
pub async fn get_test_runs(
    plan_id: String,
    limit: Option<u32>,
    state: State<'_, AppState>,
) -> Result<Vec<TestRun>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let limit = limit.unwrap_or(10);

    let mut stmt = db
        .prepare(
            "SELECT id, plan_id, status, total_tests, passed_tests, failed_tests, skipped_tests,
                    duration_ms, coverage_percent, stdout, stderr, started_at, completed_at
             FROM test_runs WHERE plan_id = ?1
             ORDER BY started_at DESC LIMIT ?2",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map(rusqlite::params![plan_id, limit], map_test_run_row)
        .map_err(|e| format!("Failed to query test runs: {}", e))?;

    let runs: Vec<TestRun> = rows.filter_map(|r| r.ok()).collect();
    Ok(runs)
}

// =============================================================================
// AI Test Generation
// =============================================================================

/// Generate AI-powered test case suggestions based on code changes.
#[tauri::command]
pub async fn generate_test_suggestions(
    project_path: String,
    file_paths: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Vec<GeneratedTestSuggestion>, String> {
    // Get API key (in a block to release DB lock before async call)
    let api_key = {
        let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
        crate::core::ai::get_api_key(&db)?
    };
    // DB lock released here at end of block

    // Read file contents to analyze
    let mut file_contents = String::new();
    if let Some(paths) = file_paths {
        for path in paths.iter().take(5) {
            // Limit to 5 files
            let full_path = std::path::Path::new(&project_path).join(path);
            if let Ok(content) = std::fs::read_to_string(&full_path) {
                file_contents.push_str(&format!("\n\n--- {} ---\n{}", path, content));
            }
        }
    } else {
        // Try to get recently changed files from git
        if let Ok(output) = std::process::Command::new("git")
            .args(["diff", "--name-only", "HEAD~5"])
            .current_dir(&project_path)
            .output()
        {
            let changed_files = String::from_utf8_lossy(&output.stdout);
            for path in changed_files.lines().take(5) {
                let full_path = std::path::Path::new(&project_path).join(path);
                if let Ok(content) = std::fs::read_to_string(&full_path) {
                    file_contents.push_str(&format!("\n\n--- {} ---\n{}", path, content));
                }
            }
        }
    }

    if file_contents.is_empty() {
        return Ok(vec![GeneratedTestSuggestion {
            name: "Add test for main functionality".to_string(),
            description: "No code changes detected. Consider adding tests for core features.".to_string(),
            test_type: TestType::Unit,
            priority: TestPriority::Medium,
            rationale: "General testing best practice".to_string(),
            suggested_file_path: None,
        }]);
    }

    // Call AI to generate suggestions
    let prompt = format!(
        r#"Analyze the following code and suggest specific test cases that should be written.
Focus on:
1. Edge cases and boundary conditions
2. Error handling paths
3. Integration points between modules
4. Critical business logic

For each suggestion provide a JSON object with:
- name: concise test name (e.g., "should handle empty input gracefully")
- description: what the test verifies (1-2 sentences)
- testType: "unit", "integration", or "e2e"
- priority: "low", "medium", "high", or "critical"
- rationale: why this test is important
- suggestedFilePath: where to put the test (optional)

Return a JSON array of suggestions. Only include the JSON array, no other text.

Code to analyze:
{}

Return 3-5 high-quality test suggestions."#,
        file_contents
    );

    let system_prompt = "You are a test-driven development expert. Generate specific, actionable test case suggestions based on code analysis. Return only valid JSON.";
    let response = crate::core::ai::call_claude(&state.http_client, &api_key, system_prompt, &prompt).await?;

    // Parse the response
    parse_test_suggestions(&response)
}

fn parse_test_suggestions(response: &str) -> Result<Vec<GeneratedTestSuggestion>, String> {
    // Try to find JSON array in response
    let json_start = response.find('[').unwrap_or(0);
    let json_end = response.rfind(']').map(|i| i + 1).unwrap_or(response.len());
    let json_str = &response[json_start..json_end];

    let suggestions: Vec<serde_json::Value> = serde_json::from_str(json_str)
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    let mut result = Vec::new();
    for item in suggestions {
        let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown test");
        let description = item.get("description").and_then(|v| v.as_str()).unwrap_or("");
        let test_type_str = item.get("testType").and_then(|v| v.as_str()).unwrap_or("unit");
        let priority_str = item.get("priority").and_then(|v| v.as_str()).unwrap_or("medium");
        let rationale = item.get("rationale").and_then(|v| v.as_str()).unwrap_or("");
        let suggested_path = item.get("suggestedFilePath").and_then(|v| v.as_str());

        result.push(GeneratedTestSuggestion {
            name: name.to_string(),
            description: description.to_string(),
            test_type: test_type_str.parse().unwrap_or(TestType::Unit),
            priority: priority_str.parse().unwrap_or(TestPriority::Medium),
            rationale: rationale.to_string(),
            suggested_file_path: suggested_path.map(|s| s.to_string()),
        });
    }

    Ok(result)
}

// =============================================================================
// TDD Workflow
// =============================================================================

/// Create a new TDD workflow session.
#[tauri::command]
pub async fn create_tdd_session(
    project_id: String,
    feature_name: String,
    test_file_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<TDDSession, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();

    // Generate initial prompts
    let red_prompt = generate_red_prompt(&feature_name);

    db.execute(
        "INSERT INTO tdd_sessions (id, project_id, feature_name, test_file_path, current_phase, phase_status, red_prompt, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'red', 'active', ?5, ?6, ?7)",
        rusqlite::params![id, project_id, feature_name, test_file_path, red_prompt, now_str, now_str],
    )
    .map_err(|e| format!("Failed to create TDD session: {}", e))?;

    // Log activity
    let _ = db::log_activity_db(&db, &project_id, "tdd", &format!("Started TDD session: {}", &feature_name));

    Ok(TDDSession {
        id,
        project_id,
        feature_name,
        test_file_path,
        current_phase: TDDPhase::Red,
        phase_status: TDDPhaseStatus::Active,
        red_prompt: Some(red_prompt),
        red_output: None,
        green_prompt: None,
        green_output: None,
        refactor_prompt: None,
        refactor_output: None,
        created_at: now,
        updated_at: now,
        completed_at: None,
    })
}

/// Update TDD session phase and status.
#[tauri::command]
pub async fn update_tdd_session(
    id: String,
    phase: Option<String>,
    phase_status: Option<String>,
    output: Option<String>,
    state: State<'_, AppState>,
) -> Result<TDDSession, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get current session
    let current: TDDSession = db
        .query_row(
            "SELECT id, project_id, feature_name, test_file_path, current_phase, phase_status,
                    red_prompt, red_output, green_prompt, green_output, refactor_prompt, refactor_output,
                    created_at, updated_at, completed_at
             FROM tdd_sessions WHERE id = ?1",
            [&id],
            map_tdd_session_row,
        )
        .map_err(|e| format!("TDD session not found: {}", e))?;

    let now = Utc::now();
    let now_str = now.to_rfc3339();

    let new_phase = phase
        .as_ref()
        .map(|p| p.parse().unwrap_or(TDDPhase::Red))
        .unwrap_or(current.current_phase.clone());

    let new_status = phase_status
        .as_ref()
        .map(|s| s.parse().unwrap_or(TDDPhaseStatus::Active))
        .unwrap_or(current.phase_status.clone());

    // Update output for current phase
    let output_column = match current.current_phase {
        TDDPhase::Red => "red_output",
        TDDPhase::Green => "green_output",
        TDDPhase::Refactor => "refactor_output",
    };

    if let Some(ref out) = output {
        db.execute(
            &format!("UPDATE tdd_sessions SET {} = ?1, updated_at = ?2 WHERE id = ?3", output_column),
            rusqlite::params![out, now_str, id],
        )
        .map_err(|e| format!("Failed to update output: {}", e))?;
    }

    // If advancing phase, generate next prompt
    if phase.is_some() && new_phase != current.current_phase {
        let (prompt_column, prompt_content) = match new_phase {
            TDDPhase::Green => ("green_prompt", Some(generate_green_prompt(&current.feature_name))),
            TDDPhase::Refactor => ("refactor_prompt", Some(generate_refactor_prompt(&current.feature_name))),
            TDDPhase::Red => ("red_prompt", None),
        };

        if let Some(content) = prompt_content {
            db.execute(
                &format!("UPDATE tdd_sessions SET {} = ?1, current_phase = ?2, phase_status = ?3, updated_at = ?4 WHERE id = ?5", prompt_column),
                rusqlite::params![content, new_phase.to_string(), new_status.to_string(), now_str, id],
            )
            .map_err(|e| format!("Failed to update phase: {}", e))?;
        }
    } else {
        db.execute(
            "UPDATE tdd_sessions SET current_phase = ?1, phase_status = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![new_phase.to_string(), new_status.to_string(), now_str, id],
        )
        .map_err(|e| format!("Failed to update session: {}", e))?;
    }

    // Check if completed
    let _completed_at = if new_phase == TDDPhase::Refactor && new_status == TDDPhaseStatus::Complete {
        db.execute(
            "UPDATE tdd_sessions SET completed_at = ?1 WHERE id = ?2",
            rusqlite::params![now_str, id],
        )
        .ok();
        Some(now)
    } else {
        None
    };

    // Fetch updated session
    db.query_row(
        "SELECT id, project_id, feature_name, test_file_path, current_phase, phase_status,
                red_prompt, red_output, green_prompt, green_output, refactor_prompt, refactor_output,
                created_at, updated_at, completed_at
         FROM tdd_sessions WHERE id = ?1",
        [&id],
        map_tdd_session_row,
    )
    .map_err(|e| format!("Failed to fetch updated session: {}", e))
}

/// Get a TDD session by ID.
#[tauri::command]
pub async fn get_tdd_session(id: String, state: State<'_, AppState>) -> Result<TDDSession, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;

    db.query_row(
        "SELECT id, project_id, feature_name, test_file_path, current_phase, phase_status,
                red_prompt, red_output, green_prompt, green_output, refactor_prompt, refactor_output,
                created_at, updated_at, completed_at
         FROM tdd_sessions WHERE id = ?1",
        [&id],
        map_tdd_session_row,
    )
    .map_err(|e| format!("TDD session not found: {}", e))
}

/// List TDD sessions for a project.
#[tauri::command]
pub async fn list_tdd_sessions(
    project_id: String,
    include_completed: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<TDDSession>, String> {
    let db = state.db.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let include_completed = include_completed.unwrap_or(false);

    let query = if include_completed {
        "SELECT id, project_id, feature_name, test_file_path, current_phase, phase_status,
                red_prompt, red_output, green_prompt, green_output, refactor_prompt, refactor_output,
                created_at, updated_at, completed_at
         FROM tdd_sessions WHERE project_id = ?1
         ORDER BY updated_at DESC"
    } else {
        "SELECT id, project_id, feature_name, test_file_path, current_phase, phase_status,
                red_prompt, red_output, green_prompt, green_output, refactor_prompt, refactor_output,
                created_at, updated_at, completed_at
         FROM tdd_sessions WHERE project_id = ?1 AND completed_at IS NULL
         ORDER BY updated_at DESC"
    };

    let mut stmt = db.prepare(query).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map([&project_id], map_tdd_session_row)
        .map_err(|e| format!("Failed to query TDD sessions: {}", e))?;

    let sessions: Vec<TDDSession> = rows.filter_map(|r| r.ok()).collect();
    Ok(sessions)
}

// =============================================================================
// Test Staleness Detection
// =============================================================================

/// Check for stale tests by comparing recently changed source files against their test files.
#[tauri::command]
pub async fn check_test_staleness(
    project_path: String,
    lookback_commits: Option<u32>,
) -> Result<TestStalenessReport, String> {
    let lookback = lookback_commits.unwrap_or(10);
    let now = Utc::now().to_rfc3339();

    // Get recently changed files from git
    let output = std::process::Command::new("git")
        .args(["diff", "--name-only", &format!("HEAD~{}", lookback), "HEAD"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        // Might not have enough commits; return empty report
        return Ok(TestStalenessReport {
            checked_files: 0,
            stale_count: 0,
            results: vec![],
            checked_at: now,
        });
    }

    let changed_files: std::collections::HashSet<String> =
        String::from_utf8_lossy(&output.stdout)
            .lines()
            .map(|s| s.to_string())
            .collect();

    // Filter to material source files
    let source_files: Vec<String> = changed_files
        .iter()
        .filter(|f| is_material_source_file(f))
        .cloned()
        .collect();

    let mut results = Vec::new();

    for src in &source_files {
        let test_file = find_corresponding_test_file(src, &project_path);

        match test_file {
            Some(ref tf) if tf == "__inline__" => {
                // Rust inline tests: if source was modified, tests were too
                results.push(TestStalenessResult {
                    source_file: src.clone(),
                    test_file: None,
                    is_stale: false,
                    reason: "Inline tests co-modified with source".to_string(),
                });
            }
            Some(ref tf) => {
                let is_stale = !changed_files.contains(tf);
                let reason = if is_stale {
                    format!("{} was modified but {} was not", src, tf)
                } else {
                    "Test file was also modified".to_string()
                };
                results.push(TestStalenessResult {
                    source_file: src.clone(),
                    test_file: Some(tf.clone()),
                    is_stale,
                    reason,
                });
            }
            None => {
                // No test file found — not stale, just untested
                results.push(TestStalenessResult {
                    source_file: src.clone(),
                    test_file: None,
                    is_stale: false,
                    reason: "No corresponding test file found".to_string(),
                });
            }
        }
    }

    let stale_count = results.iter().filter(|r| r.is_stale).count() as u32;

    Ok(TestStalenessReport {
        checked_files: source_files.len() as u32,
        stale_count,
        results,
        checked_at: now,
    })
}

/// Check if a file path is a material source file (not test, config, etc.)
fn is_material_source_file(path: &str) -> bool {
    let source_exts = [".ts", ".tsx", ".js", ".jsx", ".rs", ".py", ".go"];
    let has_source_ext = source_exts.iter().any(|ext| path.ends_with(ext));
    if !has_source_ext {
        return false;
    }

    // Exclude test files
    let test_patterns = [".test.", ".spec.", "_test.", "test_", "__tests__", ".stories."];
    if test_patterns.iter().any(|pat| path.contains(pat)) {
        return false;
    }

    // Exclude config and declaration files
    let config_patterns = ["config.", ".config", ".d.ts", "mod.rs"];
    if config_patterns.iter().any(|pat| path.contains(pat)) {
        return false;
    }

    true
}

/// Find the corresponding test file for a given source file.
/// Returns Some("__inline__") for Rust files with inline tests.
fn find_corresponding_test_file(source: &str, project_path: &str) -> Option<String> {
    let path = std::path::Path::new(source);
    let dir = path.parent().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
    let file_name = path.file_name()?.to_string_lossy().to_string();
    let ext = path.extension()?.to_string_lossy().to_string();
    let stem = path.file_stem()?.to_string_lossy().to_string();

    match ext.as_str() {
        "ts" | "tsx" | "js" | "jsx" => {
            // Check Name.test.ext, Name.spec.ext
            for test_suffix in &["test", "spec"] {
                let candidate = if dir.is_empty() {
                    format!("{}.{}.{}", stem, test_suffix, ext)
                } else {
                    format!("{}/{}.{}.{}", dir, stem, test_suffix, ext)
                };
                let full = std::path::Path::new(project_path).join(&candidate);
                if full.exists() {
                    return Some(candidate);
                }
            }
            // Check __tests__/ directory
            let tests_candidate = if dir.is_empty() {
                format!("__tests__/{}.test.{}", stem, ext)
            } else {
                format!("{}/__tests__/{}.test.{}", dir, stem, ext)
            };
            let full = std::path::Path::new(project_path).join(&tests_candidate);
            if full.exists() {
                return Some(tests_candidate);
            }
            None
        }
        "rs" => {
            // Rust: check for inline #[cfg(test)] module
            let full = std::path::Path::new(project_path).join(source);
            if let Ok(content) = std::fs::read_to_string(&full) {
                if content.contains("#[cfg(test)]") {
                    return Some("__inline__".to_string());
                }
            }
            None
        }
        "py" => {
            // Python: test_name.py in same dir or tests/ dir
            let candidate = if dir.is_empty() {
                format!("test_{}", file_name)
            } else {
                format!("{}/test_{}", dir, file_name)
            };
            let full = std::path::Path::new(project_path).join(&candidate);
            if full.exists() {
                return Some(candidate);
            }
            let tests_candidate = if dir.is_empty() {
                format!("tests/test_{}", file_name)
            } else {
                format!("{}/tests/test_{}", dir, file_name)
            };
            let full = std::path::Path::new(project_path).join(&tests_candidate);
            if full.exists() {
                return Some(tests_candidate);
            }
            None
        }
        "go" => {
            let candidate = if dir.is_empty() {
                format!("{}_test.go", stem)
            } else {
                format!("{}/{}_test.go", dir, stem)
            };
            let full = std::path::Path::new(project_path).join(&candidate);
            if full.exists() {
                return Some(candidate);
            }
            None
        }
        _ => None,
    }
}

// =============================================================================
// Subagent & Hooks Generation
// =============================================================================

/// Generate Claude Code subagent configuration markdown.
#[tauri::command]
pub async fn generate_subagent_config(agent_type: String) -> Result<String, String> {
    let config = match agent_type.as_str() {
        "tdd-test-writer" => r#"# .claude/agents/tdd-test-writer.md
---
name: tdd-test-writer
description: Writes failing integration tests for TDD red phase
tools: Read, Glob, Grep, Write, Edit, Bash
---

You are a TDD Test Writer. Your job is to write FAILING tests only.

## Your Mission
Write a failing test that captures the expected behavior for the feature being implemented.

## Critical Rules
1. Do NOT write any implementation code
2. Do NOT make the test pass
3. Run the test to CONFIRM it fails
4. Stop when you have a failing test

## Process
1. Understand the feature requirements
2. Write a focused test that will fail
3. Run the test: `pnpm vitest run [test-file] --reporter=verbose`
4. Confirm the test fails for the right reason

## Output Format
Return:
- Test file path
- Test output showing failure
- Confirmation message: "Test fails as expected: [reason]"

Do NOT proceed to implementation. Your job ends when tests fail."#.to_string(),

        "tdd-implementer" => r#"# .claude/agents/tdd-implementer.md
---
name: tdd-implementer
description: Implements minimal code to make tests pass for TDD green phase
tools: Read, Glob, Grep, Write, Edit, Bash
---

You are a TDD Implementer. Your job is to write MINIMAL code to make tests pass.

## Your Mission
Write the simplest possible implementation that makes all failing tests pass.

## Critical Rules
1. Only write enough code to make tests pass
2. Do NOT add extra features or optimizations
3. Do NOT refactor - that's the next phase
4. Keep it simple and direct

## Process
1. Read the failing test(s)
2. Write minimal implementation
3. Run tests: `pnpm vitest run [test-file] --reporter=verbose`
4. Repeat until all tests pass

## Output Format
Return:
- Files modified
- Test output showing all pass
- Confirmation message: "All tests pass"

Do NOT refactor or optimize. Your job ends when tests pass."#.to_string(),

        "tdd-refactorer" => r#"# .claude/agents/tdd-refactorer.md
---
name: tdd-refactorer
description: Refactors code while maintaining passing tests for TDD refactor phase
tools: Read, Glob, Grep, Write, Edit, Bash
---

You are a TDD Refactorer. Your job is to improve code quality while keeping tests green.

## Your Mission
Clean up the implementation without changing behavior.

## Critical Rules
1. Do NOT change test behavior
2. Run tests after EVERY change
3. If tests fail, revert immediately
4. Focus on readability and maintainability

## Refactoring Checklist
- [ ] Remove code duplication
- [ ] Improve naming (variables, functions)
- [ ] Extract helper functions if needed
- [ ] Simplify complex conditionals
- [ ] Add type annotations where missing

## Process
1. Identify one improvement
2. Make the change
3. Run tests: `pnpm vitest run [test-file] --reporter=verbose`
4. If pass, commit mentally and continue
5. If fail, revert and try different approach

## Output Format
Return:
- Changes made (or "no refactoring needed")
- Test output showing all still pass
- Confirmation message: "Refactoring complete, all tests pass""#.to_string(),

        _ => return Err(format!("Unknown agent type: {}", agent_type)),
    };

    Ok(config)
}

/// Generate PostToolUse hooks configuration JSON.
#[tauri::command]
pub async fn generate_hooks_config(
    test_command: String,
    file_patterns: Option<Vec<String>>,
) -> Result<String, String> {
    let patterns = file_patterns.unwrap_or_else(|| vec!["*.ts".to_string(), "*.tsx".to_string()]);
    let pattern_str = patterns.join("|");

    let config = serde_json::json!({
        "hooks": {
            "PostToolUse": [{
                "matcher": {
                    "tool": "Edit|Write",
                    "path": pattern_str
                },
                "hooks": [{
                    "type": "command",
                    "command": test_command,
                    "timeout": 60000
                }]
            }]
        }
    });

    serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {}", e))
}

// =============================================================================
// Prompt Generation Helpers
// =============================================================================

fn generate_red_prompt(feature_name: &str) -> String {
    format!(
        r#"## TDD Red Phase: Write Failing Test

**Feature:** {}

### Instructions
Write a FAILING test that captures the expected behavior.

1. Create or update the test file
2. Write a focused test case
3. Run the test to confirm it FAILS
4. Do NOT write implementation code

### Example Prompt for Claude Code
```
Write a FAILING integration test for {}.
- Focus on the expected behavior
- Use descriptive test names
- Do NOT write implementation yet
- Run the test to confirm it fails

After writing, run: pnpm vitest run [test-file] --reporter=verbose
```

### Expected Outcome
Test fails with a clear error message like:
- "Cannot find element..."
- "Expected X but received Y"
- "Function not defined..."

Click "Confirm Failing" when the test fails as expected."#,
        feature_name, feature_name
    )
}

fn generate_green_prompt(feature_name: &str) -> String {
    format!(
        r#"## TDD Green Phase: Make Tests Pass

**Feature:** {}

### Instructions
Write MINIMAL code to make the failing test(s) pass.

1. Read the failing test carefully
2. Write the simplest implementation
3. Run tests until they pass
4. Do NOT refactor yet

### Example Prompt for Claude Code
```
The test for {} is failing.
Write the MINIMAL implementation to make it pass.
- Keep it simple - no optimizations
- No extra features
- Just enough to pass

After implementing, run: pnpm vitest run [test-file] --reporter=verbose
```

### Expected Outcome
All tests pass. The implementation may not be elegant yet - that's OK.

Click "Confirm Passing" when all tests pass."#,
        feature_name, feature_name
    )
}

fn generate_refactor_prompt(feature_name: &str) -> String {
    format!(
        r#"## TDD Refactor Phase: Clean Up

**Feature:** {}

### Instructions
Improve code quality while keeping tests green.

1. Identify improvements (naming, duplication, structure)
2. Make ONE change at a time
3. Run tests after EACH change
4. If tests fail, revert

### Example Prompt for Claude Code
```
The implementation for {} is working but needs cleanup.
Refactor the code to improve quality:
- Better variable/function names
- Remove duplication
- Simplify complex logic
- Add types where missing

Run tests after each change: pnpm vitest run [test-file] --reporter=verbose
If tests fail, revert the change.
```

### Refactoring Checklist
- [ ] Meaningful names
- [ ] No duplication
- [ ] Single responsibility
- [ ] Clear types
- [ ] Readable logic

Click "Complete" when refactoring is done and tests pass."#,
        feature_name, feature_name
    )
}

// =============================================================================
// Row Mapping Helpers
// =============================================================================

fn map_test_plan_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TestPlan> {
    let status_str: String = row.get(4)?;
    let created_str: String = row.get(6)?;
    let updated_str: String = row.get(7)?;

    let status: TestPlanStatus = status_str.parse().unwrap_or(TestPlanStatus::Draft);
    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());
    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(TestPlan {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        status,
        target_coverage: row.get(5)?,
        created_at,
        updated_at,
    })
}

fn map_test_case_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TestCase> {
    let test_type_str: String = row.get(5)?;
    let priority_str: String = row.get(6)?;
    let status_str: String = row.get(7)?;
    let last_run_str: Option<String> = row.get(8)?;
    let created_str: String = row.get(9)?;
    let updated_str: String = row.get(10)?;

    let test_type: TestType = test_type_str.parse().unwrap_or(TestType::Unit);
    let priority: TestPriority = priority_str.parse().unwrap_or(TestPriority::Medium);
    let status: TestCaseStatus = status_str.parse().unwrap_or(TestCaseStatus::Pending);

    let last_run_at = last_run_str.and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
    });
    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());
    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(TestCase {
        id: row.get(0)?,
        plan_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        file_path: row.get(4)?,
        test_type,
        priority,
        status,
        last_run_at,
        created_at,
        updated_at,
    })
}

fn map_test_run_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TestRun> {
    let status_str: String = row.get(2)?;
    let started_str: String = row.get(11)?;
    let completed_str: Option<String> = row.get(12)?;

    let status: TestRunStatus = status_str.parse().unwrap_or(TestRunStatus::Running);
    let started_at = chrono::DateTime::parse_from_rfc3339(&started_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());
    let completed_at = completed_str.and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
    });

    Ok(TestRun {
        id: row.get(0)?,
        plan_id: row.get(1)?,
        status,
        total_tests: row.get(3)?,
        passed_tests: row.get(4)?,
        failed_tests: row.get(5)?,
        skipped_tests: row.get(6)?,
        duration_ms: row.get::<_, Option<i64>>(7)?.map(|v| v as u64),
        coverage_percent: row.get(8)?,
        stdout: row.get(9)?,
        stderr: row.get(10)?,
        started_at,
        completed_at,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // =========================================================================
    // is_material_source_file tests
    // =========================================================================

    #[test]
    fn test_material_source_ts_files() {
        assert!(is_material_source_file("src/components/App.tsx"));
        assert!(is_material_source_file("src/hooks/useHealth.ts"));
        assert!(is_material_source_file("src/lib/utils.js"));
        assert!(is_material_source_file("src/lib/helper.jsx"));
    }

    #[test]
    fn test_material_source_rust_files() {
        assert!(is_material_source_file("src-tauri/src/core/health.rs"));
        assert!(is_material_source_file("src-tauri/src/commands/project.rs"));
    }

    #[test]
    fn test_material_source_python_go_files() {
        assert!(is_material_source_file("backend/models.py"));
        assert!(is_material_source_file("cmd/server.go"));
    }

    #[test]
    fn test_excludes_test_files() {
        assert!(!is_material_source_file("src/App.test.tsx"));
        assert!(!is_material_source_file("src/App.spec.tsx"));
        assert!(!is_material_source_file("tests/test_main.py"));
        assert!(!is_material_source_file("src/__tests__/App.tsx"));
        assert!(!is_material_source_file("src/App.stories.tsx"));
    }

    #[test]
    fn test_excludes_config_files() {
        assert!(!is_material_source_file("vitest.config.ts"));
        assert!(!is_material_source_file("tailwind.config.js"));
        assert!(!is_material_source_file("src/types/global.d.ts"));
        assert!(!is_material_source_file("src-tauri/src/commands/mod.rs"));
    }

    #[test]
    fn test_excludes_non_source_files() {
        assert!(!is_material_source_file("README.md"));
        assert!(!is_material_source_file("package.json"));
        assert!(!is_material_source_file("Cargo.toml"));
        assert!(!is_material_source_file(".gitignore"));
        assert!(!is_material_source_file("src/styles.css"));
    }

    // =========================================================================
    // find_corresponding_test_file tests (using temp dirs)
    // =========================================================================

    #[test]
    fn test_find_ts_test_file() {
        let dir = tempfile::tempdir().unwrap();
        let project = dir.path();

        // Create source and test files
        std::fs::create_dir_all(project.join("src/components")).unwrap();
        std::fs::write(project.join("src/components/App.tsx"), "export function App() {}").unwrap();
        std::fs::write(
            project.join("src/components/App.test.tsx"),
            "describe('App', () => {})",
        )
        .unwrap();

        let result = find_corresponding_test_file(
            "src/components/App.tsx",
            project.to_str().unwrap(),
        );
        assert_eq!(result, Some("src/components/App.test.tsx".to_string()));
    }

    #[test]
    fn test_find_spec_file() {
        let dir = tempfile::tempdir().unwrap();
        let project = dir.path();

        std::fs::create_dir_all(project.join("src")).unwrap();
        std::fs::write(project.join("src/utils.ts"), "export function foo() {}").unwrap();
        std::fs::write(project.join("src/utils.spec.ts"), "describe('utils', () => {})").unwrap();

        let result = find_corresponding_test_file("src/utils.ts", project.to_str().unwrap());
        assert_eq!(result, Some("src/utils.spec.ts".to_string()));
    }

    #[test]
    fn test_find_rust_inline_tests() {
        let dir = tempfile::tempdir().unwrap();
        let project = dir.path();

        std::fs::create_dir_all(project.join("src-tauri/src/core")).unwrap();
        std::fs::write(
            project.join("src-tauri/src/core/health.rs"),
            "fn check() {}\n#[cfg(test)]\nmod tests { }",
        )
        .unwrap();

        let result = find_corresponding_test_file(
            "src-tauri/src/core/health.rs",
            project.to_str().unwrap(),
        );
        assert_eq!(result, Some("__inline__".to_string()));
    }

    #[test]
    fn test_find_python_test_file() {
        let dir = tempfile::tempdir().unwrap();
        let project = dir.path();

        std::fs::create_dir_all(project.join("backend")).unwrap();
        std::fs::write(project.join("backend/models.py"), "class User: pass").unwrap();
        std::fs::write(project.join("backend/test_models.py"), "def test_user(): pass").unwrap();

        let result = find_corresponding_test_file("backend/models.py", project.to_str().unwrap());
        assert_eq!(result, Some("backend/test_models.py".to_string()));
    }

    #[test]
    fn test_find_go_test_file() {
        let dir = tempfile::tempdir().unwrap();
        let project = dir.path();

        std::fs::create_dir_all(project.join("cmd")).unwrap();
        std::fs::write(project.join("cmd/server.go"), "package main").unwrap();
        std::fs::write(project.join("cmd/server_test.go"), "package main").unwrap();

        let result = find_corresponding_test_file("cmd/server.go", project.to_str().unwrap());
        assert_eq!(result, Some("cmd/server_test.go".to_string()));
    }

    #[test]
    fn test_no_test_file_found() {
        let dir = tempfile::tempdir().unwrap();
        let project = dir.path();

        std::fs::create_dir_all(project.join("src")).unwrap();
        std::fs::write(project.join("src/orphan.ts"), "export const x = 1;").unwrap();

        let result = find_corresponding_test_file("src/orphan.ts", project.to_str().unwrap());
        assert_eq!(result, None);
    }

    #[test]
    fn test_staleness_report_serialization() {
        let report = TestStalenessReport {
            checked_files: 3,
            stale_count: 1,
            results: vec![
                TestStalenessResult {
                    source_file: "src/App.tsx".to_string(),
                    test_file: Some("src/App.test.tsx".to_string()),
                    is_stale: true,
                    reason: "src/App.tsx was modified but src/App.test.tsx was not".to_string(),
                },
                TestStalenessResult {
                    source_file: "src/utils.ts".to_string(),
                    test_file: Some("src/utils.test.ts".to_string()),
                    is_stale: false,
                    reason: "Test file was also modified".to_string(),
                },
            ],
            checked_at: "2026-02-16T00:00:00+00:00".to_string(),
        };

        let json = serde_json::to_string(&report).unwrap();
        assert!(json.contains("\"checkedFiles\":3"));
        assert!(json.contains("\"staleCount\":1"));
        assert!(json.contains("\"isStale\":true"));
        assert!(json.contains("\"sourceFile\":\"src/App.tsx\""));
    }
}

fn map_tdd_session_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TDDSession> {
    let phase_str: String = row.get(4)?;
    let status_str: String = row.get(5)?;
    let created_str: String = row.get(12)?;
    let updated_str: String = row.get(13)?;
    let completed_str: Option<String> = row.get(14)?;

    let current_phase: TDDPhase = phase_str.parse().unwrap_or(TDDPhase::Red);
    let phase_status: TDDPhaseStatus = status_str.parse().unwrap_or(TDDPhaseStatus::Pending);

    let created_at = chrono::DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());
    let updated_at = chrono::DateTime::parse_from_rfc3339(&updated_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());
    let completed_at = completed_str.and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(&s)
            .map(|dt| dt.with_timezone(&Utc))
            .ok()
    });

    Ok(TDDSession {
        id: row.get(0)?,
        project_id: row.get(1)?,
        feature_name: row.get(2)?,
        test_file_path: row.get(3)?,
        current_phase,
        phase_status,
        red_prompt: row.get(6)?,
        red_output: row.get(7)?,
        green_prompt: row.get(8)?,
        green_output: row.get(9)?,
        refactor_prompt: row.get(10)?,
        refactor_output: row.get(11)?,
        created_at,
        updated_at,
        completed_at,
    })
}
