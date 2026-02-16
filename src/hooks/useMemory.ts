/**
 * @module hooks/useMemory
 * @description Hook for Memory Management operations
 *
 * PURPOSE:
 * - Provide memory source listing and health monitoring
 * - Manage learnings (list, update status, promote)
 * - Run CLAUDE.md analysis
 *
 * DEPENDENCIES:
 * - @/stores/projectStore - Active project for scoping operations
 * - @/lib/tauri - listMemorySources, listLearnings, updateLearningStatus, analyzeClaudeMd, getMemoryHealth, promoteLearning
 * - @/types/memory - MemorySource, Learning, MemoryHealth, ClaudeMdAnalysis types
 *
 * EXPORTS:
 * - useMemory - Hook returning memory state and actions
 *
 * PATTERNS:
 * - Call refresh() when the memory section becomes active
 * - All operations require an active project
 * - Returns { sources, learnings, health, analysis, loading, analyzing, error, ... }
 *
 * CLAUDE NOTES:
 * - loadSources, loadLearnings, loadHealth can be called independently
 * - refresh() calls all three in parallel
 * - runAnalysis is separate and sets its own `analyzing` flag
 * - updateStatus optimistically updates the local learnings array
 * - promote reloads the full learnings list after promotion
 */

import { useState, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";
import {
  listMemorySources,
  listLearnings,
  updateLearningStatus,
  analyzeClaudeMd,
  getMemoryHealth,
  promoteLearning,
} from "@/lib/tauri";
import type { MemorySource, Learning, MemoryHealth, ClaudeMdAnalysis } from "@/types/memory";

export function useMemory() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const addToast = useToastStore((s) => s.addToast);
  const [sources, setSources] = useState<MemorySource[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [health, setHealth] = useState<MemoryHealth | null>(null);
  const [analysis, setAnalysis] = useState<ClaudeMdAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const data = await listMemorySources(activeProject.path);
      setSources(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  const loadLearnings = useCallback(async () => {
    if (!activeProject) return;
    try {
      const data = await listLearnings(activeProject.path);
      setLearnings(data);
    } catch (e) {
      setError(String(e));
    }
  }, [activeProject]);

  const loadHealth = useCallback(async () => {
    if (!activeProject) return;
    try {
      const data = await getMemoryHealth(activeProject.path);
      setHealth(data);
    } catch (e) {
      setError(String(e));
    }
  }, [activeProject]);

  const runAnalysis = useCallback(async () => {
    if (!activeProject) return;
    setAnalyzing(true);
    try {
      const data = await analyzeClaudeMd(activeProject.path);
      setAnalysis(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setAnalyzing(false);
    }
  }, [activeProject]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      const updated = await updateLearningStatus(id, status);
      setLearnings((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const promote = useCallback(async (id: string, target: string) => {
    if (!activeProject) return;
    try {
      await promoteLearning(id, target, activeProject.path);
      // Reload learnings after promotion
      const data = await listLearnings(activeProject.path);
      setLearnings(data);
      addToast({ message: "Learning promoted", type: "success" });
    } catch (e) {
      setError(String(e));
    }
  }, [activeProject]);

  const refresh = useCallback(async () => {
    await Promise.all([loadSources(), loadLearnings(), loadHealth()]);
  }, [loadSources, loadLearnings, loadHealth]);

  return {
    sources,
    learnings,
    health,
    analysis,
    loading,
    analyzing,
    error,
    loadSources,
    loadLearnings,
    loadHealth,
    runAnalysis,
    updateStatus,
    promote,
    refresh,
  };
}
