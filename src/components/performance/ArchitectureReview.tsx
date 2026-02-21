/**
 * @module components/performance/ArchitectureReview
 * @description Architecture-level findings with status badges and recommendations
 *
 * PURPOSE:
 * - Display architecture-level performance findings
 * - Show status badges (good/warning/missing) for each category
 * - Provide actionable recommendations for improvements
 *
 * DEPENDENCIES:
 * - @/types/performance - ArchitectureFinding type
 *
 * EXPORTS:
 * - ArchitectureReview - Architecture findings display component
 *
 * PATTERNS:
 * - Cards per finding with color-coded status badges
 * - Status colors: green=good, yellow=warning, red=missing
 * - Recommendations shown for warning/missing items
 */

import type { ArchitectureFinding } from "@/types/performance";

interface ArchitectureReviewProps {
  findings: ArchitectureFinding[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  good: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
    label: "Good",
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    label: "Warning",
  },
  missing: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    label: "Missing",
  },
};

export function ArchitectureReview({ findings }: ArchitectureReviewProps) {
  const goodCount = findings.filter((f) => f.status === "good").length;
  const warningCount = findings.filter((f) => f.status === "warning").length;
  const missingCount = findings.filter((f) => f.status === "missing").length;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          Architecture Review
        </h3>
        <div className="flex gap-3 text-xs">
          {goodCount > 0 && (
            <span className="text-green-400">{goodCount} good</span>
          )}
          {warningCount > 0 && (
            <span className="text-yellow-400">{warningCount} warnings</span>
          )}
          {missingCount > 0 && (
            <span className="text-red-400">{missingCount} missing</span>
          )}
        </div>
      </div>

      {findings.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          No architecture findings yet. Run an analysis to check your project structure.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {findings.map((finding) => {
            const statusConfig = STATUS_COLORS[finding.status] ?? STATUS_COLORS.missing;

            return (
              <div
                key={finding.id}
                className={`rounded-lg border p-4 ${statusConfig.border} ${statusConfig.bg}`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-neutral-200">
                    {finding.title}
                  </h4>
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.text}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="mb-1 text-sm text-neutral-400">{finding.description}</p>
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-500">
                  {finding.category}
                </span>
                {finding.recommendation && finding.status !== "good" && (
                  <div className="mt-3 rounded-md bg-neutral-900/50 px-3 py-2 text-xs text-neutral-400">
                    <span className="font-medium text-blue-400">Recommendation: </span>
                    {finding.recommendation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
