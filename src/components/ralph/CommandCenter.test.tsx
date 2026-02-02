/**
 * @module components/ralph/CommandCenter.test
 * @description Unit tests for CommandCenter component context banner display
 *
 * PURPOSE:
 * - Test context banner visibility based on context state
 * - Test mistake display with up to 3 items
 * - Test overflow indicator for >3 mistakes
 * - Test resolution text display
 *
 * DEPENDENCIES:
 * - @/components/ralph/CommandCenter - Component under test
 * - @testing-library/react - render, screen utilities
 * - @testing-library/user-event - User interaction simulation
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Render component with mock props
 * - Test banner visibility with context/no context
 * - Test mistake list rendering and overflow
 *
 * CLAUDE NOTES:
 * - Banner only shows when context has recentMistakes
 * - Maximum 3 mistakes shown, then "+N more" indicator
 * - Resolution text shows with arrow separator
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandCenter } from "./CommandCenter";
import type { RalphLoopContext, RalphMistake, PromptAnalysis } from "@/types/ralph";

const createMistake = (
  id: string,
  description: string,
  resolution: string | null = null
): RalphMistake => ({
  id,
  projectId: "project-1",
  loopId: null,
  mistakeType: "implementation",
  description,
  context: null,
  resolution,
  learnedPattern: null,
  createdAt: "2024-01-15T10:00:00Z",
});

const mockContextWithMistakes: RalphLoopContext = {
  claudeMdSummary: "Project Jumpstart summary...",
  recentMistakes: [
    createMistake("1", "Forgot to handle null case", "Added null check"),
    createMistake("2", "Missing error boundary", null),
    createMistake("3", "Race condition in async code", "Added mutex"),
    createMistake("4", "Old mistake to test overflow", null),
  ],
  projectPatterns: ["Use async/await", "Prefer composition"],
};

const mockContextEmpty: RalphLoopContext = {
  claudeMdSummary: "Project summary...",
  recentMistakes: [],
  projectPatterns: [],
};

const mockAnalysis: PromptAnalysis = {
  qualityScore: 75,
  criteria: [],
  suggestions: [],
  enhancedPrompt: null,
};

const defaultProps = {
  analysis: null as PromptAnalysis | null,
  context: null as RalphLoopContext | null,
  analyzing: false,
  loading: false,
  onAnalyze: vi.fn(),
  onStartLoop: vi.fn(),
  onStartLoopPrd: vi.fn(),
  onClearAnalysis: vi.fn(),
};

describe("CommandCenter", () => {
  describe("context banner visibility", () => {
    it("should not show banner when context is null", () => {
      render(<CommandCenter {...defaultProps} context={null} />);

      expect(screen.queryByText("Learned from Previous Loops")).not.toBeInTheDocument();
    });

    it("should not show banner when recentMistakes is empty", () => {
      render(<CommandCenter {...defaultProps} context={mockContextEmpty} />);

      expect(screen.queryByText("Learned from Previous Loops")).not.toBeInTheDocument();
    });

    it("should show banner when context has mistakes", () => {
      render(<CommandCenter {...defaultProps} context={mockContextWithMistakes} />);

      expect(screen.getByText("Learned from Previous Loops")).toBeInTheDocument();
    });
  });

  describe("mistake display", () => {
    it("should show up to 3 recent mistakes", () => {
      render(<CommandCenter {...defaultProps} context={mockContextWithMistakes} />);

      expect(screen.getByText(/Forgot to handle null case/)).toBeInTheDocument();
      expect(screen.getByText(/Missing error boundary/)).toBeInTheDocument();
      expect(screen.getByText(/Race condition in async code/)).toBeInTheDocument();
    });

    it("should not show more than 3 mistakes", () => {
      render(<CommandCenter {...defaultProps} context={mockContextWithMistakes} />);

      // The 4th mistake should not be displayed
      expect(screen.queryByText(/Old mistake to test overflow/)).not.toBeInTheDocument();
    });

    it("should show overflow indicator when >3 mistakes", () => {
      render(<CommandCenter {...defaultProps} context={mockContextWithMistakes} />);

      // Should show "+1 more learned patterns"
      expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
    });

    it("should not show overflow indicator when exactly 3 mistakes", () => {
      const contextWith3 = {
        ...mockContextWithMistakes,
        recentMistakes: mockContextWithMistakes.recentMistakes.slice(0, 3),
      };
      render(<CommandCenter {...defaultProps} context={contextWith3} />);

      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });

    it("should show correct count for multiple overflow", () => {
      const contextWith5 = {
        ...mockContextWithMistakes,
        recentMistakes: [
          ...mockContextWithMistakes.recentMistakes,
          createMistake("5", "Fifth mistake", null),
        ],
      };
      render(<CommandCenter {...defaultProps} context={contextWith5} />);

      expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
    });
  });

  describe("resolution display", () => {
    it("should show resolution text when available", () => {
      render(<CommandCenter {...defaultProps} context={mockContextWithMistakes} />);

      // Resolution should appear with arrow separator
      expect(screen.getByText(/Added null check/)).toBeInTheDocument();
      expect(screen.getByText(/Added mutex/)).toBeInTheDocument();
    });

    it("should not show resolution for mistakes without resolution", () => {
      const contextWithNoResolution = {
        ...mockContextEmpty,
        recentMistakes: [createMistake("1", "Test mistake", null)],
      };
      render(<CommandCenter {...defaultProps} context={contextWithNoResolution} />);

      expect(screen.getByText(/Test mistake/)).toBeInTheDocument();
      // Arrow separator shouldn't appear
      expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    });
  });

  describe("single mistake", () => {
    it("should render correctly with single mistake", () => {
      const contextWithOne = {
        ...mockContextEmpty,
        recentMistakes: [createMistake("1", "Only one mistake", "Fixed it")],
      };
      render(<CommandCenter {...defaultProps} context={contextWithOne} />);

      expect(screen.getByText("Learned from Previous Loops")).toBeInTheDocument();
      expect(screen.getByText(/Only one mistake/)).toBeInTheDocument();
      expect(screen.getByText(/Fixed it/)).toBeInTheDocument();
      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });
  });

  describe("prompt input and controls", () => {
    it("should render prompt textarea", () => {
      render(<CommandCenter {...defaultProps} />);

      expect(screen.getByPlaceholderText(/Describe what you want/)).toBeInTheDocument();
    });

    it("should render Check Prompt button", () => {
      render(<CommandCenter {...defaultProps} />);

      expect(screen.getByText("Check Prompt")).toBeInTheDocument();
    });

    it("should render Start RALPH Loop button", () => {
      render(<CommandCenter {...defaultProps} />);

      expect(screen.getByText("Start RALPH Loop")).toBeInTheDocument();
    });

    it("should show example prompt buttons", () => {
      render(<CommandCenter {...defaultProps} />);

      expect(screen.getByText("Add a feature")).toBeInTheDocument();
      expect(screen.getByText("Fix a bug")).toBeInTheDocument();
      expect(screen.getByText("Refactor code")).toBeInTheDocument();
    });

    it("should disable Check Prompt when prompt is empty", () => {
      render(<CommandCenter {...defaultProps} />);

      const checkButton = screen.getByText("Check Prompt");
      expect(checkButton).toBeDisabled();
    });

    it("should disable Start Loop when prompt is empty", () => {
      render(<CommandCenter {...defaultProps} />);

      const startButton = screen.getByText("Start RALPH Loop");
      expect(startButton).toBeDisabled();
    });

    it("should enable Start Loop when prompt has text (no analysis required)", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/);
      await user.type(textarea, "Test prompt text");

      const startButton = screen.getByText("Start RALPH Loop");
      expect(startButton).not.toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("should call onAnalyze when Check Prompt clicked with text", async () => {
      const user = userEvent.setup();
      const onAnalyze = vi.fn();
      render(<CommandCenter {...defaultProps} onAnalyze={onAnalyze} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/);
      await user.type(textarea, "Test prompt text");

      const checkButton = screen.getByText("Check Prompt");
      await user.click(checkButton);

      expect(onAnalyze).toHaveBeenCalledWith("Test prompt text");
    });

    it("should fill prompt when example button clicked", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      const exampleButton = screen.getByText("Add a feature");
      await user.click(exampleButton);

      const textarea = screen.getByPlaceholderText(/Describe what you want/) as HTMLTextAreaElement;
      expect(textarea.value).toContain("GOAL:");
      expect(textarea.value).toContain("CSV export");
    });

    it("should show score when analysis exists", () => {
      render(<CommandCenter {...defaultProps} analysis={mockAnalysis} />);

      expect(screen.getByText("Score: 75/100")).toBeInTheDocument();
    });

    it("should show Checking... when analyzing", () => {
      render(<CommandCenter {...defaultProps} analyzing={true} />);

      expect(screen.getByText("Checking...")).toBeInTheDocument();
    });

    it("should show Starting... when loading", () => {
      render(<CommandCenter {...defaultProps} analysis={mockAnalysis} loading={true} />);

      expect(screen.getByText("Starting...")).toBeInTheDocument();
    });
  });

  describe("auto-enhance button", () => {
    it("should not show when no enhanced prompt", () => {
      render(<CommandCenter {...defaultProps} analysis={mockAnalysis} />);

      expect(screen.queryByText("Auto-Enhance")).not.toBeInTheDocument();
    });

    it("should show when enhanced prompt exists", () => {
      const analysisWithEnhanced: PromptAnalysis = {
        ...mockAnalysis,
        enhancedPrompt: "Enhanced version of the prompt",
      };
      render(<CommandCenter {...defaultProps} analysis={analysisWithEnhanced} />);

      expect(screen.getByText("Auto-Enhance")).toBeInTheDocument();
    });
  });
});
