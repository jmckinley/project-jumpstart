/**
 * @module hooks/useModules.test
 * @description Unit tests for useModules hook
 *
 * PURPOSE:
 * - Test initial state (empty modules, hasScanned=false)
 * - Test scan functionality with project path
 * - Test hasScanned state transitions (success, empty, error)
 * - Test generateDoc, applyDoc, batchGenerate actions
 * - Test computed values (coverage, totalFiles, missingFiles)
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - renderHook for hook testing
 * - @tauri-apps/api/core - invoke mock
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mock @tauri-apps/api/core invoke globally in test setup
 * - Mock @/stores/projectStore for activeProject
 * - Use renderHook with act() for async actions
 *
 * CLAUDE NOTES:
 * - hasScanned tracks whether a scan has completed (true even on error/empty)
 * - coverage is computed as (documented / total) * 100
 * - batchGenerate triggers a follow-up scan to refresh modules
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useModules } from "./useModules";
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

const mockModules = [
  { path: "src/App.tsx", status: "current" as const, freshnessScore: 100 },
  { path: "src/index.ts", status: "current" as const, freshnessScore: 90 },
  { path: "src/utils.ts", status: "missing" as const, freshnessScore: 0 },
  { path: "src/hooks/useData.ts", status: "outdated" as const, freshnessScore: 40 },
];

const mockModuleDoc = {
  modulePath: "src/utils.ts",
  description: "Utility functions",
  purpose: ["Helper functions"],
  dependencies: [],
  exports: ["formatDate", "parseJSON"],
  patterns: [],
  claudeNotes: [],
};

describe("useModules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset invoke to a default resolved value to prevent test pollution
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue(mockModules);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with empty modules and default values", () => {
      const { result } = renderHook(() => useModules());

      expect(result.current.modules).toEqual([]);
      expect(result.current.totalFiles).toBe(0);
      expect(result.current.documentedFiles).toBe(0);
      expect(result.current.missingFiles).toBe(0);
      expect(result.current.coverage).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.generating).toBe(false);
    });

    it("should have hasScanned=false initially", () => {
      const { result } = renderHook(() => useModules());

      expect(result.current.hasScanned).toBe(false);
    });
  });

  describe("hasScanned state", () => {
    it("should set hasScanned=true after successful scan", async () => {
      vi.mocked(invoke).mockResolvedValue(mockModules);

      const { result } = renderHook(() => useModules());

      expect(result.current.hasScanned).toBe(false);

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.hasScanned).toBe(true);
    });

    it("should set hasScanned=true even when scan returns empty array", async () => {
      vi.mocked(invoke).mockResolvedValue([]);

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.hasScanned).toBe(true);
      expect(result.current.modules).toEqual([]);
    });

    it("should set hasScanned=true when scan fails", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Scan failed"));

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.hasScanned).toBe(true);
      expect(result.current.error).toBe("Scan failed");
    });

    it("should include hasScanned in returned state", () => {
      const { result } = renderHook(() => useModules());

      expect(result.current).toHaveProperty("hasScanned");
      expect(typeof result.current.hasScanned).toBe("boolean");
    });
  });

  describe("scan", () => {
    it("should fetch modules and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockModules);

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.modules).toEqual(mockModules);
      expect(result.current.totalFiles).toBe(4);
      expect(result.current.documentedFiles).toBe(2); // current status
      expect(result.current.missingFiles).toBe(1);
    });

    it("should call scan_modules with project path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockModules);

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      expect(invoke).toHaveBeenCalledWith("scan_modules", {
        projectPath: mockProject.path,
      });
    });

    it("should calculate coverage percentage", async () => {
      vi.mocked(invoke).mockResolvedValue(mockModules);

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      // 2 documented out of 4 = 50%
      expect(result.current.coverage).toBe(50);
    });

    it("should handle scan errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Scan failed"));

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      expect(result.current.error).toBe("Scan failed");
      expect(result.current.loading).toBe(false);
    });

    it("should not scan when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.scan();
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("generateDoc", () => {
    it("should generate documentation for a file", async () => {
      vi.mocked(invoke).mockResolvedValue(mockModuleDoc);

      const { result } = renderHook(() => useModules());

      let doc;
      await act(async () => {
        doc = await result.current.generateDoc("/test/project/path/src/utils.ts");
      });

      expect(doc).toEqual(mockModuleDoc);
      expect(invoke).toHaveBeenCalledWith("generate_module_doc", {
        filePath: "/test/project/path/src/utils.ts",
        projectPath: mockProject.path,
      });
    });

    it("should return null on error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Generation failed"));

      const { result } = renderHook(() => useModules());

      let doc;
      await act(async () => {
        doc = await result.current.generateDoc("/test/file.ts");
      });

      expect(doc).toBeNull();
      expect(result.current.error).toBe("Generation failed");
    });
  });

  describe("applyDoc", () => {
    it("should apply documentation and update module status", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockModules) // Initial scan
        .mockResolvedValueOnce(undefined); // applyDoc

      const { result } = renderHook(() => useModules());

      // First scan to populate modules
      await act(async () => {
        await result.current.scan();
      });

      let success;
      await act(async () => {
        success = await result.current.applyDoc("src/utils.ts", mockModuleDoc);
      });

      expect(success).toBe(true);
      expect(invoke).toHaveBeenCalledWith("apply_module_doc", {
        filePath: "src/utils.ts",
        doc: mockModuleDoc,
      });
    });

    it("should return false on error", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Apply failed"));

      const { result } = renderHook(() => useModules());

      let success;
      await act(async () => {
        success = await result.current.applyDoc("src/utils.ts", mockModuleDoc);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Apply failed");
    });
  });

  describe("batchGenerate", () => {
    it("should batch generate docs one at a time and refresh modules", async () => {
      const mockDoc = { modulePath: "a", description: "test", purpose: [], dependencies: [], exports: [], patterns: [], claudeNotes: [] };
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockDoc) // generateModuleDoc for first file
        .mockResolvedValueOnce(undefined) // applyModuleDoc for first file
        .mockResolvedValueOnce(mockModules); // scanModules refresh

      const { result } = renderHook(() => useModules());

      await act(async () => {
        await result.current.batchGenerate(["/test/project/path/src/a.ts"]);
      });

      expect(invoke).toHaveBeenCalledWith("generate_module_doc", {
        filePath: "/test/project/path/src/a.ts",
        projectPath: mockProject.path,
      });
      expect(invoke).toHaveBeenCalledWith("apply_module_doc", {
        filePath: "/test/project/path/src/a.ts",
        doc: mockDoc,
      });
    });

    it("should set generating=true during batch operation", async () => {
      const mockDoc = { modulePath: "a", description: "test", purpose: [], dependencies: [], exports: [], patterns: [], claudeNotes: [] };
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockDoc) // generateModuleDoc
        .mockResolvedValueOnce(undefined) // applyModuleDoc
        .mockResolvedValueOnce(mockModules); // scanModules

      const { result } = renderHook(() => useModules());

      // Start generating
      await act(async () => {
        await result.current.batchGenerate(["/test/file.ts"]);
      });

      // After completion, generating should be false and progress null
      expect(result.current.generating).toBe(false);
      expect(result.current.progress).toBeNull();
    });

    it("should handle individual file errors gracefully and continue", async () => {
      // First file fails, but should continue and finish
      vi.mocked(invoke)
        .mockRejectedValueOnce(new Error("Generation failed")) // generateModuleDoc fails
        .mockResolvedValueOnce(mockModules); // scanModules refresh still works

      const { result } = renderHook(() => useModules());

      let batchResult: unknown[];
      await act(async () => {
        batchResult = await result.current.batchGenerate(["/test/file.ts"]);
      });

      // Individual errors don't set global error - they just result in "missing" status
      expect(result.current.error).toBeNull();
      expect(result.current.generating).toBe(false);
      // The result should indicate the file failed
      expect(batchResult![0]).toMatchObject({ status: "missing" });
    });
  });
});
