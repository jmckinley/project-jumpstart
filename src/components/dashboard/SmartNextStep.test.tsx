/**
 * @module components/dashboard/SmartNextStep.test
 * @description Unit tests for SmartNextStep component
 *
 * PURPOSE:
 * - Test recommendation logic based on project state
 * - Test hooks-setup recommendation visibility
 * - Test dismiss behavior (Later/Skip)
 * - Test navigation action button
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
 * - Mock Tauri API calls for getSetting and saveSetting
 * - Test priority ordering of recommendations
 * - Test dismiss persistence (session vs permanent)
 *
 * CLAUDE NOTES:
 * - hooks-setup has priority 7 (shows after setup phase)
 * - Later dismisses for 24 hours (session)
 * - Skip dismisses permanently
 * - all-good card shown when everything is configured
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SmartNextStep } from "./SmartNextStep";

// Mock Tauri API
vi.mock("@/lib/tauri", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
  saveSetting: vi.fn().mockResolvedValue(undefined),
}));

import { getSetting, saveSetting } from "@/lib/tauri";

describe("SmartNextStep", () => {
  const defaultProps = {
    hasApiKey: true,
    hasClaudeMd: true,
    isEmptyProject: false,
    moduleCoverage: 80,
    totalModules: 10,
    staleModules: 0,
    hasSkills: true,
    hasAgents: true,
    hasEnforcement: true,
    hasTestFramework: true,
    hasTestPlan: true,
    hasClaudeCodeHooks: true,
    testCoverage: 80,
    contextRotRisk: "low" as const,
    projectId: "test-project-1",
    onNavigate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSetting).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Recommendation Priority", () => {
    it("shows API key recommendation when hasApiKey=false", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasApiKey={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Add your Anthropic API key")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Add API Key/i })).toBeInTheDocument();
    });

    it("shows kickstart recommendation for empty project without CLAUDE.md", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasApiKey={true}
          hasClaudeMd={false}
          isEmptyProject={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Generate a Kickstart prompt")).toBeInTheDocument();
      });
    });

    it("shows claude-md recommendation when hasApiKey=true and no CLAUDE.md", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasApiKey={true}
          hasClaudeMd={false}
          isEmptyProject={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Generate your CLAUDE.md")).toBeInTheDocument();
      });
    });

    it("shows hooks-setup recommendation when hasTestFramework=true && hasClaudeCodeHooks=false", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
          // Clear other recommendations to ensure hooks-setup shows
          hasSkills={true}
          hasAgents={true}
          hasEnforcement={true}
          hasTestPlan={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Set up auto-test hooks")).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /Set Up Hooks/i })).toBeInTheDocument();
    });

    it("does NOT show hooks-setup when hasClaudeCodeHooks=true", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={true}
        />
      );

      // Wait for component to stabilize
      await waitFor(() => {
        expect(screen.queryByText("Set up auto-test hooks")).not.toBeInTheDocument();
      });
    });

    it("does NOT show hooks-setup when hasTestFramework=false", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={false}
          hasClaudeCodeHooks={false}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText("Set up auto-test hooks")).not.toBeInTheDocument();
      });
    });

    it("hooks-setup appears with priority 7 (after setup phase)", async () => {
      // With all setup complete except hooks, hooks-setup should show
      render(
        <SmartNextStep
          {...defaultProps}
          hasApiKey={true}
          hasClaudeMd={true}
          hasSkills={true}
          hasEnforcement={true}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
          staleModules={0}
          hasTestPlan={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Set up auto-test hooks")).toBeInTheDocument();
      });
    });
  });

  describe("Dismiss Behavior", () => {
    it("'Later' button dismisses for session (24h)", async () => {
      const user = userEvent.setup();

      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Set up auto-test hooks")).toBeInTheDocument();
      });

      const laterButton = screen.getByRole("button", { name: /Later/i });
      await user.click(laterButton);

      await waitFor(() => {
        expect(saveSetting).toHaveBeenCalledWith(
          "smart_next_dismissed_test-project-1",
          expect.stringContaining('"permanent":false')
        );
      });
    });

    it("'Skip' button permanently dismisses", async () => {
      const user = userEvent.setup();

      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Set up auto-test hooks")).toBeInTheDocument();
      });

      const skipButton = screen.getByRole("button", { name: /Skip/i });
      await user.click(skipButton);

      await waitFor(() => {
        expect(saveSetting).toHaveBeenCalledWith(
          "smart_next_dismissed_test-project-1",
          expect.stringContaining('"permanent":true')
        );
      });
    });
  });

  describe("Navigation", () => {
    it("action button calls onNavigate with correct section", async () => {
      const mockNavigate = vi.fn();
      const user = userEvent.setup();

      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
          onNavigate={mockNavigate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Set up auto-test hooks")).toBeInTheDocument();
      });

      const actionButton = screen.getByRole("button", { name: /Set Up Hooks/i });
      await user.click(actionButton);

      expect(mockNavigate).toHaveBeenCalledWith("hooks-setup");
    });
  });

  describe("All Good State", () => {
    it("shows all-good card when everything is configured", async () => {
      render(
        <SmartNextStep
          {...defaultProps}
          hasApiKey={true}
          hasClaudeMd={true}
          moduleCoverage={80}
          hasSkills={true}
          hasAgents={true}
          hasEnforcement={true}
          hasTestFramework={true}
          hasTestPlan={true}
          hasClaudeCodeHooks={true}
          staleModules={0}
          contextRotRisk="low"
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Your project is in great shape!")).toBeInTheDocument();
      });
    });
  });

  describe("Dismissed State Persistence", () => {
    it("loads dismissed state on mount", async () => {
      vi.mocked(getSetting).mockResolvedValue(
        JSON.stringify([{ id: "hooks-setup", at: Date.now(), permanent: true }])
      );

      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
        />
      );

      // Should NOT show hooks-setup because it was permanently dismissed
      await waitFor(() => {
        expect(screen.queryByText("Set up auto-test hooks")).not.toBeInTheDocument();
      });
    });

    it("clears expired session dismissals", async () => {
      // Set a dismissal older than 24 hours
      const oldTime = Date.now() - (25 * 60 * 60 * 1000);
      vi.mocked(getSetting).mockResolvedValue(
        JSON.stringify([{ id: "hooks-setup", at: oldTime, permanent: false }])
      );

      render(
        <SmartNextStep
          {...defaultProps}
          hasTestFramework={true}
          hasClaudeCodeHooks={false}
        />
      );

      // Should show hooks-setup because the dismissal expired
      await waitFor(() => {
        expect(screen.getByText("Set up auto-test hooks")).toBeInTheDocument();
      });
    });
  });
});
