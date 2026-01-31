/**
 * @module components/enforcement/GitHookSetup.test
 * @description Unit tests for GitHookSetup component
 *
 * PURPOSE:
 * - Test status badge rendering for all hook states
 * - Test installation buttons for all three modes (auto-update, block, warn)
 * - Test Husky detection warning display
 * - Test external hook warning display
 *
 * PATTERNS:
 * - Uses @testing-library/react for rendering
 * - Uses vitest for mocking
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GitHookSetup } from "./GitHookSetup";
import type { HookStatus } from "@/types/enforcement";

const mockOnInstall = vi.fn();
const mockOnRefresh = vi.fn();

const defaultProps = {
  hookStatus: null,
  loading: false,
  installing: false,
  onInstall: mockOnInstall,
  onRefresh: mockOnRefresh,
};

describe("GitHookSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render the card title", () => {
      render(<GitHookSetup {...defaultProps} />);

      expect(screen.getByText("Git Pre-Commit Hook")).toBeInTheDocument();
    });

    it("should render description text", () => {
      render(<GitHookSetup {...defaultProps} />);

      expect(
        screen.getByText(/Install a pre-commit hook to enforce documentation headers/)
      ).toBeInTheDocument();
    });

    it("should render all three mode buttons", () => {
      render(<GitHookSetup {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Auto-Update (Recommended)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Block" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Warn" })).toBeInTheDocument();
    });

    it("should render Refresh button", () => {
      render(<GitHookSetup {...defaultProps} />);

      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    it("should render mode descriptions", () => {
      render(<GitHookSetup {...defaultProps} />);

      expect(screen.getByText(/Auto-update/)).toBeInTheDocument();
      expect(screen.getByText(/Generates missing docs via AI/)).toBeInTheDocument();
      expect(screen.getByText(/Prevents commits with missing doc headers/)).toBeInTheDocument();
      expect(screen.getByText(/Allows commits but prints warnings/)).toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("should show Unknown badge when hookStatus is null", () => {
      render(<GitHookSetup {...defaultProps} hookStatus={null} />);

      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    it("should show Installed badge with mode when installed", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "auto-update",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("Installed (auto-update)")).toBeInTheDocument();
    });

    it("should show External Hook badge for external hooks", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "external",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("External Hook")).toBeInTheDocument();
    });

    it("should show Not Installed badge when not installed", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("Not Installed")).toBeInTheDocument();
    });
  });

  describe("warning messages", () => {
    it("should show Husky warning when Husky is detected", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: true,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(
        screen.getByText(/Husky detected — the hook will be installed alongside/)
      ).toBeInTheDocument();
    });

    it("should not show Husky warning when Husky is not detected", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(
        screen.queryByText(/Husky detected/)
      ).not.toBeInTheDocument();
    });

    it("should show external hook warning", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "external",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(
        screen.getByText(/An external pre-commit hook is already installed/)
      ).toBeInTheDocument();
    });
  });

  describe("hook path display", () => {
    it("should show hook path when installed", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/test/project/.git/hooks/pre-commit",
        mode: "block",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(
        screen.getByText(/Hook path: \/test\/project\/.git\/hooks\/pre-commit/)
      ).toBeInTheDocument();
    });

    it("should not show hook path when not installed", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/test/project/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.queryByText(/Hook path:/)).not.toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onInstall with auto-update when Auto-Update button clicked", () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByText("Auto-Update (Recommended)"));

      expect(mockOnInstall).toHaveBeenCalledWith("auto-update");
    });

    it("should call onInstall with block when Block button clicked", () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Block" }));

      expect(mockOnInstall).toHaveBeenCalledWith("block");
    });

    it("should call onInstall with warn when Warn button clicked", () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Warn" }));

      expect(mockOnInstall).toHaveBeenCalledWith("warn");
    });

    it("should call onRefresh when Refresh button clicked", () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByText("Refresh"));

      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe("disabled states", () => {
    it("should disable all install buttons when installing", () => {
      render(<GitHookSetup {...defaultProps} installing={true} />);

      // When installing, the button texts change to "Installing..."
      const installingButtons = screen.getAllByText("Installing...");
      expect(installingButtons.length).toBe(3);

      installingButtons.forEach((button) => {
        expect(button.closest("button")).toBeDisabled();
      });
    });

    it("should disable all install buttons when loading", () => {
      render(<GitHookSetup {...defaultProps} loading={true} />);

      expect(screen.getByRole("button", { name: "Auto-Update (Recommended)" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Block" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Warn" })).toBeDisabled();
    });

    it("should disable Refresh button when loading", () => {
      render(<GitHookSetup {...defaultProps} loading={true} />);

      expect(screen.getByText("Refresh").closest("button")).toBeDisabled();
    });
  });

  describe("installed state display", () => {
    it("should display block mode correctly", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "block",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("Installed (block)")).toBeInTheDocument();
    });

    it("should display warn mode correctly", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "warn",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("Installed (warn)")).toBeInTheDocument();
    });

    it("should display auto-update mode correctly", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "auto-update",
        hasHusky: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("Installed (auto-update)")).toBeInTheDocument();
    });
  });
});
