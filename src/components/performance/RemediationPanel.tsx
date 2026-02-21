/**
 * @module components/performance/RemediationPanel
 * @description Batch auto-remediation controls for performance issues
 *
 * PURPOSE:
 * - Allow users to select performance issues for AI-powered auto-fix
 * - Provide quick-select buttons (All Issues, Critical Only)
 * - Show progress during remediation and results summary after completion
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for selected issue IDs
 * - @/types/performance - PerformanceIssue, RemediationSummary types
 *
 * EXPORTS:
 * - RemediationPanel - Batch remediation controls component
 *
 * PATTERNS:
 * - Follows BatchGenerator.tsx pattern for quick-select + checkboxes + progress
 * - Issues grouped by file for display
 * - Cancel button stops processing between files
 *
 * CLAUDE NOTES:
 * - Only issues with filePath are selectable (issues without file paths cannot be remediated)
 * - onRemediate receives the selected PerformanceIssue[] array
 * - Results summary shows fixed/failed/skipped counts with color coding
 */

import { useState } from "react";
import type { PerformanceIssue, RemediationSummary } from "@/types/performance";

interface RemediationPanelProps {
  issues: PerformanceIssue[];
  remediating: boolean;
  progress: { current: number; total: number } | null;
  result: RemediationSummary | null;
  onRemediate: (issues: PerformanceIssue[]) => void;
  onCancel: () => void;
  onClearResult: () => void;
}

export function RemediationPanel({
  issues,
  remediating,
  progress,
  result,
  onRemediate,
  onCancel,
  onClearResult,
}: RemediationPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Only issues with file paths can be remediated
  const remediableIssues = issues.filter((i) => i.filePath);
  const criticalIssues = remediableIssues.filter((i) => i.severity === "critical");

  const handleSelectAll = () => {
    setSelectedIds(remediableIssues.map((i) => i.id));
  };

  const handleSelectCritical = () => {
    setSelectedIds(criticalIssues.map((i) => i.id));
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleFix = () => {
    const selected = remediableIssues.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) return;
    onRemediate(selected);
    setSelectedIds([]);
  };

  // Group remediable issues by file for display
  const byFile = new Map<string, PerformanceIssue[]>();
  for (const issue of remediableIssues) {
    const key = issue.filePath!;
    const existing = byFile.get(key) ?? [];
    existing.push(issue);
    byFile.set(key, existing);
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        Auto-Remediate
      </h3>

      {/* Result summary */}
      {result && (
        <div className="mb-4 rounded-md border border-neutral-700 bg-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-200">Remediation Complete</h4>
            <button
              onClick={onClearResult}
              className="text-xs text-neutral-500 hover:text-neutral-400"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            {result.fixed > 0 && (
              <span className="text-green-400">{result.fixed} fixed</span>
            )}
            {result.failed > 0 && (
              <span className="text-red-400">{result.failed} failed</span>
            )}
            {result.skipped > 0 && (
              <span className="text-yellow-400">{result.skipped} skipped</span>
            )}
          </div>
        </div>
      )}

      {/* Quick select buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={handleSelectAll}
          disabled={remediableIssues.length === 0 || remediating}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          All Issues
          {remediableIssues.length > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
              {remediableIssues.length}
            </span>
          )}
        </button>

        <button
          onClick={handleSelectCritical}
          disabled={criticalIssues.length === 0 || remediating}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Critical Only
          {criticalIssues.length > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
              {criticalIssues.length}
            </span>
          )}
        </button>

        {remediating && (
          <button
            onClick={onCancel}
            className="ml-auto rounded-md border border-red-700 bg-red-900/30 px-4 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/50"
          >
            Cancel
          </button>
        )}

        <button
          onClick={handleFix}
          disabled={selectedIds.length === 0 || remediating}
          className={`${!remediating ? "ml-auto" : ""} rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            remediating
              ? "cursor-not-allowed bg-blue-600 text-white"
              : selectedIds.length === 0
                ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {remediating ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
              {progress
                ? `Fixing file ${progress.current} of ${progress.total}...`
                : "Fixing..."}
            </span>
          ) : (
            `Fix Selected (${selectedIds.length})`
          )}
        </button>
      </div>

      {/* Issue checkboxes grouped by file */}
      {remediableIssues.length === 0 ? (
        <p className="py-4 text-center text-xs text-neutral-500">
          No issues with file paths to remediate.
        </p>
      ) : (
        <div className="max-h-[300px] space-y-3 overflow-y-auto">
          {Array.from(byFile.entries()).map(([filePath, fileIssues]) => (
            <div key={filePath}>
              <p className="mb-1 font-mono text-xs text-neutral-500">{filePath}</p>
              <div className="space-y-1 pl-2">
                {fileIssues.map((issue) => {
                  const isSelected = selectedIds.includes(issue.id);
                  const severityColor =
                    issue.severity === "critical"
                      ? "text-red-400"
                      : issue.severity === "warning"
                        ? "text-yellow-400"
                        : "text-blue-400";

                  return (
                    <label
                      key={issue.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isSelected
                          ? "bg-neutral-800 text-neutral-200"
                          : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300"
                      } ${remediating ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(issue.id)}
                        disabled={remediating}
                        className="h-3.5 w-3.5 shrink-0 rounded border-neutral-600 bg-neutral-800 accent-blue-600"
                      />
                      <span className={`text-xs font-medium ${severityColor}`}>
                        [{issue.severity}]
                      </span>
                      <span className="truncate text-xs">{issue.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
