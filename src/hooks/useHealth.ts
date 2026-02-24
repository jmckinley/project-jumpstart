/**
 * @module hooks/useHealth
 * @description Custom hook for fetching and tracking project health scores
 *
 * PURPOSE:
 * - Fetch health score from the backend for the active project
 * - Auto-fetch when the active project changes or component remounts
 * - Expose component breakdown and quick wins
 * - Track loading and error states
 *
 * DEPENDENCIES:
 * - @/lib/tauri - getHealthScore IPC call
 * - @/stores/projectStore - Active project for path
 * - @/types/health - HealthScore, HealthComponents, QuickWin types
 *
 * EXPORTS:
 * - useHealth - Hook returning health score state and refresh action
 *
 * PATTERNS:
 * - Auto-fetches on mount and when activeProject changes
 * - Call refresh() to manually re-fetch (e.g., after CLAUDE.md edits)
 * - Returns { score, components, quickWins, contextRotRisk, loading, error, refresh }
 *
 * CLAUDE NOTES:
 * - Health score range is always 0-100
 * - Uses a simple fetch-on-change pattern with activeProject.id as trigger
 * - refresh() can be called manually for on-demand re-fetch
 */

import { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { getHealthScore } from "@/lib/tauri";
import type { HealthComponents, QuickWin } from "@/types/health";

interface HealthState {
  score: number;
  components: HealthComponents | null;
  quickWins: QuickWin[];
  contextRotRisk: "low" | "medium" | "high";
  discoveredTestCount: number | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATE: HealthState = {
  score: 0,
  components: null,
  quickWins: [],
  contextRotRisk: "low",
  discoveredTestCount: null,
  loading: false,
  error: null,
};

export function useHealth() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [state, setState] = useState<HealthState>(DEFAULT_STATE);

  // Fetch health score for the given project path
  const fetchScore = useCallback(async (projectPath: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const health = await getHealthScore(projectPath);
      setState({
        score: health.total,
        components: health.components,
        quickWins: health.quickWins,
        contextRotRisk: health.contextRotRisk,
        discoveredTestCount: health.discoveredTestCount ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch health score",
      }));
    }
  }, []);

  // Auto-fetch when active project changes (keyed on project ID, not object reference)
  useEffect(() => {
    if (!activeProject) {
      setState(DEFAULT_STATE);
      return;
    }
    fetchScore(activeProject.path);
  }, [activeProject?.id, fetchScore]);

  // Manual refresh uses current active project
  const refresh = useCallback(async () => {
    if (!activeProject) return;
    await fetchScore(activeProject.path);
  }, [activeProject, fetchScore]);

  return {
    ...state,
    refresh,
  };
}
