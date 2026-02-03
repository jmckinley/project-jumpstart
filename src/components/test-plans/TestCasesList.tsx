/**
 * @module components/test-plans/TestCasesList
 * @description Displays test cases with filters by type, priority, and status
 *
 * PURPOSE:
 * - Show all test cases for a plan
 * - Filter by test type (unit, integration, e2e)
 * - Filter by priority (low, medium, high, critical)
 * - Filter by status (pending, passing, failing, skipped)
 * - Allow selecting a case for editing
 *
 * DEPENDENCIES:
 * - react (useState) - Filter state
 * - @/types/test-plan - TestCase, TestType, TestPriority, TestCaseStatus types
 *
 * EXPORTS:
 * - TestCasesList - Test cases list component with filtering
 *
 * PATTERNS:
 * - Local filter state for type, priority, and status
 * - Status icons with colors (green check, red x, gray dash)
 * - Priority badges with colors
 *
 * CLAUDE NOTES:
 * - Critical = red, High = orange, Medium = yellow, Low = gray
 * - Passing = green, Failing = red, Pending = gray, Skipped = neutral
 */

import { useState } from "react";
import type { TestCase, TestType, TestPriority, TestCaseStatus } from "@/types/test-plan";

interface TestCasesListProps {
  cases: TestCase[];
  selectedId: string | null;
  onSelect: (testCase: TestCase) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
}

const priorityColors: Record<TestPriority, { bg: string; text: string }> = {
  critical: { bg: "bg-red-500/20", text: "text-red-400" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  low: { bg: "bg-neutral-700", text: "text-neutral-400" },
};

const statusIcons: Record<TestCaseStatus, { icon: string; color: string }> = {
  passing: { icon: "✓", color: "text-green-400" },
  failing: { icon: "✕", color: "text-red-400" },
  pending: { icon: "○", color: "text-neutral-500" },
  skipped: { icon: "—", color: "text-neutral-600" },
};

const typeLabels: Record<TestType, string> = {
  unit: "Unit",
  integration: "Integration",
  e2e: "E2E",
};

export function TestCasesList({
  cases,
  selectedId,
  onSelect,
  onCreateNew,
  onDelete,
}: TestCasesListProps) {
  const [typeFilter, setTypeFilter] = useState<TestType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TestPriority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TestCaseStatus | "all">("all");

  const filteredCases = cases.filter((c) => {
    if (typeFilter !== "all" && c.testType !== typeFilter) return false;
    if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  // Count by status for badges
  const counts = {
    passing: cases.filter((c) => c.status === "passing").length,
    failing: cases.filter((c) => c.status === "failing").length,
    pending: cases.filter((c) => c.status === "pending").length,
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Test Cases
          </h3>
          <div className="flex gap-1.5">
            <span className="inline-flex items-center rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
              {counts.passing} ✓
            </span>
            <span className="inline-flex items-center rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
              {counts.failing} ✕
            </span>
            <span className="inline-flex items-center rounded-full bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
              {counts.pending} ○
            </span>
          </div>
        </div>
        <button
          onClick={onCreateNew}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          + Add Case
        </button>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-2 px-2">
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TestType | "all")}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
        >
          <option value="all">All Types</option>
          <option value="unit">Unit</option>
          <option value="integration">Integration</option>
          <option value="e2e">E2E</option>
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TestPriority | "all")}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TestCaseStatus | "all")}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
        >
          <option value="all">All Statuses</option>
          <option value="passing">Passing</option>
          <option value="failing">Failing</option>
          <option value="pending">Pending</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {/* Cases list */}
      <div className="max-h-[400px] space-y-1 overflow-y-auto">
        {filteredCases.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-neutral-500">No test cases match filters.</p>
          </div>
        ) : (
          filteredCases.map((testCase) => {
            const isSelected = testCase.id === selectedId;
            const statusInfo = statusIcons[testCase.status];
            const priorityInfo = priorityColors[testCase.priority];

            return (
              <button
                key={testCase.id}
                onClick={() => onSelect(testCase)}
                className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                }`}
              >
                {/* Status icon */}
                <span className={`text-sm font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                </span>

                {/* Name and details */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{testCase.name}</p>
                  {testCase.filePath && (
                    <p className="truncate text-xs text-neutral-600">
                      {testCase.filePath}
                    </p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
                    {typeLabels[testCase.testType]}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${priorityInfo.bg} ${priorityInfo.text}`}
                  >
                    {testCase.priority}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(testCase.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-neutral-600 opacity-0 transition-all hover:bg-neutral-700 hover:text-red-400 group-hover:opacity-100"
                  title="Delete case"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
