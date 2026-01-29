/**
 * @module hooks/useClaudeMd.test
 * @description Unit tests for useClaudeMd hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useClaudeMd } from "./useClaudeMd";
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

const mockClaudeMdInfo = {
  exists: true,
  content: "# Test Project\n\nThis is a test.",
  tokenEstimate: 10,
  path: "/test/project/path/CLAUDE.md",
};

describe("useClaudeMd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset invoke to a default resolved value to prevent test pollution
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue(mockClaudeMdInfo);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with default values", () => {
      const { result } = renderHook(() => useClaudeMd());

      expect(result.current.exists).toBe(false);
      expect(result.current.content).toBe("");
      expect(result.current.tokenEstimate).toBe(0);
      expect(result.current.filePath).toBe("");
      expect(result.current.loading).toBe(false);
      expect(result.current.saving).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("loadContent", () => {
    it("should load CLAUDE.md content", async () => {
      vi.mocked(invoke).mockResolvedValue(mockClaudeMdInfo);

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.loadContent();
      });

      expect(result.current.exists).toBe(true);
      expect(result.current.content).toBe(mockClaudeMdInfo.content);
      expect(result.current.tokenEstimate).toBe(10);
      expect(result.current.filePath).toBe(mockClaudeMdInfo.path);
    });

    it("should call read_claude_md with project path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockClaudeMdInfo);

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.loadContent();
      });

      expect(invoke).toHaveBeenCalledWith("read_claude_md", {
        projectPath: mockProject.path,
      });
    });

    it("should set loading=true during load", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useClaudeMd());

      // Start loading but don't await
      act(() => {
        result.current.loadContent();
      });

      // Check loading is true immediately after starting
      expect(result.current.loading).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolvePromise!(mockClaudeMdInfo);
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it("should handle load errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("File not found"));

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.loadContent();
      });

      expect(result.current.error).toBe("File not found");
      expect(result.current.loading).toBe(false);
    });

    it("should not load when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.loadContent();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it("should handle non-existent CLAUDE.md", async () => {
      vi.mocked(invoke).mockResolvedValue({
        exists: false,
        content: "",
        tokenEstimate: 0,
        path: "/test/project/path/CLAUDE.md",
      });

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.loadContent();
      });

      expect(result.current.exists).toBe(false);
      expect(result.current.content).toBe("");
    });
  });

  describe("saveContent", () => {
    it("should save content and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useClaudeMd());

      const newContent = "# Updated Content\n\nNew documentation.";

      await act(async () => {
        await result.current.saveContent(newContent);
      });

      expect(result.current.exists).toBe(true);
      expect(result.current.content).toBe(newContent);
      expect(result.current.tokenEstimate).toBe(Math.ceil(newContent.length / 4));
    });

    it("should call write_claude_md with correct params", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useClaudeMd());

      const newContent = "# Test";

      await act(async () => {
        await result.current.saveContent(newContent);
      });

      expect(invoke).toHaveBeenCalledWith("write_claude_md", {
        projectPath: mockProject.path,
        content: newContent,
      });
    });

    it("should set saving=true during save", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useClaudeMd());

      // Start saving but don't await
      act(() => {
        result.current.saveContent("test");
      });

      // Check saving is true immediately after starting
      expect(result.current.saving).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolvePromise!(undefined);
        await pendingPromise;
      });

      expect(result.current.saving).toBe(false);
    });

    it("should handle save errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Permission denied"));

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.saveContent("test");
      });

      expect(result.current.error).toBe("Permission denied");
      expect(result.current.saving).toBe(false);
    });
  });

  describe("generate", () => {
    it("should generate new content and return it", async () => {
      const generatedContent = "# Generated CLAUDE.md\n\nAuto-generated content.";
      vi.mocked(invoke).mockResolvedValue(generatedContent);

      const { result } = renderHook(() => useClaudeMd());

      let content;
      await act(async () => {
        content = await result.current.generate();
      });

      expect(content).toBe(generatedContent);
    });

    it("should call generate_claude_md with project id", async () => {
      vi.mocked(invoke).mockResolvedValue("# Generated");

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.generate();
      });

      expect(invoke).toHaveBeenCalledWith("generate_claude_md", {
        projectId: mockProject.id,
      });
    });

    it("should NOT auto-save generated content", async () => {
      const generatedContent = "# Generated";
      vi.mocked(invoke).mockResolvedValue(generatedContent);

      const { result } = renderHook(() => useClaudeMd());

      await act(async () => {
        await result.current.generate();
      });

      // Content should not be updated in state
      expect(result.current.content).toBe("");
      // Only generate_claude_md should be called, not write_claude_md
      expect(invoke).toHaveBeenCalledTimes(1);
      expect(invoke).toHaveBeenCalledWith("generate_claude_md", expect.any(Object));
    });

    it("should return null on error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Generation failed"));

      const { result } = renderHook(() => useClaudeMd());

      let content;
      await act(async () => {
        content = await result.current.generate();
      });

      expect(content).toBeNull();
      expect(result.current.error).toBe("Generation failed");
    });

    it("should return null when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useClaudeMd());

      let content;
      await act(async () => {
        content = await result.current.generate();
      });

      expect(content).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });
  });
});
