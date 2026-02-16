/**
 * @module hooks/useSkills.test
 * @description Unit tests for useSkills hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useSkills } from "./useSkills";
import { useProjectStore } from "@/stores/projectStore";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

vi.mock("@/stores/toastStore", () => ({
  useToastStore: vi.fn((selector) => selector({ addToast: vi.fn(), removeToast: vi.fn(), toasts: [] })),
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

const mockSkills = [
  {
    id: "skill-1",
    name: "Code Review",
    description: "Review code for issues",
    content: "Review the following code...",
    projectId: "test-project-id",
    usageCount: 5,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "skill-2",
    name: "Write Tests",
    description: "Generate unit tests",
    content: "Write tests for...",
    projectId: "test-project-id",
    usageCount: 3,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const mockPatterns = [
  { description: "React component pattern", content: "Use functional components" },
  { description: "Error handling pattern", content: "Use try-catch blocks" },
];

describe("useSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset invoke to a default resolved value to prevent test pollution
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue([]);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  describe("initial state", () => {
    it("should start with empty arrays and default values", () => {
      const { result } = renderHook(() => useSkills());

      expect(result.current.skills).toEqual([]);
      expect(result.current.patterns).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.detecting).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("loadSkills", () => {
    it("should fetch skills and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockSkills);

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.loadSkills();
      });

      expect(result.current.skills).toEqual(mockSkills);
      expect(result.current.loading).toBe(false);
    });

    it("should call list_skills with project id", async () => {
      vi.mocked(invoke).mockResolvedValue(mockSkills);

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.loadSkills();
      });

      expect(invoke).toHaveBeenCalledWith("list_skills", {
        projectId: mockProject.id,
      });
    });

    it("should handle load errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.loadSkills();
      });

      expect(result.current.error).toBe("Database error");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("addSkill", () => {
    it("should create skill and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "new-skill", name: "New Skill" }) // createSkill
        .mockResolvedValueOnce([...mockSkills, { id: "new-skill", name: "New Skill" }]); // listSkills

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.addSkill("New Skill", "Description", "Content");
      });

      expect(invoke).toHaveBeenCalledWith("create_skill", {
        name: "New Skill",
        description: "Description",
        content: "Content",
        projectId: mockProject.id,
      });
    });

    it("should handle create errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.addSkill("Test", "Desc", "Content");
      });

      expect(result.current.error).toBe("Create failed");
    });
  });

  describe("editSkill", () => {
    it("should update skill and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "skill-1", name: "Updated" }) // updateSkill
        .mockResolvedValueOnce(mockSkills); // listSkills

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.editSkill("skill-1", "Updated", "New Desc", "New Content");
      });

      expect(invoke).toHaveBeenCalledWith("update_skill", {
        id: "skill-1",
        name: "Updated",
        description: "New Desc",
        content: "New Content",
      });
    });

    it("should handle update errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.editSkill("skill-1", "Test", "Desc", "Content");
      });

      expect(result.current.error).toBe("Update failed");
    });
  });

  describe("removeSkill", () => {
    it("should delete skill and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // deleteSkill
        .mockResolvedValueOnce([mockSkills[1]]); // listSkills (one less)

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.removeSkill("skill-1");
      });

      expect(invoke).toHaveBeenCalledWith("delete_skill", { id: "skill-1" });
    });

    it("should handle delete errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.removeSkill("skill-1");
      });

      expect(result.current.error).toBe("Delete failed");
    });
  });

  describe("detectProjectPatterns", () => {
    it("should detect patterns and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockPatterns);

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.detectProjectPatterns();
      });

      expect(result.current.patterns).toEqual(mockPatterns);
      expect(invoke).toHaveBeenCalledWith("detect_patterns", {
        projectPath: mockProject.path,
      });
    });

    it("should set detecting=true during detection", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useSkills());

      // Start detecting but don't await
      act(() => {
        result.current.detectProjectPatterns();
      });

      // Check detecting is true immediately after starting
      expect(result.current.detecting).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolvePromise!(mockPatterns);
        await pendingPromise;
      });

      expect(result.current.detecting).toBe(false);
    });

    it("should not detect when no project is selected", async () => {
      vi.mocked(useProjectStore).mockImplementation((selector) =>
        selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
      );

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.detectProjectPatterns();
      });

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("bumpUsage", () => {
    it("should increment usage count locally", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockSkills) // initial load
        .mockResolvedValueOnce(6); // incrementSkillUsage returns new count

      const { result } = renderHook(() => useSkills());

      // Load skills first
      await act(async () => {
        await result.current.loadSkills();
      });

      await act(async () => {
        await result.current.bumpUsage("skill-1");
      });

      const updatedSkill = result.current.skills.find((s) => s.id === "skill-1");
      expect(updatedSkill?.usageCount).toBe(6);
    });

    it("should call increment_skill_usage", async () => {
      vi.mocked(invoke).mockResolvedValue(10);

      const { result } = renderHook(() => useSkills());

      await act(async () => {
        await result.current.bumpUsage("skill-1");
      });

      expect(invoke).toHaveBeenCalledWith("increment_skill_usage", { id: "skill-1" });
    });
  });
});
