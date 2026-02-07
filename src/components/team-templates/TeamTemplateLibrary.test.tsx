/**
 * @module components/team-templates/TeamTemplateLibrary.test
 * @description Unit tests for the TeamTemplateLibrary component
 *
 * PURPOSE:
 * - Verify search input renders
 * - Verify filter pills render
 * - Verify template cards render
 * - Verify search filters templates by name
 *
 * DEPENDENCIES:
 * - @/components/team-templates/TeamTemplateLibrary - Component under test
 * - @/data/teamTemplateLibrary - TEAM_TEMPLATE_LIBRARY catalog (mocked)
 * - @/stores/projectStore - Active project store (mocked)
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mocks projectStore, teamTemplateLibrary, teamRelevance, and teamCategories
 * - Mock data is defined inline in vi.mock factories (hoisted above const declarations)
 * - Uses fireEvent for search interaction
 *
 * CLAUDE NOTES:
 * - vi.mock is hoisted to top of file, so cannot reference variables defined after it
 * - Mock data must be inline in factory functions or accessed via vi.hoisted()
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamTemplateLibrary } from "./TeamTemplateLibrary";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn((selector: (state: { activeProject: null }) => unknown) =>
    selector({ activeProject: null }),
  ),
}));

vi.mock("@/data/teamTemplateLibrary", () => ({
  TEAM_TEMPLATE_LIBRARY: [
    {
      slug: "full-stack-feature-team",
      name: "Full Stack Feature Team",
      description: "Architect-led team for end-to-end feature delivery",
      orchestrationPattern: "leader",
      category: "feature-development",
      tags: ["universal"],
      teammates: [
        { role: "Architect", description: "Designs architecture", spawnPrompt: "You are the Architect" },
        { role: "Frontend Dev", description: "Builds UI", spawnPrompt: "You are the Frontend Dev" },
      ],
      tasks: [
        { id: "design", title: "Design", description: "Design it", assignedTo: "Architect", blockedBy: [] },
      ],
      hooks: [],
      leadSpawnInstructions: "Coordinate the team",
    },
    {
      slug: "tdd-pipeline-team",
      name: "TDD Pipeline Team",
      description: "Sequential red-green-refactor pipeline with TDD specialists",
      orchestrationPattern: "pipeline",
      category: "testing",
      tags: ["universal"],
      teammates: [
        { role: "Test Designer", description: "Writes failing tests", spawnPrompt: "You are the Test Designer" },
      ],
      tasks: [],
      hooks: [],
      leadSpawnInstructions: "Coordinate the TDD pipeline",
    },
  ],
}));

vi.mock("@/lib/teamRelevance", () => ({
  rankLibraryTeams: () => [
    {
      template: {
        slug: "full-stack-feature-team",
        name: "Full Stack Feature Team",
        description: "Architect-led team for end-to-end feature delivery",
        orchestrationPattern: "leader",
        category: "feature-development",
        tags: ["universal"],
        teammates: [
          { role: "Architect", description: "Designs architecture", spawnPrompt: "You are the Architect" },
          { role: "Frontend Dev", description: "Builds UI", spawnPrompt: "You are the Frontend Dev" },
        ],
        tasks: [
          { id: "design", title: "Design", description: "Design it", assignedTo: "Architect", blockedBy: [] },
        ],
        hooks: [],
        leadSpawnInstructions: "Coordinate the team",
      },
      score: 75,
      isRecommended: true,
      matchedTags: ["universal"],
    },
    {
      template: {
        slug: "tdd-pipeline-team",
        name: "TDD Pipeline Team",
        description: "Sequential red-green-refactor pipeline with TDD specialists",
        orchestrationPattern: "pipeline",
        category: "testing",
        tags: ["universal"],
        teammates: [
          { role: "Test Designer", description: "Writes failing tests", spawnPrompt: "You are the Test Designer" },
        ],
        tasks: [],
        hooks: [],
        leadSpawnInstructions: "Coordinate the TDD pipeline",
      },
      score: 75,
      isRecommended: true,
      matchedTags: ["universal"],
    },
  ],
}));

vi.mock("@/data/teamCategories", () => ({
  TEAM_CATEGORIES: [
    { id: "feature-development", label: "Feature Dev", description: "Feature teams", icon: "code" },
    { id: "testing", label: "Testing", description: "Test teams", icon: "test-tube" },
  ],
}));

describe("TeamTemplateLibrary", () => {
  const defaultProps = {
    existingTemplateNames: [],
    onAddTemplate: vi.fn(),
    onDeploy: vi.fn(),
  };

  it("renders search input", () => {
    render(<TeamTemplateLibrary {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Search team templates..."),
    ).toBeInTheDocument();
  });

  it("renders filter pills", () => {
    render(<TeamTemplateLibrary {...defaultProps} />);

    // "Recommended" appears in both filter pill and template card badges
    const recommendedElements = screen.getAllByText("Recommended");
    expect(recommendedElements.length).toBeGreaterThanOrEqual(1);
    // "All" appears in both category filter and pattern filter
    const allElements = screen.getAllByText("All");
    expect(allElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders template cards", () => {
    render(<TeamTemplateLibrary {...defaultProps} />);

    expect(screen.getByText("Full Stack Feature Team")).toBeInTheDocument();
    expect(screen.getByText("TDD Pipeline Team")).toBeInTheDocument();
  });

  it("search filters templates by name", () => {
    render(<TeamTemplateLibrary {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search team templates...");
    fireEvent.change(searchInput, { target: { value: "Full Stack" } });

    expect(screen.getByText("Full Stack Feature Team")).toBeInTheDocument();
    expect(screen.queryByText("TDD Pipeline Team")).not.toBeInTheDocument();
  });

  it("search filters templates by description", () => {
    render(<TeamTemplateLibrary {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText("Search team templates...");
    fireEvent.change(searchInput, { target: { value: "red-green-refactor" } });

    expect(screen.queryByText("Full Stack Feature Team")).not.toBeInTheDocument();
    expect(screen.getByText("TDD Pipeline Team")).toBeInTheDocument();
  });
});
