/**
 * @module hooks/useModules
 * @description Custom hook for module documentation scanning, generation, and management
 *
 * PURPOSE:
 * - Scan project files and track documentation status (current/missing)
 * - Generate documentation templates for individual files
 * - Apply documentation headers to files on disk
 * - Batch generate documentation for multiple files
 * - Compute coverage statistics (total, documented, missing counts)
 *
 * DEPENDENCIES:
 * - @/lib/tauri - scanModules, parseModuleDoc, generateModuleDoc, applyModuleDoc IPC calls
 * - @/stores/projectStore - Active project for path
 * - @/types/module - ModuleStatus, ModuleDoc types
 *
 * EXPORTS:
 * - useModules - Hook returning module state and actions
 *
 * PATTERNS:
 * - Call scan() to fetch all module statuses from the backend
 * - Call getExistingDoc(filePath) for instant preview of files with existing docs (no AI)
 * - Call generateDoc(filePath) to generate new docs using AI (slower but higher quality)
 * - Call applyDoc(filePath, doc) to write to disk
 * - Call batchGenerate(filePaths) to generate + apply for multiple files
 * - Returns { modules, coverage, totalFiles, documentedFiles, missingFiles, loading, generating, hasScanned, error, scan, getExistingDoc, generateDoc, applyDoc, batchGenerate }
 *
 * CLAUDE NOTES:
 * - scan() should be called when the modules section becomes active
 * - coverage is a percentage (0-100)
 * - After batchGenerate, call scan() to refresh the full list
 * - hasScanned tracks whether initial scan completed (for empty project detection)
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  scanModules,
  parseModuleDoc,
  generateModuleDoc,
  applyModuleDoc,
} from "@/lib/tauri";
import type { ModuleStatus, ModuleDoc } from "@/types/module";

interface ModulesState {
  modules: ModuleStatus[];
  loading: boolean;
  generating: boolean;
  hasScanned: boolean;
  error: string | null;
  progress: { current: number; total: number } | null;
}

export function useModules() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<ModulesState>({
    modules: [],
    loading: false,
    generating: false,
    hasScanned: false,
    error: null,
    progress: null,
  });

  const scan = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const modules = await scanModules(activeProject.path);
      setState({ modules, loading: false, generating: false, hasScanned: true, error: null, progress: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        hasScanned: true,
        error: err instanceof Error ? err.message : "Failed to scan modules",
      }));
    }
  }, [activeProject]);

  /**
   * Get existing documentation from a file (local parse, no AI).
   * Returns null if the file has no doc header.
   * Use this for instant preview of files with existing docs.
   */
  const getExistingDoc = useCallback(
    async (filePath: string): Promise<ModuleDoc | null> => {
      if (!activeProject) return null;

      try {
        return await parseModuleDoc(filePath, activeProject.path);
      } catch (err) {
        // Don't set error for this - just return null
        console.warn("Failed to parse existing doc:", err);
        return null;
      }
    },
    [activeProject],
  );

  /**
   * Generate a new documentation template for a file using AI.
   * This is slower but produces high-quality docs.
   * Use getExistingDoc() for instant preview of already-documented files.
   */
  const generateDoc = useCallback(
    async (filePath: string): Promise<ModuleDoc | null> => {
      if (!activeProject) return null;

      try {
        return await generateModuleDoc(filePath, activeProject.path);
      } catch (err) {
        setState((s) => ({
          ...s,
          error:
            err instanceof Error ? err.message : "Failed to generate doc",
        }));
        return null;
      }
    },
    [activeProject],
  );

  const applyDoc = useCallback(
    async (filePath: string, doc: ModuleDoc): Promise<boolean> => {
      try {
        await applyModuleDoc(filePath, doc);
        // Update local state to mark this file as current
        setState((s) => ({
          ...s,
          modules: s.modules.map((m) =>
            m.path === filePath
              ? { ...m, status: "current" as const, freshnessScore: 100 }
              : m,
          ),
        }));
        return true;
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Failed to apply doc",
        }));
        return false;
      }
    },
    [],
  );

  const batchGenerate = useCallback(
    async (filePaths: string[]): Promise<ModuleStatus[]> => {
      if (!activeProject) return [];

      const total = filePaths.length;
      setState((s) => ({ ...s, generating: true, error: null, progress: { current: 0, total } }));

      const results: ModuleStatus[] = [];

      // Process files one at a time to show progress
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        setState((s) => ({ ...s, progress: { current: i + 1, total } }));

        try {
          // Generate doc using AI
          const doc = await generateModuleDoc(filePath, activeProject.path);
          // Apply to file
          await applyModuleDoc(filePath, doc);

          results.push({
            path: filePath.replace(activeProject.path + "/", ""),
            status: "current",
            freshnessScore: 100,
          });
        } catch (err) {
          console.error(`[batchGenerate] Error processing ${filePath}:`, err);
          results.push({
            path: filePath.replace(activeProject.path + "/", ""),
            status: "missing",
            freshnessScore: 0,
            changes: [err instanceof Error ? err.message : "Generation failed"],
          });
        }
      }

      // Refresh the full module list after batch generation
      try {
        const modules = await scanModules(activeProject.path);
        setState({ modules, loading: false, generating: false, hasScanned: true, error: null, progress: null });
      } catch (err) {
        console.error("Failed to refresh modules after batch generation:", err);
        setState((s) => ({ ...s, generating: false, progress: null }));
      }

      return results;
    },
    [activeProject],
  );

  // Computed values
  const totalFiles = state.modules.length;
  const documentedFiles = state.modules.filter(
    (m) => m.status === "current",
  ).length;
  const missingFiles = state.modules.filter(
    (m) => m.status === "missing",
  ).length;
  const coverage = totalFiles > 0 ? Math.round((documentedFiles / totalFiles) * 100) : 0;

  return {
    ...state,
    totalFiles,
    documentedFiles,
    missingFiles,
    coverage,
    progress: state.progress,
    scan,
    getExistingDoc,
    generateDoc,
    applyDoc,
    batchGenerate,
  };
}
