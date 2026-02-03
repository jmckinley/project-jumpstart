/**
 * @module components/test-plans/TestPlansList.test
 * @description Tests for the TestPlansList component
 *
 * PURPOSE:
 * - Verify test plans list renders correctly
 * - Test selection, creation, and deletion interactions
 * - Test empty state display
 *
 * PATTERNS:
 * - Uses vitest and @testing-library/react
 * - Mocks callbacks to verify interactions
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestPlansList } from "./TestPlansList";
import type { TestPlan } from "@/types/test-plan";

const mockPlans: TestPlan[] = [
  {
    id: "plan-1",
    projectId: "project-1",
    name: "Unit Tests",
    description: "Core unit test suite",
    status: "active",
    targetCoverage: 80,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "plan-2",
    projectId: "project-1",
    name: "Integration Tests",
    description: "API integration tests",
    status: "draft",
    targetCoverage: 70,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "plan-3",
    projectId: "project-1",
    name: "Old Tests",
    description: "Archived test suite",
    status: "archived",
    targetCoverage: 60,
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

describe("TestPlansList", () => {
  describe("Rendering", () => {
    it("should render the header with title and new plan button", () => {
      render(
        <TestPlansList
          plans={[]}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Test Plans")).toBeInTheDocument();
      expect(screen.getByText("+ New Plan")).toBeInTheDocument();
    });

    it("should render empty state when no plans exist", () => {
      render(
        <TestPlansList
          plans={[]}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("No test plans yet.")).toBeInTheDocument();
      expect(screen.getByText('Click "New Plan" to create one.')).toBeInTheDocument();
    });

    it("should render all test plans", () => {
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Unit Tests")).toBeInTheDocument();
      expect(screen.getByText("Integration Tests")).toBeInTheDocument();
      expect(screen.getByText("Old Tests")).toBeInTheDocument();
    });

    it("should display plan descriptions", () => {
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Core unit test suite")).toBeInTheDocument();
      expect(screen.getByText("API integration tests")).toBeInTheDocument();
    });

    it("should display status badges", () => {
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("draft")).toBeInTheDocument();
      expect(screen.getByText("archived")).toBeInTheDocument();
    });

    it("should display target coverage for each plan", () => {
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText("Target: 80%")).toBeInTheDocument();
      expect(screen.getByText("Target: 70%")).toBeInTheDocument();
      expect(screen.getByText("Target: 60%")).toBeInTheDocument();
    });

    it("should highlight selected plan", () => {
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId="plan-1"
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // The selected plan should have the highlighted background class
      const selectedButton = screen.getByText("Unit Tests").closest("button");
      expect(selectedButton).toHaveClass("bg-neutral-800");
    });
  });

  describe("Interactions", () => {
    it("should call onSelect when a plan is clicked", () => {
      const onSelect = vi.fn();
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={onSelect}
          onCreateNew={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Unit Tests"));
      expect(onSelect).toHaveBeenCalledWith(mockPlans[0]);
    });

    it("should call onCreateNew when new plan button is clicked", () => {
      const onCreateNew = vi.fn();
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={onCreateNew}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("+ New Plan"));
      expect(onCreateNew).toHaveBeenCalled();
    });

    it("should call onDelete when delete button is clicked", () => {
      const onDelete = vi.fn();
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={vi.fn()}
          onCreateNew={vi.fn()}
          onDelete={onDelete}
        />
      );

      // Delete buttons are hidden by default, need to find by title
      const deleteButtons = screen.getAllByTitle("Delete plan");
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).toHaveBeenCalledWith("plan-1");
    });

    it("should not call onSelect when delete button is clicked (event stops propagation)", () => {
      const onSelect = vi.fn();
      const onDelete = vi.fn();
      render(
        <TestPlansList
          plans={mockPlans}
          selectedId={null}
          onSelect={onSelect}
          onCreateNew={vi.fn()}
          onDelete={onDelete}
        />
      );

      const deleteButtons = screen.getAllByTitle("Delete plan");
      fireEvent.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
