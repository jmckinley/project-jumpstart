/**
 * @module components/skills/SkillCategoryFilter
 * @description Horizontal scrollable pill bar for filtering skills by category
 *
 * PURPOSE:
 * - Display filter pills for "All", "Recommended", and each skill category
 * - Show count badges for each category
 * - Highlight the active filter
 *
 * DEPENDENCIES:
 * - @/types/skill - SkillCategoryInfo type
 *
 * EXPORTS:
 * - SkillCategoryFilter - Category filter pill bar component
 *
 * PATTERNS:
 * - "all" and "recommended" are special filter values
 * - Active pill has blue background, others have neutral
 * - Badges show count of skills in each category
 *
 * CLAUDE NOTES:
 * - Filter values: "all", "recommended", or a SkillCategory id
 * - Scrollable horizontally on narrow screens
 * - recommendedCount is separate from category counts
 */

import type { SkillCategory, SkillCategoryInfo } from "@/types/skill";

type FilterValue = "all" | "recommended" | SkillCategory;

interface SkillCategoryFilterProps {
  categories: SkillCategoryInfo[];
  selectedFilter: FilterValue;
  recommendedCount: number;
  categoryCounts: Record<SkillCategory, number>;
  totalCount: number;
  onSelect: (filter: FilterValue) => void;
}

export function SkillCategoryFilter({
  categories,
  selectedFilter,
  recommendedCount,
  categoryCounts,
  totalCount,
  onSelect,
}: SkillCategoryFilterProps) {
  const pillBase =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap";
  const pillActive = "bg-blue-600 text-white";
  const pillInactive =
    "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100";

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-700">
      {/* All */}
      <button
        onClick={() => onSelect("all")}
        className={`${pillBase} ${selectedFilter === "all" ? pillActive : pillInactive}`}
      >
        All
        <span className="rounded-full bg-neutral-900/50 px-1.5 text-xs">
          {totalCount}
        </span>
      </button>

      {/* Recommended */}
      <button
        onClick={() => onSelect("recommended")}
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
            onClick={() => onSelect(category.id)}
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
  );
}
