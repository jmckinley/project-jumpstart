/**
 * @module hooks/useEnforcement
 * @description Custom hook for documentation enforcement state and actions
 *
 * PURPOSE:
 * - Manage git hook status (install, check)
 * - Load CI integration snippets
 * - Track enforcement events (blocks, warnings)
 *
 * DEPENDENCIES:
 * - react - useState, useCallback
 * - @/lib/tauri - installGitHooks, getHookStatus, getEnforcementEvents, getCiSnippets
 * - @/types/enforcement - EnforcementEvent, HookStatus, CiSnippet
 * - @/stores/projectStore - Active project for path and ID
 *
 * EXPORTS:
 * - useEnforcement - Hook returning enforcement state and actions
 *
 * PATTERNS:
 * - Call refreshHookStatus() to check current hook state
 * - Call installHooks(mode) to install or update pre-commit hook
 * - Call loadSnippets() to fetch CI templates
 * - Call loadEvents() to fetch recent enforcement events
 * - All actions auto-resolve project path/ID from the active project store
 *
 * CLAUDE NOTES:
 * - Hook modes:
 *   - "block" (exit 1, prevents commit)
 *   - "warn" (exit 0, allows commit with warning)
 *   - "auto-update" (generates missing docs via AI, stages them, allows commit)
 * - Auto-update mode requires API key configured in Project Jumpstart settings
 * - Snippets are generated server-side, no local state mutation needed
 * - Events are sorted by created_at descending (most recent first)
 */

import { useState, useCallback } from "react";
import {
  installGitHooks,
  getHookStatus,
  getEnforcementEvents,
  getCiSnippets,
} from "@/lib/tauri";
import type { EnforcementEvent, HookStatus, CiSnippet } from "@/types/enforcement";
import { useProjectStore } from "@/stores/projectStore";

export function useEnforcement() {
  const [hookStatus, setHookStatus] = useState<HookStatus | null>(null);
  const [snippets, setSnippets] = useState<CiSnippet[]>([]);
  const [events, setEvents] = useState<EnforcementEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProject = useProjectStore((s) => s.activeProject);

  const refreshHookStatus = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const status = await getHookStatus(activeProject.path);
      setHookStatus(status);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  const installHooks = useCallback(
    async (mode: string) => {
      if (!activeProject) return;
      setInstalling(true);
      setError(null);
      try {
        const status = await installGitHooks(activeProject.path, mode);
        setHookStatus(status);
      } catch (err) {
        setError(String(err));
      } finally {
        setInstalling(false);
      }
    },
    [activeProject],
  );

  const loadSnippets = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCiSnippets(activeProject.path);
      setSnippets(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  const loadEvents = useCallback(
    async (limit?: number) => {
      if (!activeProject) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getEnforcementEvents(activeProject.id, limit);
        setEvents(result);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [activeProject],
  );

  return {
    hookStatus,
    snippets,
    events,
    loading,
    installing,
    error,
    refreshHookStatus,
    installHooks,
    loadSnippets,
    loadEvents,
  };
}
