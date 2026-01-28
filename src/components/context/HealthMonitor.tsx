/**
 * @module components/context/HealthMonitor
 * @description Main context health overview with usage gauge and rot risk indicator
 *
 * PURPOSE:
 * - Display overall context usage percentage as a circular gauge
 * - Show rot risk level with color-coded badge
 * - Display total token count and budget
 * - Provide checkpoint creation controls
 *
 * DEPENDENCIES:
 * - @/types/health - ContextHealth, Checkpoint types
 *
 * EXPORTS:
 * - HealthMonitor - Context health overview component
 *
 * PATTERNS:
 * - Renders null when contextHealth is null (loading state handled externally)
 * - Gauge color: green (<50%), yellow (50-80%), red (>80%)
 * - Checkpoint creation uses inline form with label/summary inputs
 *
 * CLAUDE NOTES:
 * - Usage percent is 0-100 (percentage of 200k token budget)
 * - Rot risk aligns with usage: low (<50%), medium (50-80%), high (>80%)
 * - Checkpoints allow users to snapshot context state for recovery
 */

import { useState, useCallback } from "react";
import type { ContextHealth, Checkpoint } from "@/types/health";

interface HealthMonitorProps {
  contextHealth: ContextHealth | null;
  checkpoints: Checkpoint[];
  onCreateCheckpoint: (label: string, summary: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

function getUsageColor(percent: number): string {
  if (percent < 50) return "text-green-400";
  if (percent < 80) return "text-yellow-400";
  return "text-red-400";
}

function getRiskBadge(risk: string): { bg: string; text: string } {
  switch (risk) {
    case "low":
      return { bg: "bg-green-950", text: "text-green-400" };
    case "medium":
      return { bg: "bg-yellow-950", text: "text-yellow-400" };
    case "high":
      return { bg: "bg-red-950", text: "text-red-400" };
    default:
      return { bg: "bg-neutral-800", text: "text-neutral-400" };
  }
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function HealthMonitor({
  contextHealth,
  checkpoints,
  onCreateCheckpoint,
  onRefresh,
  loading,
}: HealthMonitorProps) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [summary, setSummary] = useState("");

  const handleCreate = useCallback(() => {
    if (label.trim()) {
      onCreateCheckpoint(label.trim(), summary.trim());
      setLabel("");
      setSummary("");
      setShowForm(false);
    }
  }, [label, summary, onCreateCheckpoint]);

  if (!contextHealth) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
        <p className="text-sm">{loading ? "Loading context health..." : "No data available"}</p>
      </div>
    );
  }

  const risk = getRiskBadge(contextHealth.rotRisk);
  const usageColor = getUsageColor(contextHealth.usagePercent);

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">Context Health</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-300 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Usage Gauge */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className={`text-3xl font-bold ${usageColor}`}>
            {contextHealth.usagePercent.toFixed(1)}%
          </p>
          <p className="text-xs text-neutral-500">Context Used</p>
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-full rounded-full bg-neutral-800">
            <div
              className={`h-3 rounded-full transition-all ${
                contextHealth.usagePercent < 50
                  ? "bg-green-500"
                  : contextHealth.usagePercent < 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(contextHealth.usagePercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{formatTokens(contextHealth.totalTokens)} tokens used</span>
            <span>200k budget</span>
          </div>
        </div>
        <div className={`rounded-md px-3 py-1 text-xs font-medium ${risk.bg} ${risk.text}`}>
          {contextHealth.rotRisk.charAt(0).toUpperCase() + contextHealth.rotRisk.slice(1)} Risk
        </div>
      </div>

      {/* Checkpoints */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-neutral-400">Checkpoints</h4>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs text-blue-400 transition-colors hover:text-blue-300"
          >
            {showForm ? "Cancel" : "New Checkpoint"}
          </button>
        </div>

        {showForm && (
          <div className="space-y-2 rounded-md border border-neutral-700 bg-neutral-800 p-3">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Checkpoint label (e.g., 'Before refactor')"
              className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-blue-600 focus:outline-none"
            />
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary (optional)"
              className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-blue-600 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={!label.trim()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              Save Checkpoint
            </button>
          </div>
        )}

        {checkpoints.length === 0 && !showForm && (
          <p className="py-2 text-xs text-neutral-600">
            No checkpoints yet. Create one to snapshot context state.
          </p>
        )}

        {checkpoints.slice(0, 5).map((cp) => (
          <div
            key={cp.id}
            className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2"
          >
            <div>
              <p className="text-sm text-neutral-300">{cp.label}</p>
              {cp.summary && (
                <p className="text-xs text-neutral-500">{cp.summary}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500">
                {formatTokens(cp.tokenSnapshot)} tokens ({cp.contextPercent.toFixed(1)}%)
              </p>
              <p className="text-xs text-neutral-600">
                {formatRelativeTime(cp.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
