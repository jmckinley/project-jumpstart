/**
 * @module hooks/useAgents.test
 * @description Unit tests for useAgents hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useAgents } from "./useAgents";
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

const mockAgents = [
  {
    id: "agent-1",
    name: "Code Reviewer",
    description: "Reviews code",
    tier: "standard",
    category: "quality",
    instructions: "Review code for issues",
    workflow: null,
    tools: null,
    triggerPatterns: null,
    projectId: "test-project-id",
    usageCount: 5,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "agent-2",
    name: "Test Writer",
    description: "Writes tests",
    tier: "advanced",
    category: "testing",
    instructions: "Write comprehensive tests",
    workflow: [{ step: 1, action: "analyze" }],
    tools: [{ name: "jest", config: {} }],
    triggerPatterns: ["test", "spec"],
    projectId: "test-project-id",
    usageCount: 3,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

import type { LibraryAgent } from "@/types/agent";

const mockLibraryAgent: LibraryAgent = {
  slug: "debugger",
  name: "Debugger",
  description: "Debug issues",
  tier: "basic",
  category: "debugging",
  instructions: "Find and fix bugs",
  tags: ["typescript"],
};

describe("useAgents", () => {
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
    it("should start with empty agents and default values", () => {
      const { result } = renderHook(() => useAgents());

      expect(result.current.agents).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("loadAgents", () => {
    it("should fetch agents and update state", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAgents);

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.loadAgents();
      });

      expect(result.current.agents).toEqual(mockAgents);
      expect(result.current.loading).toBe(false);
    });

    it("should call list_agents with project id", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAgents);

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.loadAgents();
      });

      expect(invoke).toHaveBeenCalledWith("list_agents", {
        projectId: mockProject.id,
      });
    });

    it("should set loading=true during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(invoke).mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useAgents());

      // Start loading but don't await
      act(() => {
        result.current.loadAgents();
      });

      // Check loading is true immediately after starting
      expect(result.current.loading).toBe(true);

      // Resolve and finish
      await act(async () => {
        resolvePromise!(mockAgents);
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it("should handle load errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.loadAgents();
      });

      expect(result.current.error).toBe("Database error");
    });
  });

  describe("addAgent", () => {
    it("should create agent and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "new-agent" }) // createAgent
        .mockResolvedValueOnce([...mockAgents]); // listAgents

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.addAgent(
          "New Agent",
          "Description",
          "basic",
          "general",
          "Instructions",
          null,
          null,
          null
        );
      });

      expect(invoke).toHaveBeenCalledWith("create_agent", {
        name: "New Agent",
        description: "Description",
        tier: "basic",
        category: "general",
        instructions: "Instructions",
        workflow: null,
        tools: null,
        triggerPatterns: null,
        projectId: mockProject.id,
      });
    });

    it("should handle create errors", async () => {
      vi.mocked(invoke).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.addAgent("Test", "Desc", "basic", "cat", "Inst", null, null, null);
      });

      expect(result.current.error).toBe("Create failed");
    });
  });

  describe("editAgent", () => {
    it("should update agent and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "agent-1" }) // updateAgent
        .mockResolvedValueOnce(mockAgents); // listAgents

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.editAgent(
          "agent-1",
          "Updated",
          "New Desc",
          "advanced",
          "quality",
          "New instructions",
          null,
          null,
          null
        );
      });

      expect(invoke).toHaveBeenCalledWith("update_agent", {
        id: "agent-1",
        name: "Updated",
        description: "New Desc",
        tier: "advanced",
        category: "quality",
        instructions: "New instructions",
        workflow: null,
        tools: null,
        triggerPatterns: null,
      });
    });
  });

  describe("removeAgent", () => {
    it("should delete agent and refresh list", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(undefined) // deleteAgent
        .mockResolvedValueOnce([mockAgents[1]]); // listAgents

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.removeAgent("agent-1");
      });

      expect(invoke).toHaveBeenCalledWith("delete_agent", { id: "agent-1" });
    });
  });

  describe("bumpUsage", () => {
    it("should increment usage count locally", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce(mockAgents) // initial load
        .mockResolvedValueOnce(6); // incrementAgentUsage

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.loadAgents();
      });

      await act(async () => {
        await result.current.bumpUsage("agent-1");
      });

      const updatedAgent = result.current.agents.find((a) => a.id === "agent-1");
      expect(updatedAgent?.usageCount).toBe(6);
    });
  });

  describe("isAgentAdded", () => {
    it("should return true if agent exists (case-insensitive)", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAgents);

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.loadAgents();
      });

      expect(result.current.isAgentAdded("Code Reviewer")).toBe(true);
      expect(result.current.isAgentAdded("CODE REVIEWER")).toBe(true);
      expect(result.current.isAgentAdded("code reviewer")).toBe(true);
    });

    it("should return false if agent does not exist", async () => {
      vi.mocked(invoke).mockResolvedValue(mockAgents);

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.loadAgents();
      });

      expect(result.current.isAgentAdded("Nonexistent Agent")).toBe(false);
    });
  });

  describe("addFromLibrary", () => {
    it("should add agent from library catalog", async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ id: "new-agent" }) // createAgent
        .mockResolvedValueOnce(mockAgents); // listAgents

      const { result } = renderHook(() => useAgents());

      await act(async () => {
        await result.current.addFromLibrary(mockLibraryAgent);
      });

      expect(invoke).toHaveBeenCalledWith("create_agent", {
        name: "Debugger",
        description: "Debug issues",
        tier: "basic",
        category: "debugging",
        instructions: "Find and fix bugs",
        workflow: null,
        tools: null,
        triggerPatterns: null,
        projectId: mockProject.id,
      });
    });
  });
});
