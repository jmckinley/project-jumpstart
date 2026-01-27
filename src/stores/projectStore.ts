/**
 * @module stores/projectStore
 * @description Zustand store for project management state
 *
 * PURPOSE:
 * - Manage the list of registered projects
 * - Track the currently active project
 * - Provide actions for project CRUD operations
 *
 * DEPENDENCIES:
 * - zustand - State management
 * - @/types/project - Project type definition
 *
 * EXPORTS:
 * - useProjectStore - Zustand hook for project state
 *
 * PATTERNS:
 * - Use useProjectStore() in components to access state
 * - Actions are defined inline in the store
 * - State updates are immutable (spread + replace)
 *
 * CLAUDE NOTES:
 * - activeProject is null when no project is selected
 * - Projects are loaded from SQLite via Tauri commands on app start
 * - Keep project list sorted by most recently used
 */

import { create } from "zustand";
import type { Project } from "@/types/project";

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;

  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProject: null,
  loading: false,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
}));
