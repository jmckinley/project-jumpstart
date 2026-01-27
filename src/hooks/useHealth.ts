/**
 * @module hooks/useHealth
 * @description Custom hook for fetching and tracking project health scores
 *
 * PURPOSE:
 * - Fetch health score from the backend for the active project
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
 * - Call refresh() to fetch the latest health score from backend
 * - Returns { score, components, quickWins, contextRotRisk, loading, error, refresh }
 *
 * CLAUDE NOTES:
 * - Health score range is always 0-100
 * - refresh() should be called when project changes or after CLAUDE.md edits
 * - Phase 3 only scores CLAUDE.md and module docs; other components return 0
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { getHealthScore } from "@/lib/tauri";
import type { HealthComponents, QuickWin } from "@/types/health";

interface HealthState {
  score: number;
  components: HealthComponents | null;
  quickWins: QuickWin[];
  contextRotRisk: "low" | "medium" | "high";
  loading: boolean;
  error: string | null;
}

export function useHealth() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<HealthState>({
    score: 0,
    components: null,
    quickWins: [],
    contextRotRisk: "low",
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const health = await getHealthScore(activeProject.path);
      setState({
        score: health.total,
        components: health.components,
        quickWins: health.quickWins,
        contextRotRisk: health.contextRotRisk,
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
  }, [activeProject]);

  return {
    ...state,
    refresh,
  };
}
