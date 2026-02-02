/**
 * @module components/agents/SuggestedAgents
 * @description One-click agent suggestions based on project context
 *
 * PURPOSE:
 * - Show recommended agents from the library based on project type
 * - Enable one-click creation without navigating to library
 * - Filter out already-added agents
 * - Make agent creation as easy as skills from patterns
 *
 * DEPENDENCIES:
 * - @/data/agentLibrary - AGENT_LIBRARY catalog
 * - @/lib/agentRelevance - rankLibraryAgents for scoring
 * - @/stores/projectStore - Active project for relevance
 * - @/types/agent - LibraryAgent type
 *
 * EXPORTS:
 * - SuggestedAgents - Suggested agents component with one-click add
 *
 * PATTERNS:
 * - Shows top 4 recommended agents not already added
 * - Click "Add" to immediately create the agent
 * - Hides when all suggested agents are added
 *
 * CLAUDE NOTES:
 * - This is the "one-click solution" for agents
 * - Unlike the library browser, no preview/customize step
 * - Agents are ranked by project relevance score
 */

import { useMemo } from "react";
import { AGENT_LIBRARY } from "@/data/agentLibrary";
import { rankLibraryAgents } from "@/lib/agentRelevance";
import { useProjectStore } from "@/stores/projectStore";
import type { LibraryAgent } from "@/types/agent";

interface SuggestedAgentsProps {
  existingAgentNames: string[];
  onAddAgent: (agent: LibraryAgent) => void;
  loading?: boolean;
}

function getTierBadge(tier: string): { bg: string; text: string; label: string } {
  switch (tier) {
    case "advanced":
      return { bg: "bg-purple-900/40", text: "text-purple-400", label: "Advanced" };
    case "specialized":
      return { bg: "bg-amber-900/40", text: "text-amber-400", label: "Specialized" };
    default:
      return { bg: "bg-blue-900/40", text: "text-blue-400", label: "Basic" };
  }
}

export function SuggestedAgents({
  existingAgentNames,
  onAddAgent,
  loading = false,
}: SuggestedAgentsProps) {
  const activeProject = useProjectStore((s) => s.activeProject);

  // Rank agents by relevance and filter out already-added ones
  const suggestedAgents = useMemo(() => {
    const ranked = rankLibraryAgents(AGENT_LIBRARY, activeProject);
    const existingLower = existingAgentNames.map((n) => n.toLowerCase());

    return ranked
      .filter((s) => s.isRecommended && !existingLower.includes(s.agent.name.toLowerCase()))
      .slice(0, 4); // Show top 4
  }, [activeProject, existingAgentNames]);

  // Don't show if no suggestions
  if (suggestedAgents.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          Suggested for Your Project
        </h3>
        <span className="text-xs text-neutral-600">One-click add</span>
      </div>

      <div className="space-y-2">
        {suggestedAgents.map(({ agent, score }) => {
          const tier = getTierBadge(agent.tier);
          return (
            <div
              key={agent.slug}
              className="flex items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-medium text-neutral-200">
                    {agent.name}
                  </h4>
                  <span
                    className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${tier.bg} ${tier.text}`}
                  >
                    {tier.label}
                  </span>
                  {score >= 80 && (
                    <span className="inline-flex rounded-full bg-green-900/40 px-1.5 py-0.5 text-xs font-medium text-green-400">
                      Great Match
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {agent.description}
                </p>
              </div>

              <button
                onClick={() => onAddAgent(agent)}
                disabled={loading}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-neutral-600">
        Browse the Agent Library for more options
      </p>
    </div>
  );
}
