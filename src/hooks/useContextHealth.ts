/**
 * @module hooks/useContextHealth
 * @description Custom hook for context health monitoring, MCP status, and checkpoints
 *
 * PURPOSE:
 * - Track context token usage and rot risk
 * - Monitor MCP server overhead and recommendations
 * - Manage context checkpoints for recovery
 *
 * DEPENDENCIES:
 * - @/lib/tauri - getContextHealth, getMcpStatus, createCheckpoint, listCheckpoints IPC calls
 * - @/stores/projectStore - Active project for scoping
 * - @/types/health - ContextHealth, McpServerStatus, Checkpoint types
 *
 * EXPORTS:
 * - useContextHealth - Hook returning context health state and actions
 *
 * PATTERNS:
 * - Call refresh() to update context health and MCP status
 * - Call addCheckpoint() to save a context snapshot
 * - Call loadCheckpoints() to fetch checkpoint history
 * - Returns { contextHealth, mcpServers, checkpoints, loading, error, refresh, addCheckpoint, loadCheckpoints }
 *
 * CLAUDE NOTES:
 * - refresh() fetches both context health and MCP status in parallel
 * - Checkpoints are scoped to the active project
 * - Context health drives the status bar percentage indicator
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  getContextHealth,
  getMcpStatus,
  createCheckpoint,
  listCheckpoints,
} from "@/lib/tauri";
import type { ContextHealth, McpServerStatus, Checkpoint } from "@/types/health";

interface ContextHealthState {
  contextHealth: ContextHealth | null;
  mcpServers: McpServerStatus[];
  checkpoints: Checkpoint[];
  loading: boolean;
  error: string | null;
}

export function useContextHealth() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<ContextHealthState>({
    contextHealth: null,
    mcpServers: [],
    checkpoints: [],
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!activeProject) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [health, servers] = await Promise.all([
        getContextHealth(activeProject.path),
        getMcpStatus(activeProject.path),
      ]);
      setState((s) => ({
        ...s,
        contextHealth: health,
        mcpServers: servers,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load context health",
      }));
    }
  }, [activeProject]);

  const loadCheckpoints = useCallback(async () => {
    if (!activeProject) return;
    try {
      const checkpoints = await listCheckpoints(activeProject.id);
      setState((s) => ({ ...s, checkpoints }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to load checkpoints",
      }));
    }
  }, [activeProject]);

  const addCheckpoint = useCallback(
    async (label: string, summary: string) => {
      if (!activeProject) return;
      try {
        const checkpoint = await createCheckpoint(
          activeProject.id,
          label,
          summary,
          activeProject.path,
        );
        setState((s) => ({
          ...s,
          checkpoints: [checkpoint, ...s.checkpoints],
          error: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to create checkpoint",
        }));
      }
    },
    [activeProject],
  );

  return {
    ...state,
    refresh,
    loadCheckpoints,
    addCheckpoint,
  };
}
