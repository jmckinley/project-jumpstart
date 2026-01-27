/**
 * @module hooks/useProject
 * @description Custom hook for project-related operations
 *
 * PURPOSE:
 * - Provide a convenient API for project CRUD from components
 * - Bridge between Zustand store and Tauri backend
 * - Handle loading states and errors
 *
 * DEPENDENCIES:
 * - @/stores/projectStore - Project state
 * - @/lib/tauri - Backend IPC calls (listProjects, removeProject)
 *
 * EXPORTS:
 * - useProject - Hook returning project state and actions
 *
 * PATTERNS:
 * - Returns { projects, activeProject, loading, actions }
 * - Actions call Tauri commands and update store
 * - loadProjects() fetches from backend and populates store
 * - deleteProject() removes from backend and store
 *
 * CLAUDE NOTES:
 * - loadProjects is called by App.tsx on mount
 * - deleteProject also clears activeProject if it was the deleted one
 * - Errors are logged to console; callers can wrap in try/catch for UI handling
 */

import { useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { listProjects, removeProject } from "@/lib/tauri";

export function useProject() {
  const projects = useProjectStore((s) => s.projects);
  const activeProject = useProjectStore((s) => s.activeProject);
  const loading = useProjectStore((s) => s.loading);
  const setProjects = useProjectStore((s) => s.setProjects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const setLoading = useProjectStore((s) => s.setLoading);
  const removeFromStore = useProjectStore((s) => s.removeProject);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProjects();
      setProjects(result);
      if (result.length > 0 && !activeProject) {
        setActiveProject(result[0]);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProjects, setActiveProject, activeProject]);

  const deleteProject = useCallback(
    async (id: string) => {
      await removeProject(id);
      removeFromStore(id);
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
    },
    [removeFromStore, setActiveProject, activeProject],
  );

  return {
    projects,
    activeProject,
    loading,
    setActiveProject,
    loadProjects,
    deleteProject,
  };
}
