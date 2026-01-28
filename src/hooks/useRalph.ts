/**
 * @module hooks/useRalph
 * @description Custom hook for RALPH loop management, prompt analysis, and loop monitoring
 *
 * PURPOSE:
 * - Manage RALPH loop state with loading/error tracking
 * - Analyze prompt quality before starting loops
 * - Start and pause RALPH loops
 * - Track loop history for the active project
 *
 * DEPENDENCIES:
 * - @/lib/tauri - analyzeRalphPrompt, startRalphLoop, pauseRalphLoop, listRalphLoops IPC calls
 * - @/stores/projectStore - Active project for scoping loops
 * - @/types/ralph - RalphLoop, PromptAnalysis types
 *
 * EXPORTS:
 * - useRalph - Hook returning RALPH state and actions
 *
 * PATTERNS:
 * - Call analyzePrompt() to score prompt quality before starting
 * - Call startLoop() to begin a RALPH loop (requires analysis first)
 * - Call pauseLoop() to pause an active loop
 * - Call loadLoops() to refresh loop history
 * - Returns { loops, analysis, analyzing, loading, error, analyzePrompt, startLoop, pauseLoop, loadLoops, clearAnalysis }
 *
 * CLAUDE NOTES:
 * - analyzePrompt sets the analysis state for display in PromptAnalyzer
 * - startLoop uses the last analysis result's enhanced prompt if available
 * - Loops are scoped to the active project
 * - clearAnalysis resets the analysis state for fresh prompt entry
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  analyzeRalphPrompt,
  startRalphLoop,
  pauseRalphLoop,
  listRalphLoops,
} from "@/lib/tauri";
import type { RalphLoop, PromptAnalysis } from "@/types/ralph";

interface RalphState {
  loops: RalphLoop[];
  analysis: PromptAnalysis | null;
  analyzing: boolean;
  loading: boolean;
  error: string | null;
}

export function useRalph() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<RalphState>({
    loops: [],
    analysis: null,
    analyzing: false,
    loading: false,
    error: null,
  });

  const loadLoops = useCallback(async () => {
    if (!activeProject) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const loops = await listRalphLoops(activeProject.id);
      setState((s) => ({ ...s, loops, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load loops",
      }));
    }
  }, [activeProject]);

  const analyzePrompt = useCallback(async (prompt: string) => {
    setState((s) => ({ ...s, analyzing: true, error: null }));
    try {
      const analysis = await analyzeRalphPrompt(prompt);
      setState((s) => ({ ...s, analysis, analyzing: false }));
      return analysis;
    } catch (err) {
      setState((s) => ({
        ...s,
        analyzing: false,
        error: err instanceof Error ? err.message : "Failed to analyze prompt",
      }));
      return null;
    }
  }, []);

  const startLoop = useCallback(
    async (prompt: string) => {
      if (!activeProject) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const enhancedPrompt = state.analysis?.enhancedPrompt ?? null;
        const qualityScore = state.analysis?.qualityScore ?? 0;
        const loop = await startRalphLoop(
          activeProject.id,
          prompt,
          enhancedPrompt,
          qualityScore,
        );
        setState((s) => ({
          ...s,
          loops: [loop, ...s.loops],
          loading: false,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to start loop",
        }));
      }
    },
    [activeProject, state.analysis],
  );

  const pauseLoop = useCallback(
    async (loopId: string) => {
      setState((s) => ({ ...s, error: null }));
      try {
        await pauseRalphLoop(loopId);
        setState((s) => ({
          ...s,
          loops: s.loops.map((l) =>
            l.id === loopId ? { ...l, status: "paused" as const } : l,
          ),
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to pause loop",
        }));
      }
    },
    [],
  );

  const clearAnalysis = useCallback(() => {
    setState((s) => ({ ...s, analysis: null }));
  }, []);

  return {
    ...state,
    loadLoops,
    analyzePrompt,
    startLoop,
    pauseLoop,
    clearAnalysis,
  };
}
