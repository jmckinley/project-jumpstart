/**
 * @module components/memory/TestStalenessAlert
 * @description Alert card for Memory Dashboard showing stale test detection results
 *
 * PURPOSE:
 * - Provide a "Check Test Staleness" button to trigger the Rust backend command
 * - Show count badge when stale tests are detected
 * - List each stale file with source path, expected test path, and reason
 * - Show empty state when no staleness detected
 *
 * DEPENDENCIES:
 * - @/types/test-plan - TestStalenessReport type
 *
 * EXPORTS:
 * - TestStalenessAlert - Staleness alert card component
 *
 * PATTERNS:
 * - Receives report, loading state, and onCheck callback as props
 * - Consistent styling with other Memory Dashboard cards
 * - Stale items highlighted with amber/yellow indicators
 *
 * CLAUDE NOTES:
 * - Report is null until first check is triggered
 * - staleCount > 0 means tests may need updating
 * - isStale=false items are not shown in the stale list
 */

import type { TestStalenessReport } from "@/types/test-plan";

interface TestStalenessAlertProps {
  report: TestStalenessReport | null;
  loading: boolean;
  onCheck: () => void;
}

export function TestStalenessAlert({ report, loading, onCheck }: TestStalenessAlertProps) {
  const staleResults = report?.results.filter((r) => r.isStale) ?? [];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            Test Staleness
          </h3>
          {report && report.staleCount > 0 && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              {report.staleCount} stale
            </span>
          )}
        </div>
        <button
          onClick={onCheck}
          disabled={loading}
          className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Staleness"}
        </button>
      </div>

      {!report ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Click &quot;Check Staleness&quot; to scan for stale tests.
        </p>
      ) : report.staleCount === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm text-green-400">All tests are up to date</p>
          <p className="mt-1 text-xs text-neutral-500">
            Checked {report.checkedFiles} source files
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 mb-3">
            {report.staleCount} of {report.checkedFiles} source files have tests that may need
            updating
          </p>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {staleResults.map((result) => (
              <div
                key={result.sourceFile}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-amber-500/20 text-xs font-bold text-amber-400">
                    !
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {result.sourceFile}
                    </p>
                    {result.testFile && (
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        Test: {result.testFile}
                      </p>
                    )}
                    <p className="text-xs text-amber-400/80 mt-1">{result.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
