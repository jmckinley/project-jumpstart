/**
 * @module hooks/useRalph
 * @description Custom hook for RALPH loop management, prompt analysis, and loop monitoring
 *
 * PURPOSE:
 * - Manage RALPH loop state with loading/error tracking
 * - Analyze prompt quality before starting loops (with optional AI enhancement)
 * - Start and pause RALPH loops
 * - Track loop history for the active project
 *
 * DEPENDENCIES:
 * - @/lib/tauri - analyzeRalphPrompt, analyzeRalphPromptWithAi, startRalphLoop, pauseRalphLoop, listRalphLoops IPC calls
 * - @/stores/projectStore - Active project for scoping loops
 * - @/stores/settingsStore - hasApiKey to determine if AI analysis is available
 * - @/types/ralph - RalphLoop, PromptAnalysis types
 *
 * EXPORTS:
 * - useRalph - Hook returning RALPH state and actions
 *
 * PATTERNS:
 * - Call analyzePrompt(prompt, useAi) to score prompt quality before starting
 * - When useAi=true and API key is configured, uses AI for deeper analysis
 * - Call startLoop() to begin a RALPH loop (requires analysis first)
 * - Call pauseLoop() to pause an active loop
 * - Call loadLoops() to refresh loop history
 * - Returns { loops, analysis, analyzing, loading, error, analyzePrompt, startLoop, pauseLoop, loadLoops, clearAnalysis }
 *
 * CLAUDE NOTES:
 * - analyzePrompt sets the analysis state for display in PromptAnalyzer
 * - AI analysis includes project context (language, framework, files) for smarter suggestions
 * - startLoop uses the last analysis result's enhanced prompt if available
 * - Loops are scoped to the active project
 * - clearAnalysis resets the analysis state for fresh prompt entry
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  analyzeRalphPrompt,
  analyzeRalphPromptWithAi,
  startRalphLoop,
  pauseRalphLoop,
  listRalphLoops,
  scanModules,
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
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);

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

  /**
   * Analyze prompt quality with optional AI enhancement.
   * @param prompt - The prompt to analyze
   * @param useAi - If true and API key is available, uses AI for deeper analysis
   */
  const analyzePrompt = useCallback(async (prompt: string, useAi = false) => {
    setState((s) => ({ ...s, analyzing: true, error: null }));
    try {
      let analysis: PromptAnalysis;

      if (useAi && hasApiKey && activeProject) {
        // Get project files for context
        let projectFiles: string[] = [];
        try {
          const modules = await scanModules(activeProject.path);
          projectFiles = modules.slice(0, 30).map((m) => m.path);
        } catch {
          // Ignore file scanning errors, proceed without file context
        }

        analysis = await analyzeRalphPromptWithAi(
          prompt,
          activeProject.name,
          activeProject.language,
          activeProject.framework ?? null,
          projectFiles.length > 0 ? projectFiles : null,
        );
      } else {
        // Use fast heuristic analysis
        analysis = await analyzeRalphPrompt(prompt);
      }

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
  }, [hasApiKey, activeProject]);

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
