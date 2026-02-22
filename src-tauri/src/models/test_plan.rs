//! @module models/test_plan
//! @description Data models for test plans, cases, runs, and TDD sessions
//!
//! PURPOSE:
//! - Define TestPlan struct for organizing test cases by feature
//! - Define TestCase for individual test case tracking
//! - Define TestRun for test execution history
//! - Define TestCaseResult for per-case results
//! - Define TDDSession for guided TDD workflow tracking
//! - Define GeneratedTestSuggestion for AI-powered test suggestions
//!
//! DEPENDENCIES:
//! - serde - Serialization for Tauri IPC
//! - chrono - Timestamp handling
//!
//! EXPORTS:
//! - TestPlan - A collection of related test cases with target coverage
//! - TestPlanStatus - Status enum (draft, active, archived)
//! - TestCase - An individual test case linked to a file
//! - TestType - Type enum (unit, integration, e2e)
//! - TestPriority - Priority enum (low, medium, high, critical)
//! - TestCaseStatus - Status enum (pending, passing, failing, skipped)
//! - TestRun - A test execution run with results
//! - TestRunStatus - Status enum (running, passed, failed, cancelled)
//! - TestCaseResult - Result for a single test case in a run
//! - TestPlanSummary - Aggregated stats for a test plan
//! - TDDSession - A TDD workflow session tracking red/green/refactor phases
//! - TDDPhase - Phase enum (red, green, refactor)
//! - TDDPhaseStatus - Phase status enum (pending, active, complete, failed)
//! - GeneratedTestSuggestion - AI-generated test case suggestion
//! - TestStalenessResult - Per-file staleness detection result
//! - TestStalenessReport - Aggregated staleness report for a project
//!
//! PATTERNS:
//! - All models derive Serialize, Deserialize for Tauri IPC
//! - Use camelCase for JSON serialization to match TypeScript
//! - Timestamps stored as DateTime<Utc> for type safety
//!
//! CLAUDE NOTES:
//! - TestPlanStatus: draft = not ready, active = in use, archived = historical
//! - TestType: unit = isolated, integration = cross-module, e2e = full stack
//! - TestPriority: affects execution order and reporting
//! - TDDPhase: red = failing test, green = minimal pass, refactor = cleanup
//! - Keep in sync with TypeScript types in src/types/test-plan.ts

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Status of a test plan
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TestPlanStatus {
    #[default]
    Draft,
    Active,
    Archived,
}


impl std::fmt::Display for TestPlanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TestPlanStatus::Draft => write!(f, "draft"),
            TestPlanStatus::Active => write!(f, "active"),
            TestPlanStatus::Archived => write!(f, "archived"),
        }
    }
}

impl std::str::FromStr for TestPlanStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "draft" => Ok(TestPlanStatus::Draft),
            "active" => Ok(TestPlanStatus::Active),
            "archived" => Ok(TestPlanStatus::Archived),
            _ => Err(format!("Invalid test plan status: {}", s)),
        }
    }
}

/// A test plan organizing related test cases
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestPlan {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub status: TestPlanStatus,
    pub target_coverage: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Type of test case
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TestType {
    #[default]
    Unit,
    Integration,
    E2e,
}


impl std::fmt::Display for TestType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TestType::Unit => write!(f, "unit"),
            TestType::Integration => write!(f, "integration"),
            TestType::E2e => write!(f, "e2e"),
        }
    }
}

impl std::str::FromStr for TestType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "unit" => Ok(TestType::Unit),
            "integration" => Ok(TestType::Integration),
            "e2e" => Ok(TestType::E2e),
            _ => Err(format!("Invalid test type: {}", s)),
        }
    }
}

/// Priority level for test cases
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TestPriority {
    Low,
    #[default]
    Medium,
    High,
    Critical,
}


impl std::fmt::Display for TestPriority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TestPriority::Low => write!(f, "low"),
            TestPriority::Medium => write!(f, "medium"),
            TestPriority::High => write!(f, "high"),
            TestPriority::Critical => write!(f, "critical"),
        }
    }
}

impl std::str::FromStr for TestPriority {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "low" => Ok(TestPriority::Low),
            "medium" => Ok(TestPriority::Medium),
            "high" => Ok(TestPriority::High),
            "critical" => Ok(TestPriority::Critical),
            _ => Err(format!("Invalid test priority: {}", s)),
        }
    }
}

/// Status of a test case
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TestCaseStatus {
    #[default]
    Pending,
    Passing,
    Failing,
    Skipped,
}


impl std::fmt::Display for TestCaseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TestCaseStatus::Pending => write!(f, "pending"),
            TestCaseStatus::Passing => write!(f, "passing"),
            TestCaseStatus::Failing => write!(f, "failing"),
            TestCaseStatus::Skipped => write!(f, "skipped"),
        }
    }
}

impl std::str::FromStr for TestCaseStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pending" => Ok(TestCaseStatus::Pending),
            "passing" => Ok(TestCaseStatus::Passing),
            "failing" => Ok(TestCaseStatus::Failing),
            "skipped" => Ok(TestCaseStatus::Skipped),
            _ => Err(format!("Invalid test case status: {}", s)),
        }
    }
}

