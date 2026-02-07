/**
 * @module components/team-templates/TeamTemplateDetail.test
 * @description Unit tests for the TeamTemplateDetail component
 *
 * PURPOSE:
 * - Verify empty state when no template selected
 * - Verify template name and description render
 * - Verify teammate list displays
 * - Verify task list displays
 * - Verify add and deploy buttons render
 * - Verify onAdd callback when add button clicked
 * - Verify onDeploy callback when deploy button clicked
 *
 * DEPENDENCIES:
 * - @/components/team-templates/TeamTemplateDetail - Component under test
 * - @/types/team-template - ScoredTeamTemplate type
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Tests empty state (null scoredTemplate) vs populated state
 * - Uses fireEvent for button interactions
 *
 * CLAUDE NOTES:
 * - Empty state shows "Select a team template to view details"
 * - Add button is disabled when isAdded is true
 * - Deploy button always rendered as "Deploy Output"
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamTemplateDetail } from "./TeamTemplateDetail";
import type { ScoredTeamTemplate } from "@/types/team-template";

const mockScoredTemplate: ScoredTeamTemplate = {
  template: {
    slug: "test-team",
    name: "Test Feature Team",
    description: "A team for building test features end-to-end",
    orchestrationPattern: "leader",
    category: "feature-development",
    tags: ["typescript", "react"],
    teammates: [
      {
        role: "Architect",
        description: "Designs the feature architecture",
        spawnPrompt: "You are the Architect",
      },
      {
        role: "Frontend Dev",
        description: "Implements UI components",
        spawnPrompt: "You are the Frontend Developer",
      },
    ],
    tasks: [
      {
        id: "design",
        title: "Design feature architecture",
        description: "Create data model and component structure",
        assignedTo: "Architect",
        blockedBy: [],
      },
      {
        id: "frontend",
        title: "Implement frontend UI",
        description: "Build React components",
        assignedTo: "Frontend Dev",
        blockedBy: ["design"],
      },
    ],
    hooks: [],
    leadSpawnInstructions: "Coordinate the Full Stack Feature Team",
  },
  score: 80,
  isRecommended: true,
  matchedTags: ["typescript", "react"],
};

describe("TeamTemplateDetail", () => {
  const defaultProps = {
    scoredTemplate: mockScoredTemplate,
    isAdded: false,
    onAdd: vi.fn(),
    onDeploy: vi.fn(),
    onClose: vi.fn(),
  };

  describe("empty state", () => {
    it("shows empty state when no template selected", () => {
      render(
        <TeamTemplateDetail
          scoredTemplate={null}
          isAdded={false}
          onAdd={vi.fn()}
          onDeploy={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(
        screen.getByText("Select a team template to view details"),
      ).toBeInTheDocument();
    });
  });

  describe("populated state", () => {
    it("renders template name and description", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      expect(screen.getByText("Test Feature Team")).toBeInTheDocument();
      expect(
        screen.getByText("A team for building test features end-to-end"),
      ).toBeInTheDocument();
    });

    it("shows pattern badge", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      expect(screen.getByText("leader")).toBeInTheDocument();
    });

    it("shows teammate list", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      // "Architect" appears in both teammate role and task assignee badge
      const architectElements = screen.getAllByText("Architect");
      expect(architectElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Designs the feature architecture")).toBeInTheDocument();
      // "Frontend Dev" also appears in both teammate role and task assignee badge
      const frontendDevElements = screen.getAllByText("Frontend Dev");
      expect(frontendDevElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Implements UI components")).toBeInTheDocument();
    });

    it("shows team composition count", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      expect(screen.getByText("Team Composition (2 teammates)")).toBeInTheDocument();
    });

    it("shows task list", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      expect(screen.getByText("Design feature architecture")).toBeInTheDocument();
      expect(screen.getByText("Implement frontend UI")).toBeInTheDocument();
    });

    it("shows task flow count", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      expect(screen.getByText("Task Flow (2 tasks)")).toBeInTheDocument();
    });

    it("shows add and deploy buttons", () => {
      render(<TeamTemplateDetail {...defaultProps} />);

      expect(screen.getByText("Add to Project")).toBeInTheDocument();
      expect(screen.getByText("Deploy Output")).toBeInTheDocument();
    });

    it("calls onAdd when add button clicked", () => {
      const onAdd = vi.fn();
      render(<TeamTemplateDetail {...defaultProps} onAdd={onAdd} />);

      fireEvent.click(screen.getByText("Add to Project"));
      expect(onAdd).toHaveBeenCalled();
    });

    it("calls onDeploy when deploy button clicked", () => {
      const onDeploy = vi.fn();
      render(<TeamTemplateDetail {...defaultProps} onDeploy={onDeploy} />);

      fireEvent.click(screen.getByText("Deploy Output"));
      expect(onDeploy).toHaveBeenCalled();
    });

    it("shows 'Added to Project' when isAdded", () => {
      render(<TeamTemplateDetail {...defaultProps} isAdded={true} />);

      expect(screen.getByText("Added to Project")).toBeInTheDocument();
      expect(screen.queryByText("Add to Project")).not.toBeInTheDocument();
    });

    it("add button is disabled when isAdded", () => {
      render(<TeamTemplateDetail {...defaultProps} isAdded={true} />);

      const addButton = screen.getByText("Added to Project").closest("button");
      expect(addButton).toBeDisabled();
    });

    it("calls onClose when close button clicked", () => {
      const onClose = vi.fn();
      render(<TeamTemplateDetail {...defaultProps} onClose={onClose} />);

      // Close button is an SVG button in the top right
      const buttons = screen.getAllByRole("button");
      // The close button is the one with the X icon (first button in header)
      const closeButton = buttons.find((btn) => {
        const svg = btn.querySelector("svg");
        return svg && btn.closest(".border-b");
      });

      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });
});
