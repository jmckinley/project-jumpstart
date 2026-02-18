/**
 * @module hooks/useTestPlans
 * @description Custom hook for test plan management, CRUD operations, and test execution
 *
 * PURPOSE:
 * - Manage test plans list state with loading/error tracking
 * - Provide CRUD actions for test plans and test cases
 * - Execute tests and track run history
 * - Generate AI-powered test suggestions
 *
 * DEPENDENCIES:
 * - @/lib/tauri - Test plan IPC calls
 * - @/stores/projectStore - Active project for scoping test plans
 * - @/types/test-plan - TestPlan, TestCase, TestRun, etc.
 *
 * EXPORTS:
 * - useTestPlans - Hook returning test plans state and actions
 *
 * PATTERNS:
 * - Call loadTestPlans() when the test plans section becomes active
 * - Test plans are scoped to the active project
 * - Call runTests() to execute tests for a plan
 * - Call generateSuggestions() for AI-powered test recommendations
 * - Call refreshFramework() after user installs a new test framework
 * - Call checkStaleness() to detect tests that may need updating
 *
 * CLAUDE NOTES:
 * - loadTestPlans fetches plans scoped to the active project
 * - selectPlan loads full summary with cases, runs, and coverage
 * - After CRUD operations, lists are refreshed automatically
 * - Test execution may take time; loading state tracks this
 * - refreshFramework re-detects framework without reloading plans
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";
import {
  listTestPlans,
  getTestPlan,
  createTestPlan,
  updateTestPlan,
  deleteTestPlan,
  listTestCases,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  detectProjectTestFramework,
  runTestPlan,
  getTestRuns,
  generateTestSuggestions,
  checkTestStaleness,
} from "@/lib/tauri";
import type {
  TestPlan,
  TestPlanSummary,
  TestCase,
  TestRun,
  TestFrameworkInfo,
  GeneratedTestSuggestion,
  TestStalenessReport,
} from "@/types/test-plan";

interface TestPlansState {
  plans: TestPlan[];
  selectedPlan: TestPlanSummary | null;
  cases: TestCase[];
  runs: TestRun[];
  framework: TestFrameworkInfo | null;
  suggestions: GeneratedTestSuggestion[];
  stalenessReport: TestStalenessReport | null;
  loading: boolean;
  running: boolean;
  generating: boolean;
  checkingStaleness: boolean;
  error: string | null;
}

export function useTestPlans() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const addToast = useToastStore((s) => s.addToast);

  const [state, setState] = useState<TestPlansState>({
    plans: [],
    selectedPlan: null,
    cases: [],
    runs: [],
    framework: null,
    suggestions: [],
    stalenessReport: null,
    loading: false,
    running: false,
    generating: false,
    checkingStaleness: false,
    error: null,
  });

  // Load all test plans for the active project
  const loadTestPlans = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const plans = await listTestPlans(activeProject.id);
      const framework = await detectProjectTestFramework(activeProject.path);
      setState((s) => ({ ...s, plans, framework, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load test plans",
      }));
    }
  }, [activeProject]);

  // Select a plan and load its full details
  const selectPlan = useCallback(async (planId: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const summary = await getTestPlan(planId);
      const cases = await listTestCases(planId);
      const runs = await getTestRuns(planId, 10);
      setState((s) => ({
        ...s,
        selectedPlan: summary,
        cases,
        runs,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load test plan",
      }));
    }
  }, []);

  // Clear selected plan
  const clearSelection = useCallback(() => {
    setState((s) => ({
      ...s,
      selectedPlan: null,
      cases: [],
      runs: [],
    }));
  }, []);

  // Create a new test plan
  const addPlan = useCallback(
    async (name: string, description: string, targetCoverage?: number) => {
      if (!activeProject) return;

      try {
        const plan = await createTestPlan(activeProject.id, name, description, targetCoverage);
        setState((s) => ({
          ...s,
          plans: [plan, ...s.plans],
          error: null,
        }));
        return plan;
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to create test plan",
        }));
        return null;
      }
    },
    [activeProject],
  );

  // Update an existing test plan
  const editPlan = useCallback(
    async (
      id: string,
      name?: string,
      description?: string,
      status?: string,
      targetCoverage?: number,
    ) => {
      try {
        const updated = await updateTestPlan(id, name, description, status, targetCoverage);
        setState((s) => ({
          ...s,
          plans: s.plans.map((p) => (p.id === id ? updated : p)),
          selectedPlan: s.selectedPlan?.plan.id === id
            ? { ...s.selectedPlan, plan: updated }
            : s.selectedPlan,
          error: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to update test plan",
        }));
      }
    },
    [],
  );

  // Delete a test plan
  const removePlan = useCallback(
    async (id: string) => {
      try {
        await deleteTestPlan(id);
        setState((s) => ({
          ...s,
          plans: s.plans.filter((p) => p.id !== id),
          selectedPlan: s.selectedPlan?.plan.id === id ? null : s.selectedPlan,
          cases: s.selectedPlan?.plan.id === id ? [] : s.cases,
          runs: s.selectedPlan?.plan.id === id ? [] : s.runs,
          error: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to delete test plan",
        }));
      }
    },
    [],
  );

  // Create a new test case
  const addCase = useCallback(
    async (
      planId: string,
      name: string,
      description: string,
      filePath?: string,
      testType?: string,
      priority?: string,
    ) => {
      try {
        const testCase = await createTestCase(planId, name, description, filePath, testType, priority);
        setState((s) => ({
          ...s,
          cases: [...s.cases, testCase],
          error: null,
        }));
        return testCase;
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to create test case",
        }));
        return null;
      }
    },
    [],
  );

  // Update an existing test case
  const editCase = useCallback(
    async (
      id: string,
      name?: string,
      description?: string,
      filePath?: string,
      testType?: string,
      priority?: string,
      status?: string,
    ) => {
      try {
        const updated = await updateTestCase(id, name, description, filePath, testType, priority, status);
        setState((s) => ({
          ...s,
          cases: s.cases.map((c) => (c.id === id ? updated : c)),
          error: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to update test case",
        }));
      }
    },
    [],
  );

  // Delete a test case
  const removeCase = useCallback(async (id: string) => {
    try {
      await deleteTestCase(id);
      setState((s) => ({
        ...s,
        cases: s.cases.filter((c) => c.id !== id),
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to delete test case",
      }));
    }
  }, []);

  // Run tests for a plan
  const runTests = useCallback(
    async (planId: string, withCoverage?: boolean) => {
      if (!activeProject) return null;

      setState((s) => ({ ...s, running: true, error: null }));
      try {
        const run = await runTestPlan(planId, activeProject.path, withCoverage);

        // Refresh cases to get updated statuses
        const cases = await listTestCases(planId);
        const runs = await getTestRuns(planId, 10);
        const summary = await getTestPlan(planId);

        setState((s) => ({
          ...s,
          runs,
          cases,
          selectedPlan: summary,
          running: false,
        }));

        return run;
      } catch (err) {
        setState((s) => ({
          ...s,
          running: false,
          error: err instanceof Error ? err.message : "Failed to run tests",
        }));
        return null;
      }
    },
    [activeProject],
  );

  // Generate AI-powered test suggestions
  const generateSuggestions = useCallback(
    async (filePaths?: string[]) => {
      if (!activeProject) return;

      setState((s) => ({ ...s, generating: true, error: null }));
      try {
        const suggestions = await generateTestSuggestions(activeProject.path, filePaths);
        setState((s) => ({ ...s, suggestions, generating: false }));
      } catch (err) {
        setState((s) => ({
          ...s,
          generating: false,
          error: err instanceof Error ? err.message : "Failed to generate test suggestions",
        }));
      }
    },
    [activeProject],
  );

  // Accept a suggestion and create a test case from it
  const acceptSuggestion = useCallback(
    async (planId: string, suggestion: GeneratedTestSuggestion) => {
      const testCase = await addCase(
        planId,
        suggestion.name,
        suggestion.description,
        suggestion.suggestedFilePath,
        suggestion.testType,
        suggestion.priority,
      );
      if (testCase) {
        // Remove suggestion from list
        setState((s) => ({
          ...s,
          suggestions: s.suggestions.filter((sg) => sg.name !== suggestion.name),
        }));
      }
      return testCase;
    },
    [addCase],
  );

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((suggestionName: string) => {
    setState((s) => ({
      ...s,
      suggestions: s.suggestions.filter((sg) => sg.name !== suggestionName),
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // Refresh framework detection (after user installs a framework)
  const refreshFramework = useCallback(async () => {
    if (!activeProject) return;

    try {
      const framework = await detectProjectTestFramework(activeProject.path);
      setState((s) => ({ ...s, framework, error: null }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to detect framework",
      }));
    }
  }, [activeProject]);

  // Check for stale tests in the project
  const checkStalenessAction = useCallback(
    async (lookbackCommits?: number) => {
      if (!activeProject) {
        addToast({ message: "No project selected", type: "error" });
        return;
      }

      setState((s) => ({ ...s, checkingStaleness: true, error: null }));
      try {
        const report = await checkTestStaleness(activeProject.path, lookbackCommits);
        setState((s) => ({ ...s, stalenessReport: report, checkingStaleness: false }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to check test staleness";
        setState((s) => ({ ...s, checkingStaleness: false, error: msg }));
        addToast({ message: msg, type: "error" });
      }
    },
    [activeProject, addToast],
  );

  return {
    ...state,
    loadTestPlans,
    selectPlan,
    clearSelection,
    addPlan,
    editPlan,
    removePlan,
    addCase,
    editCase,
    removeCase,
    runTests,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    clearError,
    refreshFramework,
    checkStaleness: checkStalenessAction,
  };
}
