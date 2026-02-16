/**
 * @module hooks/useTeamTemplates.test
 * @description Unit tests for useTeamTemplates hook
 *
 * PURPOSE:
 * - Verify loadTemplates calls listTeamTemplates
 * - Verify addTemplate calls createTeamTemplate and refreshes list
 * - Verify editTemplate calls updateTeamTemplate and refreshes list
 * - Verify removeTemplate calls deleteTeamTemplate and refreshes list
 * - Verify bumpUsage increments usage count optimistically
 * - Verify isTemplateAdded checks by name case-insensitive
 * - Verify generateOutput calls backend without context
 * - Verify generateOutput calls backend with project context
 * - Verify generateOutput sets error on failure
 * - Verify error state is set on failure
 *
 * DEPENDENCIES:
 * - @/hooks/useTeamTemplates - Hook under test
 * - @tauri-apps/api/core - Mocked invoke for IPC
 * - @/stores/projectStore - Mocked project store
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mirrors useAgents.test.ts test structure
 * - Mocks invoke for IPC, projectStore for active project
 * - Uses renderHook + act for async state updates
 *
 * CLAUDE NOTES:
 * - invoke is globally mocked in test/setup.ts
 * - Each test resets mocks via beforeEach
 * - addTemplate stringifies teammates, tasks, hooks arrays
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useTeamTemplates } from "./useTeamTemplates";
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
  stackExtras: null,
  healthScore: 50,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockTemplates = [
  {
    id: "template-1",
    name: "Feature Team",
    description: "Build features",
    orchestrationPattern: "leader",
    category: "feature-development",
    teammates: [{ role: "Dev", description: "Developer", spawnPrompt: "Be a dev" }],
    tasks: [{ id: "t1", title: "Build", description: "Build it", assignedTo: "Dev", blockedBy: [] }],
    hooks: [],
    leadSpawnInstructions: "Coordinate",
    projectId: "test-project-id",
    usageCount: 5,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "template-2",
    name: "Test Team",
    description: "Write tests",
    orchestrationPattern: "pipeline",
    category: "testing",
    teammates: [{ role: "Tester", description: "Writes tests", spawnPrompt: "Test everything" }],
    tasks: [],
    hooks: [],
    leadSpawnInstructions: "Run tests",
    projectId: "test-project-id",
    usageCount: 3,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

describe("useTeamTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
    vi.mocked(invoke).mockResolvedValue([]);
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>),
    );
  });

  describe("initial state", () => {
    it("should start with empty templates and default values", () => {
      const { result } = renderHook(() => useTeamTemplates());

      expect(result.current.templates).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("loadTemplates", () => {
    it("should call listTeamTemplates and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      expect(invoke).toHaveBeenCalledWith("list_team_templates", {
        projectId: mockProject.id,
      });
      expect(result.current.templates).toEqual(mockTemplates);
      expect(result.current.loading).toBe(false);
    });

    it("should set error on failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      expect(result.current.error).toBe("Database error");
    });
  });

  describe("addTemplate", () => {
    it("should call createTeamTemplate and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "new-template" }) // createTeamTemplate
        .mockResolvedValueOnce([...mockTemplates]); // listTeamTemplates

      const { result } = renderHook(() => useTeamTemplates());

      const teammates = [{ role: "Dev", description: "Developer", spawnPrompt: "Be a dev" }];
      const tasks = [{ id: "t1", title: "Build", description: "Build it", assignedTo: "Dev", blockedBy: [] as string[] }];
      const hooks: { event: string; command: string; description: string }[] = [];

      await act(async () => {
        await result.current.addTemplate(
          "New Team",
          "New description",
          "leader",
          "feature-development",
          teammates,
          tasks,
          hooks,
          "Lead instructions",
        );
      });

      expect(invoke).toHaveBeenCalledWith("create_team_template", {
        name: "New Team",
        description: "New description",
        orchestrationPattern: "leader",
        category: "feature-development",
        teammatesJson: JSON.stringify(teammates),
        tasksJson: JSON.stringify(tasks),
        hooksJson: JSON.stringify(hooks),
        leadSpawnInstructions: "Lead instructions",
        projectId: mockProject.id,
      });
    });

    it("should set error on create failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.addTemplate(
          "New Team",
          "Desc",
          "leader",
          "feature-development",
          [],
          [],
          [],
          "Instructions",
        );
      });

      expect(result.current.error).toBe("Create failed");
    });
  });

  describe("editTemplate", () => {
    it("should call updateTeamTemplate and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "template-1" }) // updateTeamTemplate
        .mockResolvedValueOnce(mockTemplates); // listTeamTemplates

      const { result } = renderHook(() => useTeamTemplates());

      const teammates = [{ role: "Dev", description: "Developer", spawnPrompt: "Be a dev" }];
      const tasks: { id: string; title: string; description: string; assignedTo: string; blockedBy: string[] }[] = [];
      const hooks: { event: string; command: string; description: string }[] = [];

      await act(async () => {
        await result.current.editTemplate(
          "template-1",
          "Updated Team",
          "Updated desc",
          "pipeline",
          "testing",
          teammates,
          tasks,
          hooks,
          "Updated instructions",
        );
      });

      expect(invoke).toHaveBeenCalledWith("update_team_template", {
        id: "template-1",
        name: "Updated Team",
        description: "Updated desc",
        orchestrationPattern: "pipeline",
        category: "testing",
        teammatesJson: JSON.stringify(teammates),
        tasksJson: JSON.stringify(tasks),
        hooksJson: JSON.stringify(hooks),
        leadSpawnInstructions: "Updated instructions",
      });
    });

    it("should set error on update failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.editTemplate(
          "template-1",
          "Name",
          "Desc",
          "leader",
          "testing",
          [],
          [],
          [],
          "Instructions",
        );
      });

      expect(result.current.error).toBe("Update failed");
    });
  });

  describe("removeTemplate", () => {
    it("should call deleteTeamTemplate and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // deleteTeamTemplate
        .mockResolvedValueOnce([mockTemplates[1]]); // listTeamTemplates

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.removeTemplate("template-1");
      });

      expect(invoke).toHaveBeenCalledWith("delete_team_template", { id: "template-1" });
    });

    it("should set error on delete failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.removeTemplate("template-1");
      });

      expect(result.current.error).toBe("Delete failed");
    });
  });

  describe("bumpUsage", () => {
    it("should increment usage count optimistically", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockTemplates) // loadTemplates
        .mockResolvedValueOnce(6); // incrementTeamTemplateUsage

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      await act(async () => {
        await result.current.bumpUsage("template-1");
      });

      const updatedTemplate = result.current.templates.find((t) => t.id === "template-1");
      expect(updatedTemplate?.usageCount).toBe(6);
    });

    it("should call incrementTeamTemplateUsage", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockTemplates) // loadTemplates
        .mockResolvedValueOnce(6); // incrementTeamTemplateUsage

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      await act(async () => {
        await result.current.bumpUsage("template-1");
      });

      expect(invoke).toHaveBeenCalledWith("increment_team_template_usage", {
        id: "template-1",
      });
    });
  });

  describe("isTemplateAdded", () => {
    it("should return true if template exists (case-insensitive)", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      expect(result.current.isTemplateAdded("Feature Team")).toBe(true);
      expect(result.current.isTemplateAdded("FEATURE TEAM")).toBe(true);
      expect(result.current.isTemplateAdded("feature team")).toBe(true);
    });

    it("should return false if template does not exist", async () => {
      vi.mocked(invoke).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      expect(result.current.isTemplateAdded("Nonexistent Team")).toBe(false);
    });
  });

  describe("generateOutput", () => {
    it("should call generateTeamDeployOutput without context", async () => {
      vi.mocked(invoke).mockResolvedValue("# Generated Output");

      const { result } = renderHook(() => useTeamTemplates());

      let output: string | null = null;
      await act(async () => {
        output = await result.current.generateOutput(mockTemplates[0], "prompt");
      });

      expect(output).toBe("# Generated Output");
      expect(invoke).toHaveBeenCalledWith("generate_team_deploy_output", {
        templateJson: JSON.stringify(mockTemplates[0]),
        format: "prompt",
        projectContextJson: null,
      });
    });

    it("should call generateTeamDeployOutput with project context", async () => {
      vi.mocked(invoke).mockResolvedValue("# Personalized Output");

      const { result } = renderHook(() => useTeamTemplates());

      const context = {
        name: "My App",
        language: "TypeScript",
        framework: "React",
        testFramework: "Vitest",
        buildTool: null,
        styling: null,
        database: null,
      };

      let output: string | null = null;
      await act(async () => {
        output = await result.current.generateOutput(mockTemplates[0], "prompt", context);
      });

      expect(output).toBe("# Personalized Output");
      expect(invoke).toHaveBeenCalledWith("generate_team_deploy_output", {
        templateJson: JSON.stringify(mockTemplates[0]),
        format: "prompt",
        projectContextJson: JSON.stringify(context),
      });
    });

    it("should set error on generateOutput failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Generation failed"));

      const { result } = renderHook(() => useTeamTemplates());

      let output: string | null = null;
      await act(async () => {
        output = await result.current.generateOutput(mockTemplates[0], "prompt");
      });

      expect(output).toBeNull();
      expect(result.current.error).toBe("Generation failed");
    });
  });

  describe("error state", () => {
    it("should set error on loadTemplates failure", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Load failed"));

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });

      expect(result.current.error).toBe("Load failed");
    });

    it("should clear error after successful operation", async () => {
      // First: fail
      vi.mocked(invoke).mockRejectedValueOnce(new Error("Failed"));

      const { result } = renderHook(() => useTeamTemplates());

      await act(async () => {
        await result.current.loadTemplates();
      });
      expect(result.current.error).toBe("Failed");

      // Then: succeed
      vi.mocked(invoke).mockResolvedValue(mockTemplates);

      await act(async () => {
        await result.current.loadTemplates();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
