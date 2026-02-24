/**
 * @module components/skills/SkillEditor.test
 * @description Unit tests for SkillEditor component
 *
 * PURPOSE:
 * - Test create and edit modes
 * - Test form field rendering and interactions
 * - Test save/cancel behavior
 * - Test export to .claude functionality
 * - Test disabled states and validation
 *
 * PATTERNS:
 * - Uses Vitest globals (describe, it, expect)
 * - Mocks Tauri IPC and Zustand stores
 * - Uses @testing-library/react for component testing
 *
 * CLAUDE NOTES:
 * - exportSkillToFile is mocked via @/lib/tauri
 * - useProjectStore is mocked to provide activeProject
 * - Skill prop controls create vs edit mode
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SkillEditor } from "./SkillEditor";
import type { Skill } from "@/types/skill";

// Mock Tauri IPC
vi.mock("@/lib/tauri", () => ({
  exportSkillToFile: vi.fn(),
}));

// Mock project store
vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

import { exportSkillToFile } from "@/lib/tauri";
import { useProjectStore } from "@/stores/projectStore";

const mockSkill: Skill = {
  id: "skill-1",
  name: "Test Skill",
  description: "A test skill",
  content: "# Test Content\nSome markdown here.",
  projectId: "project-1",
  usageCount: 3,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
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

describe("SkillEditor", () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjectStore).mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector({ activeProject: mockActiveProject } as ReturnType<typeof useProjectStore>);
      }
      return { activeProject: mockActiveProject };
    });
  });

  describe("create mode (skill=null)", () => {
    it("should render 'New Skill' heading", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("New Skill")).toBeInTheDocument();
    });

    it("should render empty form fields", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const nameInput = screen.getByPlaceholderText("e.g. React Component Generator");
      const descInput = screen.getByPlaceholderText("Brief description of what this skill does");
      const contentArea = screen.getByPlaceholderText("Write your skill instructions in markdown...");

      expect(nameInput).toHaveValue("");
      expect(descInput).toHaveValue("");
      expect(contentArea).toHaveValue("");
    });

    it("should show 'Create Skill' button", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Create Skill")).toBeInTheDocument();
    });

    it("should disable Create Skill button when name is empty", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const saveBtn = screen.getByText("Create Skill");
      expect(saveBtn).toBeDisabled();
    });

    it("should enable Create Skill button when name is provided", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      const nameInput = screen.getByPlaceholderText("e.g. React Component Generator");
      fireEvent.change(nameInput, { target: { value: "My Skill" } });

      const saveBtn = screen.getByText("Create Skill");
      expect(saveBtn).not.toBeDisabled();
    });

    it("should not show Export button in create mode", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Export to .claude")).not.toBeInTheDocument();
    });

    it("should call onSave with trimmed values", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.change(screen.getByPlaceholderText("e.g. React Component Generator"), {
        target: { value: "  My Skill  " },
      });
      fireEvent.change(screen.getByPlaceholderText("Brief description of what this skill does"), {
        target: { value: "  A description  " },
      });
      fireEvent.change(screen.getByPlaceholderText("Write your skill instructions in markdown..."), {
        target: { value: "Some content" },
      });
      fireEvent.click(screen.getByText("Create Skill"));

      expect(mockOnSave).toHaveBeenCalledWith("My Skill", "A description", "Some content");
    });

    it("should not call onSave when name is whitespace only", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.change(screen.getByPlaceholderText("e.g. React Component Generator"), {
        target: { value: "   " },
      });
      fireEvent.click(screen.getByText("Create Skill"));

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe("edit mode (skill provided)", () => {
    it("should render 'Edit Skill' heading", () => {
      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Edit Skill")).toBeInTheDocument();
    });

    it("should pre-fill form fields from skill prop", () => {
      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByDisplayValue("Test Skill")).toBeInTheDocument();
      expect(screen.getByDisplayValue("A test skill")).toBeInTheDocument();
      const contentArea = screen.getByPlaceholderText("Write your skill instructions in markdown...") as HTMLTextAreaElement;
      expect(contentArea.value).toBe("# Test Content\nSome markdown here.");
    });

    it("should show 'Save Changes' button", () => {
      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("should show Export to .claude button", () => {
      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Export to .claude")).toBeInTheDocument();
    });
  });

  describe("pre-filled create (skill with id='')", () => {
    it("should render 'New Skill' heading for skill with empty id", () => {
      const prefilled = { ...mockSkill, id: "" };
      render(<SkillEditor skill={prefilled} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("New Skill")).toBeInTheDocument();
    });

    it("should not show Export button for skill with empty id", () => {
      const prefilled = { ...mockSkill, id: "" };
      render(<SkillEditor skill={prefilled} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Export to .claude")).not.toBeInTheDocument();
    });
  });

  describe("cancel", () => {
    it("should call onCancel and clear fields", () => {
      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Cancel"));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("export to .claude", () => {
    it("should call exportSkillToFile on click", async () => {
      vi.mocked(exportSkillToFile).mockResolvedValue("/path/.claude/skills/test-skill/SKILL.md");

      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      await waitFor(() => {
        expect(exportSkillToFile).toHaveBeenCalledWith("skill-1", "/path/to/project");
      });
    });

    it("should show success message after export", async () => {
      vi.mocked(exportSkillToFile).mockResolvedValue("/path/.claude/skills/test-skill/SKILL.md");

      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      await waitFor(() => {
        expect(screen.getByText("Exported to /path/.claude/skills/test-skill/SKILL.md")).toBeInTheDocument();
      });
    });

    it("should show error message on export failure", async () => {
      vi.mocked(exportSkillToFile).mockRejectedValue(new Error("Disk full"));

      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      fireEvent.click(screen.getByText("Export to .claude"));

      await waitFor(() => {
        expect(screen.getByText(/Error:.*Disk full/)).toBeInTheDocument();
      });
    });

    it("should show 'Exporting...' during export", async () => {
      vi.mocked(exportSkillToFile).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("/path"), 200)),
      );

      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
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

      render(<SkillEditor skill={mockSkill} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.queryByText("Export to .claude")).not.toBeInTheDocument();
    });
  });

  describe("form labels", () => {
    it("should render Name label", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    it("should render Description label", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("should render Content label", () => {
      render(<SkillEditor skill={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
      expect(screen.getByText("Content (Markdown)")).toBeInTheDocument();
    });
  });
});
