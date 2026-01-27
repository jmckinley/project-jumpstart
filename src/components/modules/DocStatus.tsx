/**
 * @module components/modules/DocStatus
 * @description Summary bar showing documentation coverage statistics with a progress bar and counts
 *
 * PURPOSE:
 * - Display a horizontal progress bar representing documentation coverage percentage
 * - Show counts: "X of Y files documented (Z%)"
 * - Color-code the bar and percentage based on thresholds: green >= 80, yellow >= 50, red < 50
 *
 * DEPENDENCIES:
 * - (none - pure presentational component)
 *
 * EXPORTS:
 * - DocStatus - Coverage statistics summary bar component
 *
 * PATTERNS:
 * - Receives pre-calculated stats as props from parent (useModules hook data)
 * - Purely presentational, no internal state
 * - Color thresholds: green >= 80%, yellow >= 50%, red < 50%
 *
 * CLAUDE NOTES:
 * - coverage prop is expected to be 0-100 (already calculated by useModules)
 * - missingFiles count is shown separately as a red-tinted count for visibility
 * - Progress bar width uses inline style with percentage for smooth transitions
 */

interface DocStatusProps {
  totalFiles: number;
  documentedFiles: number;
  missingFiles: number;
  coverage: number;
}

function getCoverageColorClass(coverage: number): string {
  if (coverage >= 80) return "text-green-400";
  if (coverage >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getBarColorClass(coverage: number): string {
  if (coverage >= 80) return "bg-green-500";
  if (coverage >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getCoverageLabel(coverage: number): string {
  if (coverage >= 80) return "Good";
  if (coverage >= 50) return "Needs Work";
  return "Critical";
}

export function DocStatus({
  totalFiles,
  documentedFiles,
  missingFiles,
  coverage,
}: DocStatusProps) {
  const colorClass = getCoverageColorClass(coverage);
  const barColor = getBarColorClass(coverage);
  const label = getCoverageLabel(coverage);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium text-neutral-300">
            Documentation Coverage
          </h3>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
              coverage >= 80
                ? "border-green-500/30 bg-green-500/20 text-green-400"
                : coverage >= 50
                  ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                  : "border-red-500/30 bg-red-500/20 text-red-400"
            }`}
          >
            {label}
          </span>
        </div>
        <span className={`text-lg font-bold ${colorClass}`}>
          {Math.round(coverage)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.min(coverage, 100)}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-neutral-400">
          <span className="font-medium text-neutral-300">{documentedFiles}</span>
          {" of "}
          <span className="font-medium text-neutral-300">{totalFiles}</span>
          {" files documented"}
        </span>

        {missingFiles > 0 && (
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            {missingFiles} missing
          </span>
        )}

        {totalFiles > 0 && documentedFiles === totalFiles && (
          <span className="flex items-center gap-1.5 text-green-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            Fully documented
          </span>
        )}
      </div>
    </div>
  );
}
