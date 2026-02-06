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

  describe("loadLoops", () => {
    const mockLoops = [
      {
        id: "loop-1",
        projectId: "test-project-id",
        prompt: "Fix the bug",
        enhancedPrompt: null,
        qualityScore: 75,
        status: "completed" as const,
        mode: "iterative" as const,
        iterations: 3,
        outcome: "Success",
        createdAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:30:00Z",
      },
    ];

    it("should load loops and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockLoops);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadLoops();
      });

      expect(result.current.loops).toEqual(mockLoops);
      expect(result.current.loading).toBe(false);
    });

    it("should call list_ralph_loops with project id", async () => {
      vi.mocked(invoke).mockResolvedValue(mockLoops);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadLoops();
      });

      expect(invoke).toHaveBeenCalledWith("list_ralph_loops", {
        projectId: mockProject.id,
      });
    });

    it("should set loading to true during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      vi.mocked(invoke).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useRalph());

      act(() => {
        result.current.loadLoops();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(mockLoops);
      });

      expect(result.current.loading).toBe(false);
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadLoops();
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
    });

    it("should not fetch when no project selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadLoops();
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("loadMistakes", () => {
    const mockMistakes: RalphMistake[] = [
      {
        id: "mistake-1",
        projectId: "test-project-id",
        loopId: "loop-1",
        mistakeType: "implementation",
        description: "Forgot null check",
        context: null,
        resolution: "Added null check",
        learnedPattern: null,
        createdAt: "2024-01-15T10:00:00Z",
      },
    ];

    it("should load mistakes and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockMistakes);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadMistakes();
      });

      expect(result.current.mistakes).toEqual(mockMistakes);
    });

    it("should call list_ralph_mistakes with project id", async () => {
      vi.mocked(invoke).mockResolvedValue(mockMistakes);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadMistakes();
      });

      expect(invoke).toHaveBeenCalledWith("list_ralph_mistakes", {
        projectId: mockProject.id,
      });
    });

    it("should not crash on error (non-critical)", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("DB error"));
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadMistakes();
      });

      // Should not set error state for non-critical mistakes loading
      expect(result.current.error).toBeNull();
      consoleSpy.mockRestore();
    });

    it("should not fetch when no project selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadMistakes();
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("analyzePrompt", () => {
    const mockAnalysis = {
      qualityScore: 85,
      issues: [],
      suggestions: ["Add more context"],
      enhancedPrompt: "Enhanced version of the prompt",
    };

    it("should analyze prompt with heuristics (no AI)", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.analyzePrompt("Fix the bug in user.ts");
      });

      expect(result.current.analysis).toEqual(mockAnalysis);
      expect(invoke).toHaveBeenCalledWith("analyze_ralph_prompt", {
        prompt: "Fix the bug in user.ts",
      });
    });

    it("should set analyzing to true during analysis", async () => {
      let resolvePromise: (value: unknown) => void;
      vi.mocked(invoke).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useRalph());

      act(() => {
        result.current.analyzePrompt("Test prompt");
      });

      expect(result.current.analyzing).toBe(true);

      await act(async () => {
        resolvePromise!(mockAnalysis);
      });

      expect(result.current.analyzing).toBe(false);
    });

    it("should use AI analysis when useAi=true and API key available", async () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) =>
        selector({ hasApiKey: true } as ReturnType<typeof useSettingsStore.getState>)
      );
      vi.mocked(invoke)
        .mockResolvedValueOnce([{ path: "src/test.ts" }]) // scanModules
        .mockResolvedValueOnce(mockAnalysis); // analyzeRalphPromptWithAi

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.analyzePrompt("Fix the bug", true);
      });

      // Verify AI analysis was called (second call after scanModules)
      expect(invoke).toHaveBeenCalledWith("analyze_ralph_prompt_with_ai", {
        prompt: "Fix the bug",
        projectName: mockProject.name,
        projectLanguage: mockProject.language,
        projectFramework: mockProject.framework,
        projectFiles: ["src/test.ts"],
      });
    });

    it("should fall back to heuristic when AI unavailable", async () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) =>
        selector({ hasApiKey: false } as ReturnType<typeof useSettingsStore.getState>)
      );
      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.analyzePrompt("Fix the bug", true); // useAi=true but no key
      });

      expect(invoke).toHaveBeenCalledWith("analyze_ralph_prompt", {
        prompt: "Fix the bug",
      });
    });

    it("should return the analysis result", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => useRalph());

      let analysis;
      await act(async () => {
        analysis = await result.current.analyzePrompt("Test prompt");
      });

      expect(analysis).toEqual(mockAnalysis);
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Analysis failed"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.analyzePrompt("Test prompt");
      });

      expect(result.current.error).toBe("Analysis failed");
      expect(result.current.analyzing).toBe(false);
    });

    it("should return null on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Analysis failed"));

      const { result } = renderHook(() => useRalph());

      let analysis;
      await act(async () => {
        analysis = await result.current.analyzePrompt("Test prompt");
      });

      expect(analysis).toBeNull();
    });
  });

  describe("startLoop", () => {
    const mockLoop = {
      id: "loop-new",
      projectId: "test-project-id",
      prompt: "Fix the bug",
      enhancedPrompt: null,
      qualityScore: 0,
      status: "running" as const,
      mode: "iterative" as const,
      iterations: 0,
      outcome: null,
      createdAt: "2024-01-16T10:00:00Z",
      completedAt: null,
    };

    it("should start a loop and add to state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockLoop);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.startLoop("Fix the bug");
      });

      expect(result.current.loops).toContainEqual(mockLoop);
    });

    it("should call start_ralph_loop with prompt and analysis data", async () => {
      vi.mocked(invoke).mockResolvedValue(mockLoop);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.startLoop("Fix the bug");
      });

      expect(invoke).toHaveBeenCalledWith("start_ralph_loop", {
        projectId: mockProject.id,
        prompt: "Fix the bug",
        enhancedPrompt: null,
        qualityScore: 0,
      });
    });

    it("should set loading during start", async () => {
      let resolvePromise: (value: unknown) => void;
      vi.mocked(invoke).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useRalph());

      act(() => {
        result.current.startLoop("Test");
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(mockLoop);
      });

      expect(result.current.loading).toBe(false);
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Start failed"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.startLoop("Test");
      });

      expect(result.current.error).toBe("Start failed");
    });

    it("should not start when no project selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.startLoop("Test");
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("startLoopPrd", () => {
    const mockPrdLoop = {
      id: "loop-prd",
      projectId: "test-project-id",
      prompt: "PRD: My Feature",
      enhancedPrompt: null,
      qualityScore: 0,
      status: "running" as const,
      mode: "prd" as const,
      iterations: 0,
      outcome: null,
      createdAt: "2024-01-16T10:00:00Z",
      completedAt: null,
    };

    it("should start a PRD loop", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPrdLoop);

      const { result } = renderHook(() => useRalph());
      const prdJson = JSON.stringify({ name: "Feature", stories: [] });

      await act(async () => {
        await result.current.startLoopPrd(prdJson);
      });

      expect(result.current.loops).toContainEqual(mockPrdLoop);
    });

    it("should call start_ralph_loop_prd with PRD JSON", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPrdLoop);

      const { result } = renderHook(() => useRalph());
      const prdJson = JSON.stringify({ name: "Feature", stories: [{ id: "1", title: "Story 1" }] });

      await act(async () => {
        await result.current.startLoopPrd(prdJson);
      });

      expect(invoke).toHaveBeenCalledWith("start_ralph_loop_prd", {
        projectId: mockProject.id,
        prdJson,
      });
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("PRD start failed"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.startLoopPrd("{}");
      });

      expect(result.current.error).toBe("PRD start failed");
    });
  });

  describe("pauseLoop", () => {
    it("should pause a loop and update status", async () => {
      const runningLoop = {
        id: "loop-1",
        projectId: "test-project-id",
        prompt: "Test",
        enhancedPrompt: null,
        qualityScore: 0,
        status: "running" as const,
        mode: "iterative" as const,
        iterations: 1,
        outcome: null,
        createdAt: "2024-01-16T10:00:00Z",
        completedAt: null,
      };

      vi.mocked(invoke)
        .mockResolvedValueOnce([runningLoop]) // loadLoops
        .mockResolvedValueOnce(undefined); // pauseRalphLoop

      const { result } = renderHook(() => useRalph());

      // First load the loop
      await act(async () => {
        await result.current.loadLoops();
      });

      // Then pause it
      await act(async () => {
        await result.current.pauseLoop("loop-1");
      });

      expect(result.current.loops[0].status).toBe("paused");
    });

    it("should call pause_ralph_loop with loop id", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.pauseLoop("loop-123");
      });

      expect(invoke).toHaveBeenCalledWith("pause_ralph_loop", {
        loopId: "loop-123",
      });
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Pause failed"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.pauseLoop("loop-1");
      });

      expect(result.current.error).toBe("Pause failed");
    });
  });

  describe("resumeLoop", () => {
    it("should resume a loop and update status", async () => {
      const pausedLoop = {
        id: "loop-1",
        projectId: "test-project-id",
        prompt: "Test",
        enhancedPrompt: null,
        qualityScore: 0,
        status: "paused" as const,
        mode: "iterative" as const,
        iterations: 1,
        outcome: null,
        createdAt: "2024-01-16T10:00:00Z",
        completedAt: null,
      };

      vi.mocked(invoke)
        .mockResolvedValueOnce([pausedLoop])
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadLoops();
      });

      await act(async () => {
        await result.current.resumeLoop("loop-1");
      });

      expect(result.current.loops[0].status).toBe("running");
    });

    it("should call resume_ralph_loop with loop id", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.resumeLoop("loop-456");
      });

      expect(invoke).toHaveBeenCalledWith("resume_ralph_loop", {
        loopId: "loop-456",
      });
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Resume failed"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.resumeLoop("loop-1");
      });

      expect(result.current.error).toBe("Resume failed");
    });
  });

  describe("killLoop", () => {
    it("should kill a loop and update status to failed", async () => {
      const runningLoop = {
        id: "loop-1",
        projectId: "test-project-id",
        prompt: "Test",
        enhancedPrompt: null,
        qualityScore: 0,
        status: "running" as const,
        mode: "iterative" as const,
        iterations: 1,
        outcome: null,
        createdAt: "2024-01-16T10:00:00Z",
        completedAt: null,
      };

      vi.mocked(invoke)
        .mockResolvedValueOnce([runningLoop])
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.loadLoops();
      });

      await act(async () => {
        await result.current.killLoop("loop-1");
      });

      expect(result.current.loops[0].status).toBe("failed");
      expect(result.current.loops[0].outcome).toBe("Killed by user");
    });

    it("should call kill_ralph_loop with loop id", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.killLoop("loop-789");
      });

      expect(invoke).toHaveBeenCalledWith("kill_ralph_loop", {
        loopId: "loop-789",
      });
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Kill failed"));

      const { result } = renderHook(() => useRalph());

      await act(async () => {
        await result.current.killLoop("loop-1");
      });

      expect(result.current.error).toBe("Kill failed");
    });
  });

  describe("clearAnalysis", () => {
    it("should clear analysis state", async () => {
      const mockAnalysis = {
        qualityScore: 85,
        issues: [],
        suggestions: [],
        enhancedPrompt: null,
      };
      vi.mocked(invoke).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => useRalph());

      // First set analysis
      await act(async () => {
        await result.current.analyzePrompt("Test");
      });

      expect(result.current.analysis).not.toBeNull();

      // Then clear it
      act(() => {
        result.current.clearAnalysis();
      });

      expect(result.current.analysis).toBeNull();
    });
  });
});
