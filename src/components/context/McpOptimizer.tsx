/**
 * @module components/context/McpOptimizer
 * @description MCP server list with overhead analysis and optimization recommendations
 *
 * PURPOSE:
 * - Display configured MCP servers with their token overhead
 * - Show optimization recommendations per server
 * - Calculate total MCP token overhead
 *
 * DEPENDENCIES:
 * - @/types/health - McpServerStatus type
 *
 * EXPORTS:
 * - McpOptimizer - MCP server analysis and recommendations component
 *
 * PATTERNS:
 * - Renders servers in a list with status badges and overhead counts
 * - Recommendation colors: green=keep, yellow=optimize, red=disable, gray=none
 * - Total overhead is summed at the top
 *
 * CLAUDE NOTES:
 * - "none" status means no MCP servers detected
 * - Token overhead is estimated (~500-800 per server for tool schemas)
 * - Recommendations are heuristic (npx/node servers get "optimize" due to higher overhead)
 */

import type { McpServerStatus } from "@/types/health";

interface McpOptimizerProps {
  servers: McpServerStatus[];
}

function getRecommendationBadge(rec: string): { bg: string; text: string; label: string } {
  switch (rec) {
    case "keep":
      return { bg: "bg-green-950", text: "text-green-400", label: "Keep" };
    case "optimize":
      return { bg: "bg-yellow-950", text: "text-yellow-400", label: "Optimize" };
    case "disable":
      return { bg: "bg-red-950", text: "text-red-400", label: "Disable" };
    default:
      return { bg: "bg-neutral-800", text: "text-neutral-500", label: "N/A" };
  }
}

function getStatusDot(status: string): string {
  switch (status) {
    case "configured":
      return "bg-green-500";
    case "error":
      return "bg-red-500";
    case "none":
      return "bg-neutral-600";
    default:
      return "bg-neutral-500";
  }
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function McpOptimizer({ servers }: McpOptimizerProps) {
  const totalOverhead = servers.reduce((sum, s) => sum + s.tokenOverhead, 0);
  const hasServers = servers.some((s) => s.status !== "none");

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">MCP Servers</h3>
        {hasServers && (
          <span className="text-xs text-neutral-500">
            {formatTokens(totalOverhead)} tokens overhead
          </span>
        )}
      </div>

      {!hasServers && (
        <div className="flex items-center justify-center py-6 text-neutral-600">
          <div className="text-center">
            <p className="text-sm">No MCP servers configured</p>
            <p className="mt-1 text-xs text-neutral-700">
              Add servers in .mcp.json to extend Claude&apos;s capabilities.
            </p>
          </div>
        </div>
      )}

      {hasServers && (
        <div className="space-y-2">
          {servers
            .filter((s) => s.status !== "none")
            .map((server) => {
              const rec = getRecommendationBadge(server.recommendation);
              return (
                <div
                  key={server.name}
                  className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${getStatusDot(server.status)}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-300">
                        {server.name}
                      </p>
                      <p className="text-xs text-neutral-500">{server.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">
                      {formatTokens(server.tokenOverhead)} tokens
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${rec.bg} ${rec.text}`}
                    >
                      {rec.label}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Optimization Tips */}
      {hasServers && servers.some((s) => s.recommendation === "optimize") && (
        <div className="rounded-md border border-yellow-900 bg-yellow-950/30 px-3 py-2">
          <p className="text-xs text-yellow-400">
            Some MCP servers have high token overhead. Consider consolidating
            tools or using lighter alternatives to free up context budget.
          </p>
        </div>
      )}
    </div>
  );
}
