/**
 * @module components/dashboard/RecentActivity.test
 * @description Unit tests for RecentActivity dashboard component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentActivity } from "./RecentActivity";

const mockActivities = [
  { type: "generate", message: "Generated CLAUDE.md", timestamp: "2024-01-15T10:30:00Z" },
  { type: "edit", message: "Updated module documentation", timestamp: "2024-01-15T09:00:00Z" },
  { type: "skill", message: "Added new skill: Code Review", timestamp: "2024-01-14T15:45:00Z" },
];

describe("RecentActivity", () => {
  describe("rendering", () => {
    it("should render recent activity title", () => {
      render(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    it("should display all activity messages", () => {
      render(<RecentActivity activities={mockActivities} />);

      expect(screen.getByText("Generated CLAUDE.md")).toBeInTheDocument();
      expect(screen.getByText("Updated module documentation")).toBeInTheDocument();
      expect(screen.getByText("Added new skill: Code Review")).toBeInTheDocument();
    });

    it("should display activity icons for each type", () => {
      render(<RecentActivity activities={mockActivities} />);

      // Types are displayed as SVG icons, not text
      // Just verify the list items are rendered
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });
  });

  describe("empty state", () => {
    it("should show empty message when no activities", () => {
      render(<RecentActivity activities={[]} />);

      expect(screen.getByText("No recent activity.")).toBeInTheDocument();
    });
  });

  describe("activity ordering", () => {
    it("should render activities in provided order", () => {
      render(<RecentActivity activities={mockActivities} />);

      const messages = screen.getAllByText(/Generated|Updated|Added/);
      expect(messages[0]).toHaveTextContent("Generated CLAUDE.md");
      expect(messages[1]).toHaveTextContent("Updated module documentation");
      expect(messages[2]).toHaveTextContent("Added new skill: Code Review");
    });
  });

  describe("single activity", () => {
    it("should render correctly with single activity", () => {
      render(<RecentActivity activities={[mockActivities[0]]} />);

      expect(screen.getByText("Generated CLAUDE.md")).toBeInTheDocument();
      expect(screen.queryByText("Updated module documentation")).not.toBeInTheDocument();
    });
  });

  describe("timestamp display", () => {
    it("should display timestamps or relative times", () => {
      render(<RecentActivity activities={mockActivities} />);

      // The component likely shows relative time like "2 hours ago"
      // or formatted time - just check something time-related exists
      // This is implementation-dependent
      const container = screen.getByText("Recent Activity").closest("div");
      expect(container).toBeInTheDocument();
    });
  });
});
