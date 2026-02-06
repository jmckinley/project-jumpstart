/**
 * @module components/test-plans/TestRunProgress
 * @description Live test execution progress with streaming output
 *
 * PURPOSE:
 * - Show test execution progress in real-time
 * - Display pass/fail counts as they update
 * - Show test output with color-coded results
 * - Provide controls to run with/without coverage
 * - Show FrameworkInstaller when no framework detected
 *
 * DEPENDENCIES:
 * - react - Component rendering
 * - @/types/test-plan - TestRun, TestFrameworkInfo types
 * - ./FrameworkInstaller - One-click framework installation
 *
 * EXPORTS:
 * - TestRunProgress - Test execution progress component
 *
 * PATTERNS:
 * - Shows spinner while running
 * - Displays summary after completion
 * - Output is scrollable with auto-scroll to bottom
 * - Shows FrameworkInstaller with one-click install when no framework detected
 *
 * CLAUDE NOTES:
 * - Running = blue spinner
 * - Passed = green summary
 * - Failed = red summary with failure count
 * - onRefreshFramework callback re-detects framework after installation
 */

import type { TestRun, TestFrameworkInfo } from "@/types/test-plan";
import { FrameworkInstaller } from "./FrameworkInstaller";

interface TestRunProgressProps {
  run: TestRun | null;
  framework: TestFrameworkInfo | null;
  isRunning: boolean;
  onRunTests: (withCoverage: boolean) => void;
  onRefreshFramework?: () => void;
}

export function TestRunProgress({
  run,
  framework,
  isRunning,
  onRunTests,
  onRefreshFramework,
}: TestRunProgressProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-200">Test Runner</h3>
          {framework && (
            <p className="mt-0.5 text-xs text-neutral-500">
              Using: {framework.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onRunTests(false)}
            disabled={isRunning || !framework}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-3 w-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Running...
              </span>
            ) : (
              "Run Tests"
            )}
          </button>
          <button
            onClick={() => onRunTests(true)}
            disabled={isRunning || !framework}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run with Coverage
          </button>
        </div>
      </div>

      {/* No framework - show installer */}
      {!framework && (
        <div className="space-y-4">
          <FrameworkInstaller />
          {onRefreshFramework && (
            <button
              onClick={onRefreshFramework}
              className="w-full rounded-md border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
            >
              Refresh Framework Detection
            </button>
          )}
        </div>
      )}

      {/* Run results */}
      {run && (
        <div className="space-y-3">
          {/* Summary */}
          <div
            className={`rounded-md p-3 ${
              run.status === "passed"
                ? "bg-green-500/10 border border-green-500/30"
                : run.status === "failed"
                ? "bg-red-500/10 border border-red-500/30"
                : run.status === "running"
                ? "bg-blue-500/10 border border-blue-500/30"
                : "bg-neutral-800 border border-neutral-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Status */}
                <span
                  className={`text-sm font-medium ${
                    run.status === "passed"
                      ? "text-green-400"
                      : run.status === "failed"
                      ? "text-red-400"
                      : run.status === "running"
                      ? "text-blue-400"
                      : "text-neutral-400"
                  }`}
                >
                  {run.status === "running" && (
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Running
                    </span>
                  )}
                  {run.status === "passed" && "✓ All Tests Passed"}
                  {run.status === "failed" && `✕ ${run.failedTests} Tests Failed`}
                  {run.status === "cancelled" && "Cancelled"}
                </span>

                {/* Counts */}
                <div className="flex gap-3 text-xs">
                  <span className="text-green-400">{run.passedTests} passed</span>
                  <span className="text-red-400">{run.failedTests} failed</span>
                  {run.skippedTests > 0 && (
                    <span className="text-neutral-500">{run.skippedTests} skipped</span>
                  )}
                </div>
              </div>

              {/* Duration and coverage */}
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                {run.durationMs !== undefined && (
                  <span>{(run.durationMs / 1000).toFixed(2)}s</span>
                )}
                {run.coveragePercent !== undefined && (
                  <span
                    className={
                      run.coveragePercent >= 80
                        ? "text-green-400"
                        : run.coveragePercent >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                    }
                  >
                    {run.coveragePercent.toFixed(1)}% coverage
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Output */}
          {(run.stdout || run.stderr) && (
            <div className="max-h-64 overflow-auto rounded-md bg-neutral-950 p-3 font-mono text-xs">
              {run.stdout && (
                <pre className="whitespace-pre-wrap text-neutral-300">{run.stdout}</pre>
              )}
              {run.stderr && (
                <pre className="mt-2 whitespace-pre-wrap text-red-400">{run.stderr}</pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!run && framework && !isRunning && (
        <div className="py-8 text-center">
          <p className="text-sm text-neutral-500">
            Click "Run Tests" to execute tests for this plan.
          </p>
        </div>
      )}
    </div>
  );
}
