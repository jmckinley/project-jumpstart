/**
 * @module components/skills/SkillLibrary
 * @description Main orchestrator for the skill library view
 *
 * PURPOSE:
 * - Display the browsable catalog of pre-defined skills
 * - Filter skills by category and relevance
 * - Search skills by name/description
 * - Handle adding skills to the project
 *
 * DEPENDENCIES:
 * - @/data/skillLibrary - SKILL_LIBRARY catalog
 * - @/data/skillCategories - SKILL_CATEGORIES metadata
 * - @/lib/skillRelevance - rankLibrarySkills, ScoredSkill
 * - @/stores/projectStore - Active project for relevance scoring
 * - @/components/skills/SkillCategoryFilter - Category filter pills
 * - @/components/skills/SkillLibraryCard - Skill card component
 * - @/components/skills/SkillLibraryDetail - Detail panel
 *
 * EXPORTS:
 * - SkillLibrary - Main library view component
 *
 * PATTERNS:
 * - Skills are ranked by relevance to the active project
 * - Search filters on name and description
 * - Category filter shows matching skills
 * - "Recommended" filter shows isRecommended skills
 *
 * CLAUDE NOTES:
 * - Uses useMemo for expensive ranking computation
 * - Selected skill opens in detail panel on the right
 * - "Add" calls parent callback to create the skill
 * - "Customize" switches to expert mode with pre-filled content
 */

import { useState, useMemo } from "react";
import { SKILL_LIBRARY } from "@/data/skillLibrary";
import { SKILL_CATEGORIES } from "@/data/skillCategories";
import { rankLibrarySkills } from "@/lib/skillRelevance";
import { useProjectStore } from "@/stores/projectStore";
import { SkillCategoryFilter } from "./SkillCategoryFilter";
import { SkillLibraryCard } from "./SkillLibraryCard";
import { SkillLibraryDetail } from "./SkillLibraryDetail";
import type { SkillCategory, LibrarySkill } from "@/types/skill";

type FilterValue = "all" | "recommended" | SkillCategory;

interface SkillLibraryProps {
  existingSkillNames: string[];
  onAddSkill: (skill: LibrarySkill) => void;
  onSwitchToExpert: (skill: LibrarySkill) => void;
}

export function SkillLibrary({
  existingSkillNames,
  onAddSkill,
  onSwitchToExpert,
}: SkillLibraryProps) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [filter, setFilter] = useState<FilterValue>("recommended");
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Rank skills by relevance to the active project
  const rankedSkills = useMemo(
    () => rankLibrarySkills(SKILL_LIBRARY, activeProject),
    [activeProject],
  );

  // Check if a skill is already added
  const isAdded = (name: string) =>
    existingSkillNames.some(
      (n) => n.toLowerCase() === name.toLowerCase(),
    );

  // Apply search filter
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return rankedSkills;
    const term = search.toLowerCase();
    return rankedSkills.filter(
      (s) =>
        s.skill.name.toLowerCase().includes(term) ||
        s.skill.description.toLowerCase().includes(term),
    );
  }, [rankedSkills, search]);

  // Apply category/recommended filter
  const filteredSkills = useMemo(() => {
    if (filter === "all") return searchFiltered;
    if (filter === "recommended") {
      return searchFiltered.filter((s) => s.isRecommended);
    }
    return searchFiltered.filter((s) => s.skill.category === filter);
  }, [searchFiltered, filter]);

  // Compute counts for the filter bar
  const counts = useMemo(() => {
    const categoryCounts: Record<SkillCategory, number> = {
      documentation: 0,
      testing: 0,
      "component-creation": 0,
      "state-management": 0,
      "api-design": 0,
      "error-handling": 0,
      "code-review": 0,
      refactoring: 0,
      debugging: 0,
      database: 0,
    };
    let recommendedCount = 0;

    for (const s of searchFiltered) {
      categoryCounts[s.skill.category]++;
      if (s.isRecommended) recommendedCount++;
    }

    return { categoryCounts, recommendedCount, totalCount: searchFiltered.length };
  }, [searchFiltered]);

  // Get selected skill
  const selectedSkill = useMemo(
    () => filteredSkills.find((s) => s.skill.slug === selectedSlug) ?? null,
    [filteredSkills, selectedSlug],
  );

  const handleAdd = (skill: LibrarySkill) => {
    onAddSkill(skill);
  };

  const handleCustomize = (skill: LibrarySkill) => {
    onSwitchToExpert(skill);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-colors focus:border-blue-600"
        />
      </div>

      {/* Category filter */}
      <SkillCategoryFilter
        categories={SKILL_CATEGORIES}
        selectedFilter={filter}
        recommendedCount={counts.recommendedCount}
        categoryCounts={counts.categoryCounts}
        totalCount={counts.totalCount}
        onSelect={setFilter}
      />

      {/* Main content: grid + detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Skills grid */}
        <div className="space-y-3 lg:col-span-1">
          {filteredSkills.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
              <p className="text-sm">No skills match your filters</p>
            </div>
          ) : (
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
              {filteredSkills.map((scoredSkill) => (
                <SkillLibraryCard
                  key={scoredSkill.skill.slug}
                  scoredSkill={scoredSkill}
                  isAdded={isAdded(scoredSkill.skill.name)}
                  isSelected={selectedSlug === scoredSkill.skill.slug}
                  onSelect={() => setSelectedSlug(scoredSkill.skill.slug)}
                  onAdd={() => handleAdd(scoredSkill.skill)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <SkillLibraryDetail
            scoredSkill={selectedSkill}
            isAdded={selectedSkill ? isAdded(selectedSkill.skill.name) : false}
            onAdd={() => selectedSkill && handleAdd(selectedSkill.skill)}
            onCustomize={() => selectedSkill && handleCustomize(selectedSkill.skill)}
            onClose={() => setSelectedSlug(null)}
          />
        </div>
      </div>
    </div>
  );
}
