/**
 * @module components/dashboard/HealthScore
 * @description Displays the overall project health score (0-100) with a circular SVG indicator and component breakdown bars
 *
 * PURPOSE:
 * - Render a large circular progress ring showing the total health score
 * - Color-code the ring: green >= 70, yellow 40-69, red < 40
 * - Show a breakdown of all 8 health components as horizontal bars
 *
 * DEPENDENCIES:
 * - @/types/health - HealthComponents type for component breakdown
 *
 * EXPORTS:
 * - HealthScore - Dashboard card component showing health score and breakdown
 *
 * PATTERNS:
 * - Receives score and components as props from the parent dashboard
 * - Uses SVG stroke-dasharray / stroke-dashoffset for the circular progress ring
 * - Each breakdown bar width is calculated as (current / max) * 100%
 *
 * CLAUDE NOTES:
 * - The SVG circle has radius 54 and circumference ~339.29
 * - stroke-dashoffset is calculated as circumference * (1 - score / 100)
 * - Component max weights: claudeMd 20, moduleDocs 20, freshness 12, skills 12, context 7, enforcement 7, tests 10, performance 12
 * - When components is null, bars render at 0 width
 */

import type { HealthComponents } from "@/types/health";

interface HealthScoreProps {
  score: number;
  components: HealthComponents | null;
  discoveredTestCount?: number | null;
}

const COMPONENT_CONFIG = [
  { key: "claudeMd" as const, label: "CLAUDE.md", max: 20 },
  { key: "moduleDocs" as const, label: "Modules", max: 20 },
  { key: "freshness" as const, label: "Freshness", max: 12 },
  { key: "skills" as const, label: "Skills", max: 12 },
  { key: "context" as const, label: "Context", max: 7 },
  { key: "enforcement" as const, label: "Enforcement", max: 7 },
  { key: "tests" as const, label: "Tests", max: 10 },
  { key: "performance" as const, label: "Performance", max: 12 },
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

export function HealthScore({ score, components, discoveredTestCount }: HealthScoreProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);
  const color = getScoreColor(score);
  const colorClass = getScoreColorClass(score);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        Health Score
      </h3>

      {/* Circular Score Display */}
      <div className="mb-6 flex justify-center">
        <div className="relative h-36 w-36">
          <svg
            className="-rotate-90"
            viewBox="0 0 120 120"
            width="144"
            height="144"
          >
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#404040"
              strokeWidth="8"
            />
            {/* Progress circle */}
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
      <div className="space-y-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Breakdown
        </h4>
        {COMPONENT_CONFIG.map(({ key, label, max }) => {
          const value = components ? components[key] : 0;
          const ratio = max > 0 ? value / max : 0;
          const barColor = getBarColorClass(ratio);
          const widthPercent = Math.min(ratio * 100, 100);
          const showDiscovery = key === "tests" && discoveredTestCount && discoveredTestCount > 0 && value <= 3;

          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {label}
                  {showDiscovery && (
                    <span className="ml-1.5 text-blue-400">
                      ({discoveredTestCount} discovered)
                    </span>
                  )}
                </span>
                <span className="text-xs font-mono text-neutral-500">
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
    </div>
  );
}
