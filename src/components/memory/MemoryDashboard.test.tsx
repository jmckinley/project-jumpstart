/**
 * @module components/memory/MemoryDashboard.test
 * @description Unit tests for MemoryDashboard component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryDashboard } from "./MemoryDashboard";
import type { MemoryHealth, MemorySource } from "@/types/memory";

const mockHealth: MemoryHealth = {
  totalSources: 5,
  totalLines: 850,
  totalLearnings: 12,
  activeLearnings: 8,
  claudeMdLines: 112,
  claudeMdScore: 85,
  rulesFileCount: 4,
  skillsCount: 3,
  estimatedTokenUsage: 15000,
  healthRating: "excellent",
};

const mockSources: MemorySource[] = [
  {
    path: "/project/CLAUDE.md",
    sourceType: "claude-md",
    name: "CLAUDE.md",
    lineCount: 112,
    sizeBytes: 4500,
    lastModified: "2026-02-16T00:00:00Z",
    description: "Project memory file",
  },
  {
    path: "/project/.claude/rules/testing.md",
    sourceType: "rules",
    name: "testing.md",
    lineCount: 80,
    sizeBytes: 2200,
    lastModified: "2026-02-16T00:00:00Z",
    description: "Testing rules",
  },
  {
    path: "/project/.claude/skills/tdd-workflow/SKILL.md",
    sourceType: "skills",
    name: "tdd-workflow",
    lineCount: 45,
    sizeBytes: 1200,
    lastModified: "2026-02-16T00:00:00Z",
    description: "TDD workflow skill",
  },
];

describe("MemoryDashboard", () => {
  describe("rendering with health data", () => {
    it("should render Memory Health heading", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Memory Health")).toBeInTheDocument();
    });

    it("should display CLAUDE.md score", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("85")).toBeInTheDocument();
      // "CLAUDE.md" appears multiple times (score label + source name), so use getAllByText
      expect(screen.getAllByText("CLAUDE.md").length).toBeGreaterThanOrEqual(1);
    });

    it("should display health rating badge", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("should display quick stats", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("5")).toBeInTheDocument(); // totalSources
      // "Memory Sources" appears in both heading and stat card
      expect(screen.getAllByText("Memory Sources").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("12")).toBeInTheDocument(); // totalLearnings
      expect(screen.getByText("Total Learnings")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument(); // activeLearnings
      expect(screen.getByText("Active Learnings")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument(); // rulesFileCount
      expect(screen.getByText("Rules Files")).toBeInTheDocument();
    });

    it("should display skills count and total lines", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("3")).toBeInTheDocument(); // skillsCount
      expect(screen.getByText("Skills Count")).toBeInTheDocument();
      expect(screen.getByText("850")).toBeInTheDocument(); // totalLines
      expect(screen.getByText("Total Lines")).toBeInTheDocument();
    });

    it("should display token usage bar", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Estimated Token Usage")).toBeInTheDocument();
      expect(screen.getByText("15.0k / 200.0k")).toBeInTheDocument();
    });
  });

  describe("health rating badges", () => {
    it("should show Good badge for good rating", () => {
      const goodHealth = { ...mockHealth, healthRating: "good" as const };
      render(
        <MemoryDashboard
          health={goodHealth}
          sources={[]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it("should show Needs Attention badge", () => {
      const attentionHealth = { ...mockHealth, healthRating: "needs-attention" as const };
      render(
        <MemoryDashboard
          health={attentionHealth}
          sources={[]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    });

    it("should show Poor badge", () => {
      const poorHealth = { ...mockHealth, healthRating: "poor" as const };
      render(
        <MemoryDashboard
          health={poorHealth}
          sources={[]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Poor")).toBeInTheDocument();
    });
  });

  describe("memory sources list", () => {
    it("should render source names", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      // CLAUDE.md appears in both score section and source list
      expect(screen.getAllByText("CLAUDE.md").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("testing.md")).toBeInTheDocument();
      expect(screen.getByText("tdd-workflow")).toBeInTheDocument();
    });

    it("should render source type badges", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("claude-md")).toBeInTheDocument();
      expect(screen.getByText("rules")).toBeInTheDocument();
      expect(screen.getByText("skills")).toBeInTheDocument();
    });

    it("should render source line counts", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      // "112 lines" appears in both the score section and the source list
      expect(screen.getAllByText("112 lines").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("80 lines")).toBeInTheDocument();
      expect(screen.getByText("45 lines")).toBeInTheDocument();
    });

    it("should render source type icons", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("M")).toBeInTheDocument(); // claude-md icon
      expect(screen.getByText("R")).toBeInTheDocument(); // rules icon
      expect(screen.getByText("S")).toBeInTheDocument(); // skills icon
    });

    it("should show empty state when no sources", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={[]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(
        screen.getByText("No memory sources found. Create a CLAUDE.md file to get started."),
      ).toBeInTheDocument();
    });
  });

  describe("null health state", () => {
    it("should render zero values when health is null", () => {
      render(
        <MemoryDashboard
          health={null}
          sources={[]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      // Multiple zeroes appear (score, stats, token usage)
      expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("refresh button", () => {
    it("should call onRefresh when clicked", () => {
      const onRefresh = vi.fn();
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={false}
          onRefresh={onRefresh}
        />,
      );

      fireEvent.click(screen.getByText("Refresh"));
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("should show Loading... text when loading", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={true}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should be disabled when loading", () => {
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={mockSources}
          loading={true}
          onRefresh={vi.fn()}
        />,
      );

      const button = screen.getByText("Loading...");
      expect(button).toBeDisabled();
    });
  });

  describe("formatting", () => {
    it("should format bytes correctly for KB values", () => {
      const source: MemorySource = {
        path: "/test",
        sourceType: "rules",
        name: "test.md",
        lineCount: 10,
        sizeBytes: 2200,
        lastModified: "2026-02-16T00:00:00Z",
        description: "Test file",
      };
      render(
        <MemoryDashboard
          health={mockHealth}
          sources={[source]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("2.1 KB")).toBeInTheDocument();
    });

    it("should format high token usage percentage", () => {
      const highTokenHealth = { ...mockHealth, estimatedTokenUsage: 180000 };
      render(
        <MemoryDashboard
          health={highTokenHealth}
          sources={[]}
          loading={false}
          onRefresh={vi.fn()}
        />,
      );

      expect(screen.getByText("90% of context window")).toBeInTheDocument();
    });
  });
});
