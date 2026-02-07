/**
 * @module components/team-templates/TeamTemplateCard.test
 * @description Unit tests for the TeamTemplateCard component
 *
 * PURPOSE:
 * - Verify template name and description render
 * - Verify pattern badge displays
 * - Verify "Added" state when isAdded is true
 * - Verify onAdd callback when add button clicked
 * - Verify onSelect callback when card clicked
 *
 * DEPENDENCIES:
 * - @/components/team-templates/TeamTemplateCard - Component under test
 * - @/types/team-template - ScoredTeamTemplate type
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Uses minimal ScoredTeamTemplate mock data
 * - Tests button states (disabled when added)
 * - Tests click propagation (add button vs card click)
 *
 * CLAUDE NOTES:
 * - Add button has stopPropagation to prevent triggering onSelect
 * - Pattern badge is color-coded per orchestration pattern
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamTemplateCard } from "./TeamTemplateCard";
import type { ScoredTeamTemplate } from "@/types/team-template";

const mockScoredTemplate: ScoredTeamTemplate = {
  template: {
    slug: "test-team",
    name: "Test Feature Team",
    description: "A team for building test features",
    orchestrationPattern: "leader",
    category: "feature-development",
    tags: ["universal"],
    teammates: [
      { role: "Dev", description: "Developer", spawnPrompt: "Be a dev" },
      { role: "Tester", description: "Tests code", spawnPrompt: "Test everything" },
    ],
    tasks: [
      { id: "t1", title: "Build", description: "Build it", assignedTo: "Dev", blockedBy: [] },
    ],
    hooks: [],
    leadSpawnInstructions: "Coordinate the team",
  },
  score: 75,
  isRecommended: true,
  matchedTags: ["universal"],
};

describe("TeamTemplateCard", () => {
  const defaultProps = {
    scoredTemplate: mockScoredTemplate,
    isAdded: false,
    isSelected: false,
    onSelect: vi.fn(),
    onAdd: vi.fn(),
  };

  it("renders template name and description", () => {
    render(<TeamTemplateCard {...defaultProps} />);

    expect(screen.getByText("Test Feature Team")).toBeInTheDocument();
    expect(screen.getByText("A team for building test features")).toBeInTheDocument();
  });

  it("shows pattern badge", () => {
    render(<TeamTemplateCard {...defaultProps} />);

    expect(screen.getByText("leader")).toBeInTheDocument();
  });

  it("shows Recommended badge when isRecommended", () => {
    render(<TeamTemplateCard {...defaultProps} />);

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("does not show Recommended badge when not recommended", () => {
    const nonRecommended: ScoredTeamTemplate = {
      ...mockScoredTemplate,
      isRecommended: false,
    };
    render(
      <TeamTemplateCard
        {...defaultProps}
        scoredTemplate={nonRecommended}
      />,
    );

    expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
  });

  it("shows 'Added' state when isAdded", () => {
    render(<TeamTemplateCard {...defaultProps} isAdded={true} />);

    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
  });

  it("shows 'Add' button when not added", () => {
    render(<TeamTemplateCard {...defaultProps} isAdded={false} />);

    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("calls onAdd when add button clicked", () => {
    const onAdd = vi.fn();
    render(<TeamTemplateCard {...defaultProps} onAdd={onAdd} />);

    fireEvent.click(screen.getByText("Add"));
    expect(onAdd).toHaveBeenCalled();
  });

  it("does not call onAdd when already added", () => {
    const onAdd = vi.fn();
    render(<TeamTemplateCard {...defaultProps} isAdded={true} onAdd={onAdd} />);

    fireEvent.click(screen.getByText("Added"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("calls onSelect when card clicked", () => {
    const onSelect = vi.fn();
    render(<TeamTemplateCard {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Test Feature Team"));
    expect(onSelect).toHaveBeenCalled();
  });

  it("shows teammate and task counts", () => {
    render(<TeamTemplateCard {...defaultProps} />);

    expect(screen.getByText("2 teammates")).toBeInTheDocument();
    expect(screen.getByText("1 tasks")).toBeInTheDocument();
  });

  it("shows tags", () => {
    render(<TeamTemplateCard {...defaultProps} />);

    expect(screen.getByText("universal")).toBeInTheDocument();
  });
});
