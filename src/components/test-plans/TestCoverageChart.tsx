/**
 * @module components/test-plans/TestCoverageChart
 * @description SVG trend chart showing coverage over time vs target
 *
 * PURPOSE:
 * - Visualize coverage trend over recent runs
 * - Show target coverage line
 * - Indicate whether current coverage meets target
 *
 * DEPENDENCIES:
 * - react - Component rendering
 *
 * EXPORTS:
 * - TestCoverageChart - Coverage trend chart component
 *
 * PATTERNS:
 * - Simple SVG line chart
 * - Target line shown as dashed
 * - Points colored based on relation to target
 *
 * CLAUDE NOTES:
 * - Green when coverage >= target
 * - Yellow when coverage >= target * 0.8
 * - Red when coverage < target * 0.8
 */

interface TestCoverageChartProps {
  coverageTrend: number[];
  targetCoverage: number;
  currentCoverage?: number;
}

export function TestCoverageChart({
  coverageTrend,
  targetCoverage,
  currentCoverage,
}: TestCoverageChartProps) {
  // Chart dimensions
  const width = 280;
  const height = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const maxCoverage = Math.max(100, ...coverageTrend, targetCoverage);
  const yScale = (value: number) =>
    padding.top + chartHeight - (value / maxCoverage) * chartHeight;
  const xScale = (index: number) =>
    padding.left + (index / Math.max(1, coverageTrend.length - 1)) * chartWidth;

  // Generate path for trend line
  const linePath =
    coverageTrend.length > 0
      ? coverageTrend
          .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`)
          .join(" ")
      : "";

  // Target line y position
  const targetY = yScale(targetCoverage);

  // Determine status color
  const statusColor =
    currentCoverage !== undefined
      ? currentCoverage >= targetCoverage
        ? "text-green-400"
        : currentCoverage >= targetCoverage * 0.8
        ? "text-yellow-400"
        : "text-red-400"
      : "text-neutral-400";

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Coverage Trend
        </h3>
        {currentCoverage !== undefined && (
          <span className={`text-lg font-semibold ${statusColor}`}>
            {currentCoverage.toFixed(1)}%
          </span>
        )}
      </div>

      {coverageTrend.length === 0 ? (
        <div className="flex h-24 items-center justify-center">
          <p className="text-xs text-neutral-500">No coverage data yet</p>
        </div>
      ) : (
        <svg width={width} height={height} className="overflow-visible">
          {/* Y-axis labels */}
          <text
            x={padding.left - 5}
            y={padding.top}
            className="fill-neutral-600 text-[10px]"
            textAnchor="end"
          >
            100%
          </text>
          <text
            x={padding.left - 5}
            y={padding.top + chartHeight / 2}
            className="fill-neutral-600 text-[10px]"
            textAnchor="end"
          >
            50%
          </text>
          <text
            x={padding.left - 5}
            y={padding.top + chartHeight}
            className="fill-neutral-600 text-[10px]"
            textAnchor="end"
          >
            0%
          </text>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + chartWidth}
            y2={padding.top}
            className="stroke-neutral-800"
            strokeWidth={1}
          />
          <line
            x1={padding.left}
            y1={padding.top + chartHeight / 2}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight / 2}
            className="stroke-neutral-800"
            strokeWidth={1}
          />
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            className="stroke-neutral-800"
            strokeWidth={1}
          />

          {/* Target line */}
          <line
            x1={padding.left}
            y1={targetY}
            x2={padding.left + chartWidth}
            y2={targetY}
            className="stroke-blue-500"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <text
            x={padding.left + chartWidth + 3}
            y={targetY + 3}
            className="fill-blue-500 text-[9px]"
          >
            Target
          </text>

          {/* Trend line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              className={
                currentCoverage !== undefined && currentCoverage >= targetCoverage
                  ? "stroke-green-400"
                  : "stroke-yellow-400"
              }
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {coverageTrend.map((value, index) => (
            <circle
              key={index}
              cx={xScale(index)}
              cy={yScale(value)}
              r={3}
              className={
                value >= targetCoverage
                  ? "fill-green-400"
                  : value >= targetCoverage * 0.8
                  ? "fill-yellow-400"
                  : "fill-red-400"
              }
            />
          ))}

          {/* X-axis label */}
          <text
            x={padding.left + chartWidth / 2}
            y={height - 3}
            className="fill-neutral-600 text-[9px]"
            textAnchor="middle"
          >
            Last {coverageTrend.length} runs
          </text>
        </svg>
      )}

      {/* Target info */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-neutral-500">Target: {targetCoverage}%</span>
        {currentCoverage !== undefined && (
          <span className={statusColor}>
            {currentCoverage >= targetCoverage
              ? "Target met!"
              : `${(targetCoverage - currentCoverage).toFixed(1)}% to go`}
          </span>
        )}
      </div>
    </div>
  );
}
