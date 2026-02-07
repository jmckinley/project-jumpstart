/**
 * @module components/team-templates/TeamCategoryFilter
 * @description Horizontal scrollable pill bar for filtering team templates by category and pattern
 *
 * PURPOSE:
 * - Display filter pills for "All", "Recommended", pattern options, and each team category
 * - Show count badges for each category
 * - Highlight the active filter
 *
 * DEPENDENCIES:
 * - @/types/team-template - TeamCategoryInfo, OrchestrationPattern, TeamCategory types
 *
 * EXPORTS:
 * - TeamCategoryFilter - Category and pattern filter pill bar component
 *
 * PATTERNS:
 * - "all" and "recommended" are special filter values
 * - Pattern filter is separate from category filter (replaces tier filter from agents)
 * - Active pill has blue background, others have neutral
 * - Badges show count of templates in each category
 *
 * CLAUDE NOTES:
 * - Filter values: "all", "recommended", or a TeamCategory id
 * - Pattern values: "all", "leader", "pipeline", "parallel", "swarm", "council"
 * - Scrollable horizontally on narrow screens
 * - Pattern pills have color-coded active states
 */

import type { TeamCategory, TeamCategoryInfo, OrchestrationPattern } from "@/types/team-template";

type FilterValue = "all" | "recommended" | TeamCategory;
type PatternFilter = "all" | OrchestrationPattern;

interface TeamCategoryFilterProps {
  categories: TeamCategoryInfo[];
  selectedFilter: FilterValue;
  selectedPattern: PatternFilter;
  recommendedCount: number;
  categoryCounts: Record<TeamCategory, number>;
  totalCount: number;
  onSelectFilter: (filter: FilterValue) => void;
  onSelectPattern: (pattern: PatternFilter) => void;
}

const PATTERN_COLORS: Record<string, string> = {
  leader: "bg-blue-600 text-white",
  pipeline: "bg-amber-600 text-white",
  parallel: "bg-green-600 text-white",
  swarm: "bg-purple-600 text-white",
  council: "bg-rose-600 text-white",
  all: "bg-neutral-700 text-white",
};

const PATTERN_LABELS: Record<string, string> = {
  all: "All",
  leader: "Leader",
  pipeline: "Pipeline",
  parallel: "Parallel",
  swarm: "Swarm",
  council: "Council",
};

export function TeamCategoryFilter({
  categories,
  selectedFilter,
  selectedPattern,
  recommendedCount,
  categoryCounts,
  totalCount,
  onSelectFilter,
  onSelectPattern,
}: TeamCategoryFilterProps) {
  const pillBase =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
  const pillActive = "bg-blue-600 text-white";
  const pillInactive =
    "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100";

  return (
    <div className="space-y-3">
      {/* Pattern filter row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">Pattern:</span>
        <div className="flex gap-1">
          {(["all", "leader", "pipeline", "parallel", "swarm", "council"] as PatternFilter[]).map((pattern) => (
            <button
              key={pattern}
              onClick={() => onSelectPattern(pattern)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedPattern === pattern
                  ? PATTERN_COLORS[pattern]
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {PATTERN_LABELS[pattern]}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter row */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-700">
        {/* All */}
        <button
          onClick={() => onSelectFilter("all")}
          className={`${pillBase} ${selectedFilter === "all" ? pillActive : pillInactive}`}
        >
          All
          <span className="rounded-full bg-neutral-900/50 px-1.5 text-xs">
            {totalCount}
          </span>
        </button>

        {/* Recommended */}
        <button
          onClick={() => onSelectFilter("recommended")}
          className={`${pillBase} ${selectedFilter === "recommended" ? pillActive : pillInactive}`}
        >
          Recommended
          <span className="rounded-full bg-neutral-900/50 px-1.5 text-xs">
            {recommendedCount}
          </span>
        </button>

        {/* Category pills */}
        {categories.map((category) => {
          const count = categoryCounts[category.id] ?? 0;
          return (
            <button
              key={category.id}
              onClick={() => onSelectFilter(category.id)}
              className={`${pillBase} ${selectedFilter === category.id ? pillActive : pillInactive}`}
              title={category.description}
            >
              {category.label}
              <span className="rounded-full bg-neutral-900/50 px-1.5 text-xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
