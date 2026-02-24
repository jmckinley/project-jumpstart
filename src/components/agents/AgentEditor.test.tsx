/**
 * @module components/agents/AgentEditor.test
 * @description Unit tests for AgentEditor component
 *
 * PURPOSE:
 * - Test create and edit modes
 * - Test tier switching (basic/advanced)
 * - Test workflow and tools editors (advanced tier)
 * - Test export to .claude functionality
 * - Test AI enhancement flow
 * - Test save/cancel behavior
 *
 * PATTERNS:
 * - Uses Vitest globals (describe, it, expect)
 * - Mocks Tauri IPC and Zustand stores
 * - Uses @testing-library/react for component testing
 *
 * CLAUDE NOTES:
 * - exportAgentToFile and enhanceAgentInstructions mocked via @/lib/tauri
 * - useSettingsStore mocked for API key checks
 * - useProjectStore mocked for active project
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AgentEditor } from "./AgentEditor";
import type { Agent } from "@/types/agent";

// Mock Tauri IPC
vi.mock("@/lib/tauri", () => ({
  enhanceAgentInstructions: vi.fn(),
  exportAgentToFile: vi.fn(),
}));

// Mock stores
vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: vi.fn(),
}));
vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

// Mock agent categories
vi.mock("@/data/agentCategories", () => ({
  AGENT_CATEGORIES: [
    { id: "testing", label: "Testing", description: "Test agents", icon: "TestTube" },
    { id: "code-review", label: "Code Review", description: "Review code", icon: "Eye" },
    { id: "documentation", label: "Documentation", description: "Write docs", icon: "FileText" },
    { id: "debugging", label: "Debugging", description: "Debug issues", icon: "Bug" },
    { id: "refactoring", label: "Refactoring", description: "Refactor code", icon: "Wrench" },
    { id: "feature-development", label: "Feature Development", description: "Build features", icon: "Rocket" },
  ],
}));

import { enhanceAgentInstructions, exportAgentToFile } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProjectStore } from "@/stores/projectStore";

const mockAgent: Agent = {
  id: "agent-1",
  name: "TDD Agent",
  description: "Test-driven development workflow",
  tier: "basic",
  category: "testing",
  instructions: "Follow red-green-refactor cycle.",
  workflow: null,
  tools: null,
  triggerPatterns: null,
  projectId: "project-1",
  usageCount: 3,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

const mockAdvancedAgent: Agent = {
  ...mockAgent,
  id: "agent-2",
  name: "Full Stack Agent",
  tier: "advanced",
  workflow: [
    { step: 1, action: "Analyze", description: "Read the codebase" },
    { step: 2, action: "Implement", description: "Write the code" },
  ],
  tools: [
    { name: "Read", description: "Read files", required: true },
    { name: "Edit", description: "Edit files", required: false },
  ],
  triggerPatterns: ["*.ts", "*.tsx"],
};

const mockActiveProject = {
  id: "project-1",
  name: "test-project",
  path: "/path/to/project",
  language: "TypeScript",
  framework: "React",
  healthScore: 75,
  createdAt: "2026-01-01T00:00:00Z",
  testing: "Vitest",
};

describe("AgentEditor", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector({ hasApiKey: true } as ReturnType<typeof useSettingsStore>);
      }
      return { hasApiKey: true };
    });
    vi.mocked(useProjectStore).mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector({ activeProject: mockActiveProject } as ReturnType<typeof useProjectStore>);
      }
      return { activeProject: mockActiveProject };
    });
  });

  describe("create mode (agent=null)", () => {
    it("should render 'New Agent' heading", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("New Agent")).toBeInTheDocument();
    });

    it("should render empty form fields", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByPlaceholderText("e.g. Unit Test Writer")).toHaveValue("");
      expect(screen.getByPlaceholderText("Brief description of what this agent does")).toHaveValue("");
      expect(screen.getByPlaceholderText("Write agent instructions in markdown...")).toHaveValue("");
    });

    it("should show 'Create Agent' button", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Create Agent")).toBeInTheDocument();
    });

    it("should disable Create Agent button when name is empty", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Create Agent")).toBeDisabled();
    });

    it("should not show Export button in create mode", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Export to .claude")).not.toBeInTheDocument();
    });

    it("should default tier to basic", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const tierSelect = screen.getByLabelText("Tier") as HTMLSelectElement;
      expect(tierSelect.value).toBe("basic");
    });

    it("should default category to feature-development", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const catSelect = screen.getByLabelText("Category") as HTMLSelectElement;
      expect(catSelect.value).toBe("feature-development");
    });
  });

  describe("edit mode (agent provided)", () => {
    it("should render 'Edit Agent' heading", () => {
      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Edit Agent")).toBeInTheDocument();
    });

    it("should pre-fill form fields from agent prop", () => {
      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByDisplayValue("TDD Agent")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Test-driven development workflow")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Follow red-green-refactor cycle.")).toBeInTheDocument();
    });

    it("should show 'Save Changes' button", () => {
      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("should show Export to .claude button", () => {
      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Export to .claude")).toBeInTheDocument();
    });
  });

  describe("tier switching", () => {
    it("should not show workflow/tools for basic tier", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Workflow Steps")).not.toBeInTheDocument();
      expect(screen.queryByText("Tools")).not.toBeInTheDocument();
      expect(screen.queryByText("Trigger Patterns")).not.toBeInTheDocument();
    });

    it("should show workflow/tools/triggers when switching to advanced tier", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const tierSelect = screen.getByLabelText("Tier");
      fireEvent.change(tierSelect, { target: { value: "advanced" } });

      expect(screen.getByText("Workflow Steps")).toBeInTheDocument();
      expect(screen.getByText("Tools")).toBeInTheDocument();
      expect(screen.getByText("Trigger Patterns")).toBeInTheDocument();
    });

    it("should show empty workflow/tools message for advanced tier", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.change(screen.getByLabelText("Tier"), { target: { value: "advanced" } });

      expect(screen.getByText("No workflow steps defined.")).toBeInTheDocument();
      expect(screen.getByText("No tools defined.")).toBeInTheDocument();
    });
  });

  describe("advanced agent editing", () => {
    it("should display workflow steps from advanced agent", () => {
      render(<AgentEditor agent={mockAdvancedAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByDisplayValue("Analyze")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Read the codebase")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Implement")).toBeInTheDocument();
    });

    it("should display tools from advanced agent", () => {
      render(<AgentEditor agent={mockAdvancedAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByDisplayValue("Read")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Read files")).toBeInTheDocument();
    });

    it("should display trigger patterns from advanced agent", () => {
      render(<AgentEditor agent={mockAdvancedAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      // Patterns render with surrounding quotes in the UI: "*.ts" and "*.tsx"
      const patterns = screen.getAllByText(/\*\.tsx?/);
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should add a workflow step when clicking + Add Step", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.change(screen.getByLabelText("Tier"), { target: { value: "advanced" } });

      fireEvent.click(screen.getByText("+ Add Step"));
      expect(screen.queryByText("No workflow steps defined.")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Action name")).toBeInTheDocument();
    });

    it("should add a tool when clicking + Add Tool", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.change(screen.getByLabelText("Tier"), { target: { value: "advanced" } });

      fireEvent.click(screen.getByText("+ Add Tool"));
      expect(screen.queryByText("No tools defined.")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Tool name")).toBeInTheDocument();
    });
  });

  describe("save", () => {
    it("should call onSave with basic tier fields", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.change(screen.getByPlaceholderText("e.g. Unit Test Writer"), {
        target: { value: "My Agent" },
      });
      fireEvent.change(screen.getByPlaceholderText("Brief description of what this agent does"), {
        target: { value: "Agent desc" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write agent instructions in markdown..."), {
        target: { value: "Do things" },
      });
      fireEvent.click(screen.getByText("Create Agent"));

      expect(mockOnSave).toHaveBeenCalledWith(
        "My Agent",
        "Agent desc",
        "basic",
        "feature-development",
        "Do things",
        null,
        null,
        null,
      );
    });
  });

  describe("cancel", () => {
    it("should call onCancel", () => {
      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("export to .claude", () => {
    it("should call exportAgentToFile on click", async () => {
      vi.mocked(exportAgentToFile).mockResolvedValue("/path/.claude/agents/tdd-agent.md");

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      await waitFor(() => {
        expect(exportAgentToFile).toHaveBeenCalledWith("agent-1", "/path/to/project");
      });
    });

    it("should show success message after export", async () => {
      vi.mocked(exportAgentToFile).mockResolvedValue("/path/.claude/agents/tdd-agent.md");

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      await waitFor(() => {
        expect(screen.getByText("Exported to /path/.claude/agents/tdd-agent.md")).toBeInTheDocument();
      });
    });

    it("should show error message on export failure", async () => {
      vi.mocked(exportAgentToFile).mockRejectedValue(new Error("Permission denied"));

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      await waitFor(() => {
        expect(screen.getByText(/Error:.*Permission denied/)).toBeInTheDocument();
      });
    });

    it("should show 'Exporting...' during export", async () => {
      vi.mocked(exportAgentToFile).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("/path"), 200)),
      );

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      expect(screen.getByText("Exporting...")).toBeInTheDocument();
    });

    it("should not show Export button when no active project", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        if (typeof selector === "function") {
          return selector({ activeProject: null } as ReturnType<typeof useProjectStore>);
        }
        return { activeProject: null };
      });

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Export to .claude")).not.toBeInTheDocument();
    });

    it("should not show Export button for agent with empty id", () => {
      const prefilled = { ...mockAgent, id: "" };
      render(<AgentEditor agent={prefilled} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Export to .claude")).not.toBeInTheDocument();
    });
  });

  describe("AI enhancement", () => {
    it("should show Enhance with AI button", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Enhance with AI")).toBeInTheDocument();
    });

    it("should disable enhance when no instructions", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const enhanceBtn = screen.getByText("Enhance with AI").closest("button")!;
      expect(enhanceBtn).toBeDisabled();
    });

    it("should disable enhance when no API key", () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        if (typeof selector === "function") {
          return selector({ hasApiKey: false } as ReturnType<typeof useSettingsStore>);
        }
        return { hasApiKey: false };
      });

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const enhanceBtn = screen.getByText("Enhance with AI").closest("button")!;
      expect(enhanceBtn).toBeDisabled();
    });

    it("should show API key message when no key configured", () => {
      vi.mocked(useSettingsStore).mockImplementation((selector) => {
        if (typeof selector === "function") {
          return selector({ hasApiKey: false } as ReturnType<typeof useSettingsStore>);
        }
        return { hasApiKey: false };
      });

      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Set API key in Settings to enable AI enhancement")).toBeInTheDocument();
    });

    it("should show review UI after enhancement", async () => {
      vi.mocked(enhanceAgentInstructions).mockResolvedValue("# Enhanced\nBetter instructions.");

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Enhance with AI"));

      await waitFor(() => {
        expect(screen.getByText("Enhanced")).toBeInTheDocument();
        expect(screen.getByText("Accept")).toBeInTheDocument();
        expect(screen.getByText("Reject")).toBeInTheDocument();
      });
    });

    it("should show error message on enhancement failure", async () => {
      vi.mocked(enhanceAgentInstructions).mockRejectedValue(new Error("API error"));

      render(<AgentEditor agent={mockAgent} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Enhance with AI"));

      await waitFor(() => {
        expect(screen.getByText("API error")).toBeInTheDocument();
      });
    });
  });

  describe("form labels", () => {
    it("should render required form labels", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Tier")).toBeInTheDocument();
      expect(screen.getByText("Category")).toBeInTheDocument();
      expect(screen.getByText("Instructions (Markdown)")).toBeInTheDocument();
    });

    it("should render category options from AGENT_CATEGORIES", () => {
      render(<AgentEditor agent={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const catSelect = screen.getByLabelText("Category") as HTMLSelectElement;
      const options = Array.from(catSelect.options).map((o) => o.value);
      expect(options).toContain("testing");
      expect(options).toContain("code-review");
      expect(options).toContain("feature-development");
    });
  });
});
