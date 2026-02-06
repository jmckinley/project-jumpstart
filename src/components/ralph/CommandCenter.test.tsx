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
import { render, screen, fireEvent } from "@testing-library/react";
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

    it("should apply enhanced prompt and re-analyze when clicked", async () => {
      const user = userEvent.setup();
      const onAnalyze = vi.fn();
      const analysisWithEnhanced: PromptAnalysis = {
        ...mockAnalysis,
        enhancedPrompt: "Enhanced version of the prompt",
      };
      render(<CommandCenter {...defaultProps} analysis={analysisWithEnhanced} onAnalyze={onAnalyze} />);

      const enhanceButton = screen.getByText("Auto-Enhance");
      await user.click(enhanceButton);

      expect(onAnalyze).toHaveBeenCalledWith("Enhanced version of the prompt");
    });
  });

  describe("mode toggle", () => {
    it("should render mode toggle buttons", () => {
      render(<CommandCenter {...defaultProps} />);

      expect(screen.getByText("Iterative")).toBeInTheDocument();
      expect(screen.getByText("PRD")).toBeInTheDocument();
    });

    it("should start in iterative mode by default", () => {
      render(<CommandCenter {...defaultProps} />);

      // Should show iterative mode content
      expect(screen.getByPlaceholderText(/Describe what you want/)).toBeInTheDocument();
      expect(screen.getByText("Iterative Mode:")).toBeInTheDocument();
    });

    it("should switch to PRD mode when PRD button clicked", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      const prdButton = screen.getByText("PRD");
      await user.click(prdButton);

      // Should show PRD mode content
      expect(screen.getByText("PRD Mode:")).toBeInTheDocument();
      expect(screen.getByText("Start PRD Loop")).toBeInTheDocument();
    });

    it("should switch back to iterative mode", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      // Switch to PRD
      await user.click(screen.getByText("PRD"));
      expect(screen.getByText("PRD Mode:")).toBeInTheDocument();

      // Switch back to Iterative
      await user.click(screen.getByText("Iterative"));
      expect(screen.getByText("Iterative Mode:")).toBeInTheDocument();
    });
  });

  describe("PRD mode", () => {
    it("should show PRD JSON textarea when in PRD mode", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      expect(screen.getByText("PRD JSON")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter your PRD as JSON/)).toBeInTheDocument();
    });

    it("should show Start PRD Loop button in PRD mode", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      expect(screen.getByText("Start PRD Loop")).toBeInTheDocument();
    });

    it("should show template buttons in PRD mode", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      expect(screen.getByText("Load CSV Export Example")).toBeInTheDocument();
      expect(screen.getByText("Reset to Template")).toBeInTheDocument();
    });

    it("should load example PRD when example button clicked", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));
      await user.click(screen.getByText("Load CSV Export Example"));

      const textarea = screen.getByPlaceholderText(/Enter your PRD as JSON/) as HTMLTextAreaElement;
      expect(textarea.value).toContain("Add CSV Export");
      expect(textarea.value).toContain("csv-1");
    });

    it("should show error for invalid JSON", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      const textarea = screen.getByPlaceholderText(/Enter your PRD as JSON/);
      fireEvent.change(textarea, { target: { value: "invalid json" } });

      expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
    });

    it("should show error for PRD without name", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      const textarea = screen.getByPlaceholderText(/Enter your PRD as JSON/);
      fireEvent.change(textarea, { target: { value: JSON.stringify({ stories: [{ id: "1" }] }) } });

      expect(screen.getByText(/must have a name/)).toBeInTheDocument();
    });

    it("should show error for PRD without stories", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      const textarea = screen.getByPlaceholderText(/Enter your PRD as JSON/);
      fireEvent.change(textarea, { target: { value: JSON.stringify({ name: "Test", stories: [] }) } });

      expect(screen.getByText(/at least one story/)).toBeInTheDocument();
    });

    it("should show PRD preview when valid", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      // Default template is valid, should show preview
      expect(screen.getByText("My Feature")).toBeInTheDocument();
      expect(screen.getByText("Story 1: Setup")).toBeInTheDocument();
    });

    it("should disable Start PRD Loop when PRD is invalid", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      const textarea = screen.getByPlaceholderText(/Enter your PRD as JSON/);
      fireEvent.change(textarea, { target: { value: "invalid json" } });

      const startButton = screen.getByText("Start PRD Loop");
      expect(startButton).toBeDisabled();
    });

    it("should enable Start PRD Loop when PRD is valid", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      // Default template is valid
      const startButton = screen.getByText("Start PRD Loop");
      expect(startButton).not.toBeDisabled();
    });

    it("should call onStartLoopPrd when Start PRD Loop clicked", async () => {
      const user = userEvent.setup();
      const onStartLoopPrd = vi.fn().mockResolvedValue(undefined);
      render(<CommandCenter {...defaultProps} onStartLoopPrd={onStartLoopPrd} />);

      await user.click(screen.getByText("PRD"));
      await user.click(screen.getByText("Start PRD Loop"));

      expect(onStartLoopPrd).toHaveBeenCalled();
      // Should be called with JSON string
      const callArg = onStartLoopPrd.mock.calls[0][0];
      expect(() => JSON.parse(callArg)).not.toThrow();
    });

    it("should show story count and branch in PRD preview", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      // Check for story count in the action area
      expect(screen.getByText(/execute 3 stories/)).toBeInTheDocument();
      // Check that branch is mentioned (use getAllByText since it appears in multiple places)
      const branchTexts = screen.getAllByText(/feature\/my-feature/);
      expect(branchTexts.length).toBeGreaterThan(0);
    });

    it("should show PRD field reference in details", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      expect(screen.getByText("PRD Field Reference")).toBeInTheDocument();
    });
  });

  describe("starting loops", () => {
    it("should call onStartLoop when Start RALPH Loop clicked", async () => {
      const user = userEvent.setup();
      const onStartLoop = vi.fn().mockResolvedValue(undefined);
      render(<CommandCenter {...defaultProps} onStartLoop={onStartLoop} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/);
      await user.type(textarea, "Fix the bug in auth.ts");

      await user.click(screen.getByText("Start RALPH Loop"));

      expect(onStartLoop).toHaveBeenCalledWith("Fix the bug in auth.ts");
    });

    it("should clear prompt after starting loop", async () => {
      const user = userEvent.setup();
      const onStartLoop = vi.fn().mockResolvedValue(undefined);
      const onClearAnalysis = vi.fn();
      render(<CommandCenter {...defaultProps} onStartLoop={onStartLoop} onClearAnalysis={onClearAnalysis} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/) as HTMLTextAreaElement;
      await user.type(textarea, "Test prompt");
      await user.click(screen.getByText("Start RALPH Loop"));

      expect(textarea.value).toBe("");
      expect(onClearAnalysis).toHaveBeenCalled();
    });

    it("should show success message after starting loop", async () => {
      const user = userEvent.setup();
      const onStartLoop = vi.fn().mockResolvedValue(undefined);
      render(<CommandCenter {...defaultProps} onStartLoop={onStartLoop} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/);
      await user.type(textarea, "Test prompt");
      await user.click(screen.getByText("Start RALPH Loop"));

      expect(screen.getByText(/RALPH loop started/)).toBeInTheDocument();
    });
  });

  describe("clear button", () => {
    it("should show Clear button when analysis exists", () => {
      render(<CommandCenter {...defaultProps} analysis={mockAnalysis} />);

      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("should clear prompt and analysis when Clear clicked", async () => {
      const user = userEvent.setup();
      const onClearAnalysis = vi.fn();
      render(<CommandCenter {...defaultProps} analysis={mockAnalysis} onClearAnalysis={onClearAnalysis} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/) as HTMLTextAreaElement;
      await user.type(textarea, "Some text");

      await user.click(screen.getByText("Clear"));

      expect(textarea.value).toBe("");
      expect(onClearAnalysis).toHaveBeenCalled();
    });

    it("should show Clear button in PRD mode", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("should reset PRD JSON when Clear clicked in PRD mode", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} />);

      await user.click(screen.getByText("PRD"));

      // Modify the PRD JSON
      const textarea = screen.getByPlaceholderText(/Enter your PRD as JSON/) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: JSON.stringify({ name: "Modified", stories: [{ id: "1", title: "X" }] }) } });

      // Verify it changed
      expect(textarea.value).toContain("Modified");

      await user.click(screen.getByText("Clear"));

      // Should reset to default template
      expect(textarea.value).toContain("My Feature");
    });
  });

  describe("loading states", () => {
    it("should disable Check Prompt while analyzing", () => {
      render(<CommandCenter {...defaultProps} analyzing={true} />);

      // Need to have text to normally enable the button
      const checkButton = screen.getByText("Checking...");
      expect(checkButton).toBeDisabled();
    });

    it("should disable Start Loop while loading", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} loading={true} />);

      const textarea = screen.getByPlaceholderText(/Describe what you want/);
      await user.type(textarea, "Test");

      const startButton = screen.getByText("Starting...");
      expect(startButton).toBeDisabled();
    });

    it("should disable Start PRD Loop while loading", async () => {
      const user = userEvent.setup();
      render(<CommandCenter {...defaultProps} loading={true} />);

      await user.click(screen.getByText("PRD"));

      const startButton = screen.getByText("Starting...");
      expect(startButton).toBeDisabled();
    });
  });

  describe("What is Ralph link", () => {
    it("should render link to Ralph GitHub", () => {
      render(<CommandCenter {...defaultProps} />);

      const link = screen.getByText("What is Ralph?");
      expect(link).toHaveAttribute("href", "https://github.com/snarktank/ralph");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("score display", () => {
    it("should show green score for high quality", () => {
      const highScore: PromptAnalysis = { ...mockAnalysis, qualityScore: 85 };
      render(<CommandCenter {...defaultProps} analysis={highScore} />);

      const scoreText = screen.getByText("Score: 85/100");
      expect(scoreText).toHaveClass("text-green-400");
    });

    it("should show yellow score for medium quality", () => {
      const mediumScore: PromptAnalysis = { ...mockAnalysis, qualityScore: 55 };
      render(<CommandCenter {...defaultProps} analysis={mediumScore} />);

      const scoreText = screen.getByText("Score: 55/100");
      expect(scoreText).toHaveClass("text-yellow-400");
    });

    it("should show red score for low quality", () => {
      const lowScore: PromptAnalysis = { ...mockAnalysis, qualityScore: 25 };
      render(<CommandCenter {...defaultProps} analysis={lowScore} />);

      const scoreText = screen.getByText("Score: 25/100");
      expect(scoreText).toHaveClass("text-red-400");
    });
  });
});
