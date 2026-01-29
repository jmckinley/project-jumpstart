/**
 * @module hooks/useRefreshDocs.test
 * @description Unit tests for useRefreshDocs hook
 *
 * PURPOSE:
 * - Test initial state and stale file scanning
 * - Test refreshAll success flow
 * - Test refreshAll error handling
 * - Verify proper state transitions
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - renderHook utility
 * - @/hooks/useRefreshDocs - Hook under test
 * - @/stores/projectStore - Mocked for active project
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mock Tauri invoke calls with vi.mocked()
 * - Use renderHook from testing-library for hook testing
 * - Test both success and error paths
 *
 * CLAUDE NOTES:
 * - Each test should reset mocks with vi.clearAllMocks()
 * - waitFor is used to handle async state updates
 * - Mock project store before each test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useRefreshDocs } from "./useRefreshDocs";
import { useProjectStore } from "@/stores/projectStore";

// Mock the project store
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

describe("useRefreshDocs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: project is selected
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with refreshing=false and zero counts", async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      const { result } = renderHook(() => useRefreshDocs());

      expect(result.current.refreshing).toBe(false);

      await waitFor(() => {
        expect(result.current.staleCount).toBe(0);
        expect(result.current.missingCount).toBe(0);
      });
    });

    it("should calculate totalToRefresh as staleCount + missingCount + 1", async () => {
      vi.mocked(invoke).mockResolvedValue([
        { path: "src/file1.ts", status: "outdated", freshnessScore: 50 },
        { path: "src/file2.ts", status: "missing", freshnessScore: 0 },
        { path: "src/file3.ts", status: "missing", freshnessScore: 0 },
      ]);

      const { result } = renderHook(() => useRefreshDocs());

      await waitFor(() => {
        expect(result.current.staleCount).toBe(1);
        expect(result.current.missingCount).toBe(2);
        expect(result.current.totalToRefresh).toBe(4); // 1 + 2 + 1 for CLAUDE.md
      });
    });
  });

  describe("scanForStaleFiles", () => {
    it("should call getStaleFiles and update counts", async () => {
      vi.mocked(invoke).mockResolvedValue([
        { path: "src/a.ts", status: "outdated", freshnessScore: 40 },
        { path: "src/b.ts", status: "outdated", freshnessScore: 30 },
      ]);

      const { result } = renderHook(() => useRefreshDocs());

      await waitFor(() => {
        expect(result.current.staleCount).toBe(2);
        expect(result.current.missingCount).toBe(0);
      });

      expect(invoke).toHaveBeenCalledWith("get_stale_files", {
        projectPath: mockProject.path,
      });
    });

    it("should handle errors gracefully and set counts to 0", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useRefreshDocs());

      await waitFor(() => {
        expect(result.current.staleCount).toBe(0);
        expect(result.current.missingCount).toBe(0);
      });
    });

    it("should not call API when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      renderHook(() => useRefreshDocs());

      // Wait a tick to ensure no calls were made
      await new Promise((r) => setTimeout(r, 10));

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("refreshAll", () => {
    it("should regenerate CLAUDE.md and batch generate stale docs", async () => {
      const staleFiles = [
        { path: "src/file1.ts", status: "outdated", freshnessScore: 50 },
        { path: "src/file2.ts", status: "missing", freshnessScore: 0 },
      ];

      vi.mocked(invoke)
        .mockResolvedValueOnce(staleFiles) // Initial scan
        .mockResolvedValueOnce("# Generated CLAUDE.md") // generateClaudeMd
        .mockResolvedValueOnce(undefined) // writeClaudeMd
        .mockResolvedValueOnce(staleFiles) // getStaleFiles for refresh
        .mockResolvedValueOnce([]) // batchGenerateDocs
        .mockResolvedValueOnce({ id: "1", projectId: mockProject.id, activityType: "generate", message: "test", createdAt: "" }) // logActivity
        .mockResolvedValueOnce([]); // Final scan

      const { result } = renderHook(() => useRefreshDocs());

      await waitFor(() => {
        expect(result.current.staleCount).toBe(1);
      });

      let refreshResult: { claudeMd: boolean; modules: number } | undefined;
      await act(async () => {
        refreshResult = await result.current.refreshAll();
      });

      expect(refreshResult).toEqual({ claudeMd: true, modules: 2 });
      expect(invoke).toHaveBeenCalledWith("generate_claude_md", { projectId: mockProject.id });
      expect(invoke).toHaveBeenCalledWith("write_claude_md", {
        projectPath: mockProject.path,
        content: "# Generated CLAUDE.md",
      });
      expect(invoke).toHaveBeenCalledWith("batch_generate_docs", {
        filePaths: [
          `${mockProject.path}/src/file1.ts`,
          `${mockProject.path}/src/file2.ts`,
        ],
        projectPath: mockProject.path,
      });
    });

    it("should throw error when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useRefreshDocs());

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.refreshAll();
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error?.message).toBe("No active project");
    });

    it("should log activity after successful refresh", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([]) // Initial scan
        .mockResolvedValueOnce("# CLAUDE.md") // generateClaudeMd
        .mockResolvedValueOnce(undefined) // writeClaudeMd
        .mockResolvedValueOnce([]) // getStaleFiles (empty)
        .mockResolvedValueOnce({ id: "1", projectId: mockProject.id, activityType: "generate", message: "test", createdAt: "" }) // logActivity
        .mockResolvedValueOnce([]); // Final scan

      const { result } = renderHook(() => useRefreshDocs());

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(invoke).toHaveBeenCalledWith("log_activity", {
        projectId: mockProject.id,
        activityType: "generate",
        message: "Refreshed CLAUDE.md and 0 module docs",
      });
    });

    it("should reset refreshing=false even on error", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([]) // Initial scan
        .mockRejectedValueOnce(new Error("API failure")); // generateClaudeMd fails

      const { result } = renderHook(() => useRefreshDocs());

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });

      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.refreshAll();
        } catch (e) {
          error = e as Error;
        }
      });

      expect(error?.message).toBe("API failure");
      expect(result.current.refreshing).toBe(false);
    });
  });
});
