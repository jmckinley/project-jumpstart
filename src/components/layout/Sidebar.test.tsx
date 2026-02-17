/**
 * @module components/layout/Sidebar.test
 * @description Unit tests for Sidebar component with grouped navigation
 *
 * PURPOSE:
 * - Test project selector dropdown functionality
 * - Test grouped navigation rendering and collapsible behavior
 * - Test completion checkmarks display
 * - Test Kickstart and Hooks Setup section visibility logic
 * - Test auto-expand of group when active section is inside a collapsed group
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - Component rendering and queries
 * - @testing-library/user-event - User interaction simulation
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Test Kickstart visibility based on isEmptyProject and completion["claude-md"]
 * - Test navigation callbacks with section IDs
 * - Test project selector with mock project list
 * - Test group collapse/expand toggling
 * - Test auto-expand when activeSection changes into a collapsed group
 *
 * CLAUDE NOTES:
 * - Kickstart section appears only when isEmptyProject=true AND no CLAUDE.md
 * - Kickstart disappears after CLAUDE.md is created (completion["claude-md"]=true)
 * - Active section gets highlighted styling
 * - Core group is always expanded (no toggle); others have chevron toggles
 * - "Navigation" label is no longer rendered; replaced by group labels
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";
import type { Project } from "@/types/project";

const mockProjects: Project[] = [
  {
    id: "project-1",
    name: "Test Project 1",
    path: "/home/user/projects/test-project-1",
    description: "A test project",
    projectType: "Web App",
    language: "TypeScript",
    framework: "React",
    database: null,
    testing: "Vitest",
    styling: "Tailwind CSS",
    stackExtras: null,
    healthScore: 50,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "project-2",
    name: "Test Project 2",
    path: "/home/user/projects/test-project-2",
    description: "Another test project",
    projectType: "API",
    language: "Go",
    framework: "Gin",
    database: "PostgreSQL",
    testing: null,
    styling: null,
    stackExtras: null,
    healthScore: 75,
    createdAt: "2024-01-02T00:00:00Z",
  },
];

describe("Sidebar", () => {
  describe("Hooks Setup Section", () => {
    it("should show Hooks Setup when showHooksSetup=true", () => {
      render(
        <Sidebar
          showHooksSetup={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText("Set Up Hooks")).toBeInTheDocument();
    });

    it("should hide Hooks Setup when showHooksSetup=false", () => {
      render(
        <Sidebar
          showHooksSetup={false}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.queryByText("Set Up Hooks")).not.toBeInTheDocument();
    });

    it("should navigate to 'hooks-setup' when clicked", async () => {
      const mockNavigate = vi.fn();
      const user = userEvent.setup();

      render(
        <Sidebar
          showHooksSetup={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={mockNavigate}
        />
      );

      await user.click(screen.getByText("Set Up Hooks"));

      expect(mockNavigate).toHaveBeenCalledWith("hooks-setup");
    });

    it("should highlight Hooks Setup when activeSection='hooks-setup'", () => {
      render(
        <Sidebar
          showHooksSetup={true}
          completion={{}}
          activeSection="hooks-setup"
          onNavigate={vi.fn()}
        />
      );

      const hooksButton = screen.getByText("Set Up Hooks").closest("button");
      expect(hooksButton).toHaveClass("border-blue-500/50");
      expect(hooksButton).toHaveClass("bg-blue-600/20");
    });

    it("should show 'New' badge styling", () => {
      render(
        <Sidebar
          showHooksSetup={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("should not highlight when not active", () => {
      render(
        <Sidebar
          showHooksSetup={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      const hooksButton = screen.getByText("Set Up Hooks").closest("button");
      expect(hooksButton).not.toHaveClass("bg-blue-600/20");
      expect(hooksButton).toHaveClass("border-blue-500/30");
    });

    it("should hide Hooks Setup by default", () => {
      render(
        <Sidebar
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.queryByText("Set Up Hooks")).not.toBeInTheDocument();
    });
  });

  describe("Kickstart Section", () => {
    it("should show Kickstart when isEmptyProject=true and no CLAUDE.md", () => {
      render(
        <Sidebar
          isEmptyProject={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText("Kickstart")).toBeInTheDocument();
    });

    it("should hide Kickstart when isEmptyProject=false", () => {
      render(
        <Sidebar
          isEmptyProject={false}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.queryByText("Kickstart")).not.toBeInTheDocument();
    });

    it("should hide Kickstart when CLAUDE.md exists", () => {
      render(
        <Sidebar
          isEmptyProject={true}
          completion={{ "claude-md": true }}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.queryByText("Kickstart")).not.toBeInTheDocument();
    });

    it("should hide Kickstart when isEmptyProject=false even if no CLAUDE.md", () => {
      render(
        <Sidebar
          isEmptyProject={false}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.queryByText("Kickstart")).not.toBeInTheDocument();
    });

    it("should navigate to 'kickstart' section when clicked", async () => {
      const mockNavigate = vi.fn();
      const user = userEvent.setup();

      render(
        <Sidebar
          isEmptyProject={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={mockNavigate}
        />
      );

      await user.click(screen.getByText("Kickstart"));

      expect(mockNavigate).toHaveBeenCalledWith("kickstart");
    });

    it("should highlight Kickstart when active", () => {
      render(
        <Sidebar
          isEmptyProject={true}
          completion={{}}
          activeSection="kickstart"
          onNavigate={vi.fn()}
        />
      );

      const kickstartButton = screen.getByText("Kickstart").closest("button");
      expect(kickstartButton).toHaveClass("border-purple-500/50");
      expect(kickstartButton).toHaveClass("bg-purple-600/20");
    });

    it("should not highlight Kickstart when not active", () => {
      render(
        <Sidebar
          isEmptyProject={true}
          completion={{}}
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      const kickstartButton = screen.getByText("Kickstart").closest("button");
      expect(kickstartButton).not.toHaveClass("bg-purple-600/20");
      expect(kickstartButton).toHaveClass("border-purple-500/30");
    });
  });

  describe("Navigation Groups", () => {
    it("should render all navigation sections across groups", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("CLAUDE.md")).toBeInTheDocument();
      expect(screen.getByText("Modules")).toBeInTheDocument();
      expect(screen.getByText("Skills")).toBeInTheDocument();
      expect(screen.getByText("Agents")).toBeInTheDocument();
      expect(screen.getByText("RALPH")).toBeInTheDocument();
      expect(screen.getByText("Context Health")).toBeInTheDocument();
      expect(screen.getByText("Enforcement")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Help")).toBeInTheDocument();
    });

    it("should render group headers", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.getByText("Core")).toBeInTheDocument();
      expect(screen.getByText("Development")).toBeInTheDocument();
      expect(screen.getByText("Monitoring")).toBeInTheDocument();
      expect(screen.getByText("Setup")).toBeInTheDocument();
    });

    it("should not render the old 'Navigation' label", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    });

    it("should not have a clickable toggle on the Core group", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      // Core is rendered as a div, not a button — find the text and check its parent
      const coreLabel = screen.getByText("Core");
      expect(coreLabel.closest("button")).toBeNull();
    });

    it("should have clickable toggles on non-Core groups", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      const devLabel = screen.getByText("Development");
      expect(devLabel.closest("button")).not.toBeNull();

      const monLabel = screen.getByText("Monitoring");
      expect(monLabel.closest("button")).not.toBeNull();

      const setupLabel = screen.getByText("Setup");
      expect(setupLabel.closest("button")).not.toBeNull();
    });

    it("should collapse Development group when its header is clicked", async () => {
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      // Skills should be visible initially
      expect(screen.getByText("Skills")).toBeInTheDocument();

      // Click Development header to collapse
      await user.click(screen.getByText("Development"));

      // All Development items should be hidden
      expect(screen.queryByText("Skills")).not.toBeInTheDocument();
      expect(screen.queryByText("Agents")).not.toBeInTheDocument();
      expect(screen.queryByText("Team Templates")).not.toBeInTheDocument();
      expect(screen.queryByText("RALPH")).not.toBeInTheDocument();
    });

    it("should expand a collapsed group when clicked again", async () => {
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      // Collapse Development
      await user.click(screen.getByText("Development"));
      expect(screen.queryByText("Skills")).not.toBeInTheDocument();

      // Expand Development
      await user.click(screen.getByText("Development"));
      expect(screen.getByText("Skills")).toBeInTheDocument();
    });

    it("should auto-expand group when activeSection is inside a collapsed group", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
        />
      );

      // Collapse Development
      await user.click(screen.getByText("Development"));
      expect(screen.queryByText("Skills")).not.toBeInTheDocument();

      // Re-render with activeSection in Development group
      rerender(
        <Sidebar
          activeSection="skills"
          onNavigate={vi.fn()}
        />
      );

      // Development should auto-expand, showing Skills
      expect(screen.getByText("Skills")).toBeInTheDocument();
    });
  });

  describe("Navigation Actions", () => {
    it("should call onNavigate with section id when section is clicked", async () => {
      const mockNavigate = vi.fn();
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={mockNavigate}
        />
      );

      await user.click(screen.getByText("Modules"));
      expect(mockNavigate).toHaveBeenCalledWith("modules");

      await user.click(screen.getByText("Skills"));
      expect(mockNavigate).toHaveBeenCalledWith("skills");
    });

    it("should highlight active section", () => {
      render(
        <Sidebar
          activeSection="modules"
          onNavigate={vi.fn()}
        />
      );

      const modulesButton = screen.getByText("Modules").closest("button");
      expect(modulesButton).toHaveClass("bg-neutral-800");
      expect(modulesButton).toHaveClass("text-neutral-100");
    });

    it("should show checkmark for completed sections", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          completion={{
            "claude-md": true,
            modules: true,
            skills: false,
          }}
          onNavigate={vi.fn()}
        />
      );

      // Find the checkmark icons (green check SVGs) in nav buttons
      const navButtons = screen.getAllByRole("button").filter((button) => {
        // Only count buttons that are nav section buttons (inside nav elements)
        const isInNav = button.closest("nav") !== null;
        const svg = button.querySelector('svg.text-emerald-500');
        return isInNav && svg !== null;
      });

      // Should have 2 checkmarks (claude-md and modules)
      expect(navButtons.length).toBe(2);
    });
  });

  describe("Project Selector", () => {
    it("should display active project name", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={mockProjects[0]}
        />
      );

      expect(screen.getByText("Test Project 1")).toBeInTheDocument();
    });

    it("should display 'Select Project' when no active project", () => {
      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={null}
        />
      );

      expect(screen.getByText("Select Project")).toBeInTheDocument();
    });

    it("should open dropdown when project selector is clicked", async () => {
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={mockProjects[0]}
        />
      );

      // Initially dropdown should be closed
      expect(screen.queryByText("Test Project 2")).not.toBeInTheDocument();

      // Click to open dropdown
      await user.click(screen.getByText("Test Project 1"));

      // Both projects should be visible in dropdown
      expect(screen.getByText("Test Project 2")).toBeInTheDocument();
    });

    it("should call onProjectChange when a different project is selected", async () => {
      const mockProjectChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={mockProjects[0]}
          onProjectChange={mockProjectChange}
        />
      );

      // Open dropdown
      await user.click(screen.getByText("Test Project 1"));

      // Click on second project
      await user.click(screen.getByText("Test Project 2"));

      expect(mockProjectChange).toHaveBeenCalledWith(mockProjects[1]);
    });

    it("should close dropdown after selecting a project", async () => {
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={mockProjects[0]}
          onProjectChange={vi.fn()}
        />
      );

      // Open dropdown
      await user.click(screen.getByText("Test Project 1"));
      expect(screen.getByText("Test Project 2")).toBeInTheDocument();

      // Select a project
      await user.click(screen.getByText("Test Project 2"));

      // Dropdown should be closed - can't find the dropdown items anymore
      // The button text will change but the dropdown list should close
      expect(screen.queryAllByText("Test Project 1").length).toBeLessThanOrEqual(1);
    });

    it("should show 'New Project' button in dropdown", async () => {
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={mockProjects[0]}
        />
      );

      // Open dropdown
      await user.click(screen.getByText("Test Project 1"));

      expect(screen.getByText("New Project")).toBeInTheDocument();
    });

    it("should call onNewProject when 'New Project' is clicked", async () => {
      const mockNewProject = vi.fn();
      const user = userEvent.setup();

      render(
        <Sidebar
          activeSection="dashboard"
          onNavigate={vi.fn()}
          projects={mockProjects}
          activeProject={mockProjects[0]}
          onNewProject={mockNewProject}
        />
      );

      // Open dropdown
      await user.click(screen.getByText("Test Project 1"));

      // Click New Project
      await user.click(screen.getByText("New Project"));

      expect(mockNewProject).toHaveBeenCalledTimes(1);
    });
  });
});
