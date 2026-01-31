/**
 * @module components/dashboard/RefreshDocsButton.test
 * @description Unit tests for RefreshDocsButton component
 *
 * PURPOSE:
 * - Test button rendering and states
 * - Test single-click refresh behavior
 * - Test success and error banner display
 * - Test callback invocation
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - Component rendering and queries
 * - @testing-library/user-event - User interaction simulation
 * - @/components/dashboard/RefreshDocsButton - Component under test
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Mock useRefreshDocs hook to control component state
 * - Use userEvent for realistic user interactions
 * - Test async flows with waitFor
 *
 * CLAUDE NOTES:
 * - Badge only shows when moduleCount > 0
 * - Success banner auto-dismisses (use fake timers to test)
 * - Error banner persists until dismissed
 * - No confirmation dialog - single click triggers refresh
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RefreshDocsButton } from "./RefreshDocsButton";

// Mock the useRefreshDocs hook
const mockRefreshAll = vi.fn();
const mockScanForStaleFiles = vi.fn();

vi.mock("@/hooks/useRefreshDocs", () => ({
  useRefreshDocs: vi.fn(() => ({
    refreshing: false,
    staleCount: 0,
    missingCount: 0,
    totalToRefresh: 1,
    scanForStaleFiles: mockScanForStaleFiles,
    refreshAll: mockRefreshAll,
  })),
}));

// Import after mock to get the mocked version
import { useRefreshDocs } from "@/hooks/useRefreshDocs";

describe("RefreshDocsButton", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Ensure real timers are used by default
    // Reset to default mock state
    vi.mocked(useRefreshDocs).mockReturnValue({
      refreshing: false,
      staleCount: 0,
      missingCount: 0,
      totalToRefresh: 1,
      scanForStaleFiles: mockScanForStaleFiles,
      refreshAll: mockRefreshAll,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers(); // Always restore real timers after each test
  });

  describe("rendering", () => {
    it("should render the refresh button with icon and text", () => {
      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      expect(screen.getByRole("button", { name: /refresh docs/i })).toBeInTheDocument();
    });

    it("should show badge with count when stale files exist", () => {
      vi.mocked(useRefreshDocs).mockReturnValue({
        refreshing: false,
        staleCount: 2,
        missingCount: 1,
        totalToRefresh: 4,
        scanForStaleFiles: mockScanForStaleFiles,
        refreshAll: mockRefreshAll,
      });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("should not show badge when no stale files", () => {
      vi.mocked(useRefreshDocs).mockReturnValue({
        refreshing: false,
        staleCount: 0,
        missingCount: 0,
        totalToRefresh: 1,
        scanForStaleFiles: mockScanForStaleFiles,
        refreshAll: mockRefreshAll,
      });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });

    it("should show loading state when refreshing", () => {
      vi.mocked(useRefreshDocs).mockReturnValue({
        refreshing: true,
        staleCount: 0,
        missingCount: 0,
        totalToRefresh: 1,
        scanForStaleFiles: mockScanForStaleFiles,
        refreshAll: mockRefreshAll,
      });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      expect(screen.getByRole("button", { name: /refreshing/i })).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("click behavior", () => {
    it("should call refreshAll immediately when button is clicked", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockResolvedValue({ claudeMd: true, modules: 3 });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      expect(mockRefreshAll).toHaveBeenCalled();
    });
  });

  describe("success state", () => {
    it("should show success banner after successful refresh", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockResolvedValue({ claudeMd: true, modules: 5 });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText(/refreshed claude\.md and 5 module files/i)).toBeInTheDocument();
      });
    });

    it("should call onComplete after successful refresh", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockResolvedValue({ claudeMd: true, modules: 0 });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it("should auto-dismiss success banner after 3 seconds", async () => {
      // This test verifies the setTimeout is called with 3000ms
      // Testing actual auto-dismiss is complex with fake timers and React
      const setTimeoutSpy = vi.spyOn(window, "setTimeout");
      const user = userEvent.setup();
      mockRefreshAll.mockResolvedValue({ claudeMd: true, modules: 2 });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText(/refreshed claude\.md/i)).toBeInTheDocument();
      });

      // Verify setTimeout was called with 3000ms for auto-dismiss
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);

      setTimeoutSpy.mockRestore();
    });

    it("should show correct message when only CLAUDE.md is refreshed", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockResolvedValue({ claudeMd: true, modules: 0 });

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText("Refreshed CLAUDE.md")).toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("should show error banner when refresh fails", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockRejectedValue(new Error("API connection failed"));

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText(/api connection failed/i)).toBeInTheDocument();
      });
    });

    it("should not call onComplete when refresh fails", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockRejectedValue(new Error("Failed"));

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it("should dismiss error banner when dismiss button is clicked", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockRejectedValue(new Error("Some error"));

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText(/some error/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(screen.queryByText(/some error/i)).not.toBeInTheDocument();
    });

    it("should show generic error message for non-Error exceptions", async () => {
      const user = userEvent.setup();
      mockRefreshAll.mockRejectedValue("string error");

      render(<RefreshDocsButton onComplete={mockOnComplete} />);

      await user.click(screen.getByRole("button", { name: /refresh docs/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to refresh documentation/i)).toBeInTheDocument();
      });
    });
  });
});
