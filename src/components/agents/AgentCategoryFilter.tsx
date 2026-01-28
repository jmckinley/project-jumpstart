/**
 * @module components/agents/AgentCategoryFilter
 * @description Horizontal scrollable pill bar for filtering agents by category and tier
 *
 * PURPOSE:
 * - Display filter pills for "All", "Recommended", tier options, and each agent category
 * - Show count badges for each category
 * - Highlight the active filter
 *
 * DEPENDENCIES:
 * - @/types/agent - AgentCategoryInfo, AgentTier, AgentCategory types
 *
 * EXPORTS:
 * - AgentCategoryFilter - Category filter pill bar component
 *
 * PATTERNS:
 * - "all" and "recommended" are special filter values
 * - Tier filter is separate from category filter
 * - Active pill has blue background, others have neutral
 * - Badges show count of agents in each category
 *
 * CLAUDE NOTES:
 * - Filter values: "all", "recommended", or an AgentCategory id
 * - Tier values: "all", "basic", "advanced"
 * - Scrollable horizontally on narrow screens
 * - recommendedCount is separate from category counts
 */

import type { AgentCategory, AgentCategoryInfo, AgentTier } from "@/types/agent";

type FilterValue = "all" | "recommended" | AgentCategory;
type TierFilter = "all" | AgentTier;

interface AgentCategoryFilterProps {
  categories: AgentCategoryInfo[];
  selectedFilter: FilterValue;
  selectedTier: TierFilter;
  recommendedCount: number;
  categoryCounts: Record<AgentCategory, number>;
  totalCount: number;
  onSelectFilter: (filter: FilterValue) => void;
  onSelectTier: (tier: TierFilter) => void;
}

export function AgentCategoryFilter({
  categories,
  selectedFilter,
  selectedTier,
  recommendedCount,
  categoryCounts,
  totalCount,
  onSelectFilter,
  onSelectTier,
}: AgentCategoryFilterProps) {
  const pillBase =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
  const pillActive = "bg-blue-600 text-white";
  const pillInactive =
    "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100";

  return (
    <div className="space-y-3">
      {/* Tier filter row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">Tier:</span>
        <div className="flex gap-1">
          {(["all", "basic", "advanced"] as TierFilter[]).map((tier) => (
            <button
              key={tier}
              onClick={() => onSelectTier(tier)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedTier === tier
                  ? tier === "basic"
                    ? "bg-blue-600 text-white"
                    : tier === "advanced"
                      ? "bg-purple-600 text-white"
                      : "bg-neutral-700 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {tier === "all" ? "All" : tier === "basic" ? "Basic" : "Advanced"}
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
