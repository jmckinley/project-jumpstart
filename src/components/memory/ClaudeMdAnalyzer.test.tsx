/**
 * @module components/memory/ClaudeMdAnalyzer.test
 * @description Unit tests for ClaudeMdAnalyzer component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClaudeMdAnalyzer } from "./ClaudeMdAnalyzer";
import type { ClaudeMdAnalysis } from "@/types/memory";

const mockAnalysis: ClaudeMdAnalysis = {
  totalLines: 112,
  estimatedTokens: 4500,
  score: 85,
  sections: ["Overview", "Tech Stack", "Commands", "Status"],
  suggestions: [
    {
      suggestionType: "remove",
      message: "Remove verbose code examples that belong in rules/",
      lineRange: [50, 80],
      target: null,
    },
    {
      suggestionType: "move",
      message: "Move documentation format to .claude/rules/documentation.md",
      lineRange: [100, 150],
      target: ".claude/rules/documentation.md",
    },
  ],
  linesToRemove: [
    {
      lineNumber: 55,
      content: "// This is an example of a Tauri command...",
      reason: "Self-evident code example",
    },
  ],
  linesToMove: [
    {
      lineRange: [100, 120],
      contentPreview: "### TypeScript/React Documentation Format...",
      targetFile: ".claude/rules/documentation.md",
      reason: "Path-specific content belongs in rules file",
    },
  ],
};

describe("ClaudeMdAnalyzer", () => {
  describe("pre-analysis state", () => {
    it("should render CLAUDE.md Analysis heading", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={null}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("CLAUDE.md Analysis")).toBeInTheDocument();
    });

    it("should show analyze button", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={null}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Analyze")).toBeInTheDocument();
    });

    it("should show placeholder text before analysis", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={null}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(
        screen.getByText('Click "Analyze" to evaluate your CLAUDE.md quality'),
      ).toBeInTheDocument();
    });

    it("should call onAnalyze when button is clicked", () => {
      const onAnalyze = vi.fn();
      render(
        <ClaudeMdAnalyzer
          analysis={null}
          analyzing={false}
          onAnalyze={onAnalyze}
        />,
      );

      fireEvent.click(screen.getByText("Analyze"));
      expect(onAnalyze).toHaveBeenCalledTimes(1);
    });
  });

  describe("analyzing state", () => {
    it("should show Analyzing... text", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={null}
          analyzing={true}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });

    it("should disable button while analyzing", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={null}
          analyzing={true}
          onAnalyze={vi.fn()}
        />,
      );

      const button = screen.getByText("Analyzing...").closest("button")!;
      expect(button).toBeDisabled();
    });
  });

  describe("analysis results", () => {
    it("should display score", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("85")).toBeInTheDocument();
      expect(screen.getByText("Score")).toBeInTheDocument();
    });

    it("should display lines count", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("112")).toBeInTheDocument();
      expect(screen.getByText("Lines")).toBeInTheDocument();
    });

    it("should display token count", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("4.5k")).toBeInTheDocument();
      expect(screen.getByText("Tokens")).toBeInTheDocument();
    });

    it("should display sections count", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("Sections")).toBeInTheDocument();
    });

    it("should display detected section names", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Tech Stack")).toBeInTheDocument();
      expect(screen.getByText("Commands")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });
  });

  describe("suggestions", () => {
    it("should display suggestions heading with count", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Suggestions (2)")).toBeInTheDocument();
    });

    it("should display suggestion type badges", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Remove")).toBeInTheDocument();
      expect(screen.getByText("Move")).toBeInTheDocument();
    });

    it("should display suggestion messages", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(
        screen.getByText("Remove verbose code examples that belong in rules/"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Move documentation format to .claude/rules/documentation.md"),
      ).toBeInTheDocument();
    });

    it("should display line ranges for suggestions", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Lines 50-80")).toBeInTheDocument();
      expect(screen.getByText("Lines 100-150")).toBeInTheDocument();
    });

    it("should display target file for move suggestions", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(
        screen.getByText("Target: .claude/rules/documentation.md"),
      ).toBeInTheDocument();
    });
  });

  describe("lines to remove", () => {
    it("should display lines to remove heading with count", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Lines to Remove (1)")).toBeInTheDocument();
    });

    it("should display line number", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("L55")).toBeInTheDocument();
    });

    it("should display removal reason", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Self-evident code example")).toBeInTheDocument();
    });

    it("should display line content", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(
        screen.getByText("// This is an example of a Tauri command..."),
      ).toBeInTheDocument();
    });
  });

  describe("lines to move", () => {
    it("should display lines to move heading with count", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("Lines to Move (1)")).toBeInTheDocument();
    });

    it("should display line range", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("L100-120")).toBeInTheDocument();
    });

    it("should display target file", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText(".claude/rules/documentation.md")).toBeInTheDocument();
    });

    it("should display content preview", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(
        screen.getByText("### TypeScript/React Documentation Format..."),
      ).toBeInTheDocument();
    });

    it("should display move reason", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(
        screen.getByText("Path-specific content belongs in rules file"),
      ).toBeInTheDocument();
    });
  });

  describe("no issues state", () => {
    it("should show success message when no issues found", () => {
      const cleanAnalysis: ClaudeMdAnalysis = {
        totalLines: 80,
        estimatedTokens: 3000,
        score: 95,
        sections: ["Overview", "Commands"],
        suggestions: [],
        linesToRemove: [],
        linesToMove: [],
      };

      render(
        <ClaudeMdAnalyzer
          analysis={cleanAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("No issues found")).toBeInTheDocument();
      expect(screen.getByText("Your CLAUDE.md looks great!")).toBeInTheDocument();
    });
  });

  describe("low score display", () => {
    it("should use red color class for low scores", () => {
      const lowScoreAnalysis: ClaudeMdAnalysis = {
        totalLines: 500,
        estimatedTokens: 25000,
        score: 25,
        sections: ["Overview"],
        suggestions: [],
        linesToRemove: [],
        linesToMove: [],
      };

      render(
        <ClaudeMdAnalyzer
          analysis={lowScoreAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.getByText("25")).toBeInTheDocument();
    });
  });

  describe("apply actions", () => {
    it("should render Remove button on each line-to-remove when onApplyRemoval provided", () => {
      const onApplyRemoval = vi.fn();
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
          onApplyRemoval={onApplyRemoval}
        />,
      );

      const removeBtn = screen.getByRole("button", { name: "Remove" });
      expect(removeBtn).toBeInTheDocument();
      fireEvent.click(removeBtn);
      expect(onApplyRemoval).toHaveBeenCalledWith([55]);
    });

    it("should not render Remove button when onApplyRemoval is not provided", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    });

    it("should render Remove All button when multiple lines to remove", () => {
      const multiRemoveAnalysis: ClaudeMdAnalysis = {
        ...mockAnalysis,
        linesToRemove: [
          { lineNumber: 10, content: "line 10", reason: "self-evident" },
          { lineNumber: 20, content: "line 20", reason: "self-evident" },
        ],
      };
      const onApplyRemoval = vi.fn();
      render(
        <ClaudeMdAnalyzer
          analysis={multiRemoveAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
          onApplyRemoval={onApplyRemoval}
        />,
      );

      const removeAllBtn = screen.getByRole("button", { name: "Remove All" });
      expect(removeAllBtn).toBeInTheDocument();
      fireEvent.click(removeAllBtn);
      expect(onApplyRemoval).toHaveBeenCalledWith([10, 20]);
    });

    it("should not render Remove All button when only one line to remove", () => {
      const onApplyRemoval = vi.fn();
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
          onApplyRemoval={onApplyRemoval}
        />,
      );

      expect(screen.queryByRole("button", { name: "Remove All" })).not.toBeInTheDocument();
    });

    it("should render Move button on each line-to-move when onApplyMove provided", () => {
      const onApplyMove = vi.fn();
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
          onApplyMove={onApplyMove}
        />,
      );

      const moveBtn = screen.getByRole("button", { name: "Move" });
      expect(moveBtn).toBeInTheDocument();
      fireEvent.click(moveBtn);
      expect(onApplyMove).toHaveBeenCalledWith([100, 120], ".claude/rules/documentation.md");
    });

    it("should not render Move button when onApplyMove is not provided", () => {
      render(
        <ClaudeMdAnalyzer
          analysis={mockAnalysis}
          analyzing={false}
          onAnalyze={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: "Move" })).not.toBeInTheDocument();
    });
  });
});
