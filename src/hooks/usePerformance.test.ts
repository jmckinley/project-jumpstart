/**
 * @module hooks/usePerformance.test
 * @description Unit tests for usePerformance hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { usePerformance } from "./usePerformance";
import { useProjectStore } from "@/stores/projectStore";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

vi.mock("@/stores/toastStore", () => ({
  useToastStore: vi.fn((selector) =>
    selector({ addToast: vi.fn() })
  ),
}));

const mockProject = {
  id: "test-project-id",
  name: "Test Project",
  path: "/test/project/path",
  description: "A test project",
  projectType: "Web App",
  language: "TypeScript",
  framework: "React",
  database: null,
  testing: "Vitest",
  styling: "Tailwind CSS",
  stackExtras: null,
  healthScore: 50,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockReview = {
  id: "review-1",
  projectId: "test-project-id",
  overallScore: 85,
  components: {
    queryPatterns: 18,
    rendering: 17,
    memory: 15,
    bundle: 12,
    caching: 13,
    apiDesign: 10,
  },
  issues: [
    {
      id: "issue-1",
      category: "rendering",
      severity: "warning" as const,
      title: "Inline handlers",
      description: "Multiple inline handlers found",
      filePath: "src/App.tsx",
      lineNumber: 10,
      suggestion: "Use useCallback",
    },
  ],
  architectureFindings: [
    {
      id: "finding-1",
      category: "caching",
      status: "good" as const,
      title: "Client caching",
      description: "Using React Query",
      recommendation: "",
    },
  ],
  createdAt: "2024-01-01T00:00:00Z",
};

describe("usePerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with default values", () => {
      const { result } = renderHook(() => usePerformance());

      expect(result.current.review).toBeNull();
      expect(result.current.history).toEqual([]);
      expect(result.current.analyzing).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.remediating).toBe(false);
      expect(result.current.remediationProgress).toBeNull();
      expect(result.current.remediationResult).toBeNull();
    });
  });

  describe("analyze", () => {
    it("should call analyze_performance and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockReview);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.analyze();
      });

      expect(invoke).toHaveBeenCalledWith("analyze_performance", {
        projectPath: mockProject.path,
      });
      expect(result.current.review).toEqual(mockReview);
      expect(result.current.history).toContainEqual(mockReview);
      expect(result.current.analyzing).toBe(false);
    });

    it("should set analyzing=true during analysis", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => usePerformance());

      act(() => {
        result.current.analyze();
      });

      expect(result.current.analyzing).toBe(true);

      await act(async () => {
        resolvePromise!(mockReview);
        await pendingPromise;
      });

      expect(result.current.analyzing).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Analysis failed"));

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.analyze();
      });

      expect(result.current.error).toBe("Analysis failed");
      expect(result.current.analyzing).toBe(false);
    });

    it("should not analyze when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.analyze();
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("loadHistory", () => {
    it("should fetch review history", async () => {
      vi.mocked(invoke).mockResolvedValue([mockReview]);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(invoke).toHaveBeenCalledWith("list_performance_reviews", {
        projectId: mockProject.id,
      });
      expect(result.current.history).toEqual([mockReview]);
      expect(result.current.review).toEqual(mockReview);
    });

    it("should set loading state during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => usePerformance());

      act(() => {
        result.current.loadHistory();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!([]);
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it("should handle empty history", async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.history).toEqual([]);
    });
  });

  describe("deleteReview", () => {
    it("should delete a review and remove from history", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([mockReview]) // loadHistory
        .mockResolvedValueOnce(undefined); // deleteReview

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.history).toHaveLength(1);

      await act(async () => {
        await result.current.deleteReview("review-1");
      });

      expect(result.current.history).toHaveLength(0);
    });

    it("should clear current review if deleted", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce([mockReview])
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.loadHistory();
      });

      expect(result.current.review).toEqual(mockReview);

      await act(async () => {
        await result.current.deleteReview("review-1");
      });

      expect(result.current.review).toBeNull();
    });

    it("should handle delete errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.deleteReview("review-1");
      });

      expect(result.current.error).toBe("Delete failed");
    });
  });

  describe("remediate", () => {
    const mockIssues = [
      {
        id: "issue-1",
        category: "rendering",
        severity: "warning" as const,
        title: "Inline handlers",
        description: "Multiple inline handlers",
        filePath: "src/App.tsx",
        lineNumber: 10,
        suggestion: "Use useCallback",
      },
      {
        id: "issue-2",
        category: "query-patterns",
        severity: "critical" as const,
        title: "N+1 query",
        description: "Query in loop",
        filePath: "src/api/users.ts",
        lineNumber: 42,
        suggestion: "Batch queries",
      },
      {
        id: "issue-3",
        category: "memory",
        severity: "info" as const,
        title: "No file path",
        description: "General concern",
        filePath: null,
        lineNumber: null,
        suggestion: "N/A",
      },
    ];

    it("should call per-file command for each unique file", async () => {
      vi.mocked(invoke).mockResolvedValue([
        { issueId: "issue-1", filePath: "src/App.tsx", status: "fixed", message: "OK" },
      ]);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.remediate(mockIssues);
      });

      // Should call remediate_performance_file for 2 files (issue-3 has no filePath)
      const remediateCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "remediate_performance_file"
      );
      expect(remediateCalls).toHaveLength(2);
    });

    it("should set remediating=true during processing", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => usePerformance());

      act(() => {
        result.current.remediate([mockIssues[0]]);
      });

      expect(result.current.remediating).toBe(true);

      await act(async () => {
        resolvePromise!([
          { issueId: "issue-1", filePath: "src/App.tsx", status: "fixed", message: "OK" },
        ]);
        await pendingPromise;
      });

      expect(result.current.remediating).toBe(false);
    });

    it("should build summary from results", async () => {
      vi.mocked(invoke).mockResolvedValue([
        { issueId: "issue-1", filePath: "src/App.tsx", status: "fixed", message: "OK" },
      ]);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.remediate([mockIssues[0]]);
      });

      expect(result.current.remediationResult).not.toBeNull();
      expect(result.current.remediationResult!.fixed).toBe(1);
      expect(result.current.remediationResult!.total).toBe(1);
    });

    it("should handle per-file errors gracefully", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("API failed"));

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.remediate([mockIssues[0]]);
      });

      expect(result.current.remediationResult).not.toBeNull();
      expect(result.current.remediationResult!.failed).toBe(1);
      expect(result.current.remediating).toBe(false);
    });

    it("should skip issues without filePath", async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.remediate([mockIssues[2]]);
      });

      // No IPC calls since the only issue has no filePath
      expect(invoke).not.toHaveBeenCalled();
    });

    it("should clear remediation result", async () => {
      vi.mocked(invoke).mockResolvedValue([
        { issueId: "issue-1", filePath: "src/App.tsx", status: "fixed", message: "OK" },
      ]);

      const { result } = renderHook(() => usePerformance());

      await act(async () => {
        await result.current.remediate([mockIssues[0]]);
      });

      expect(result.current.remediationResult).not.toBeNull();

      act(() => {
        result.current.clearRemediationResult();
      });

      expect(result.current.remediationResult).toBeNull();
    });
  });
});
