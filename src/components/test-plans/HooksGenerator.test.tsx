/**
 * @module components/test-plans/HooksGenerator.test
 * @description Unit tests for HooksGenerator component (multi-hook support)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HooksGenerator } from "./HooksGenerator";

describe("HooksGenerator", () => {
  describe("rendering", () => {
    it("should render heading", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByText("Hooks Generator")).toBeInTheDocument();
    });

    it("should render description", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByText("Generate Claude Code hooks for automation")).toBeInTheDocument();
    });

    it("should render all hook type tabs", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByText("PostToolUse")).toBeInTheDocument();
      expect(screen.getByText("PreCompact")).toBeInTheDocument();
      expect(screen.getByText("SessionEnd")).toBeInTheDocument();
      expect(screen.getByText("Skill Hook")).toBeInTheDocument();
    });

    it("should default to PostToolUse tab", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByText("Auto-run tests after file edits")).toBeInTheDocument();
    });

    it("should render command input", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByDisplayValue("pnpm vitest run --reporter=verbose")).toBeInTheDocument();
    });

    it("should render generate button", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByText("Generate JSON Config")).toBeInTheDocument();
    });
  });

  describe("default command", () => {
    it("should use custom defaultCommand when provided", () => {
      render(
        <HooksGenerator
          defaultCommand="cargo test"
          onGenerate={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue("cargo test")).toBeInTheDocument();
    });
  });

  describe("hook type switching", () => {
    it("should switch to PreCompact tab", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("PreCompact"));

      expect(screen.getByText("Preserve context before compaction")).toBeInTheDocument();
      expect(screen.getByDisplayValue(".claude/hooks/pre-compact.sh")).toBeInTheDocument();
    });

    it("should switch to SessionEnd tab", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("SessionEnd"));

      expect(screen.getByText("Extract learnings at session end")).toBeInTheDocument();
      expect(screen.getByDisplayValue(".claude/hooks/extract-learnings.sh")).toBeInTheDocument();
    });

    it("should switch to Skill Hook tab", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("Skill Hook"));

      expect(screen.getByText("Attach hooks to a SKILL.md file")).toBeInTheDocument();
      expect(screen.getByText("Generate YAML Config")).toBeInTheDocument();
    });

    it("should show file patterns for PostToolUse", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      expect(screen.getByText("File Patterns (comma-separated)")).toBeInTheDocument();
    });

    it("should show file patterns for Skill Hook", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("Skill Hook"));

      expect(screen.getByText("File Patterns (comma-separated)")).toBeInTheDocument();
    });

    it("should not show file patterns for PreCompact", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("PreCompact"));

      expect(screen.queryByText("File Patterns (comma-separated)")).not.toBeInTheDocument();
    });

    it("should show timeout input for PreCompact", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("PreCompact"));

      expect(screen.getByText("Timeout (ms)")).toBeInTheDocument();
    });

    it("should show timeout input for SessionEnd", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("SessionEnd"));

      expect(screen.getByText("Timeout (ms)")).toBeInTheDocument();
    });

    it("should show hook event selector for Skill Hook", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("Skill Hook"));

      expect(screen.getByText("Hook Event")).toBeInTheDocument();
      expect(screen.getByDisplayValue("PostToolUse (after file edits)")).toBeInTheDocument();
    });
  });

  describe("PreCompact generation", () => {
    it("should generate PreCompact JSON config", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("PreCompact"));
      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(screen.getByText("Generated JSON:")).toBeInTheDocument();
      });

      const preElement = screen.getByText(/PreCompact/i, { selector: "pre" });
      expect(preElement.textContent).toContain("PreCompact");
      expect(preElement.textContent).toContain(".claude/hooks/pre-compact.sh");
    });
  });

  describe("SessionEnd generation", () => {
    it("should generate SessionEnd JSON config", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("SessionEnd"));
      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(screen.getByText("Generated JSON:")).toBeInTheDocument();
      });

      const preElement = screen.getByText(/SessionEnd/i, { selector: "pre" });
      expect(preElement.textContent).toContain("SessionEnd");
      expect(preElement.textContent).toContain(".claude/hooks/extract-learnings.sh");
    });
  });

  describe("Skill Hook generation", () => {
    it("should generate Skill YAML config", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("Skill Hook"));
      fireEvent.click(screen.getByText("Generate YAML Config"));

      await waitFor(() => {
        expect(screen.getByText("Generated YAML:")).toBeInTheDocument();
      });

      // Find the pre element directly
      const preElement = document.querySelector("pre");
      expect(preElement?.textContent).toContain("hooks:");
      expect(preElement?.textContent).toContain("event: PostToolUse");
    });
  });

  describe("PostToolUse generation", () => {
    it("should call onGenerate with command and patterns", async () => {
      const onGenerate = vi.fn().mockResolvedValue('{"hooks": {}}');
      render(<HooksGenerator onGenerate={onGenerate} />);

      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(onGenerate).toHaveBeenCalledWith(
          "pnpm vitest run --reporter=verbose",
          ["*.ts", "*.tsx"],
        );
      });
    });

    it("should show generated config after PostToolUse generation", async () => {
      const mockConfig = JSON.stringify({ hooks: { PostToolUse: [] } }, null, 2);
      const onGenerate = vi.fn().mockResolvedValue(mockConfig);
      render(<HooksGenerator onGenerate={onGenerate} />);

      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(screen.getByText("Generated JSON:")).toBeInTheDocument();
      });
    });
  });

  describe("copy to clipboard", () => {
    it("should show Copy button after generation", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("PreCompact"));
      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(screen.getByText("Copy")).toBeInTheDocument();
      });
    });
  });

  describe("help text", () => {
    it("should show settings.json help for non-skill hooks", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("PreCompact"));
      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(screen.getByText(".claude/settings.json")).toBeInTheDocument();
      });
    });

    it("should show SKILL.md help for skill hooks", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      fireEvent.click(screen.getByText("Skill Hook"));
      fireEvent.click(screen.getByText("Generate YAML Config"));

      await waitFor(() => {
        expect(screen.getByText(".claude/skills/*/SKILL.md")).toBeInTheDocument();
      });
    });
  });

  describe("button states", () => {
    it("should disable button when command is empty", () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      const input = screen.getByDisplayValue("pnpm vitest run --reporter=verbose");
      fireEvent.change(input, { target: { value: "" } });

      const button = screen.getByText("Generate JSON Config");
      expect(button).toBeDisabled();
    });

    it("should show Generating... while in progress", async () => {
      const onGenerate = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve("{}"), 200)),
      );
      render(<HooksGenerator onGenerate={onGenerate} />);

      fireEvent.click(screen.getByText("Generate JSON Config"));

      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });
  });

  describe("clearing config on tab switch", () => {
    it("should clear generated config when switching tabs", async () => {
      render(<HooksGenerator onGenerate={vi.fn()} />);

      // Generate PreCompact config
      fireEvent.click(screen.getByText("PreCompact"));
      fireEvent.click(screen.getByText("Generate JSON Config"));

      await waitFor(() => {
        expect(screen.getByText("Generated JSON:")).toBeInTheDocument();
      });

      // Switch to SessionEnd
      fireEvent.click(screen.getByText("SessionEnd"));

      expect(screen.queryByText("Generated JSON:")).not.toBeInTheDocument();
    });
  });
});
