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
 * - @/lib/tauri - listMemorySources, listLearnings, updateLearningStatus, analyzeClaudeMd, getMemoryHealth, promoteLearning, readClaudeMd, writeClaudeMd, appendToProjectFile
 * - @/types/memory - MemorySource, Learning, MemoryHealth, ClaudeMdAnalysis types
 *
 * EXPORTS:
 * - useMemory - Hook returning memory state and actions
 *
 * PATTERNS:
 * - Call refresh() when the memory section becomes active
 * - All operations require an active project
 * - Returns { sources, learnings, health, analysis, loading, analyzing, error, applyRemoval, applyMove, ... }
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
  readClaudeMd,
  writeClaudeMd,
  appendToProjectFile,
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
      addToast({ message: "Failed to load memory sources", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [activeProject, addToast]);

  const loadLearnings = useCallback(async () => {
    if (!activeProject) return;
    try {
      const data = await listLearnings(activeProject.path);
      setLearnings(data);
    } catch (e) {
      setError(String(e));
      addToast({ message: "Failed to load learnings", type: "error" });
    }
  }, [activeProject, addToast]);

  const loadHealth = useCallback(async () => {
    if (!activeProject) return;
    try {
      const data = await getMemoryHealth(activeProject.path);
      setHealth(data);
    } catch (e) {
      setError(String(e));
      addToast({ message: "Failed to load memory health", type: "error" });
    }
  }, [activeProject, addToast]);

  const runAnalysis = useCallback(async () => {
    if (!activeProject) {
      addToast({ message: "No project selected", type: "error" });
      return;
    }
    setAnalyzing(true);
    try {
      const data = await analyzeClaudeMd(activeProject.path);
      setAnalysis(data);
    } catch (e) {
      setError(String(e));
      addToast({ message: "Failed to analyze CLAUDE.md", type: "error" });
    } finally {
      setAnalyzing(false);
    }
  }, [activeProject, addToast]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      const updated = await updateLearningStatus(id, status);
      setLearnings((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const promote = useCallback(async (id: string, target: string) => {
    if (!activeProject) {
      addToast({ message: "No project selected", type: "error" });
      return;
    }
    try {
      await promoteLearning(id, target, activeProject.path);
      const data = await listLearnings(activeProject.path);
      setLearnings(data);
      addToast({ message: "Learning promoted", type: "success" });
    } catch (e) {
      setError(String(e));
      addToast({ message: "Failed to promote learning", type: "error" });
    }
  }, [activeProject, addToast]);

  const applyRemoval = useCallback(async (lineNumbers: number[]) => {
    if (!activeProject) {
      addToast({ message: "No project selected", type: "error" });
      return;
    }
    try {
      const info = await readClaudeMd(activeProject.path);
      const lines = info.content.split("\n");
      const toRemove = new Set(lineNumbers);
      const filtered = lines.filter((_, i) => !toRemove.has(i + 1));
      await writeClaudeMd(activeProject.path, filtered.join("\n"));
      addToast({ message: `Removed ${lineNumbers.length} line(s) from CLAUDE.md`, type: "success" });
      const data = await analyzeClaudeMd(activeProject.path);
      setAnalysis(data);
    } catch (e) {
      setError(String(e));
      addToast({ message: "Failed to remove lines from CLAUDE.md", type: "error" });
    }
  }, [activeProject, addToast]);

  const applyMove = useCallback(async (lineRange: [number, number], targetFile: string) => {
    if (!activeProject) {
      addToast({ message: "No project selected", type: "error" });
      return;
    }
    try {
      const info = await readClaudeMd(activeProject.path);
      const lines = info.content.split("\n");
      const [start, end] = lineRange;
      const extracted = lines.slice(start - 1, end).join("\n") + "\n";
      const remaining = lines.filter((_, i) => i < start - 1 || i >= end);
      await writeClaudeMd(activeProject.path, remaining.join("\n"));
      await appendToProjectFile(activeProject.path, targetFile, "\n" + extracted);
      addToast({ message: `Moved lines ${start}-${end} to ${targetFile}`, type: "success" });
      const data = await analyzeClaudeMd(activeProject.path);
      setAnalysis(data);
    } catch (e) {
      setError(String(e));
      addToast({ message: "Failed to move lines", type: "error" });
    }
  }, [activeProject, addToast]);

  const refresh = useCallback(async () => {
    if (!activeProject) {
      addToast({ message: "No project selected", type: "error" });
      return;
    }
    await Promise.all([loadSources(), loadLearnings(), loadHealth()]);
  }, [activeProject, addToast, loadSources, loadLearnings, loadHealth]);

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
    applyRemoval,
    applyMove,
    refresh,
  };
}
