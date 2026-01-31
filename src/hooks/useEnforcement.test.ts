/**
 * @module hooks/useEnforcement.test
 * @description Unit tests for useEnforcement hook
 *
 * PURPOSE:
 * - Test hook status refreshing
 * - Test hook installation with all three modes (warn, block, auto-update)
 * - Test CI snippet loading
 * - Test enforcement event loading
 *
 * PATTERNS:
 * - Mocks Tauri invoke and projectStore
 * - Uses renderHook from testing-library
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useEnforcement } from "./useEnforcement";
import { useProjectStore } from "@/stores/projectStore";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
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

const mockHookStatus = {
  installed: true,
  hookPath: "/test/project/path/.git/hooks/pre-commit",
  mode: "auto-update",
  hasHusky: false,
};

const mockSnippets = [
  {
    provider: "github_actions",
    name: "Documentation Coverage Check",
    description: "Checks that all source files have documentation headers on pull requests.",
    filename: ".github/workflows/doc-check.yml",
    content: "name: Documentation Check\n...",
  },
  {
    provider: "gitlab_ci",
    name: "Documentation Coverage Check",
    description: "Checks documentation headers as part of the GitLab CI pipeline.",
    filename: ".gitlab-ci.yml (add stage)",
    content: "doc-check:\n  stage: test\n...",
  },
];

const mockEvents = [
  {
    id: "event-1",
    projectId: "test-project-id",
    eventType: "block",
    source: "hook",
    message: "Missing doc header in file.ts",
    filePath: "src/file.ts",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "event-2",
    projectId: "test-project-id",
    eventType: "warning",
    source: "hook",
    message: "Missing @module tag",
    filePath: "src/utils.ts",
    createdAt: "2024-01-14T09:00:00Z",
  },
];

describe("useEnforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue(null);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with null hookStatus and empty arrays", () => {
      const { result } = renderHook(() => useEnforcement());

      expect(result.current.hookStatus).toBeNull();
      expect(result.current.snippets).toEqual([]);
      expect(result.current.events).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.installing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("refreshHookStatus", () => {
    it("should fetch hook status and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockHookStatus);

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.refreshHookStatus();
      });

      expect(result.current.hookStatus).toEqual(mockHookStatus);
      expect(result.current.loading).toBe(false);
    });

    it("should call get_hook_status with project path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockHookStatus);

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.refreshHookStatus();
      });

      expect(invoke).toHaveBeenCalledWith("get_hook_status", {
        projectPath: mockProject.path,
      });
    });

    it("should handle errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Not a git repository"));

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.refreshHookStatus();
      });

      expect(result.current.error).toBe("Error: Not a git repository");
      expect(result.current.loading).toBe(false);
    });

    it("should not fetch when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.refreshHookStatus();
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("installHooks", () => {
    it("should install hooks with auto-update mode", async () => {
      vi.mocked(invoke).mockResolvedValue({ ...mockHookStatus, mode: "auto-update" });

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.installHooks("auto-update");
      });

      expect(invoke).toHaveBeenCalledWith("install_git_hooks", {
        projectPath: mockProject.path,
        mode: "auto-update",
      });
      expect(result.current.hookStatus?.mode).toBe("auto-update");
    });

    it("should install hooks with block mode", async () => {
      vi.mocked(invoke).mockResolvedValue({ ...mockHookStatus, mode: "block" });

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.installHooks("block");
      });

      expect(invoke).toHaveBeenCalledWith("install_git_hooks", {
        projectPath: mockProject.path,
        mode: "block",
      });
      expect(result.current.hookStatus?.mode).toBe("block");
    });

    it("should install hooks with warn mode", async () => {
      vi.mocked(invoke).mockResolvedValue({ ...mockHookStatus, mode: "warn" });

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.installHooks("warn");
      });

      expect(invoke).toHaveBeenCalledWith("install_git_hooks", {
        projectPath: mockProject.path,
        mode: "warn",
      });
      expect(result.current.hookStatus?.mode).toBe("warn");
    });

    it("should set installing=true during installation", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useEnforcement());

      act(() => {
        result.current.installHooks("auto-update");
      });

      expect(result.current.installing).toBe(true);

      await act(async () => {
        resolvePromise!(mockHookStatus);
        await pendingPromise;
      });

      expect(result.current.installing).toBe(false);
    });

    it("should handle installation errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Permission denied"));

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.installHooks("block");
      });

      expect(result.current.error).toBe("Error: Permission denied");
      expect(result.current.installing).toBe(false);
    });

    it("should not install when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.installHooks("auto-update");
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("loadSnippets", () => {
    it("should fetch CI snippets and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockSnippets);

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.loadSnippets();
      });

      expect(result.current.snippets).toEqual(mockSnippets);
      expect(result.current.loading).toBe(false);
    });

    it("should call get_ci_snippets with project path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockSnippets);

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.loadSnippets();
      });

      expect(invoke).toHaveBeenCalledWith("get_ci_snippets", {
        projectPath: mockProject.path,
      });
    });

    it("should handle snippet load errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Failed to read project"));

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.loadSnippets();
      });

      expect(result.current.error).toBe("Error: Failed to read project");
    });
  });

  describe("loadEvents", () => {
    it("should fetch enforcement events and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockEvents);

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.loadEvents();
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.loading).toBe(false);
    });

    it("should call get_enforcement_events with project id and limit", async () => {
      vi.mocked(invoke).mockResolvedValue(mockEvents);

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.loadEvents(10);
      });

      expect(invoke).toHaveBeenCalledWith("get_enforcement_events", {
        projectId: mockProject.id,
        limit: 10,
      });
    });

    it("should handle event load errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useEnforcement());

      await act(async () => {
        await result.current.loadEvents();
      });

      expect(result.current.error).toBe("Error: Database error");
    });
  });
});
