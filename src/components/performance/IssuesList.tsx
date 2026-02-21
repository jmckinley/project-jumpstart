/**
 * @module components/performance/IssuesList
 * @description Filterable list of performance issues by category and severity
 *
 * PURPOSE:
 * - Display performance issues found during analysis
 * - Filter by category (query, rendering, memory, etc.) and severity
 * - Show file paths, line numbers, and suggestions for each issue
 * - Optionally render RemediationPanel for batch auto-fix
 *
 * DEPENDENCIES:
 * - @/types/performance - PerformanceIssue, RemediationSummary types
 * - @/components/performance/RemediationPanel - Batch remediation controls
 *
 * EXPORTS:
 * - IssuesList - Filterable performance issues list component
 *
 * PATTERNS:
 * - Uses local state for category and severity filters
 * - Severity badges: red=critical, yellow=warning, blue=info
 * - Issues sorted by severity (critical first)
 * - RemediationPanel rendered above issues when onRemediate is provided (backward-compatible)
 */

import { useState } from "react";
import type { PerformanceIssue, RemediationSummary } from "@/types/performance";
import { RemediationPanel } from "./RemediationPanel";

interface IssuesListProps {
  issues: PerformanceIssue[];
  onRemediate?: (issues: PerformanceIssue[]) => void;
  onCancelRemediation?: () => void;
  onClearRemediationResult?: () => void;
  remediating?: boolean;
  remediationProgress?: { current: number; total: number } | null;
  remediationResult?: RemediationSummary | null;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "query-patterns", label: "Query Patterns" },
  { value: "rendering", label: "Rendering" },
  { value: "memory", label: "Memory" },
  { value: "bundle", label: "Bundle" },
  { value: "caching", label: "Caching" },
  { value: "api-design", label: "API Design" },
];

export function IssuesList({
  issues,
  onRemediate,
  onCancelRemediation,
  onClearRemediationResult,
  remediating = false,
  remediationProgress = null,
  remediationResult = null,
}: IssuesListProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const filtered = issues
    .filter((issue) => categoryFilter === "all" || issue.category === categoryFilter)
    .filter((issue) => severityFilter === "all" || issue.severity === severityFilter)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Remediation Panel (only when onRemediate is provided) */}
      {onRemediate && onCancelRemediation && onClearRemediationResult && (
        <RemediationPanel
          issues={issues}
          remediating={remediating}
          progress={remediationProgress}
          result={remediationResult}
          onRemediate={onRemediate}
          onCancel={onCancelRemediation}
          onClearResult={onClearRemediationResult}
        />
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
            Issues ({issues.length})
          </h3>
          <div className="flex gap-3 text-xs">
            {criticalCount > 0 && (
              <span className="text-red-400">{criticalCount} critical</span>
            )}
            {warningCount > 0 && (
              <span className="text-yellow-400">{warningCount} warnings</span>
            )}
            {infoCount > 0 && (
              <span className="text-blue-400">{infoCount} info</span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Issues List */}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            {issues.length === 0
              ? "No issues found. Run an analysis to check for performance problems."
              : "No issues match the current filters."}
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((issue) => (
              <div
                key={issue.id}
                className="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.info
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <h4 className="text-sm font-medium text-neutral-200">
                      {issue.title}
                    </h4>
                  </div>
                  <span className="whitespace-nowrap rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
                    {issue.category}
                  </span>
                </div>
                <p className="mb-2 text-sm text-neutral-400">{issue.description}</p>
                {issue.filePath && (
                  <p className="mb-2 font-mono text-xs text-neutral-500">
                    {issue.filePath}
                    {issue.lineNumber ? `:${issue.lineNumber}` : ""}
                  </p>
                )}
                {issue.suggestion && (
                  <div className="rounded-md bg-neutral-900 px-3 py-2 text-xs text-neutral-400">
                    <span className="font-medium text-green-400">Suggestion: </span>
                    {issue.suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
