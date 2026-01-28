/**
 * @module components/context/TokenBreakdown
 * @description Token usage breakdown chart showing distribution by category
 *
 * PURPOSE:
 * - Visualize token usage across categories (conversation, code, MCP, skills)
 * - Show proportional bar chart with category colors
 * - Display raw token counts per category
 *
 * DEPENDENCIES:
 * - @/types/health - TokenBreakdown type
 *
 * EXPORTS:
 * - TokenBreakdownChart - Token usage visualization component
 *
 * PATTERNS:
 * - Renders null when breakdown is null
 * - Categories: conversation (blue), code (green), MCP (purple), skills (amber)
 * - Bars are proportional to the category with the most tokens
 *
 * CLAUDE NOTES:
 * - Categories map to the Rust TokenBreakdown struct fields
 * - Total is the sum of all categories
 * - 0-token categories still show a label but no bar
 */

import type { TokenBreakdown } from "@/types/health";

interface TokenBreakdownChartProps {
  breakdown: TokenBreakdown | null;
  totalTokens: number;
}

interface Category {
  key: string;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

export function TokenBreakdownChart({ breakdown, totalTokens }: TokenBreakdownChartProps) {
  if (!breakdown) return null;

  const categories: Category[] = [
    {
      key: "code",
      label: "Code (CLAUDE.md + Docs)",
      value: breakdown.code,
      color: "bg-green-500",
      bgColor: "bg-green-950",
    },
    {
      key: "skills",
      label: "Skills",
      value: breakdown.skills,
      color: "bg-amber-500",
      bgColor: "bg-amber-950",
    },
    {
      key: "mcp",
      label: "MCP Servers",
      value: breakdown.mcp,
      color: "bg-purple-500",
      bgColor: "bg-purple-950",
    },
    {
      key: "conversation",
      label: "Conversation",
      value: breakdown.conversation,
      color: "bg-blue-500",
      bgColor: "bg-blue-950",
    },
  ];

  const maxValue = Math.max(...categories.map((c) => c.value), 1);

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Token Breakdown</h3>
        <span className="text-xs text-neutral-500">
          {formatTokens(totalTokens)} total
        </span>
      </div>

      {/* Stacked proportional bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-800">
        {categories
          .filter((c) => c.value > 0)
          .map((cat) => (
            <div
              key={cat.key}
              className={`${cat.color} transition-all`}
              style={{
                width: `${totalTokens > 0 ? (cat.value / totalTokens) * 100 : 0}%`,
              }}
              title={`${cat.label}: ${formatTokens(cat.value)}`}
            />
          ))}
      </div>

      {/* Category details */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.key}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${cat.color}`} />
                <span className="text-xs text-neutral-400">{cat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">
                  {formatTokens(cat.value)}
                </span>
                <span className="text-xs text-neutral-600">
                  {totalTokens > 0
                    ? `${((cat.value / totalTokens) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-800">
              <div
                className={`h-1.5 rounded-full transition-all ${cat.color}`}
                style={{
                  width: `${maxValue > 0 ? (cat.value / maxValue) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
