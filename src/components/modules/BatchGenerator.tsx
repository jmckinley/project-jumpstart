/**
 * @module components/modules/BatchGenerator
 * @description Batch documentation generation controls with quick-select filters and progress indication
 *
 * PURPOSE:
 * - Allow users to select multiple files for batch documentation generation
 * - Provide quick-select buttons: "Select All Missing" and "Select All Outdated"
 * - Trigger batch generation and show generating state with a spinner
 *
 * DEPENDENCIES:
 * - react (useState) - Local state for selected file paths
 * - @/types/module - ModuleStatus type for filtering by status
 *
 * EXPORTS:
 * - BatchGenerator - Batch generation controls component
 *
 * PATTERNS:
 * - Maintains local selectedPaths state as string[] of file paths
 * - Quick-select buttons replace the current selection (not additive)
 * - "Generate Selected" button is disabled when no files are selected or generation is in progress
 * - Each selectable file is shown as a checkbox row
 *
 * CLAUDE NOTES:
 * - Only files with status "missing" or "outdated" are shown as selectable (not "current")
 * - The onGenerateSelected callback receives the array of selected paths
 * - After generation completes, the parent is responsible for refreshing module data
 * - The spinner uses a CSS animation via Tailwind's animate-spin class
 * - selectedPaths is cleared after generation is triggered to prevent double-submission
 */

import { useState } from "react";
import type { ModuleStatus } from "@/types/module";

interface BatchGeneratorProps {
  modules: ModuleStatus[];
  generating: boolean;
  progress: { current: number; total: number } | null;
  onGenerateSelected: (paths: string[]) => void;
}

export function BatchGenerator({
  modules,
  generating,
  progress,
  onGenerateSelected,
}: BatchGeneratorProps) {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [showAllFiles, setShowAllFiles] = useState(false);

  const missingModules = modules.filter((m) => m.status === "missing");
  const outdatedModules = modules.filter((m) => m.status === "outdated");
  const currentModules = modules.filter((m) => m.status === "current");

  // Show all files if user wants to regenerate current ones, otherwise just actionable
  const displayedModules = showAllFiles
    ? modules
    : modules.filter((m) => m.status === "missing" || m.status === "outdated");

  const handleSelectAllMissing = () => {
    setSelectedPaths(missingModules.map((m) => m.path));
  };

  const handleSelectAllOutdated = () => {
    setSelectedPaths(outdatedModules.map((m) => m.path));
  };

  const handleSelectAllCurrent = () => {
    setShowAllFiles(true);
    setSelectedPaths(currentModules.map((m) => m.path));
  };

  const handleSelectAll = () => {
    setShowAllFiles(true);
    setSelectedPaths(modules.map((m) => m.path));
  };

  const handleToggle = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedPaths.length === displayedModules.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(displayedModules.map((m) => m.path));
    }
  };

  const handleGenerate = () => {
    if (selectedPaths.length === 0 || generating) return;
    onGenerateSelected(selectedPaths);
    setSelectedPaths([]);
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
        Batch Generate
      </h3>

      {/* Quick select buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={handleSelectAllMissing}
          disabled={missingModules.length === 0 || generating}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Missing
          {missingModules.length > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
              {missingModules.length}
            </span>
          )}
        </button>

        <button
          onClick={handleSelectAllOutdated}
          disabled={outdatedModules.length === 0 || generating}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Outdated
          {outdatedModules.length > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
              {outdatedModules.length}
            </span>
          )}
        </button>

        <button
          onClick={handleSelectAllCurrent}
          disabled={currentModules.length === 0 || generating}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="Regenerate documentation for files that already have docs"
        >
          Current
          {currentModules.length > 0 && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
              {currentModules.length}
            </span>
          )}
        </button>

        <button
          onClick={handleSelectAll}
          disabled={modules.length === 0 || generating}
          className="rounded-md border border-blue-700 bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-300 transition-colors hover:bg-blue-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          title="Regenerate ALL documentation using AI"
        >
          All Files
          <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
            {modules.length}
          </span>
        </button>

        <button
          onClick={handleGenerate}
          disabled={selectedPaths.length === 0 || generating}
          className={`ml-auto rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            generating
              ? "cursor-not-allowed bg-blue-600 text-white"
              : selectedPaths.length === 0
                ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {progress ? `Generating ${progress.current} of ${progress.total}...` : "Generating..."}
            </span>
          ) : (
            `Generate Selected (${selectedPaths.length})`
          )}
        </button>
      </div>

      {/* File list with checkboxes */}
      {displayedModules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm font-medium text-neutral-300">
            All files are documented
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Click "Current" or "All Files" to regenerate existing documentation.
          </p>
        </div>
      ) : (
        <>
          {/* Select all toggle */}
          <div className="mb-2 flex items-center justify-between border-b border-neutral-800 pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-500 hover:text-neutral-400">
              <input
                type="checkbox"
                checked={
                  displayedModules.length > 0 &&
                  selectedPaths.length === displayedModules.length
                }
                onChange={handleToggleSelectAll}
                disabled={generating}
                className="h-3.5 w-3.5 rounded border-neutral-600 bg-neutral-800 accent-blue-600"
              />
              Select all ({displayedModules.length})
            </label>
            {showAllFiles && (
              <button
                onClick={() => {
                  setShowAllFiles(false);
                  setSelectedPaths([]);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-400"
              >
                Show only actionable
              </button>
            )}
          </div>

          <div className="max-h-[300px] space-y-1 overflow-y-auto">
            {displayedModules.map((mod) => {
              const isSelected = selectedPaths.includes(mod.path);
              const statusColor =
                mod.status === "missing"
                  ? "bg-red-500"
                  : mod.status === "outdated"
                    ? "bg-yellow-500"
                    : "bg-green-500";

              return (
                <label
                  key={mod.path}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-neutral-800 text-neutral-200"
                      : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-300"
                  } ${generating ? "pointer-events-none opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(mod.path)}
                    disabled={generating}
                    className="h-3.5 w-3.5 shrink-0 rounded border-neutral-600 bg-neutral-800 accent-blue-600"
                  />
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusColor}`}
                  />
                  <span className="truncate font-mono text-xs">{mod.path}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
