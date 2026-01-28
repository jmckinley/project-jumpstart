/**
 * @module components/agents/AgentLibrary
 * @description Main orchestrator for the agent library view
 *
 * PURPOSE:
 * - Display the browsable catalog of pre-defined agents
 * - Filter agents by category, tier, and relevance
 * - Search agents by name/description
 * - Handle adding agents to the project
 *
 * DEPENDENCIES:
 * - @/data/agentLibrary - AGENT_LIBRARY catalog
 * - @/data/agentCategories - AGENT_CATEGORIES metadata
 * - @/lib/agentRelevance - rankLibraryAgents, ScoredAgent
 * - @/stores/projectStore - Active project for relevance scoring
 * - @/components/agents/AgentCategoryFilter - Category filter pills
 * - @/components/agents/AgentLibraryCard - Agent card component
 * - @/components/agents/AgentLibraryDetail - Detail panel
 *
 * EXPORTS:
 * - AgentLibrary - Main library view component
 *
 * PATTERNS:
 * - Agents are ranked by relevance to the active project
 * - Search filters on name and description
 * - Category filter shows matching agents
 * - Tier filter shows basic/advanced/all
 * - "Recommended" filter shows isRecommended agents
 *
 * CLAUDE NOTES:
 * - Uses useMemo for expensive ranking computation
 * - Selected agent opens in detail panel on the right
 * - "Add" calls parent callback to create the agent
 * - "Customize" switches to expert mode with pre-filled content
 */

import { useState, useMemo } from "react";
import { AGENT_LIBRARY } from "@/data/agentLibrary";
import { AGENT_CATEGORIES } from "@/data/agentCategories";
import { rankLibraryAgents } from "@/lib/agentRelevance";
import { useProjectStore } from "@/stores/projectStore";
import { AgentCategoryFilter } from "./AgentCategoryFilter";
import { AgentLibraryCard } from "./AgentLibraryCard";
import { AgentLibraryDetail } from "./AgentLibraryDetail";
import type { AgentCategory, LibraryAgent, AgentTier } from "@/types/agent";

type FilterValue = "all" | "recommended" | AgentCategory;
type TierFilter = "all" | AgentTier;

interface AgentLibraryProps {
  existingAgentNames: string[];
  onAddAgent: (agent: LibraryAgent) => void;
  onSwitchToExpert: (agent: LibraryAgent) => void;
}

export function AgentLibrary({
  existingAgentNames,
  onAddAgent,
  onSwitchToExpert,
}: AgentLibraryProps) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [filter, setFilter] = useState<FilterValue>("recommended");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Rank agents by relevance to the active project
  const rankedAgents = useMemo(
    () => rankLibraryAgents(AGENT_LIBRARY, activeProject),
    [activeProject],
  );

  // Check if an agent is already added
  const isAdded = (name: string) =>
    existingAgentNames.some(
      (n) => n.toLowerCase() === name.toLowerCase(),
    );

  // Apply tier filter
  const tierFiltered = useMemo(() => {
    if (tierFilter === "all") return rankedAgents;
    return rankedAgents.filter((s) => s.agent.tier === tierFilter);
  }, [rankedAgents, tierFilter]);

  // Apply search filter
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return tierFiltered;
    const term = search.toLowerCase();
    return tierFiltered.filter(
      (s) =>
        s.agent.name.toLowerCase().includes(term) ||
        s.agent.description.toLowerCase().includes(term),
    );
  }, [tierFiltered, search]);

  // Apply category/recommended filter
  const filteredAgents = useMemo(() => {
    if (filter === "all") return searchFiltered;
    if (filter === "recommended") {
      return searchFiltered.filter((s) => s.isRecommended);
    }
    return searchFiltered.filter((s) => s.agent.category === filter);
  }, [searchFiltered, filter]);

  // Compute counts for the filter bar
  const counts = useMemo(() => {
    const categoryCounts: Record<AgentCategory, number> = {
      testing: 0,
      "code-review": 0,
      documentation: 0,
      debugging: 0,
      refactoring: 0,
      "feature-development": 0,
    };
    let recommendedCount = 0;

    for (const s of searchFiltered) {
      categoryCounts[s.agent.category]++;
      if (s.isRecommended) recommendedCount++;
    }

    return { categoryCounts, recommendedCount, totalCount: searchFiltered.length };
  }, [searchFiltered]);

  // Get selected agent
  const selectedAgent = useMemo(
    () => filteredAgents.find((s) => s.agent.slug === selectedSlug) ?? null,
    [filteredAgents, selectedSlug],
  );

  const handleAdd = (agent: LibraryAgent) => {
    onAddAgent(agent);
  };

  const handleCustomize = (agent: LibraryAgent) => {
    onSwitchToExpert(agent);
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
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 py-2 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-colors focus:border-blue-600"
        />
      </div>

      {/* Category and tier filters */}
      <AgentCategoryFilter
        categories={AGENT_CATEGORIES}
        selectedFilter={filter}
        selectedTier={tierFilter}
        recommendedCount={counts.recommendedCount}
        categoryCounts={counts.categoryCounts}
        totalCount={counts.totalCount}
        onSelectFilter={setFilter}
        onSelectTier={setTierFilter}
      />

      {/* Main content: grid + detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Agents grid */}
        <div className="space-y-3 lg:col-span-1">
          {filteredAgents.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
              <p className="text-sm">No agents match your filters</p>
            </div>
          ) : (
            <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
              {filteredAgents.map((scoredAgent) => (
                <AgentLibraryCard
                  key={scoredAgent.agent.slug}
                  scoredAgent={scoredAgent}
                  isAdded={isAdded(scoredAgent.agent.name)}
                  isSelected={selectedSlug === scoredAgent.agent.slug}
                  onSelect={() => setSelectedSlug(scoredAgent.agent.slug)}
                  onAdd={() => handleAdd(scoredAgent.agent)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          <AgentLibraryDetail
            scoredAgent={selectedAgent}
            isAdded={selectedAgent ? isAdded(selectedAgent.agent.name) : false}
            onAdd={() => selectedAgent && handleAdd(selectedAgent.agent)}
            onCustomize={() => selectedAgent && handleCustomize(selectedAgent.agent)}
            onClose={() => setSelectedSlug(null)}
          />
        </div>
      </div>
    </div>
  );
}
