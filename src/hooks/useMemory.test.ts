/**
 * @module hooks/useMemory.test
 * @description Unit tests for useMemory hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMemory } from "./useMemory";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) =>
    selector({
      activeProject: { id: "proj-1", name: "Test", path: "/test/project" },
    }),
  ),
}));

vi.mock("@/stores/toastStore", () => ({
  useToastStore: vi.fn((selector) =>
    selector({
      addToast: vi.fn(),
    }),
  ),
}));

const mockListMemorySources = vi.fn().mockResolvedValue([]);
const mockListLearnings = vi.fn().mockResolvedValue([]);
const mockUpdateLearningStatus = vi.fn().mockResolvedValue({ id: "l1", status: "verified" });
const mockAnalyzeClaudeMd = vi.fn().mockResolvedValue({
  totalLines: 100,
  estimatedTokens: 2500,
  score: 80,
  sections: [],
  suggestions: [],
  linesToRemove: [],
  linesToMove: [],
});
const mockGetMemoryHealth = vi.fn().mockResolvedValue({ healthRating: "good" });
const mockPromoteLearning = vi.fn().mockResolvedValue(undefined);
const mockReadClaudeMd = vi.fn().mockResolvedValue({ content: "line1\nline2\nline3\nline4\nline5", exists: true });
const mockWriteClaudeMd = vi.fn().mockResolvedValue(undefined);
const mockAppendToProjectFile = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/tauri", () => ({
  listMemorySources: (...args: unknown[]) => mockListMemorySources(...args),
  listLearnings: (...args: unknown[]) => mockListLearnings(...args),
  updateLearningStatus: (...args: unknown[]) => mockUpdateLearningStatus(...args),
  analyzeClaudeMd: (...args: unknown[]) => mockAnalyzeClaudeMd(...args),
  getMemoryHealth: (...args: unknown[]) => mockGetMemoryHealth(...args),
  promoteLearning: (...args: unknown[]) => mockPromoteLearning(...args),
  readClaudeMd: (...args: unknown[]) => mockReadClaudeMd(...args),
  writeClaudeMd: (...args: unknown[]) => mockWriteClaudeMd(...args),
  appendToProjectFile: (...args: unknown[]) => mockAppendToProjectFile(...args),
}));

describe("useMemory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return initial state", () => {
    const { result } = renderHook(() => useMemory());
    expect(result.current.sources).toEqual([]);
    expect(result.current.learnings).toEqual([]);
    expect(result.current.health).toBeNull();
    expect(result.current.analysis).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.analyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should expose applyRemoval and applyMove", () => {
    const { result } = renderHook(() => useMemory());
    expect(typeof result.current.applyRemoval).toBe("function");
    expect(typeof result.current.applyMove).toBe("function");
  });

  describe("applyRemoval", () => {
    it("should read CLAUDE.md, remove specified lines, write back, and re-analyze", async () => {
      mockReadClaudeMd.mockResolvedValue({ content: "line1\nline2\nline3\nline4\nline5", exists: true });

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.applyRemoval([2, 4]);
      });

      expect(mockReadClaudeMd).toHaveBeenCalledWith("/test/project");
      expect(mockWriteClaudeMd).toHaveBeenCalledWith("/test/project", "line1\nline3\nline5");
      expect(mockAnalyzeClaudeMd).toHaveBeenCalledWith("/test/project");
    });

    it("should set error on failure", async () => {
      mockReadClaudeMd.mockRejectedValue(new Error("read failed"));

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.applyRemoval([1]);
      });

      expect(result.current.error).toBe("Error: read failed");
    });
  });

  describe("applyMove", () => {
    it("should extract lines from CLAUDE.md, write remaining, append to target, and re-analyze", async () => {
      mockReadClaudeMd.mockResolvedValue({ content: "line1\nline2\nline3\nline4\nline5", exists: true });

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.applyMove([2, 4], ".claude/rules/test.md");
      });

      expect(mockReadClaudeMd).toHaveBeenCalledWith("/test/project");
      // Lines 2-4 removed, lines 1 and 5 remain
      expect(mockWriteClaudeMd).toHaveBeenCalledWith("/test/project", "line1\nline5");
      // Lines 2-4 appended to target
      expect(mockAppendToProjectFile).toHaveBeenCalledWith(
        "/test/project",
        ".claude/rules/test.md",
        "\nline2\nline3\nline4\n",
      );
      expect(mockAnalyzeClaudeMd).toHaveBeenCalledWith("/test/project");
    });

    it("should set error on failure", async () => {
      mockReadClaudeMd.mockRejectedValue(new Error("read failed"));

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.applyMove([1, 3], ".claude/rules/test.md");
      });

      expect(result.current.error).toBe("Error: read failed");
    });
  });

  describe("runAnalysis", () => {
    it("should call analyzeClaudeMd and set analysis", async () => {
      const analysisData = {
        totalLines: 100,
        estimatedTokens: 2500,
        score: 80,
        sections: ["Overview"],
        suggestions: [],
        linesToRemove: [],
        linesToMove: [],
      };
      mockAnalyzeClaudeMd.mockResolvedValue(analysisData);

      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.runAnalysis();
      });

      expect(mockAnalyzeClaudeMd).toHaveBeenCalledWith("/test/project");
      expect(result.current.analysis).toEqual(analysisData);
    });
  });

  describe("refresh", () => {
    it("should load sources, learnings, and health in parallel", async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockListMemorySources).toHaveBeenCalledWith("/test/project");
      expect(mockListLearnings).toHaveBeenCalledWith("/test/project");
      expect(mockGetMemoryHealth).toHaveBeenCalledWith("/test/project");
    });
  });
});
