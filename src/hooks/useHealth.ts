/**
 * @module hooks/useHealth
 * @description Custom hook for fetching and tracking project health scores
 *
 * PURPOSE:
 * - Fetch health score from the backend for the active project
 * - Auto-fetch when the active project changes
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
 * - Uses useEffect to auto-fetch, plus exposes refresh() for manual re-fetch
 * - Stale request guard prevents out-of-order responses when project changes rapidly
 */

import { useCallback, useEffect, useRef, useState } from "react";
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

export function useHealth() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const requestId = useRef(0);

  const [state, setState] = useState<HealthState>({
    score: 0,
    components: null,
    quickWins: [],
    contextRotRisk: "low",
    discoveredTestCount: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!activeProject) return;

    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const health = await getHealthScore(activeProject.path);
      // Guard against stale responses (project changed while awaiting)
      if (requestId.current !== id) return;
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
      if (requestId.current !== id) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch health score",
      }));
    }
  }, [activeProject]);

  // Auto-fetch when active project changes
  useEffect(() => {
    if (!activeProject) {
      // Reset state when no project is selected
      setState({
        score: 0,
        components: null,
        quickWins: [],
        contextRotRisk: "low",
        discoveredTestCount: null,
        loading: false,
        error: null,
      });
      return;
    }

    refresh();
  }, [activeProject, refresh]);

  return {
    ...state,
    refresh,
  };
}
