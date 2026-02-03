/**
 * @module components/test-plans/TDDPhaseCard
 * @description Individual TDD phase card with prompt and status
 *
 * PURPOSE:
 * - Display a single TDD phase (red/green/refactor)
 * - Show phase prompt with copy button
 * - Display phase status and output
 * - Provide confirm/fail actions
 *
 * DEPENDENCIES:
 * - react (useState) - Copy state
 * - @/types/test-plan - TDDPhase, TDDPhaseStatus types
 *
 * EXPORTS:
 * - TDDPhaseCard - Individual TDD phase card component
 *
 * PATTERNS:
 * - Collapsible prompt section
 * - Copy to clipboard functionality
 * - Status-based styling
 *
 * CLAUDE NOTES:
 * - Red = expect test to fail
 * - Green = expect test to pass
 * - Refactor = expect test to still pass
 */

import { useState } from "react";
import type { TDDPhaseStatus, TDDPhaseConfig } from "@/types/test-plan";

interface TDDPhaseCardProps {
  config: TDDPhaseConfig;
  status: TDDPhaseStatus;
  prompt?: string;
  output?: string;
  isActive: boolean;
  isCompleted: boolean;
  onConfirm: () => void;
  onFail: () => void;
  onRetry: () => void;
  onRecordOutput: (output: string) => void;
}

export function TDDPhaseCard({
  config,
  status,
  prompt,
  output,
  isActive,
  isCompleted,
  onConfirm,
  onFail,
  onRetry,
  onRecordOutput,
}: TDDPhaseCardProps) {
  const [copied, setCopied] = useState(false);
  const [outputInput, setOutputInput] = useState(output || "");

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveOutput = () => {
    if (outputInput.trim()) {
      onRecordOutput(outputInput.trim());
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isActive
          ? "border-blue-500/50 bg-neutral-900"
          : isCompleted
          ? "border-green-500/30 bg-neutral-900/50"
          : "border-neutral-800 bg-neutral-900/30 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.emoji}</span>
          <div>
            <h4 className={`text-sm font-medium ${config.color}`}>
              {config.title}
            </h4>
            <p className="text-xs text-neutral-500">{config.description}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            status === "complete"
              ? "bg-green-500/20 text-green-400"
              : status === "active"
              ? "bg-blue-500/20 text-blue-400"
              : status === "failed"
              ? "bg-red-500/20 text-red-400"
              : "bg-neutral-700 text-neutral-400"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Prompt section */}
      {isActive && prompt && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Prompt for Claude Code:
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="max-h-48 overflow-auto rounded-md bg-neutral-950 p-3">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-300">
              {prompt}
            </pre>
          </div>
        </div>
      )}

      {/* Output section */}
      {isActive && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-neutral-400">
            Test Output:
          </label>
          <textarea
            value={outputInput}
            onChange={(e) => setOutputInput(e.target.value)}
            placeholder="Paste the test output here..."
            rows={3}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
          />
          {outputInput !== output && outputInput.trim() && (
            <button
              onClick={handleSaveOutput}
              className="mt-1 text-xs text-blue-400 hover:text-blue-300"
            >
              Save Output
            </button>
          )}
        </div>
      )}

      {/* Saved output display (when not active) */}
      {!isActive && output && (
        <div className="mb-3">
          <span className="mb-1 block text-xs font-medium text-neutral-500">
            Output:
          </span>
          <div className="max-h-24 overflow-auto rounded-md bg-neutral-950 p-2">
            <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-500">
              {output}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      {isActive && status !== "complete" && (
        <div className="flex gap-2">
          {status === "failed" ? (
            <button
              onClick={onRetry}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
            >
              Retry Phase
            </button>
          ) : (
            <>
              <button
                onClick={onConfirm}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
              >
                {config.expectedOutcome === "fail"
                  ? "Confirm Failing"
                  : "Confirm Passing"}
              </button>
              <button
                onClick={onFail}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-300"
              >
                Mark Failed
              </button>
            </>
          )}
        </div>
      )}

      {/* Completed indicator */}
      {isCompleted && (
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Phase completed
        </div>
      )}
    </div>
  );
}
