/**
 * @module components/memory/LearningBrowser.test
 * @description Unit tests for LearningBrowser component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearningBrowser } from "./LearningBrowser";
import type { Learning } from "@/types/memory";

const mockLearnings: Learning[] = [
  {
    id: "l1",
    sessionId: "s1",
    category: "Preference",
    content: "User prefers terse responses",
    topic: "workflow",
    confidence: "high",
    status: "active",
    sourceFile: "CLAUDE.local.md",
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-02-15T10:00:00Z",
  },
  {
    id: "l2",
    sessionId: "s1",
    category: "Solution",
    content: "SQLite locked error: release db.lock() first",
    topic: "debugging",
    confidence: "medium",
    status: "verified",
    sourceFile: "CLAUDE.local.md",
    createdAt: "2026-02-15T11:00:00Z",
    updatedAt: "2026-02-15T11:00:00Z",
  },
  {
    id: "l3",
    sessionId: "s2",
    category: "Pattern",
    content: "Always run tests after modifying Rust files",
    topic: "patterns",
    confidence: "high",
    status: "active",
    sourceFile: "CLAUDE.local.md",
    createdAt: "2026-02-16T09:00:00Z",
    updatedAt: "2026-02-16T09:00:00Z",
  },
  {
    id: "l4",
    sessionId: "s2",
    category: "Gotcha",
    content: "Legacy API /v1/users is deprecated",
    topic: "project",
    confidence: "low",
    status: "deprecated",
    sourceFile: "CLAUDE.local.md",
    createdAt: "2026-02-16T10:00:00Z",
    updatedAt: "2026-02-16T10:00:00Z",
  },
  {
    id: "l5",
    sessionId: "s3",
    category: "Solution",
    content: "Archived solution for old bug",
    topic: "debugging",
    confidence: "medium",
    status: "archived",
    sourceFile: "CLAUDE.local.md",
    createdAt: "2026-02-10T10:00:00Z",
    updatedAt: "2026-02-12T10:00:00Z",
  },
];

describe("LearningBrowser", () => {
  describe("rendering", () => {
    it("should render Filters heading", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("should render all category filter pills", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      // Categories appear as filter pills AND as badges on learning cards
      expect(screen.getAllByText("Preference").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Solution").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Pattern").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Gotcha").length).toBeGreaterThanOrEqual(1);
    });

    it("should show total count", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Showing 5 of 5 learnings")).toBeInTheDocument();
    });

    it("should render learning content", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("User prefers terse responses")).toBeInTheDocument();
      expect(screen.getByText("SQLite locked error: release db.lock() first")).toBeInTheDocument();
      expect(screen.getByText("Always run tests after modifying Rust files")).toBeInTheDocument();
    });

    it("should render topic tags", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      // Topics appear as tags on learning cards and may also appear in dropdown
      expect(screen.getAllByText("workflow").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("debugging").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("patterns").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("project").length).toBeGreaterThanOrEqual(1);
    });

    it("should render confidence labels", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getAllByText("high").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("medium").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("low").length).toBeGreaterThanOrEqual(1);
    });

    it("should render status badges", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getAllByText("active").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("verified").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("deprecated").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("empty state", () => {
    it("should show empty message when no learnings", () => {
      render(
        <LearningBrowser
          learnings={[]}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(
        screen.getByText(
          "No learnings found. Learnings are auto-extracted from Claude Code sessions.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("category filtering", () => {
    it("should filter by category when pill is clicked", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      // Click "Pattern" filter
      fireEvent.click(screen.getByRole("button", { name: "Pattern" }));

      expect(screen.getByText("Showing 1 of 5 learnings")).toBeInTheDocument();
      expect(screen.getByText("Always run tests after modifying Rust files")).toBeInTheDocument();
    });

    it("should show Clear button when category filter is active", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Gotcha" }));
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("should clear category filter", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Gotcha" }));
      expect(screen.getByText("Showing 1 of 5 learnings")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Clear"));
      expect(screen.getByText("Showing 5 of 5 learnings")).toBeInTheDocument();
    });

    it("should show no-match message when filter yields zero results", () => {
      const learnings: Learning[] = [mockLearnings[0]]; // Only Preference
      render(
        <LearningBrowser
          learnings={learnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Gotcha" }));
      expect(screen.getByText("No learnings match the current filters.")).toBeInTheDocument();
    });
  });

  describe("dropdown filtering", () => {
    it("should filter by topic", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      const topicSelect = screen.getByDisplayValue("All topics");
      fireEvent.change(topicSelect, { target: { value: "debugging" } });

      expect(screen.getByText("Showing 2 of 5 learnings")).toBeInTheDocument();
    });

    it("should filter by status", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      const statusSelect = screen.getByDisplayValue("All statuses");
      fireEvent.change(statusSelect, { target: { value: "verified" } });

      expect(screen.getByText("Showing 1 of 5 learnings")).toBeInTheDocument();
    });

    it("should filter by confidence level", () => {
      render(
        <LearningBrowser
          learnings={mockLearnings}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      const confidenceSelect = screen.getByDisplayValue("All levels");
      fireEvent.change(confidenceSelect, { target: { value: "low" } });

      expect(screen.getByText("Showing 1 of 5 learnings")).toBeInTheDocument();
    });
  });

  describe("status actions", () => {
    it("should show Verify button for active learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]} // active
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Verify")).toBeInTheDocument();
    });

    it("should call onUpdateStatus with verified when Verify is clicked", () => {
      const onUpdateStatus = vi.fn();
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]} // active
          onUpdateStatus={onUpdateStatus}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Verify"));
      expect(onUpdateStatus).toHaveBeenCalledWith("l1", "verified");
    });

    it("should show Deprecate button for active and verified learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0], mockLearnings[1]]} // active, verified
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      const deprecateButtons = screen.getAllByText("Deprecate");
      expect(deprecateButtons).toHaveLength(2);
    });

    it("should call onUpdateStatus with deprecated when Deprecate is clicked", () => {
      const onUpdateStatus = vi.fn();
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]} // active
          onUpdateStatus={onUpdateStatus}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Deprecate"));
      expect(onUpdateStatus).toHaveBeenCalledWith("l1", "deprecated");
    });

    it("should show Archive button for non-archived learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]} // active
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Archive")).toBeInTheDocument();
    });

    it("should not show Archive button for archived learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[4]]} // archived
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.queryByText("Archive")).not.toBeInTheDocument();
    });

    it("should not show Verify button for non-active learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[1]]} // verified
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.queryByText("Verify")).not.toBeInTheDocument();
    });
  });

  describe("promote functionality", () => {
    it("should show Promote button for active learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]} // active
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Promote")).toBeInTheDocument();
    });

    it("should show Promote button for verified learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[1]]} // verified
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Promote")).toBeInTheDocument();
    });

    it("should not show Promote button for deprecated learnings", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[3]]} // deprecated
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.queryByText("Promote")).not.toBeInTheDocument();
    });

    it("should open promote dropdown when clicked", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Promote"));
      expect(screen.getByText("Move to CLAUDE.md")).toBeInTheDocument();
      expect(screen.getByText("Move to rules file")).toBeInTheDocument();
    });

    it("should call onPromote with claude-md target", () => {
      const onPromote = vi.fn();
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]}
          onUpdateStatus={vi.fn()}
          onPromote={onPromote}
        />,
      );

      fireEvent.click(screen.getByText("Promote"));
      fireEvent.click(screen.getByText("Move to CLAUDE.md"));
      expect(onPromote).toHaveBeenCalledWith("l1", "claude-md");
    });

    it("should call onPromote with rules target", () => {
      const onPromote = vi.fn();
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]}
          onUpdateStatus={vi.fn()}
          onPromote={onPromote}
        />,
      );

      fireEvent.click(screen.getByText("Promote"));
      fireEvent.click(screen.getByText("Move to rules file"));
      expect(onPromote).toHaveBeenCalledWith("l1", "rules");
    });

    it("should close promote dropdown after selection", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Promote"));
      expect(screen.getByText("Move to CLAUDE.md")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Move to CLAUDE.md"));
      expect(screen.queryByText("Move to CLAUDE.md")).not.toBeInTheDocument();
    });
  });

  describe("source info display", () => {
    it("should show source file name", () => {
      render(
        <LearningBrowser
          learnings={[mockLearnings[0]]}
          onUpdateStatus={vi.fn()}
          onPromote={vi.fn()}
        />,
      );

      expect(screen.getByText("Source: CLAUDE.local.md")).toBeInTheDocument();
    });
  });
});
