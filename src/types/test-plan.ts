/**
 * @module types/test-plan
 * @description TypeScript type definitions for test plans, cases, runs, and TDD workflow
 *
 * PURPOSE:
 * - Define TestPlan interface for organizing test cases by feature
 * - Define TestCase for individual test case tracking
 * - Define TestRun for test execution history
 * - Define TDDSession for guided TDD workflow tracking
 * - Define supporting types for AI test generation
 *
 * EXPORTS:
 * - TestPlanStatus - Status enum (draft, active, archived)
 * - TestPlan - A collection of related test cases with target coverage
 * - TestType - Type enum (unit, integration, e2e)
 * - TestPriority - Priority enum (low, medium, high, critical)
 * - TestCaseStatus - Status enum (pending, passing, failing, skipped)
 * - TestCase - An individual test case linked to a file
 * - TestRunStatus - Status enum (running, passed, failed, cancelled)
 * - TestRun - A test execution run with results
 * - TestCaseResult - Result for a single test case in a run
 * - TestPlanSummary - Aggregated stats for a test plan
 * - TDDPhase - Phase enum (red, green, refactor)
 * - TDDPhaseStatus - Phase status enum (pending, active, complete, failed)
 * - TDDSession - A TDD workflow session tracking phases
 * - GeneratedTestSuggestion - AI-generated test case suggestion
 * - TestFrameworkInfo - Detected test framework information
 * - TestStalenessResult - Per-file staleness detection result
 * - TestStalenessReport - Aggregated staleness report for a project
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/test_plan.rs
 * - Status enums use lowercase strings for serialization
 * - DateTime fields are serialized as ISO strings by Tauri
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/test_plan.rs
 * - TDDPhase: red = failing test, green = minimal pass, refactor = cleanup
 * - TestPlanStatus: draft = not ready, active = in use, archived = historical
 */

export type TestPlanStatus = "draft" | "active" | "archived";

export interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: TestPlanStatus;
  targetCoverage: number;
  createdAt: string;
  updatedAt: string;
}

export type TestType = "unit" | "integration" | "e2e";

export type TestPriority = "low" | "medium" | "high" | "critical";

export type TestCaseStatus = "pending" | "passing" | "failing" | "skipped";

export interface TestCase {
  id: string;
  planId: string;
  name: string;
  description: string;
  filePath?: string;
  testType: TestType;
  priority: TestPriority;
  status: TestCaseStatus;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TestRunStatus = "running" | "passed" | "failed" | "cancelled";

export interface TestRun {
  id: string;
  planId: string;
  status: TestRunStatus;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  durationMs?: number;
  coveragePercent?: number;
  stdout?: string;
  stderr?: string;
  startedAt: string;
  completedAt?: string;
}

export interface TestCaseResult {
  id: string;
  runId: string;
  caseId: string;
  status: TestCaseStatus;
  durationMs?: number;
  errorMessage?: string;
  stackTrace?: string;
}

export interface TestPlanSummary {
  plan: TestPlan;
  totalCases: number;
  passingCases: number;
  failingCases: number;
  pendingCases: number;
  skippedCases: number;
  lastRun?: TestRun;
  currentCoverage?: number;
  coverageTrend: number[];
}

export type TDDPhase = "red" | "green" | "refactor";

export type TDDPhaseStatus = "pending" | "active" | "complete" | "failed";

export interface TDDSession {
  id: string;
  projectId: string;
  featureName: string;
  testFilePath?: string;
  currentPhase: TDDPhase;
  phaseStatus: TDDPhaseStatus;
  redPrompt?: string;
  redOutput?: string;
  greenPrompt?: string;
  greenOutput?: string;
  refactorPrompt?: string;
  refactorOutput?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GeneratedTestSuggestion {
  name: string;
  description: string;
  testType: TestType;
  priority: TestPriority;
  rationale: string;
  suggestedFilePath?: string;
}

export interface TestFrameworkInfo {
  name: string;
  command: string;
  configFile?: string;
  coverageCommand?: string;
}

/**
 * A single source file and its test file staleness status
 */
export interface TestStalenessResult {
  sourceFile: string;
  testFile?: string;
  isStale: boolean;
  reason: string;
}

/**
 * Aggregated staleness report for a project
 */
export interface TestStalenessReport {
  checkedFiles: number;
  staleCount: number;
  results: TestStalenessResult[];
  checkedAt: string;
}

/**
 * Result of automatic test discovery (without running tests)
 */
export interface TestDiscoveryResult {
  frameworkName: string;
  testCount: number;
  method: "list_command" | "static_grep";
  discoveredAt: string;
}

/**
 * TDD Phase configuration for UI display
 */
export interface TDDPhaseConfig {
  id: TDDPhase;
  emoji: string;
  title: string;
  description: string;
  expectedOutcome: "fail" | "pass";
  color: string;
}

/**
 * TDD Workflow result after completing all phases
 */
export interface TDDResult {
  sessionId: string;
  featureName: string;
  testFilePath?: string;
  totalDuration: number;
  phases: {
    red: { completed: boolean; output?: string };
    green: { completed: boolean; output?: string };
    refactor: { completed: boolean; output?: string };
  };
}

/**
 * Configuration for a subagent (for export)
 */
export interface SubagentConfig {
  name: string;
  description: string;
  tools: string[];
  instructions: string;
}

/**
 * PostToolUse hook configuration (for export)
 */
export interface HooksConfig {
  hooks: {
    PostToolUse: Array<{
      matcher: {
        tool: string;
        path?: string;
      };
      hooks: Array<{
        type: "command";
        command: string;
        timeout?: number;
      }>;
    }>;
  };
}
