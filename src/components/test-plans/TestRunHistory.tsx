/**
 * @module components/test-plans/TestRunHistory
 * @description Historical test runs with expandable details
 *
 * PURPOSE:
 * - Show past test runs for a plan
 * - Display pass/fail counts and duration
 * - Expand to see detailed output
 *
 * DEPENDENCIES:
 * - react (useState) - Expansion state
 * - @/types/test-plan - TestRun type
 *
 * EXPORTS:
 * - TestRunHistory - Test run history component
 *
 * PATTERNS:
 * - Collapsible rows for run details
 * - Time-relative display (e.g., "2 hours ago")
 * - Status-colored indicators
 *
 * CLAUDE NOTES:
 * - Most recent runs first
 * - Click row to expand/collapse output
 * - Coverage trend can be inferred from history
 */

import { useState } from "react";
import type { TestRun } from "@/types/test-plan";

interface TestRunHistoryProps {
  runs: TestRun[];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TestRunHistory({ runs }: TestRunHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
          Run History
        </h3>
        <div className="py-6 text-center">
          <p className="text-sm text-neutral-500">No test runs yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
        Run History
      </h3>

      <div className="space-y-1">
        {runs.map((run) => {
          const isExpanded = expandedId === run.id;

          return (
            <div key={run.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : run.id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-800/50"
              >
                {/* Status indicator */}
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    run.status === "passed"
                      ? "bg-green-400"
                      : run.status === "failed"
                      ? "bg-red-400"
                      : run.status === "running"
                      ? "bg-blue-400 animate-pulse"
                      : "bg-neutral-500"
                  }`}
                />

                {/* Summary */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-300">
                      {run.passedTests}/{run.totalTests} passed
                    </span>
                    {run.failedTests > 0 && (
                      <span className="text-xs text-red-400">
                        ({run.failedTests} failed)
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration and time */}
                <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
                  {run.durationMs !== undefined && (
                    <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  {run.coveragePercent !== undefined && (
                    <span>{run.coveragePercent.toFixed(0)}%</span>
                  )}
                  <span>{formatRelativeTime(run.startedAt)}</span>
                </div>

                {/* Expand chevron */}
                <svg
                  className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded output */}
              {isExpanded && (run.stdout || run.stderr) && (
                <div className="ml-5 mt-1 max-h-48 overflow-auto rounded-md bg-neutral-950 p-3 font-mono text-xs">
                  {run.stdout && (
                    <pre className="whitespace-pre-wrap text-neutral-400">{run.stdout}</pre>
                  )}
                  {run.stderr && (
                    <pre className="mt-2 whitespace-pre-wrap text-red-400">{run.stderr}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
