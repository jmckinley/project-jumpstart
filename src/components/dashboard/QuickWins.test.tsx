/**
 * @module components/dashboard/QuickWins.test
 * @description Unit tests for QuickWins dashboard component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickWins } from "./QuickWins";

import type { QuickWin } from "@/types/health";

const mockQuickWins: QuickWin[] = [
  { title: "Add CLAUDE.md", description: "Create project documentation", impact: 25, effort: "low" },
  { title: "Document 5 modules", description: "Add module headers to undocumented files", impact: 15, effort: "medium" },
  { title: "Add skills", description: "Import skills from library", impact: 10, effort: "low" },
];

describe("QuickWins", () => {
  describe("rendering", () => {
    it("should render quick wins title", () => {
      render(<QuickWins quickWins={mockQuickWins} onAction={() => {}} />);

      expect(screen.getByText("Quick Wins")).toBeInTheDocument();
    });

    it("should display all quick win items", () => {
      render(<QuickWins quickWins={mockQuickWins} onAction={() => {}} />);

      expect(screen.getByText("Add CLAUDE.md")).toBeInTheDocument();
      expect(screen.getByText("Document 5 modules")).toBeInTheDocument();
      expect(screen.getByText("Add skills")).toBeInTheDocument();
    });

    it("should display quick win descriptions", () => {
      render(<QuickWins quickWins={mockQuickWins} onAction={() => {}} />);

      expect(screen.getByText("Create project documentation")).toBeInTheDocument();
      expect(screen.getByText("Add module headers to undocumented files")).toBeInTheDocument();
    });

    it("should display impact values", () => {
      render(<QuickWins quickWins={mockQuickWins} onAction={() => {}} />);

      expect(screen.getByText("+25 points")).toBeInTheDocument();
      expect(screen.getByText("+15 points")).toBeInTheDocument();
      expect(screen.getByText("+10 points")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show empty message when no quick wins", () => {
      render(<QuickWins quickWins={[]} onAction={() => {}} />);

      expect(screen.getByText("All caught up!")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onAction when Fix button is clicked", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(<QuickWins quickWins={mockQuickWins} onAction={onAction} />);

      // Component has a "Fix" button for each quick win
      const fixButtons = screen.getAllByText("Fix");
      await user.click(fixButtons[0]);

      expect(onAction).toHaveBeenCalledWith(mockQuickWins[0]);
    });

    it("should call onAction with correct quick win object", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(<QuickWins quickWins={mockQuickWins} onAction={onAction} />);

      const fixButtons = screen.getAllByText("Fix");
      await user.click(fixButtons[1]);

      expect(onAction).toHaveBeenCalledWith({
        title: "Document 5 modules",
        description: "Add module headers to undocumented files",
        impact: 15,
        effort: "medium",
      });
    });
  });

  describe("single quick win", () => {
    it("should render correctly with single quick win", () => {
      render(<QuickWins quickWins={[mockQuickWins[0]]} onAction={() => {}} />);

      expect(screen.getByText("Add CLAUDE.md")).toBeInTheDocument();
      expect(screen.queryByText("Document 5 modules")).not.toBeInTheDocument();
    });
  });
});
