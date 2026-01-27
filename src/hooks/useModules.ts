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
 * - @/lib/tauri - scanModules, generateModuleDoc, applyModuleDoc, batchGenerateDocs IPC calls
 * - @/stores/projectStore - Active project for path
 * - @/types/module - ModuleStatus, ModuleDoc types
 *
 * EXPORTS:
 * - useModules - Hook returning module state and actions
 *
 * PATTERNS:
 * - Call scan() to fetch all module statuses from the backend
 * - Call generateDoc(filePath) to preview a generated doc before applying
 * - Call applyDoc(filePath, doc) to write to disk
 * - Call batchGenerate(filePaths) to generate + apply for multiple files
 * - Returns { modules, coverage, totalFiles, documentedFiles, missingFiles, loading, error, scan, generateDoc, applyDoc, batchGenerate }
 *
 * CLAUDE NOTES:
 * - scan() should be called when the modules section becomes active
 * - coverage is a percentage (0-100)
 * - After batchGenerate, call scan() to refresh the full list
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  scanModules,
  generateModuleDoc,
  applyModuleDoc,
  batchGenerateDocs,
} from "@/lib/tauri";
import type { ModuleStatus, ModuleDoc } from "@/types/module";

interface ModulesState {
  modules: ModuleStatus[];
  loading: boolean;
  generating: boolean;
  error: string | null;
}

export function useModules() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [state, setState] = useState<ModulesState>({
    modules: [],
    loading: false,
    generating: false,
    error: null,
  });

  const scan = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const modules = await scanModules(activeProject.path);
      setState({ modules, loading: false, generating: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to scan modules",
      }));
    }
  }, [activeProject]);

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

      setState((s) => ({ ...s, generating: true, error: null }));
      try {
        const results = await batchGenerateDocs(filePaths, activeProject.path);
        // Refresh the full module list after batch generation
        const modules = await scanModules(activeProject.path);
        setState({ modules, loading: false, generating: false, error: null });
        return results;
      } catch (err) {
        setState((s) => ({
          ...s,
          generating: false,
          error:
            err instanceof Error
              ? err.message
              : "Failed to batch generate docs",
        }));
        return [];
      }
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
    scan,
    generateDoc,
    applyDoc,
    batchGenerate,
  };
}
