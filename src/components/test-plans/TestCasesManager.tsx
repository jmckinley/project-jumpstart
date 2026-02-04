/**
 * @module components/test-plans/TestCasesManager
 * @description Filterable test cases list for managing large numbers of test cases
 *
 * PURPOSE:
 * - Display all test cases for a plan with filtering capabilities
 * - Allow editing and deleting test cases inline
 * - Handle hundreds of test cases efficiently with search and filters
 *
 * DEPENDENCIES:
 * - react (useState, useMemo) - State and memoization
 * - @/types/test-plan - TestCase, TestType, TestPriority types
 *
 * EXPORTS:
 * - TestCasesManager - Filterable test cases management component
 *
 * PATTERNS:
 * - Filters: search, type, priority, status
 * - Virtualized-ready (shows count, could add virtualization for 500+ cases)
 * - Inline actions: edit, delete
 * - Bulk selection for future bulk actions
 *
 * CLAUDE NOTES:
 * - Designed for bottom section of Test Plans page
 * - Filters are OR within category, AND across categories
 * - Shows filtered count vs total count
 * - Status derived from lastRunStatus field
 */

import { useState, useMemo } from "react";
import type { TestCase, TestType, TestPriority } from "@/types/test-plan";

interface TestCasesManagerProps {
  cases: TestCase[];
  onEdit: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  planName?: string;
}

const typeLabels: Record<TestType, string> = {
  unit: "Unit",
  integration: "Integration",
  e2e: "E2E",
};

const priorityLabels: Record<TestPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityColors: Record<TestPriority, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-neutral-700 text-neutral-400",
};

const statusColors: Record<string, string> = {
  passing: "text-green-400",
  failing: "text-red-400",
  skipped: "text-yellow-400",
  pending: "text-neutral-500",
};

export function TestCasesManager({
  cases,
  onEdit,
  onDelete,
  planName,
}: TestCasesManagerProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TestType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TestPriority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed" | "pending">("all");

  const filteredCases = useMemo(() => {
    return cases.filter((tc) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          tc.name.toLowerCase().includes(searchLower) ||
          tc.description.toLowerCase().includes(searchLower) ||
          (tc.filePath?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== "all" && tc.testType !== typeFilter) return false;

      // Priority filter
      if (priorityFilter !== "all" && tc.priority !== priorityFilter) return false;

      // Status filter (maps to TestCaseStatus: pending/passing/failing/skipped)
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && tc.status !== "pending") return false;
        if (statusFilter === "passed" && tc.status !== "passing") return false;
        if (statusFilter === "failed" && tc.status !== "failing") return false;
      }

      return true;
    });
  }, [cases, search, typeFilter, priorityFilter, statusFilter]);

  const hasFilters = search || typeFilter !== "all" || priorityFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setPriorityFilter("all");
    setStatusFilter("all");
  };

  if (cases.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-200">
              Test Cases {planName && <span className="text-neutral-500">— {planName}</span>}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {hasFilters
                ? `Showing ${filteredCases.length} of ${cases.length} test cases`
                : `${cases.length} test cases`}
            </p>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-neutral-400 hover:text-neutral-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-800 px-4 py-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test cases..."
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 py-1.5 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TestType | "all")}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All types</option>
          {(Object.keys(typeLabels) as TestType[]).map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TestPriority | "all")}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All priorities</option>
          {(Object.keys(priorityLabels) as TestPriority[]).map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "passed" | "failed" | "pending")}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="pending">Not run</option>
        </select>
      </div>

      {/* Cases list */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredCases.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">
            No test cases match your filters
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-neutral-900">
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium w-24">Type</th>
                <th className="px-4 py-2 font-medium w-24">Priority</th>
                <th className="px-4 py-2 font-medium w-20">Status</th>
                <th className="px-4 py-2 font-medium w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredCases.map((tc) => {
                return (
                  <tr key={tc.id} className="group hover:bg-neutral-800/50">
                    <td className="px-4 py-2">
                      <p className="text-sm text-neutral-200 truncate max-w-[300px]" title={tc.name}>
                        {tc.name}
                      </p>
                      {tc.filePath && (
                        <p className="text-xs text-neutral-500 truncate max-w-[300px]" title={tc.filePath}>
                          {tc.filePath}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-300">
                        {typeLabels[tc.testType]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${priorityColors[tc.priority]}`}>
                        {priorityLabels[tc.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${statusColors[tc.status]}`}>
                        {tc.status === "pending" ? "—" : tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(tc)}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                          title="Edit test case"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(tc.id)}
                          className="rounded p-1 text-neutral-400 hover:bg-red-500/20 hover:text-red-400"
                          title="Delete test case"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
