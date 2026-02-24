/**
 * @module hooks/useSessionHandoff
 * @description Custom hook for Smart Session Handoff — capturing and restoring session context
 *
 * PURPOSE:
 * - Load the latest session snapshot for the active project
 * - Capture a new session snapshot via AI analysis
 * - Generate and install the SessionStart hook script
 * - Track loading, capturing, and error states
 *
 * DEPENDENCIES:
 * - @/lib/tauri - generateHandoffContext, getLatestSnapshot, generateSessionStartScript IPC calls
 * - @/stores/projectStore - Active project for path and ID
 * - @/stores/toastStore - Success/error toast notifications
 * - @/types/session-handoff - SessionSnapshot type
 *
 * EXPORTS:
 * - useSessionHandoff - Hook returning snapshot state and actions
 *
 * PATTERNS:
 * - Call loadSnapshot() to fetch the latest snapshot on mount
 * - Call captureSnapshot() to analyze current session and save a new snapshot
 * - Call installHook() to generate the SessionStart hook script
 * - Returns { snapshot, loading, capturing, installing, error, loadSnapshot, captureSnapshot, installHook }
 *
 * CLAUDE NOTES:
 * - captureSnapshot() requires API key (calls Claude for AI analysis)
 * - installHook() creates .claude/hooks/session-handoff.sh and registers in .claude/settings.json
 * - loadSnapshot() is called automatically on mount when activeProject changes
 */

import { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";
import {
  generateHandoffContext,
  getLatestSnapshot,
  generateSessionStartScript,
} from "@/lib/tauri";
import type { SessionSnapshot } from "@/types/session-handoff";

interface SessionHandoffState {
  snapshot: SessionSnapshot | null;
  loading: boolean;
  capturing: boolean;
  installing: boolean;
  error: string | null;
}

export function useSessionHandoff() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const addToast = useToastStore((s) => s.addToast);

  const [state, setState] = useState<SessionHandoffState>({
    snapshot: null,
    loading: false,
    capturing: false,
    installing: false,
    error: null,
  });

  const loadSnapshot = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const snapshot = await getLatestSnapshot(activeProject.id);
      setState((s) => ({ ...s, snapshot, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load snapshot",
      }));
    }
  }, [activeProject]);

  const captureSnapshot = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, capturing: true, error: null }));
    try {
      const snapshot = await generateHandoffContext(
        activeProject.path,
        activeProject.id,
      );
      setState((s) => ({ ...s, snapshot, capturing: false }));
      addToast({ message: "Session snapshot captured", type: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to capture snapshot";
      setState((s) => ({ ...s, capturing: false, error: message }));
      addToast({ message: "Failed to capture snapshot", type: "error" });
    }
  }, [activeProject, addToast]);

  const installHook = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, installing: true, error: null }));
    try {
      const scriptPath = await generateSessionStartScript(activeProject.path);
      setState((s) => ({ ...s, installing: false }));
      addToast({
        message: `Hook installed: ${scriptPath}`,
        type: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to install hook";
      setState((s) => ({ ...s, installing: false, error: message }));
      addToast({ message: "Failed to install hook", type: "error" });
    }
  }, [activeProject, addToast]);

  // Auto-load snapshot when project changes
  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  return {
    ...state,
    loadSnapshot,
    captureSnapshot,
    installHook,
  };
}
