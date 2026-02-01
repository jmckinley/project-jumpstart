/**
 * @module hooks/useRalph.test
 * @description Unit tests for useRalph hook context, mistake, and learning functions
 *
 * PURPOSE:
 * - Test loadContext() fetches CLAUDE.md summary and mistakes
 * - Test recordMistake() records mistakes and refreshes context
 * - Test learnPattern() updates CLAUDE.md and refreshes context
 * - Verify error handling for all new functions
 *
 * DEPENDENCIES:
 * - @/hooks/useRalph - Hook under test
 * - @/stores/projectStore - Mocked for activeProject
 * - @/stores/settingsStore - Mocked for hasApiKey
 * - @tauri-apps/api/core - Mocked invoke function
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mock Tauri invoke for IPC calls
 * - Mock stores for project and settings state
 * - Use renderHook and act from testing-library/react
 *
 * CLAUDE NOTES:
 * - Context loading is non-critical (returns null on error, no crash)
 * - recordMistake refreshes context after success
 * - learnPattern calls updateClaudeMdWithPattern then refreshes context
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useRalph } from "./useRalph";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { RalphLoopContext, RalphMistake } from "@/types/ralph";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: vi.fn(),
}));

const mockProject = {
  id: "test-project-id",
  name: "Test Project",
  path: "/test/project/path",
  description: "A test project",
  projectType: "Web App",
  language: "typescript",
  framework: "react",
  database: null,
  testing: "Vitest",
  styling: "Tailwind CSS",
  healthScore: 50,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockContext: RalphLoopContext = {
  claudeMdSummary: "Project Jumpstart is a Tauri app for managing Claude Code best practices.",
  recentMistakes: [
    {
      id: "mistake-1",
      projectId: "test-project-id",
      loopId: "loop-1",
      mistakeType: "implementation",
      description: "Forgot to handle null case in user lookup",
      context: "UserService.getUser()",
      resolution: "Added null check with early return",
      learnedPattern: null,
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "mistake-2",
      projectId: "test-project-id",
      loopId: null,
      mistakeType: "testing",
      description: "Missing error boundary test",
      context: null,
      resolution: null,
      learnedPattern: null,
      createdAt: "2024-01-14T10:00:00Z",
    },
  ],
  projectPatterns: ["Use async/await for all Tauri calls", "Prefer composition over inheritance"],
};

const mockNewMistake: RalphMistake = {
  id: "mistake-3",
  projectId: "test-project-id",
  loopId: "loop-2",
  mistakeType: "logic",
  description: "Off-by-one error in pagination",
  context: "PaginationHelper.getPage()",
  resolution: "Changed <= to <",
  learnedPattern: null,
  createdAt: "2024-01-16T10:00:00Z",
};

describe("useRalph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue([]);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
    vi.mocked(useSettingsStore).mockImplementation((selector) =>
      selector({ hasApiKey: false } as ReturnType<typeof useSettingsStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with null context", () => {
      const { result } = renderHook(() => useRalph());

      expect(result.current.context).toBeNull();
    });

    it("should start with empty loops array", () => {
      const { result } = renderHook(() => useRalph());

      expect(result.current.loops).toEqual([]);
    });

    it("should start with null analysis", () => {
      const { result } = renderHook(() => useRalph());

      expect(result.current.analysis).toBeNull();
    });

    it("should start with loading=false and error=null", () => {
      const { result } = renderHook(() => useRalph());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("loadContext", () => {
    it("should fetch context and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadContext();
      });

      expect(result.current.context).toEqual(mockContext);
    });

    it("should call get_ralph_context with project id and path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadContext();
      });

      expect(invoke).toHaveBeenCalledWith("get_ralph_context", {
        projectId: mockProject.id,
        projectPath: mockProject.path,
      });
    });

    it("should return the loaded context", async () => {
      vi.mocked(invoke).mockResolvedValue(mockContext);

      const { result } = renderHook(() => useRalph());

      let returnedContext: RalphLoopContext | null = null;
      await act(async () => {
        returnedContext = await result.current.loadContext();
      });

      expect(returnedContext).toEqual(mockContext);
    });

    it("should return null gracefully on error without crashing", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useRalph());

      let returnedContext: RalphLoopContext | null = null;
      await act(async () => {
        returnedContext = await result.current.loadContext();
      });

      expect(returnedContext).toBeNull();
      expect(result.current.context).toBeNull();
      // Should not set error state for non-critical context loading
      expect(result.current.error).toBeNull();

      consoleSpy.mockRestore();
    });

    it("should return null when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRalph());

      let returnedContext: RalphLoopContext | null = null;
      await act(async () => {
        returnedContext = await result.current.loadContext();
      });

      expect(returnedContext).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("recordMistake", () => {
    it("should record mistake and return it", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockNewMistake) // recordRalphMistake
        .mockResolvedValueOnce(mockContext); // getRalphContext (refresh)

      const { result } = renderHook(() => useRalph());

      let mistake: RalphMistake | null = null;
      await act(async () => {
        mistake = await result.current.recordMistake(
          "loop-2",
          "logic",
          "Off-by-one error in pagination",
          "PaginationHelper.getPage()",
          "Changed <= to <"
        );
      });

      expect(mistake).toEqual(mockNewMistake);
    });

    it("should call record_ralph_mistake with correct parameters", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockNewMistake)
        .mockResolvedValueOnce(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.recordMistake(
          "loop-2",
          "logic",
          "Off-by-one error",
          "some context",
          "some resolution"
        );
      });

      expect(invoke).toHaveBeenCalledWith("record_ralph_mistake", {
        projectId: mockProject.id,
        loopId: "loop-2",
        mistakeType: "logic",
        description: "Off-by-one error",
        context: "some context",
        resolution: "some resolution",
        learnedPattern: null,
      });
    });

    it("should refresh context after recording", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockNewMistake)
        .mockResolvedValueOnce(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.recordMistake("loop-2", "logic", "Test mistake");
      });

      // Second call should be get_ralph_context to refresh
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(invoke).toHaveBeenNthCalledWith(2, "get_ralph_context", {
        projectId: mockProject.id,
        projectPath: mockProject.path,
      });
    });

    it("should return null when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRalph());

      let mistake: RalphMistake | null = null;
      await act(async () => {
        mistake = await result.current.recordMistake(
          "loop-1",
          "implementation",
          "Test mistake"
        );
      });

      expect(mistake).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });

    it("should set error state on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.recordMistake("loop-1", "implementation", "Test");
      });

      expect(result.current.error).toBe("Database error");
    });

    it("should handle optional parameters", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockNewMistake)
        .mockResolvedValueOnce(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.recordMistake(
          null, // no loop id
          "other",
          "General mistake"
          // no context or resolution
        );
      });

      expect(invoke).toHaveBeenCalledWith("record_ralph_mistake", {
        projectId: mockProject.id,
        loopId: null,
        mistakeType: "other",
        description: "General mistake",
        context: null,
        resolution: null,
        learnedPattern: null,
      });
    });
  });

  describe("learnPattern", () => {
    it("should update CLAUDE.md and return true on success", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // updateClaudeMdWithPattern
        .mockResolvedValueOnce(mockContext); // getRalphContext (refresh)

      const { result } = renderHook(() => useRalph());

      let success = false;
      await act(async () => {
        success = await result.current.learnPattern("Always validate user input before processing");
      });

      expect(success).toBe(true);
    });

    it("should call update_claude_md_with_pattern with pattern", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.learnPattern("Use async/await for all API calls");
      });

      expect(invoke).toHaveBeenCalledWith("update_claude_md_with_pattern", {
        projectPath: mockProject.path,
        pattern: "Use async/await for all API calls",
      });
    });

    it("should refresh context after learning", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockContext);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.learnPattern("New pattern");
      });

      expect(invoke).toHaveBeenCalledTimes(2);
      expect(invoke).toHaveBeenNthCalledWith(2, "get_ralph_context", {
        projectId: mockProject.id,
        projectPath: mockProject.path,
      });
    });

    it("should return false when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRalph());

      let success = true;
      await act(async () => {
        success = await result.current.learnPattern("Test pattern");
      });

      expect(success).toBe(false);
      expect(invoke).not.toHaveBeenCalled();
    });

    it("should set error state on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("File write error"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.learnPattern("Test pattern");
      });

      expect(result.current.error).toBe("File write error");
    });

    it("should return false on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Write error"));

      const { result } = renderHook(() => useRalph());

      let success = true;
      await act(async () => {
        success = await result.current.learnPattern("Test pattern");
      });

      expect(success).toBe(false);
    });
  });
});
