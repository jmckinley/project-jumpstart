/**
 * @module components/test-plans/FrameworkInstaller.test
 * @description Unit tests for FrameworkInstaller component
 *
 * PURPOSE:
 * - Test framework options based on project language/framework
 * - Test hooksOnly mode rendering
 * - Test copy and install functionality
 * - Test QuickHooksSetup integration
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
 * - Mock projectStore for activeProject
 * - Mock navigator.clipboard for copy tests
 * - Test framework recommendations per language
 *
 * CLAUDE NOTES:
 * - Returns null when no activeProject
 * - Vitest recommended for React/Vite projects
 * - hooksOnly mode renders only QuickHooksSetup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { FrameworkInstaller } from "./FrameworkInstaller";

// Mock QuickHooksSetup to simplify tests
vi.mock("@/components/hooks/QuickHooksSetup", () => ({
  QuickHooksSetup: vi.fn(({ variant }: { variant: string }) => (
    <div data-testid="quick-hooks-setup" data-variant={variant}>
      QuickHooksSetup Mock
    </div>
  )),
}));

// Mock Tauri API
vi.mock("@/lib/tauri", () => ({
  generateHooksConfig: vi.fn().mockResolvedValue('{"hooks": []}'),
  logActivity: vi.fn().mockResolvedValue({}),
}));

const mockTypescriptReactProject = {
  id: "test-project-1",
  name: "Test Project",
  path: "/test/project",
  language: "typescript",
  framework: "React",
  testing: null,
  healthScore: 75,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockViteProject = {
  ...mockTypescriptReactProject,
  framework: "Vite",
};

const mockRustProject = {
  ...mockTypescriptReactProject,
  language: "rust",
  framework: null,
};

const mockPythonProject = {
  ...mockTypescriptReactProject,
  language: "python",
  framework: null,
};

const mockGoProject = {
  ...mockTypescriptReactProject,
  language: "go",
  framework: null,
};

// Mock projectStore
vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

import { useProjectStore } from "@/stores/projectStore";

describe("FrameworkInstaller", () => {
  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("No Active Project", () => {
    it("returns null when no activeProject", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: null };
        return selector(state);
      });

      const { container } = render(<FrameworkInstaller />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Framework Detection Banner", () => {
    it("shows 'No Test Framework Detected' banner", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockTypescriptReactProject };
        return selector(state);
      });

      render(<FrameworkInstaller />);

      expect(screen.getByText("No Test Framework Detected")).toBeInTheDocument();
    });
  });

  describe("TypeScript/React Project", () => {
    beforeEach(() => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockViteProject };
        return selector(state);
      });
    });

    it("shows unit testing frameworks section", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("Unit Testing")).toBeInTheDocument();
    });

    it("shows E2E testing frameworks section", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("End-to-End Testing")).toBeInTheDocument();
    });

    it("recommends Vitest for React/Vite projects", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("Vitest")).toBeInTheDocument();
      // Find the Vitest card and check for Recommended badge
      const vitestCard = screen.getByText("Vitest").closest("div");
      expect(vitestCard?.textContent).toContain("Recommended");
    });

    it("shows Jest as available option", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("Jest")).toBeInTheDocument();
    });

    it("shows Playwright for E2E", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("Playwright")).toBeInTheDocument();
    });

    it("shows Cypress for E2E", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("Cypress")).toBeInTheDocument();
    });
  });

  describe("Rust Project", () => {
    it("shows cargo test as built-in", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockRustProject };
        return selector(state);
      });

      render(<FrameworkInstaller />);

      expect(screen.getByText("cargo test")).toBeInTheDocument();
      expect(screen.getByText(/Ready to use!/)).toBeInTheDocument();
    });
  });

  describe("Python Project", () => {
    it("shows pytest as recommended", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockPythonProject };
        return selector(state);
      });

      render(<FrameworkInstaller />);

      expect(screen.getByText("pytest")).toBeInTheDocument();
      const pytestCard = screen.getByText("pytest").closest("div");
      expect(pytestCard?.textContent).toContain("Recommended");
    });
  });

  describe("Go Project", () => {
    it("shows go test as built-in", () => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockGoProject };
        return selector(state);
      });

      render(<FrameworkInstaller />);

      expect(screen.getByText("go test")).toBeInTheDocument();
      expect(screen.getByText(/Ready to use!/)).toBeInTheDocument();
    });
  });

  describe("Copy and Install", () => {
    beforeEach(() => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockViteProject };
        return selector(state);
      });
    });

    it("copy button copies install command", async () => {
      render(<FrameworkInstaller />);

      // Find the copy button for Vitest (first one in unit testing section)
      const copyButtons = screen.getAllByTitle("Copy command");
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining("pnpm add -D vitest")
        );
      });
    });

    it("install button shows instructions", async () => {
      render(<FrameworkInstaller />);

      // Find the Install button for Vitest
      const installButton = screen.getByRole("button", { name: /Install Vitest/i });
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByText("Installation Steps")).toBeInTheDocument();
      });
    });
  });

  describe("hooksOnly Mode", () => {
    beforeEach(() => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockViteProject };
        return selector(state);
      });
    });

    it("renders only QuickHooksSetup when hooksOnly=true", () => {
      render(<FrameworkInstaller hooksOnly={true} />);

      expect(screen.getByTestId("quick-hooks-setup")).toBeInTheDocument();
      expect(screen.queryByText("No Test Framework Detected")).not.toBeInTheDocument();
      expect(screen.queryByText("Unit Testing")).not.toBeInTheDocument();
    });

    it("passes detectedFramework to QuickHooksSetup", () => {
      render(<FrameworkInstaller hooksOnly={true} detectedFramework="vitest" />);

      const hooksSetup = screen.getByTestId("quick-hooks-setup");
      expect(hooksSetup).toHaveAttribute("data-variant", "full");
    });
  });

  describe("QuickHooksSetup Integration", () => {
    beforeEach(() => {
      vi.mocked(useProjectStore).mockImplementation((selector) => {
        const state = { activeProject: mockViteProject };
        return selector(state);
      });
    });

    it("shows QuickHooksSetup section at bottom", () => {
      render(<FrameworkInstaller />);

      expect(screen.getByText("After Installing")).toBeInTheDocument();
      expect(screen.getByTestId("quick-hooks-setup")).toBeInTheDocument();
    });

    it("QuickHooksSetup uses compact variant in normal mode", () => {
      render(<FrameworkInstaller />);

      const hooksSetup = screen.getByTestId("quick-hooks-setup");
      expect(hooksSetup).toHaveAttribute("data-variant", "compact");
    });
  });
});
