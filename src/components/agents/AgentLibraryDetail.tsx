/**
 * @module components/agents/AgentLibraryDetail
 * @description Detail panel for a selected library agent
 *
 * PURPOSE:
 * - Show full agent instructions in a formatted view
 * - Display workflow steps for advanced agents
 * - Display tools list for advanced agents
 * - Display trigger patterns
 * - Provide "Add to Project" action
 * - Provide "Customize in Expert Mode" link
 *
 * DEPENDENCIES:
 * - @/lib/agentRelevance - ScoredAgent type
 * - @/components/ui/badge - Badge component
 *
 * EXPORTS:
 * - AgentLibraryDetail - Detail panel component
 *
 * PATTERNS:
 * - Content is displayed in a scrollable area with markdown styling
 * - Workflow steps shown as numbered list for advanced agents
 * - Tools shown as list with required/optional badges
 * - Close button in top-right corner
 * - Actions at the bottom
 *
 * CLAUDE NOTES:
 * - Content is markdown but displayed as preformatted text for simplicity
 * - onCustomize pre-fills the agent editor with this content
 * - Empty state shown when no agent is selected
 * - Workflow/tools only shown for advanced tier agents
 */

import type { ScoredAgent } from "@/lib/agentRelevance";
import { Badge } from "@/components/ui/badge";

interface AgentLibraryDetailProps {
  scoredAgent: ScoredAgent | null;
  isAdded: boolean;
  onAdd: () => void;
  onCustomize: () => void;
  onClose: () => void;
}

export function AgentLibraryDetail({
  scoredAgent,
  isAdded,
  onAdd,
  onCustomize,
  onClose,
}: AgentLibraryDetailProps) {
  if (!scoredAgent) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
        <p className="text-sm">Select an agent to view details</p>
      </div>
    );
  }

  const { agent, isRecommended, matchedTags } = scoredAgent;

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-neutral-800 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-100">
              {agent.name}
            </h3>
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
          <p className="mt-1 text-sm text-neutral-400">{agent.description}</p>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  matchedTags.includes(tag)
                    ? "bg-blue-900/40 text-blue-400"
                    : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {tag}
                {matchedTags.includes(tag) && tag !== "universal" && " (match)"}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Instructions */}
        <div className="mb-6">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Instructions
          </h4>
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-neutral-300">
            {agent.instructions}
          </pre>
        </div>

        {/* Workflow (advanced agents only) */}
        {agent.tier === "advanced" && agent.workflow && agent.workflow.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Workflow Steps
            </h4>
            <ol className="space-y-2">
              {agent.workflow.map((step) => (
                <li
                  key={step.step}
                  className="rounded-md border border-neutral-800 bg-neutral-850 p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-900/40 text-xs font-medium text-purple-400">
                      {step.step}
                    </span>
                    <div>
                      <p className="font-medium text-neutral-200">{step.action}</p>
                      <p className="mt-0.5 text-sm text-neutral-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Tools (advanced agents only) */}
        {agent.tier === "advanced" && agent.tools && agent.tools.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Tools Used
            </h4>
            <ul className="space-y-2">
              {agent.tools.map((tool) => (
                <li
                  key={tool.name}
                  className="flex items-start justify-between rounded-md border border-neutral-800 bg-neutral-850 p-3"
                >
                  <div>
                    <p className="font-medium text-neutral-200">{tool.name}</p>
                    <p className="mt-0.5 text-sm text-neutral-400">
                      {tool.description}
                    </p>
                  </div>
                  <Badge
                    className={
                      tool.required
                        ? "bg-amber-900/40 text-amber-400"
                        : "bg-neutral-800 text-neutral-400"
                    }
                  >
                    {tool.required ? "Required" : "Optional"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Trigger patterns (advanced agents only) */}
        {agent.tier === "advanced" &&
          agent.triggerPatterns &&
          agent.triggerPatterns.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Trigger Patterns
              </h4>
              <div className="flex flex-wrap gap-1">
                {agent.triggerPatterns.map((pattern) => (
                  <span
                    key={pattern}
                    className="rounded-full bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400"
                  >
                    "{pattern}"
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Words that suggest when to invoke this agent
              </p>
            </div>
          )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-neutral-800 p-4">
        <button
          onClick={onCustomize}
          className="text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          Customize in Expert Mode
        </button>

        <button
          onClick={onAdd}
          disabled={isAdded}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            isAdded
              ? "cursor-default bg-neutral-800 text-neutral-500"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isAdded ? (
            <span className="flex items-center gap-1.5">
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
              Added to Project
            </span>
          ) : (
            "Add to Project"
          )}
        </button>
      </div>
    </div>
  );
}
