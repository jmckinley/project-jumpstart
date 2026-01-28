/**
 * @module components/agents/AgentLibraryCard
 * @description Card component for displaying an agent in the library grid
 *
 * PURPOSE:
 * - Display agent name, description, tier, and tag pills
 * - Show "Recommended" badge for relevant agents
 * - Show "Add" button or "Added" indicator
 * - Handle click to select for detail view
 *
 * DEPENDENCIES:
 * - @/lib/agentRelevance - ScoredAgent type
 * - @/components/ui/badge - Badge component for tags
 *
 * EXPORTS:
 * - AgentLibraryCard - Library agent card component
 *
 * PATTERNS:
 * - Card is clickable to select
 * - Add button stops propagation to not trigger select
 * - Tags are shown as small pills
 * - Tier badge: Basic = blue, Advanced = purple
 * - Recommended badge is green
 *
 * CLAUDE NOTES:
 * - isAdded shows checkmark instead of Add button
 * - Score is not displayed, only used for sorting
 * - Card has hover state and selected state
 */

import type { ScoredAgent } from "@/lib/agentRelevance";
import { Badge } from "@/components/ui/badge";

interface AgentLibraryCardProps {
  scoredAgent: ScoredAgent;
  isAdded: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}

export function AgentLibraryCard({
  scoredAgent,
  isAdded,
  isSelected,
  onSelect,
  onAdd,
}: AgentLibraryCardProps) {
  const { agent, isRecommended } = scoredAgent;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdded) {
      onAdd();
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        isSelected
          ? "border-blue-600 bg-blue-950/20"
          : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-medium text-neutral-100">
              {agent.name}
            </h4>
            {/* Tier badge */}
            <Badge
              className={
                agent.tier === "advanced"
                  ? "bg-purple-900/40 text-purple-400"
                  : "bg-blue-900/40 text-blue-400"
              }
            >
              {agent.tier === "advanced" ? "Advanced" : "Basic"}
            </Badge>
            {isRecommended && (
              <Badge className="bg-green-900/40 text-green-400">
                Recommended
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
            {agent.description}
          </p>
        </div>

        <button
          onClick={handleAddClick}
          disabled={isAdded}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isAdded
              ? "cursor-default bg-neutral-800 text-neutral-500"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isAdded ? (
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Added
            </span>
          ) : (
            "Add"
          )}
        </button>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1">
        {agent.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400"
          >
            {tag}
          </span>
        ))}
        {agent.tags.length > 4 && (
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500">
            +{agent.tags.length - 4}
          </span>
        )}
      </div>
    </div>
  );
}
