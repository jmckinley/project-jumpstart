/**
 * @module components/hooks/QuickHooksSetup.test
 * @description Unit tests for QuickHooksSetup component
 *
 * PURPOSE:
 * - Test framework detection from project or prop
 * - Test hooks config generation and clipboard copy
 * - Test callback execution after setup
 * - Test variant rendering (compact vs full)
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
 * - Mock Tauri API calls for generateHooksConfig and logActivity
 * - Mock projectStore for activeProject
 * - Use fireEvent for clipboard-involving tests
 *
 * CLAUDE NOTES:
 * - Framework detection priority: prop > project.testing > project.language
 * - Returns null when no framework detected
 * - Compact variant used in dashboard, full variant in dedicated setup view
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickHooksSetup } from "./QuickHooksSetup";

// Mock Tauri API
vi.mock("@/lib/tauri", () => ({
  generateHooksConfig: vi.fn(),
  logActivity: vi.fn(),
}));

// Mock projectStore
const mockActiveProject = {
  id: "test-project-1",
  name: "Test Project",
  path: "/test/project",
  language: "typescript",
  framework: "React",
  testing: "vitest",
  healthScore: 75,
  createdAt: "2024-01-01T00:00:00Z",
};

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) => {
    const state = { activeProject: mockActiveProject };
    return selector(state);
  }),
}));

import { generateHooksConfig, logActivity } from "@/lib/tauri";
import { useProjectStore } from "@/stores/projectStore";

describe("QuickHooksSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.mocked(generateHooksConfig).mockResolvedValue('{"hooks": []}');
    vi.mocked(logActivity).mockResolvedValue({
      id: "act-1",
      projectId: "test-project-1",
      activityType: "hooks_configured",
      message: "Generated PostToolUse hooks for Vitest",
      createdAt: new Date().toISOString(),
    });
  });

  describe("Framework Detection", () => {
    it("renders nothing when no framework detected", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: { ...mockActiveProject, testing: null, language: "unknown" } };
        return selector(state);
      });

      const { container } = render(<QuickHooksSetup />);
      expect(container.firstChild).toBeNull();
    });

    it("detects vitest from project testing field", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: { ...mockActiveProject, testing: "vitest" } };
        return selector(state);
      });

      render(<QuickHooksSetup variant="full" />);

      expect(screen.getByText("Vitest")).toBeInTheDocument();
      expect(screen.getByText("pnpm vitest run --reporter=verbose")).toBeInTheDocument();
    });

    it("detects jest from project testing field", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: { ...mockActiveProject, testing: "jest" } };
        return selector(state);
      });

      render(<QuickHooksSetup variant="full" />);

      expect(screen.getByText("Jest")).toBeInTheDocument();
      expect(screen.getByText("pnpm jest --passWithNoTests")).toBeInTheDocument();
    });

    it("detects pytest from project testing field", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: { ...mockActiveProject, testing: "pytest", language: "python" } };
        return selector(state);
      });

      render(<QuickHooksSetup variant="full" />);

      expect(screen.getByText("pytest")).toBeInTheDocument();
      expect(screen.getByText("pytest -v")).toBeInTheDocument();
    });

    it("detects cargo from rust language", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = {
          activeProject: {
            ...mockActiveProject,
            testing: null,
            language: "rust",
            framework: null,
          },
        };
        return selector(state);
      });

      render(<QuickHooksSetup variant="full" />);

      // Both the name and command are "cargo test", so use getAllByText
      const cargoTestElements = screen.getAllByText("cargo test");
      expect(cargoTestElements.length).toBeGreaterThanOrEqual(1);
    });

    it("detects go test from go language", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: { ...mockActiveProject, testing: null, language: "go" } };
        return selector(state);
      });

      render(<QuickHooksSetup variant="full" />);

      expect(screen.getByText("go test")).toBeInTheDocument();
      expect(screen.getByText("go test ./...")).toBeInTheDocument();
    });

    it("uses framework prop over project detection", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: { ...mockActiveProject, testing: "vitest" } };
        return selector(state);
      });

      render(<QuickHooksSetup variant="full" framework="jest" />);

      expect(screen.getByText("Jest")).toBeInTheDocument();
    });
  });

  describe("Variant Rendering", () => {
    beforeEach(() => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockActiveProject };
        return selector(state);
      });
    });

    it("renders compact variant with correct styling", () => {
      render(<QuickHooksSetup variant="compact" />);

      expect(screen.getByText("Auto-Run Tests on File Changes")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Set Up Hooks/i })).toBeInTheDocument();
    });

    it("renders full variant with explanation sections", () => {
      render(<QuickHooksSetup variant="full" />);

      expect(screen.getByText("Claude Code Hooks")).toBeInTheDocument();
      expect(screen.getByText("Detected Framework")).toBeInTheDocument();
      expect(screen.getByText("Test Command")).toBeInTheDocument();
      expect(screen.getByText("File Patterns")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Generate & Copy Hooks Config/i })).toBeInTheDocument();
    });

    it("displays correct file patterns for framework", () => {
      render(<QuickHooksSetup variant="full" />);

      expect(screen.getByText("*.ts, *.tsx")).toBeInTheDocument();
    });
  });

  describe("Config Generation", () => {
    beforeEach(() => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockActiveProject };
        return selector(state);
      });
    });

    it("calls generateHooksConfig on button click", async () => {
      render(<QuickHooksSetup variant="compact" />);

      const button = screen.getByRole("button", { name: /Set Up Hooks/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(generateHooksConfig).toHaveBeenCalledWith(
          "pnpm vitest run --reporter=verbose",
          ["*.ts", "*.tsx"]
        );
      });
    });

    it("copies config to clipboard on success", async () => {
      render(<QuickHooksSetup variant="compact" />);

      const button = screen.getByRole("button", { name: /Set Up Hooks/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{"hooks": []}');
      });
    });

    it("logs activity after successful generation", async () => {
      render(<QuickHooksSetup variant="compact" />);

      const button = screen.getByRole("button", { name: /Set Up Hooks/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(logActivity).toHaveBeenCalledWith(
          "test-project-1",
          "hooks_configured",
          "Generated PostToolUse hooks for Vitest"
        );
      });
    });

    it("calls onSetupComplete callback after setup", async () => {
      const onSetupComplete = vi.fn();

      render(<QuickHooksSetup variant="compact" onSetupComplete={onSetupComplete} />);

      const button = screen.getByRole("button", { name: /Set Up Hooks/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSetupComplete).toHaveBeenCalledTimes(1);
      });
    });

    it("shows 'Copied!' confirmation state", async () => {
      render(<QuickHooksSetup variant="compact" />);

      const button = screen.getByRole("button", { name: /Set Up Hooks/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Copied/i)).toBeInTheDocument();
      });
    });
  });

  describe("No Active Project", () => {
    it("renders nothing when no active project", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: null };
        return selector(state);
      });

      const { container } = render(<QuickHooksSetup />);
      expect(container.firstChild).toBeNull();
    });
  });
});