/// An individual test case
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestCase {
    pub id: String,
    pub plan_id: String,
    pub name: String,
    pub description: String,
    pub file_path: Option<String>,
    pub test_type: TestType,
    pub priority: TestPriority,
    pub status: TestCaseStatus,
    pub last_run_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Status of a test run
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TestRunStatus {
    #[default]
    Running,
    Passed,
    Failed,
    Cancelled,
}


impl std::fmt::Display for TestRunStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TestRunStatus::Running => write!(f, "running"),
            TestRunStatus::Passed => write!(f, "passed"),
            TestRunStatus::Failed => write!(f, "failed"),
            TestRunStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

impl std::str::FromStr for TestRunStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "running" => Ok(TestRunStatus::Running),
            "passed" => Ok(TestRunStatus::Passed),
            "failed" => Ok(TestRunStatus::Failed),
            "cancelled" => Ok(TestRunStatus::Cancelled),
            _ => Err(format!("Invalid test run status: {}", s)),
        }
    }
}

/// A test execution run
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestRun {
    pub id: String,
    pub plan_id: String,
    pub status: TestRunStatus,
    pub total_tests: u32,
    pub passed_tests: u32,
    pub failed_tests: u32,
    pub skipped_tests: u32,
    pub duration_ms: Option<u64>,
    pub coverage_percent: Option<f64>,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Result for a single test case in a run
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct TestCaseResult {
    pub id: String,
    pub run_id: String,
    pub case_id: String,
    pub status: TestCaseStatus,
    pub duration_ms: Option<u64>,
    pub error_message: Option<String>,
    pub stack_trace: Option<String>,
}

/// Aggregated summary for a test plan
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestPlanSummary {
    pub plan: TestPlan,
    pub total_cases: u32,
    pub passing_cases: u32,
    pub failing_cases: u32,
    pub pending_cases: u32,
    pub skipped_cases: u32,
    pub last_run: Option<TestRun>,
    pub current_coverage: Option<f64>,
    pub coverage_trend: Vec<f64>,
}

/// TDD workflow phase
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TDDPhase {
    #[default]
    Red,
    Green,
    Refactor,
}


impl std::fmt::Display for TDDPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TDDPhase::Red => write!(f, "red"),
            TDDPhase::Green => write!(f, "green"),
            TDDPhase::Refactor => write!(f, "refactor"),
        }
    }
}

impl std::str::FromStr for TDDPhase {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "red" => Ok(TDDPhase::Red),
            "green" => Ok(TDDPhase::Green),
            "refactor" => Ok(TDDPhase::Refactor),
            _ => Err(format!("Invalid TDD phase: {}", s)),
        }
    }
}

/// Status of a TDD phase
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum TDDPhaseStatus {
    #[default]
    Pending,
    Active,
    Complete,
    Failed,
}


impl std::fmt::Display for TDDPhaseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TDDPhaseStatus::Pending => write!(f, "pending"),
            TDDPhaseStatus::Active => write!(f, "active"),
            TDDPhaseStatus::Complete => write!(f, "complete"),
            TDDPhaseStatus::Failed => write!(f, "failed"),
        }
    }
}

impl std::str::FromStr for TDDPhaseStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pending" => Ok(TDDPhaseStatus::Pending),
            "active" => Ok(TDDPhaseStatus::Active),
            "complete" => Ok(TDDPhaseStatus::Complete),
            "failed" => Ok(TDDPhaseStatus::Failed),
            _ => Err(format!("Invalid TDD phase status: {}", s)),
        }
    }
}

/// A TDD workflow session tracking phases
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TDDSession {
    pub id: String,
    pub project_id: String,
    pub feature_name: String,
    pub test_file_path: Option<String>,
    pub current_phase: TDDPhase,
    pub phase_status: TDDPhaseStatus,
    pub red_prompt: Option<String>,
    pub red_output: Option<String>,
    pub green_prompt: Option<String>,
    pub green_output: Option<String>,
    pub refactor_prompt: Option<String>,
    pub refactor_output: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// AI-generated test case suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedTestSuggestion {
    pub name: String,
    pub description: String,
    pub test_type: TestType,
    pub priority: TestPriority,
    pub rationale: String,
    pub suggested_file_path: Option<String>,
}

/// Detected test framework information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestFrameworkInfo {
    pub name: String,
    pub command: String,
    pub config_file: Option<String>,
    pub coverage_command: Option<String>,
}

/// A single source file and its corresponding test file staleness status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestStalenessResult {
    pub source_file: String,
    pub test_file: Option<String>,
    pub is_stale: bool,
    pub reason: String,
}

/// Aggregated staleness report for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestStalenessReport {
    pub checked_files: u32,
    pub stale_count: u32,
    pub results: Vec<TestStalenessResult>,
    pub checked_at: String,
}

/// Result of automatic test discovery (without running tests)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestDiscoveryResult {
    pub framework_name: String,
    pub test_count: u32,
    pub method: String, // "list_command" | "static_grep"
    pub discovered_at: String,
}
