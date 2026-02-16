/**
 * @module components/memory/LearningBrowser
 * @description Filterable learning list with status management and promotion
 *
 * PURPOSE:
 * - Browse extracted learnings with filters (category, topic, status, confidence)
 * - Update learning status (verify, deprecate, archive)
 * - Promote learnings to CLAUDE.md or rules files
 *
 * DEPENDENCIES:
 * - @/types/memory - Learning, LearningCategory, LearningTopic, LearningStatus, ConfidenceLevel types
 *
 * EXPORTS:
 * - LearningBrowser - Learning management component
 *
 * PATTERNS:
 * - Filter pills toggle on/off for each category (multi-select)
 * - Each learning renders as a card with category badge, content, and actions
 * - Status changes call onUpdateStatus immediately
 * - Promote dropdown shows target options
 *
 * CLAUDE NOTES:
 * - Categories: Preference, Solution, Pattern, Gotcha (4 filter pills)
 * - Topics: debugging, patterns, tools, project, workflow (5 filter options)
 * - Status: active, verified, deprecated, archived (4 possible states)
 * - Confidence: high, medium, low (3 levels, shown as colored dot)
 * - Filtering is purely client-side (all learnings are loaded in memory)
 * - Empty state shown when no learnings match filters
 */

import { useState, useMemo } from "react";
import type {
  Learning,
  LearningCategory,
  LearningTopic,
  LearningStatus,
  ConfidenceLevel,
} from "@/types/memory";

interface LearningBrowserProps {
  learnings: Learning[];
  onUpdateStatus: (id: string, status: string) => void;
  onPromote: (id: string, target: string) => void;
}

const CATEGORIES: LearningCategory[] = ["Preference", "Solution", "Pattern", "Gotcha"];
const TOPICS: LearningTopic[] = ["debugging", "patterns", "tools", "project", "workflow"];
const STATUSES: LearningStatus[] = ["active", "verified", "deprecated", "archived"];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["high", "medium", "low"];

function getCategoryColor(category: LearningCategory): string {
  switch (category) {
    case "Preference":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Solution":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Pattern":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "Gotcha":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

function getStatusColor(status: LearningStatus): string {
  switch (status) {
    case "active":
      return "bg-blue-500/20 text-blue-400";
    case "verified":
      return "bg-green-500/20 text-green-400";
    case "deprecated":
      return "bg-yellow-500/20 text-yellow-400";
    case "archived":
      return "bg-neutral-500/20 text-neutral-400";
  }
}

function getConfidenceDot(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "bg-green-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-red-500";
  }
}

function getConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
  }
}

export function LearningBrowser({
  learnings,
  onUpdateStatus,
  onPromote,
}: LearningBrowserProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<LearningCategory>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<LearningTopic | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<LearningStatus | "all">("all");
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | "all">("all");
  const [promoteOpenId, setPromoteOpenId] = useState<string | null>(null);

  const toggleCategory = (cat: LearningCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    return learnings.filter((l) => {
      if (selectedCategories.size > 0 && !selectedCategories.has(l.category)) return false;
      if (selectedTopic !== "all" && l.topic !== selectedTopic) return false;
      if (selectedStatus !== "all" && l.status !== selectedStatus) return false;
      if (selectedConfidence !== "all" && l.confidence !== selectedConfidence) return false;
      return true;
    });
  }, [learnings, selectedCategories, selectedTopic, selectedStatus, selectedConfidence]);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-neutral-400">
          Filters
        </h3>

        {/* Category filter pills */}
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-neutral-500">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? getCategoryColor(cat)
                      : "border-neutral-700 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            {selectedCategories.size > 0 && (
              <button
                onClick={() => setSelectedCategories(new Set())}
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-500 hover:text-neutral-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap gap-3">
          {/* Topic filter */}
          <div>
            <p className="mb-1 text-xs text-neutral-500">Topic</p>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value as LearningTopic | "all")}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All topics</option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <p className="mb-1 text-xs text-neutral-500">Status</p>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as LearningStatus | "all")}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Confidence filter */}
          <div>
            <p className="mb-1 text-xs text-neutral-500">Confidence</p>
            <select
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value as ConfidenceLevel | "all")}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All levels</option>
              {CONFIDENCE_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-neutral-600">
          Showing {filtered.length} of {learnings.length} learnings
        </p>
      </div>

      {/* Learnings List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-12 text-center">
          <p className="text-sm text-neutral-500">
            {learnings.length === 0
              ? "No learnings found. Learnings are auto-extracted from Claude Code sessions."
              : "No learnings match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((learning) => (
            <div
              key={learning.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700"
            >
              {/* Header row: category badge + confidence + status */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getCategoryColor(learning.category)}`}
                >
                  {learning.category}
                </span>
                {learning.topic && (
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-500">
                    {learning.topic}
                  </span>
                )}
                <div className="flex items-center gap-1" title={getConfidenceLabel(learning.confidence)}>
                  <span className={`h-2 w-2 rounded-full ${getConfidenceDot(learning.confidence)}`} />
                  <span className="text-xs text-neutral-600">{learning.confidence}</span>
                </div>
                <span className="ml-auto">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(learning.status)}`}>
                    {learning.status}
                  </span>
                </span>
              </div>

              {/* Content */}
              <p className="mb-3 text-sm leading-relaxed text-neutral-200">
                {learning.content}
              </p>

              {/* Source info */}
              <div className="mb-3 text-xs text-neutral-600">
                <span>Source: {learning.sourceFile}</span>
                <span className="mx-2">|</span>
                <span>{new Date(learning.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {learning.status === "active" && (
                  <button
                    onClick={() => onUpdateStatus(learning.id, "verified")}
                    className="rounded-md border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/20"
                  >
                    Verify
                  </button>
                )}
                {(learning.status === "active" || learning.status === "verified") && (
                  <button
                    onClick={() => onUpdateStatus(learning.id, "deprecated")}
                    className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
                  >
                    Deprecate
                  </button>
                )}
                {learning.status !== "archived" && (
                  <button
                    onClick={() => onUpdateStatus(learning.id, "archived")}
                    className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800"
                  >
                    Archive
                  </button>
                )}

                {/* Promote dropdown */}
                {(learning.status === "active" || learning.status === "verified") && (
                  <div className="relative ml-auto">
                    <button
                      onClick={() =>
                        setPromoteOpenId(promoteOpenId === learning.id ? null : learning.id)
                      }
                      className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                    >
                      Promote
                      <svg
                        className="ml-1 inline h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {promoteOpenId === learning.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-neutral-700 bg-neutral-800 py-1 shadow-lg">
                        <button
                          onClick={() => {
                            onPromote(learning.id, "claude-md");
                            setPromoteOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-700"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/20 text-xs font-bold text-blue-400">
                            M
                          </span>
                          Move to CLAUDE.md
                        </button>
                        <button
                          onClick={() => {
                            onPromote(learning.id, "rules");
                            setPromoteOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-700"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 text-xs font-bold text-amber-400">
                            R
                          </span>
                          Move to rules file
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
