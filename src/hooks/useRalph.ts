/**
 * @module hooks/useRalph
 * @description Custom hook for RALPH loop management, prompt analysis, and loop monitoring
 *
 * PURPOSE:
 * - Manage RALPH loop state with loading/error tracking
 * - Analyze prompt quality before starting loops (with optional AI enhancement)
 * - Start and pause RALPH loops
 * - Track loop history for the active project
 * - Load project context (CLAUDE.md, recent mistakes, patterns) for enhanced analysis
 * - Record mistakes for learning and pattern extraction
 *
 * DEPENDENCIES:
 * - @/lib/tauri - analyzeRalphPrompt, analyzeRalphPromptWithAi, startRalphLoop, pauseRalphLoop, listRalphLoops, getRalphContext, recordRalphMistake, updateClaudeMdWithPattern IPC calls
 * - @/stores/projectStore - Active project for scoping loops
 * - @/stores/settingsStore - hasApiKey to determine if AI analysis is available
 * - @/types/ralph - RalphLoop, PromptAnalysis, RalphLoopContext, RalphMistake types
 *
 * EXPORTS:
 * - useRalph - Hook returning RALPH state and actions
 *
 * PATTERNS:
 * - Call analyzePrompt(prompt, useAi) to score prompt quality before starting
 * - When useAi=true and API key is configured, uses AI for deeper analysis
 * - Call startLoop() to begin a RALPH loop (requires analysis first)
 * - Call pauseLoop() to pause an active loop
 * - Call resumeLoop() to resume a paused loop
 * - Call killLoop() to kill a running or paused loop and mark as failed
 * - Call loadLoops() to refresh loop history
 * - Call loadContext() to fetch CLAUDE.md + mistakes before analysis
 * - Call recordMistake() to record a new mistake for learning
 * - Call learnPattern() to add a pattern to CLAUDE.md
 * - Returns { loops, mistakes, analysis, context, analyzing, loading, error, analyzePrompt, startLoop, pauseLoop, resumeLoop, killLoop, loadLoops, loadMistakes, loadContext, recordMistake, learnPattern, clearAnalysis }
 *
 * CLAUDE NOTES:
 * - analyzePrompt sets the analysis state for display in PromptAnalyzer
 * - AI analysis includes project context (language, framework, files) for smarter suggestions
 * - startLoop uses the last analysis result's enhanced prompt if available
 * - Loops are scoped to the active project
 * - clearAnalysis resets the analysis state for fresh prompt entry
 * - Context includes CLAUDE.md summary and recent mistakes for learning
 * - recordMistake stores mistakes in DB with auto-pruning (max 50 per project)
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  analyzeRalphPrompt,
  analyzeRalphPromptWithAi,
  startRalphLoop,
  pauseRalphLoop,
  resumeRalphLoop,
  killRalphLoop,
  listRalphLoops,
  listRalphMistakes,
  scanModules,
  getRalphContext,
  recordRalphMistake,
  updateClaudeMdWithPattern,
} from "@/lib/tauri";
import type { RalphLoop, PromptAnalysis, RalphLoopContext, RalphMistake } from "@/types/ralph";

interface RalphState {
  loops: RalphLoop[];
  mistakes: RalphMistake[];
  analysis: PromptAnalysis | null;
  context: RalphLoopContext | null;
  analyzing: boolean;
  loading: boolean;
  error: string | null;
}

export function useRalph() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);

  const [state, setState] = useState<RalphState>({
    loops: [],
    mistakes: [],
    analysis: null,
    context: null,
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
   * Load captured mistakes for the active project.
   */
  const loadMistakes = useCallback(async () => {
    if (!activeProject) return;
    try {
      const mistakes = await listRalphMistakes(activeProject.id);
      setState((s) => ({ ...s, mistakes }));
    } catch (err) {
      // Mistakes loading failures are non-critical
      console.warn("Failed to load mistakes:", err);
    }
  }, [activeProject]);

  /**
   * Load RALPH context including CLAUDE.md summary, recent mistakes, and project patterns.
   * Call this before analyzePrompt for context-aware analysis.
   */
  const loadContext = useCallback(async () => {
    if (!activeProject) return null;
    try {
      const context = await getRalphContext(activeProject.id, activeProject.path);
      setState((s) => ({ ...s, context }));
      return context;
    } catch (err) {
      // Context loading failures are non-critical, continue without context
      console.warn("Failed to load RALPH context:", err);
      return null;
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

  const resumeLoop = useCallback(
    async (loopId: string) => {
      setState((s) => ({ ...s, error: null }));
      try {
        await resumeRalphLoop(loopId);
        setState((s) => ({
          ...s,
          loops: s.loops.map((l) =>
            l.id === loopId ? { ...l, status: "running" as const } : l,
          ),
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to resume loop",
        }));
      }
    },
    [],
  );

  const killLoop = useCallback(
    async (loopId: string) => {
      setState((s) => ({ ...s, error: null }));
      try {
        await killRalphLoop(loopId);
        setState((s) => ({
          ...s,
          loops: s.loops.map((l) =>
            l.id === loopId ? { ...l, status: "failed" as const, outcome: "Killed by user" } : l,
          ),
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to kill loop",
        }));
      }
    },
    [],
  );

  const clearAnalysis = useCallback(() => {
    setState((s) => ({ ...s, analysis: null }));
  }, []);

  /**
   * Record a mistake from a RALPH loop for learning.
   * Mistakes are stored in the database and can be used to enhance future analyses.
   */
  const recordMistake = useCallback(
    async (
      loopId: string | null,
      mistakeType: RalphMistake["mistakeType"],
      description: string,
      context?: string,
      resolution?: string,
    ): Promise<RalphMistake | null> => {
      if (!activeProject) return null;
      try {
        const mistake = await recordRalphMistake(
          activeProject.id,
          loopId,
          mistakeType,
          description,
          context ?? null,
          resolution ?? null,
          null, // learnedPattern can be added later
        );
        // Refresh context to include the new mistake
        await loadContext();
        return mistake;
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to record mistake",
        }));
        return null;
      }
    },
    [activeProject, loadContext],
  );

  /**
   * Learn a pattern by adding it to CLAUDE.md's CLAUDE NOTES section.
   * This makes the pattern persist across sessions.
   */
  const learnPattern = useCallback(
    async (pattern: string): Promise<boolean> => {
      if (!activeProject) return false;
      try {
        await updateClaudeMdWithPattern(activeProject.path, pattern);
        // Refresh context to include the new pattern
        await loadContext();
        return true;
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to learn pattern",
        }));
        return false;
      }
    },
    [activeProject, loadContext],
  );

  return {
    ...state,
    loadLoops,
    loadMistakes,
    loadContext,
    analyzePrompt,
    startLoop,
    pauseLoop,
    resumeLoop,
    killLoop,
    clearAnalysis,
    recordMistake,
    learnPattern,
  };
}
