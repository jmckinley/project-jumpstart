/**
 * @module hooks/useHealth.test
 * @description Unit tests for useHealth hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useHealth } from "./useHealth";
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

const mockHealthScore = {
  total: 75,
  components: {
    claudeMd: 20,
    moduleDocs: 15,
    freshness: 12,
    skills: 10,
    context: 7,
    enforcement: 7,
    tests: 0,
    performance: 4,
  },
  quickWins: [
    { title: "Add CLAUDE.md", description: "Create project documentation", impact: 25 },
    { title: "Document modules", description: "Add module headers", impact: 15 },
  ],
  contextRotRisk: "low" as const,
};

describe("useHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset invoke to a default resolved value to prevent test pollution
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue(mockHealthScore);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with default values", () => {
      vi.mocked(invoke).mockResolvedValue(mockHealthScore);

      const { result } = renderHook(() => useHealth());

      expect(result.current.score).toBe(0);
      expect(result.current.components).toBeNull();
      expect(result.current.quickWins).toEqual([]);
      expect(result.current.contextRotRisk).toBe("low");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("refresh", () => {
    it("should fetch health score and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockHealthScore);

      const { result } = renderHook(() => useHealth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.score).toBe(75);
      expect(result.current.components).toEqual(mockHealthScore.components);
      expect(result.current.quickWins).toEqual(mockHealthScore.quickWins);
      expect(result.current.contextRotRisk).toBe("low");
    });

    it("should call get_health_score with project path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockHealthScore);

      const { result } = renderHook(() => useHealth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(invoke).toHaveBeenCalledWith("get_health_score", {
        projectPath: mockProject.path,
      });
    });

    it("should set loading=true during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useHealth());

      // Start loading but don't await
      act(() => {
        result.current.refresh();
      });

      // Check loading is true immediately after starting
      expect(result.current.loading).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolvePromise!(mockHealthScore);
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useHealth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
    });

    it("should not fetch when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useHealth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it("should update contextRotRisk based on response", async () => {
      vi.mocked(invoke).mockResolvedValue({
        ...mockHealthScore,
        contextRotRisk: "high",
      });

      const { result } = renderHook(() => useHealth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.contextRotRisk).toBe("high");
    });
  });
});
