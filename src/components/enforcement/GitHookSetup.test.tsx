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
 * - Mocks settingsStore and tauri saveSetting for installation sync
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GitHookSetup } from "./GitHookSetup";
import type { HookStatus } from "@/types/enforcement";

// Mock settings store
const mockSetEnforcementLevel = vi.fn();
vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: { setEnforcementLevel: typeof mockSetEnforcementLevel }) => unknown) =>
    selector({ setEnforcementLevel: mockSetEnforcementLevel }),
}));

// Mock tauri functions
vi.mock("@/lib/tauri", () => ({
  saveSetting: vi.fn().mockResolvedValue(undefined),
  initGit: vi.fn().mockResolvedValue(undefined),
}));

const mockOnInstall = vi.fn();
const mockOnRefresh = vi.fn();

const defaultHookStatus: HookStatus = {
  installed: false,
  hookPath: "/path/.git/hooks/pre-commit",
  mode: "none",
  hasHusky: false,
  hasGit: true,
};

const defaultProps = {
  hookStatus: defaultHookStatus,
  projectPath: "/test/project",
  loading: false,
  installing: false,
  onInstall: mockOnInstall,
  onRefresh: mockOnRefresh,
};

describe("GitHookSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetEnforcementLevel.mockClear();
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.queryByText(/Hook path:/)).not.toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onInstall with auto-update when Auto-Update button clicked", async () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByText("Auto-Update (Recommended)"));

      await waitFor(() => {
        expect(mockOnInstall).toHaveBeenCalledWith("auto-update");
      });
      expect(mockSetEnforcementLevel).toHaveBeenCalledWith("auto-update");
    });

    it("should call onInstall with block when Block button clicked", async () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Block" }));

      await waitFor(() => {
        expect(mockOnInstall).toHaveBeenCalledWith("block");
      });
      expect(mockSetEnforcementLevel).toHaveBeenCalledWith("block");
    });

    it("should call onInstall with warn when Warn button clicked", async () => {
      render(<GitHookSetup {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Warn" }));

      await waitFor(() => {
        expect(mockOnInstall).toHaveBeenCalledWith("warn");
      });
      expect(mockSetEnforcementLevel).toHaveBeenCalledWith("warn");
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
        hasGit: true,
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
        hasGit: true,
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
        hasGit: true,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("Installed (auto-update)")).toBeInTheDocument();
    });
  });

  describe("no git repository", () => {
    it("should show warning when hasGit is false", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
        hasGit: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByText("No Git Repository")).toBeInTheDocument();
      expect(screen.getByText(/This project doesn't have a git repository/)).toBeInTheDocument();
    });

    it("should show Initialize Git Repository button when hasGit is false", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
        hasGit: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByRole("button", { name: "Initialize Git Repository" })).toBeInTheDocument();
    });

    it("should hide hook installation buttons when hasGit is false", () => {
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
        hasGit: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.queryByRole("button", { name: "Auto-Update (Recommended)" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Block" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Warn" })).not.toBeInTheDocument();
    });

    it("should call initGit and refresh when Initialize button clicked", async () => {
      const { initGit } = await import("@/lib/tauri");
      const hookStatus: HookStatus = {
        installed: false,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "none",
        hasHusky: false,
        hasGit: false,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      fireEvent.click(screen.getByRole("button", { name: "Initialize Git Repository" }));

      await waitFor(() => {
        expect(initGit).toHaveBeenCalledWith("/test/project");
      });
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe("self-healing downgrade alert", () => {
    it("should show downgrade alert when hookHealth.downgraded is true", () => {
      const hookHealth = {
        consecutiveFailures: 3,
        lastFailureFile: "src/main.ts",
        lastFailureReason: "SIZE_DELTA: grew by 5000 bytes",
        lastFailureTime: "2026-02-22T10:00:00Z",
        downgraded: true,
        downgradeTime: "2026-02-22T10:05:00Z",
        totalSuccesses: 10,
        totalFailures: 5,
      };
      render(<GitHookSetup {...defaultProps} hookHealth={hookHealth} />);

      expect(screen.getByText("Auto-Update Disabled (Self-Healed)")).toBeInTheDocument();
    });

    it("should not show downgrade alert when hookHealth is null", () => {
      render(<GitHookSetup {...defaultProps} hookHealth={null} />);

      expect(screen.queryByText("Auto-Update Disabled (Self-Healed)")).not.toBeInTheDocument();
    });

    it("should not show downgrade alert when downgraded is false", () => {
      const hookHealth = {
        consecutiveFailures: 0,
        lastFailureFile: null,
        lastFailureReason: null,
        lastFailureTime: null,
        downgraded: false,
        downgradeTime: null,
        totalSuccesses: 5,
        totalFailures: 0,
      };
      render(<GitHookSetup {...defaultProps} hookHealth={hookHealth} />);

      expect(screen.queryByText("Auto-Update Disabled (Self-Healed)")).not.toBeInTheDocument();
    });

    it("should show failure count and reason in alert", () => {
      const hookHealth = {
        consecutiveFailures: 3,
        lastFailureFile: "src/main.ts",
        lastFailureReason: "TAIL_MISMATCH: original file content not preserved",
        lastFailureTime: "2026-02-22T10:00:00Z",
        downgraded: true,
        downgradeTime: "2026-02-22T10:05:00Z",
        totalSuccesses: 10,
        totalFailures: 5,
      };
      render(<GitHookSetup {...defaultProps} hookHealth={hookHealth} />);

      expect(screen.getByText(/3 consecutive failed commits/)).toBeInTheDocument();
      expect(screen.getByText(/TAIL_MISMATCH/)).toBeInTheDocument();
      expect(screen.getByText(/10 succeeded, 5 failed/)).toBeInTheDocument();
    });

    it("should show Re-enable button that calls onResetHealth", () => {
      const mockResetHealth = vi.fn();
      const hookHealth = {
        consecutiveFailures: 3,
        lastFailureFile: null,
        lastFailureReason: null,
        lastFailureTime: null,
        downgraded: true,
        downgradeTime: null,
        totalSuccesses: 0,
        totalFailures: 3,
      };
      render(<GitHookSetup {...defaultProps} hookHealth={hookHealth} onResetHealth={mockResetHealth} />);

      const btn = screen.getByRole("button", { name: "Re-enable Auto-Update" });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(mockResetHealth).toHaveBeenCalled();
    });

    it("should show health stats when installed and healthy", () => {
      const hookHealth = {
        consecutiveFailures: 0,
        lastFailureFile: null,
        lastFailureReason: null,
        lastFailureTime: null,
        downgraded: false,
        downgradeTime: null,
        totalSuccesses: 15,
        totalFailures: 2,
      };
      render(<GitHookSetup {...defaultProps} hookHealth={hookHealth} />);

      // When healthy (not downgraded), the alert should not show
      expect(screen.queryByText("Auto-Update Disabled (Self-Healed)")).not.toBeInTheDocument();
    });
  });

  describe("active state buttons", () => {
    it("should show Auto-Update (Active) when auto-update mode is installed", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "auto-update",
        hasHusky: false,
        hasGit: true,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByRole("button", { name: "Auto-Update (Active)" })).toBeInTheDocument();
    });

    it("should show Block (Active) when block mode is installed", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "block",
        hasHusky: false,
        hasGit: true,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByRole("button", { name: "Block (Active)" })).toBeInTheDocument();
    });

    it("should show Warn (Active) when warn mode is installed", () => {
      const hookStatus: HookStatus = {
        installed: true,
        hookPath: "/path/.git/hooks/pre-commit",
        mode: "warn",
        hasHusky: false,
        hasGit: true,
      };
      render(<GitHookSetup {...defaultProps} hookStatus={hookStatus} />);

      expect(screen.getByRole("button", { name: "Warn (Active)" })).toBeInTheDocument();
    });
  });
});
