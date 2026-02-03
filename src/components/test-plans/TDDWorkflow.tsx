/**
 * @module components/test-plans/TDDWorkflow
 * @description Guided TDD workflow panel with red/green/refactor phases
 *
 * PURPOSE:
 * - Guide users through TDD red/green/refactor cycle
 * - Display phase cards with prompts and status
 * - Track progress through the workflow
 * - Export session as markdown
 *
 * DEPENDENCIES:
 * - react (useState) - Local state
 * - @/hooks/useTDDWorkflow - TDD workflow state and actions
 * - ./TDDPhaseCard - Individual phase card component
 *
 * EXPORTS:
 * - TDDWorkflow - TDD workflow panel component
 *
 * PATTERNS:
 * - Vertical phase cards with progress indicator
 * - Phase gates prevent skipping ahead
 * - Session can be exported for documentation
 *
 * CLAUDE NOTES:
 * - Sessions track all three phases
 * - Output is recorded per phase
 * - Progress bar shows 1/3, 2/3, 3/3 completion
 */

import { useState } from "react";
import type { TDDSession, TDDPhaseConfig } from "@/types/test-plan";
import { TDDPhaseCard } from "./TDDPhaseCard";

interface TDDWorkflowProps {
  session: TDDSession | null;
  phases: TDDPhaseConfig[];
  onStartSession: (featureName: string, testFilePath?: string) => void;
  onAdvancePhase: () => void;
  onFailPhase: () => void;
  onRetryPhase: () => void;
  onRecordOutput: (output: string) => void;
  onCloseSession: () => void;
}

export function TDDWorkflow({
  session,
  phases,
  onStartSession,
  onAdvancePhase,
  onFailPhase,
  onRetryPhase,
  onRecordOutput,
  onCloseSession,
}: TDDWorkflowProps) {
  const [featureName, setFeatureName] = useState("");
  const [testFilePath, setTestFilePath] = useState("");

  const handleStart = () => {
    if (!featureName.trim()) return;
    onStartSession(featureName.trim(), testFilePath.trim() || undefined);
    setFeatureName("");
    setTestFilePath("");
  };

  // Get current phase index
  const currentPhaseIndex = session
    ? phases.findIndex((p) => p.id === session.currentPhase)
    : -1;

  // Calculate progress
  const isCompleted = session?.completedAt !== null && session?.completedAt !== undefined;
  const progress = isCompleted ? 3 : currentPhaseIndex + 1;

  // Get output for each phase
  const getPhaseOutput = (phaseId: string): string | undefined => {
    if (!session) return undefined;
    switch (phaseId) {
      case "red":
        return session.redOutput || undefined;
      case "green":
        return session.greenOutput || undefined;
      case "refactor":
        return session.refactorOutput || undefined;
      default:
        return undefined;
    }
  };

  // Get prompt for each phase
  const getPhasePrompt = (phaseId: string): string | undefined => {
    if (!session) return undefined;
    switch (phaseId) {
      case "red":
        return session.redPrompt || undefined;
      case "green":
        return session.greenPrompt || undefined;
      case "refactor":
        return session.refactorPrompt || undefined;
      default:
        return undefined;
    }
  };

  // Get status for each phase
  const getPhaseStatus = (
    phaseId: string,
    index: number,
  ): "pending" | "active" | "complete" | "failed" => {
    if (!session) return "pending";

    if (index < currentPhaseIndex) {
      return "complete";
    } else if (index === currentPhaseIndex) {
      if (session.phaseStatus === "failed") return "failed";
      if (isCompleted && phaseId === "refactor") return "complete";
      return "active";
    } else {
      return "pending";
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      {!session ? (
        // Start new session form
        <>
          <h3 className="mb-4 text-sm font-medium text-neutral-200">
            Start TDD Workflow
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">
                Feature Name
              </label>
              <input
                type="text"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="e.g., Add user logout button"
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-400">
                Test File Path (optional)
              </label>
              <input
                type="text"
                value={testFilePath}
                onChange={(e) => setTestFilePath(e.target.value)}
                placeholder="e.g., src/components/Logout.test.tsx"
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={!featureName.trim()}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start TDD Session
            </button>
          </div>
        </>
      ) : (
        // Active session
        <>
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-neutral-200">
                TDD: {session.featureName}
              </h3>
              {session.testFilePath && (
                <p className="text-xs text-neutral-500">{session.testFilePath}</p>
              )}
            </div>
            <button
              onClick={onCloseSession}
              className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
            >
              Close
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Progress</span>
              <span>{progress}/3 phases</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all ${
                  isCompleted ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${(progress / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Phase cards */}
          <div className="space-y-3">
            {phases.map((phase, index) => {
              const status = getPhaseStatus(phase.id, index);
              const isActive = status === "active" || status === "failed";
              const isPhaseCompleted = status === "complete";

              return (
                <TDDPhaseCard
                  key={phase.id}
                  config={phase}
                  status={status}
                  prompt={getPhasePrompt(phase.id)}
                  output={getPhaseOutput(phase.id)}
                  isActive={isActive}
                  isCompleted={isPhaseCompleted}
                  onConfirm={onAdvancePhase}
                  onFail={onFailPhase}
                  onRetry={onRetryPhase}
                  onRecordOutput={onRecordOutput}
                />
              );
            })}
          </div>

          {/* Completion message */}
          {isCompleted && (
            <div className="mt-4 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-center">
              <p className="text-sm font-medium text-green-400">
                TDD Cycle Complete!
              </p>
              <p className="mt-1 text-xs text-green-400/70">
                You've successfully completed the red-green-refactor cycle.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
