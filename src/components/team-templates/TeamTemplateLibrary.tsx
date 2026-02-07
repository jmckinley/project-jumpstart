/**
 * @module components/team-templates/TeamTemplateLibrary
 * @description Main orchestrator for the team template library view
 *
 * PURPOSE:
 * - Display the browsable catalog of pre-defined team templates
 * - Filter templates by category, pattern, and relevance
 * - Search templates by name/description
 * - Handle adding templates to the project
 *
 * DEPENDENCIES:
 * - @/data/teamTemplateLibrary - TEAM_TEMPLATE_LIBRARY catalog
 * - @/data/teamCategories - TEAM_CATEGORIES metadata
 * - @/lib/teamRelevance - rankLibraryTeams, ScoredTeamTemplate
 * - @/stores/projectStore - Active project for relevance scoring
 * - @/components/team-templates/TeamCategoryFilter - Filter pills
 * - @/components/team-templates/TeamTemplateCard - Template card
 * - @/components/team-templates/TeamTemplateDetail - Detail panel
 *
 * EXPORTS:
 * - TeamTemplateLibrary - Main library view component
 *
 * PATTERNS:
 * - Templates ranked by relevance to active project
 * - Search filters on name and description
 * - Category filter shows matching templates
 * - Pattern filter shows leader/pipeline/parallel/swarm/council/all
 *
 * CLAUDE NOTES:
 * - Uses useMemo for expensive ranking computation
 * - Selected template opens in detail panel on the right
 */

import { useState, useMemo } from "react";
import { TEAM_TEMPLATE_LIBRARY } from "@/data/teamTemplateLibrary";
import { TEAM_CATEGORIES } from "@/data/teamCategories";
import { rankLibraryTeams } from "@/lib/teamRelevance";
import { useProjectStore } from "@/stores/projectStore";
import { TeamCategoryFilter } from "./TeamCategoryFilter";
import { TeamTemplateCard } from "./TeamTemplateCard";
import { TeamTemplateDetail } from "./TeamTemplateDetail";
import type { TeamCategory, LibraryTeamTemplate, OrchestrationPattern } from "@/types/team-template";

type FilterValue = "all" | "recommended" | TeamCategory;
type PatternFilter = "all" | OrchestrationPattern;

interface TeamTemplateLibraryProps {
  existingTemplateNames: string[];
  onAddTemplate: (template: LibraryTeamTemplate) => void;
  onDeploy: (template: LibraryTeamTemplate) => void;
}

export function TeamTemplateLibrary({
  existingTemplateNames,
  onAddTemplate,
  onDeploy,
}: TeamTemplateLibraryProps) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [filter, setFilter] = useState<FilterValue>("recommended");
  const [patternFilter, setPatternFilter] = useState<PatternFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const rankedTemplates = useMemo(
    () => rankLibraryTeams(TEAM_TEMPLATE_LIBRARY, activeProject),
    [activeProject],
  );

  const isAdded = (name: string) =>
    existingTemplateNames.some(
      (n) => n.toLowerCase() === name.toLowerCase(),
    );

  // Apply pattern filter
  const patternFiltered = useMemo(() => {
    if (patternFilter === "all") return rankedTemplates;
    return rankedTemplates.filter((s) => s.template.orchestrationPattern === patternFilter);
  }, [rankedTemplates, patternFilter]);

  // Apply search filter
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return patternFiltered;
    const term = search.toLowerCase();
    return patternFiltered.filter(
      (s) =>
        s.template.name.toLowerCase().includes(term) ||
        s.template.description.toLowerCase().includes(term),
    );
  }, [patternFiltered, search]);

  // Apply category/recommended filter
  const filteredTemplates = useMemo(() => {
    if (filter === "all") return searchFiltered;
    if (filter === "recommended") {
      return searchFiltered.filter((s) => s.isRecommended);
    }
    return searchFiltered.filter((s) => s.template.category === filter);
  }, [searchFiltered, filter]);

  // Compute counts
  const counts = useMemo(() => {
    const categoryCounts: Record<TeamCategory, number> = {
      "feature-development": 0,
      testing: 0,
      "code-review": 0,
      refactoring: 0,
      migration: 0,
      documentation: 0,
      devops: 0,
    };
    let recommendedCount = 0;

    for (const s of searchFiltered) {
      categoryCounts[s.template.category]++;
      if (s.isRecommended) recommendedCount++;
    }

    return { categoryCounts, recommendedCount, totalCount: searchFiltered.length };
  }, [searchFiltered]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((s) => s.template.slug === selectedSlug) ?? null,
    [filteredTemplates, selectedSlug],
  );

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
          placeholder="Search team templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-colors focus:border-blue-600"
        />
      </div>

      {/* Category and pattern filters */}
      <TeamCategoryFilter
        categories={TEAM_CATEGORIES}
        selectedFilter={filter}
        selectedPattern={patternFilter}
        recommendedCount={counts.recommendedCount}
        categoryCounts={counts.categoryCounts}
        totalCount={counts.totalCount}
        onSelectFilter={setFilter}
        onSelectPattern={setPatternFilter}
      />

      {/* Main content: grid + detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Templates grid */}
        <div className="space-y-3 lg:col-span-1">
          {filteredTemplates.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
              <p className="text-sm">No team templates match your filters</p>
            </div>
          ) : (
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
              {filteredTemplates.map((scoredTemplate) => (
                <TeamTemplateCard
                  key={scoredTemplate.template.slug}
                  scoredTemplate={scoredTemplate}
                  isAdded={isAdded(scoredTemplate.template.name)}
                  isSelected={selectedSlug === scoredTemplate.template.slug}
                  onSelect={() => setSelectedSlug(scoredTemplate.template.slug)}
                  onAdd={() => onAddTemplate(scoredTemplate.template)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <TeamTemplateDetail
            scoredTemplate={selectedTemplate}
            isAdded={selectedTemplate ? isAdded(selectedTemplate.template.name) : false}
            onAdd={() => selectedTemplate && onAddTemplate(selectedTemplate.template)}
            onDeploy={() => selectedTemplate && onDeploy(selectedTemplate.template)}
            onClose={() => setSelectedSlug(null)}
          />
        </div>
      </div>
    </div>
  );
}
