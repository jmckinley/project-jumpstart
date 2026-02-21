/**
 * @module components/performance/PerformanceScore
 * @description Displays performance score with circular gauge and 6-component breakdown
 *
 * PURPOSE:
 * - Render circular progress ring showing overall performance score (0-100)
 * - Show 6-component breakdown bars (query, rendering, memory, bundle, caching, API)
 * - Provide "Run Analysis" button to trigger performance scan
 *
 * DEPENDENCIES:
 * - @/types/performance - PerformanceComponents type
 *
 * EXPORTS:
 * - PerformanceScore - Performance score display component
 *
 * PATTERNS:
 * - Receives score, components, analyzing flag, and onAnalyze callback as props
 * - Color-coding: green >= 70, yellow 40-69, red < 40
 * - Component max weights: queryPatterns=20, rendering=20, memory=15, bundle=15, caching=15, apiDesign=15
 */

import type { PerformanceComponents } from "@/types/performance";

interface PerformanceScoreProps {
  score: number;
  components: PerformanceComponents | null;
  analyzing: boolean;
  onAnalyze: () => void;
}

const COMPONENT_CONFIG = [
  { key: "queryPatterns" as const, label: "Query Patterns", max: 20 },
  { key: "rendering" as const, label: "Rendering", max: 20 },
  { key: "memory" as const, label: "Memory", max: 15 },
  { key: "bundle" as const, label: "Bundle Size", max: 15 },
  { key: "caching" as const, label: "Caching", max: 15 },
  { key: "apiDesign" as const, label: "API Design", max: 15 },
];

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function getScoreColorClass(score: number): string {
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

function getBarColorClass(ratio: number): string {
  if (ratio >= 0.7) return "bg-green-500";
  if (ratio >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

export function PerformanceScore({
  score,
  components,
  analyzing,
  onAnalyze,
}: PerformanceScoreProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);
  const color = getScoreColor(score);
  const colorClass = getScoreColorClass(score);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          Performance Score
        </h3>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzing ? (
            <>
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
              Analyzing...
            </>
          ) : (
            "Run Analysis"
          )}
        </button>
      </div>

      {/* Circular Score Display */}
      <div className="mb-6 flex justify-center">
        <div className="relative h-36 w-36">
          <svg
            className="-rotate-90"
            viewBox="0 0 120 120"
            width="144"
            height="144"
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#404040"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${colorClass}`}>{score}</span>
            <span className="text-xs text-neutral-500">/ 100</span>
          </div>
        </div>
      </div>

      {/* Component Breakdown */}
      {components && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Breakdown
          </h4>
          {COMPONENT_CONFIG.map(({ key, label, max }) => {
            const value = components[key];
            const ratio = max > 0 ? value / max : 0;
            const barColor = getBarColorClass(ratio);
            const widthPercent = Math.min(ratio * 100, 100);

            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{label}</span>
                  <span className="font-mono text-xs text-neutral-500">
                    {value} / {max}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!components && !analyzing && (
        <p className="text-center text-sm text-neutral-500">
          Click "Run Analysis" to scan your project for performance issues.
        </p>
      )}
    </div>
  );
}
