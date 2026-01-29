/**
 * @module stores/projectStore.test
 * @description Unit tests for projectStore Zustand store
 */

import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useProjectStore } from "./projectStore";

import type { Project } from "@/types/project";

const mockProject1: Project = {
  id: "project-1",
  name: "Project One",
  path: "/path/to/project1",
  description: "A test project",
  projectType: "Web App",
  language: "typescript",
  framework: "react",
  database: "PostgreSQL",
  testing: "Vitest",
  styling: "Tailwind CSS",
  healthScore: 75,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockProject2: Project = {
  id: "project-2",
  name: "Project Two",
  path: "/path/to/project2",
  description: "Another test project",
  projectType: "API",
  language: "python",
  framework: "django",
  database: "PostgreSQL",
  testing: "pytest",
  styling: null,
  healthScore: 50,
  createdAt: "2024-01-02T00:00:00Z",
};

describe("projectStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useProjectStore.getState();
    store.setProjects([]);
    store.setActiveProject(null);
    store.setLoading(false);
  });

  describe("initial state", () => {
    it("should start with empty projects and null activeProject", () => {
      const state = useProjectStore.getState();

      expect(state.projects).toEqual([]);
      expect(state.activeProject).toBeNull();
      expect(state.loading).toBe(false);
    });
  });

  describe("setProjects", () => {
    it("should set the projects array", () => {
      act(() => {
        useProjectStore.getState().setProjects([mockProject1, mockProject2]);
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject1, mockProject2]);
    });

    it("should replace existing projects", () => {
      act(() => {
        useProjectStore.getState().setProjects([mockProject1]);
        useProjectStore.getState().setProjects([mockProject2]);
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject2]);
    });
  });

  describe("setActiveProject", () => {
    it("should set the active project", () => {
      act(() => {
        useProjectStore.getState().setActiveProject(mockProject1);
      });

      const state = useProjectStore.getState();
      expect(state.activeProject).toEqual(mockProject1);
    });

    it("should allow setting null", () => {
      act(() => {
        useProjectStore.getState().setActiveProject(mockProject1);
        useProjectStore.getState().setActiveProject(null);
      });

      const state = useProjectStore.getState();
      expect(state.activeProject).toBeNull();
    });
  });

  describe("addProject", () => {
    it("should add a project to the list", () => {
      act(() => {
        useProjectStore.getState().addProject(mockProject1);
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject1]);
    });

    it("should append to existing projects", () => {
      act(() => {
        useProjectStore.getState().setProjects([mockProject1]);
        useProjectStore.getState().addProject(mockProject2);
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject1, mockProject2]);
    });
  });

  describe("removeProject", () => {
    it("should remove a project by id", () => {
      act(() => {
        useProjectStore.getState().setProjects([mockProject1, mockProject2]);
        useProjectStore.getState().removeProject("project-1");
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject2]);
    });

    it("should do nothing if project id not found", () => {
      act(() => {
        useProjectStore.getState().setProjects([mockProject1]);
        useProjectStore.getState().removeProject("nonexistent");
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([mockProject1]);
    });

    it("should handle removing from empty list", () => {
      act(() => {
        useProjectStore.getState().removeProject("any-id");
      });

      const state = useProjectStore.getState();
      expect(state.projects).toEqual([]);
    });
  });

  describe("setLoading", () => {
    it("should set loading to true", () => {
      act(() => {
        useProjectStore.getState().setLoading(true);
      });

      const state = useProjectStore.getState();
      expect(state.loading).toBe(true);
    });

    it("should set loading to false", () => {
      act(() => {
        useProjectStore.getState().setLoading(true);
        useProjectStore.getState().setLoading(false);
      });

      const state = useProjectStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  describe("selector usage", () => {
    it("should allow selecting specific state slices", () => {
      act(() => {
        useProjectStore.getState().setProjects([mockProject1, mockProject2]);
        useProjectStore.getState().setActiveProject(mockProject1);
      });

      // Simulate selector usage
      const projects = useProjectStore.getState().projects;
      const activeProject = useProjectStore.getState().activeProject;

      expect(projects.length).toBe(2);
      expect(activeProject?.id).toBe("project-1");
    });
  });
});
