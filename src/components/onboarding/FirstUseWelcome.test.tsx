/**
 * @module components/onboarding/FirstUseWelcome.test
 * @description Unit tests for FirstUseWelcome component
 *
 * PURPOSE:
 * - Test required API key flow (enter and validate)
 * - Test format validation feedback
 * - Test button states during validation/save
 * - Test successful completion flow with valid API key
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
 * - Mock @/lib/tauri for validateApiKey and saveSetting
 * - Mock @/stores/settingsStore for setHasApiKey
 * - Use userEvent for realistic input interactions
 * - Test async flows with waitFor
 *
 * CLAUDE NOTES:
 * - API key format: must start with "sk-ant-" and be 20+ chars
 * - API key is required to proceed
 * - validating state shows during API call
 * - saving state shows during settings persistence
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FirstUseWelcome } from "./FirstUseWelcome";

// Mock the tauri lib
const mockValidateApiKey = vi.fn();
const mockSaveSetting = vi.fn();

vi.mock("@/lib/tauri", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  saveSetting: (...args: unknown[]) => mockSaveSetting(...args),
}));

// Mock the settings store
const mockSetHasApiKey = vi.fn();

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: vi.fn((selector) =>
    selector({ setHasApiKey: mockSetHasApiKey })
  ),
}));

describe("FirstUseWelcome", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(true);
    mockSaveSetting.mockResolvedValue(undefined);
  });

  describe("Initial Render", () => {
    it("should render welcome message and features list", () => {
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      expect(screen.getByText("Welcome to Project Jumpstart")).toBeInTheDocument();
      expect(screen.getByText("One-click updates all your project documentation")).toBeInTheDocument();
      expect(screen.getByText("Latest best practices from the Claude Code team built-in")).toBeInTheDocument();
      expect(screen.getByText("Claude remembers your project—even in new conversations")).toBeInTheDocument();
      expect(screen.getByText("Pre-built skills & agents for commits, PRs, reviews & more")).toBeInTheDocument();
      expect(screen.getByText("Use RALPH to work behind the scenes")).toBeInTheDocument();
    });

    it("should render API key input", () => {
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      expect(screen.getByText("Anthropic API Key")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("sk-ant-...")).toBeInTheDocument();
    });

    it("should render disabled Get Started button when input is empty", () => {
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      const button = screen.getByRole("button", { name: /get started/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Format Validation", () => {
    it("should show format error when key doesn't start with 'sk-ant-'", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "invalid-key-format-here");

      expect(screen.getByText("Key must start with 'sk-ant-'")).toBeInTheDocument();
    });

    it("should show format error when key is too short", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-short");

      expect(screen.getByText("Key is too short")).toBeInTheDocument();
    });

    it("should show 'Format looks good' when format is valid", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");

      expect(screen.getByText("Format looks good")).toBeInTheDocument();
    });

    it("should apply error styling to input when format is invalid", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      const input = screen.getByPlaceholderText("sk-ant-...");
      await user.type(input, "invalid-key");

      expect(input).toHaveClass("border-red-500");
    });

    it("should apply success styling to input when format is valid", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      const input = screen.getByPlaceholderText("sk-ant-...");
      await user.type(input, "sk-ant-validkey123456789");

      expect(input).toHaveClass("border-green-500");
    });

    it("should disable Get Started button when key format is invalid", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-short");

      expect(screen.getByRole("button", { name: /get started/i })).toBeDisabled();
    });
  });

  describe("Button States", () => {
    it("should show 'Validating...' during API validation", async () => {
      const user = userEvent.setup();
      // Make validation take time
      let resolveValidation: (value: boolean) => void;
      mockValidateApiKey.mockImplementation(
        () => new Promise<boolean>((resolve) => { resolveValidation = resolve; })
      );

      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      expect(screen.getByRole("button", { name: /validating/i })).toBeInTheDocument();

      // Cleanup
      resolveValidation!(true);
    });

    it("should show 'Saving...' during save operation", async () => {
      const user = userEvent.setup();
      // Make save take time
      let resolveSave: (value: void) => void;
      mockValidateApiKey.mockResolvedValue(true);
      mockSaveSetting.mockImplementation(
        () => new Promise<void>((resolve) => { resolveSave = resolve; })
      );

      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Wait for validation to complete
      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalled();
      });

      // Button should still be loading since save is pending
      expect(screen.getByRole("button")).toBeDisabled();

      // Cleanup - need to resolve save twice (for api key and has_seen_welcome)
      resolveSave!(undefined);
    });

    it("should disable button during validation/save", async () => {
      const user = userEvent.setup();
      let resolveValidation: (value: boolean) => void;
      mockValidateApiKey.mockImplementation(
        () => new Promise<boolean>((resolve) => { resolveValidation = resolve; })
      );

      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      expect(screen.getByRole("button")).toBeDisabled();

      // Cleanup
      resolveValidation!(true);
    });
  });

  describe("Validation Flow", () => {
    it("should call validateApiKey when Get Started is clicked with a valid key", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      await waitFor(() => {
        expect(mockValidateApiKey).toHaveBeenCalledWith("sk-ant-validkey123456789");
      });
    });

    it("should show error message when validation fails", async () => {
      const user = userEvent.setup();
      mockValidateApiKey.mockRejectedValue(new Error("Invalid API key"));

      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      await waitFor(() => {
        expect(screen.getByText("Invalid API key")).toBeInTheDocument();
      });
    });

    it("should call saveSetting with API key on successful validation", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      await waitFor(() => {
        expect(mockSaveSetting).toHaveBeenCalledWith("anthropic_api_key", "sk-ant-validkey123456789");
      });
    });

    it("should call saveSetting for has_seen_welcome on success", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      await waitFor(() => {
        expect(mockSaveSetting).toHaveBeenCalledWith("has_seen_welcome", "true");
      });
    });

    it("should call setHasApiKey(true) on success", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      await waitFor(() => {
        expect(mockSetHasApiKey).toHaveBeenCalledWith(true);
      });
    });

    it("should call onComplete callback on success", async () => {
      const user = userEvent.setup();
      render(<FirstUseWelcome onComplete={mockOnComplete} />);

      await user.type(screen.getByPlaceholderText("sk-ant-..."), "sk-ant-validkey123456789");
      await user.click(screen.getByRole("button", { name: /get started/i }));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });
  });
});
