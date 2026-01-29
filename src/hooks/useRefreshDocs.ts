/**
 * @module hooks/useRefreshDocs
 * @description Custom hook for one-click documentation refresh functionality
 *
 * PURPOSE:
 * - Scan project files to identify stale (outdated or missing) documentation
 * - Regenerate CLAUDE.md using AI or template
 * - Batch generate and apply documentation for all stale module files
 * - Track refresh progress and provide feedback
 *
 * DEPENDENCIES:
 * - @/lib/tauri - getStaleFiles, generateClaudeMd, writeClaudeMd, batchGenerateDocs, logActivity IPC calls
 * - @/stores/projectStore - Active project for ID and path
 * - @/types/module - ModuleStatus type for stale file info
 *
 * EXPORTS:
 * - useRefreshDocs - Hook returning stale counts, refresh state, and actions
 *
 * PATTERNS:
 * - Call scanForStaleFiles() to update stale/missing counts (called on mount)
 * - Call refreshAll() to regenerate CLAUDE.md and batch update all stale module docs
 * - Returns { refreshing, staleCount, missingCount, totalToRefresh, scanForStaleFiles, refreshAll }
 *
 * CLAUDE NOTES:
 * - totalToRefresh includes +1 for CLAUDE.md regeneration
 * - refreshAll returns a summary object with claudeMd boolean and modules count
 * - Errors are thrown to be caught by the calling component for display
 * - scanForStaleFiles should be called when dashboard loads or after external changes
 */

import { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import {
  getStaleFiles,
  generateClaudeMd,
  writeClaudeMd,
  batchGenerateDocs,
  logActivity,
} from "@/lib/tauri";

interface RefreshResult {
  claudeMd: boolean;
  modules: number;
}

export function useRefreshDocs() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [refreshing, setRefreshing] = useState(false);
  const [staleCount, setStaleCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);

  const scanForStaleFiles = useCallback(async () => {
    if (!activeProject) return;

    try {
      const staleFiles = await getStaleFiles(activeProject.path);
      setStaleCount(staleFiles.filter((f) => f.status === "outdated").length);
      setMissingCount(staleFiles.filter((f) => f.status === "missing").length);
    } catch {
      // Silently fail - counts will remain at 0
      setStaleCount(0);
      setMissingCount(0);
    }
  }, [activeProject]);

  // Scan on mount and when project changes
  useEffect(() => {
    scanForStaleFiles();
  }, [scanForStaleFiles]);

  const refreshAll = useCallback(async (): Promise<RefreshResult> => {
    if (!activeProject) {
      throw new Error("No active project");
    }

    setRefreshing(true);
    try {
      // 1. Regenerate CLAUDE.md
      const claudeMdContent = await generateClaudeMd(activeProject.id);
      await writeClaudeMd(activeProject.path, claudeMdContent);

      // 2. Get stale files and batch generate docs
      const staleFiles = await getStaleFiles(activeProject.path);
      const pathsToUpdate = staleFiles.map((f) => `${activeProject.path}/${f.path}`);

      let modulesUpdated = 0;
      if (pathsToUpdate.length > 0) {
        await batchGenerateDocs(pathsToUpdate, activeProject.path);
        modulesUpdated = pathsToUpdate.length;
      }

      // 3. Log activity
      await logActivity(
        activeProject.id,
        "generate",
        `Refreshed CLAUDE.md and ${modulesUpdated} module docs`,
      );

      // 4. Rescan to update counts
      await scanForStaleFiles();

      return { claudeMd: true, modules: modulesUpdated };
    } finally {
      setRefreshing(false);
    }
  }, [activeProject, scanForStaleFiles]);

  return {
    refreshing,
    staleCount,
    missingCount,
    totalToRefresh: staleCount + missingCount + 1, // +1 for CLAUDE.md
    scanForStaleFiles,
    refreshAll,
  };
}
