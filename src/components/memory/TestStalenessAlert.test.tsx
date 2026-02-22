/**
 * @module components/memory/TestStalenessAlert.test
 * @description Unit tests for TestStalenessAlert component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestStalenessAlert } from "./TestStalenessAlert";
import type { TestStalenessReport } from "@/types/test-plan";

const mockStaleReport: TestStalenessReport = {
  checkedFiles: 5,
  staleCount: 2,
  results: [
    {
      sourceFile: "src/components/App.tsx",
      testFile: "src/components/App.test.tsx",
      isStale: true,
      reason: "src/components/App.tsx was modified but src/components/App.test.tsx was not",
    },
    {
      sourceFile: "src/hooks/useHealth.ts",
      testFile: "src/hooks/useHealth.test.ts",
      isStale: true,
      reason: "src/hooks/useHealth.ts was modified but src/hooks/useHealth.test.ts was not",
    },
    {
      sourceFile: "src/lib/utils.ts",
      testFile: "src/lib/utils.test.ts",
      isStale: false,
      reason: "Test file was also modified",
    },
  ],
  checkedAt: "2026-02-16T00:00:00Z",
};

const mockCleanReport: TestStalenessReport = {
  checkedFiles: 3,
  staleCount: 0,
  results: [
    {
      sourceFile: "src/lib/utils.ts",
      testFile: "src/lib/utils.test.ts",
      isStale: false,
      reason: "Test file was also modified",
    },
  ],
  checkedAt: "2026-02-16T00:00:00Z",
};

describe("TestStalenessAlert", () => {
  describe("initial state (no report)", () => {
    it("should render the heading", () => {
      render(<TestStalenessAlert report={null} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("Test Staleness")).toBeInTheDocument();
    });

    it("should show placeholder text", () => {
      render(<TestStalenessAlert report={null} loading={false} onCheck={vi.fn()} />);
      expect(
        screen.getByText('Click "Check Staleness" to scan for stale tests.'),
      ).toBeInTheDocument();
    });

    it("should show Check Staleness button", () => {
      render(<TestStalenessAlert report={null} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("Check Staleness")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show Checking... text when loading", () => {
      render(<TestStalenessAlert report={null} loading={true} onCheck={vi.fn()} />);
      expect(screen.getByText("Checking...")).toBeInTheDocument();
    });

    it("should disable button when loading", () => {
      render(<TestStalenessAlert report={null} loading={true} onCheck={vi.fn()} />);
      expect(screen.getByText("Checking...")).toBeDisabled();
    });
  });

  describe("stale results", () => {
    it("should show stale count badge", () => {
      render(<TestStalenessAlert report={mockStaleReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("2 stale")).toBeInTheDocument();
    });

    it("should show summary text", () => {
      render(<TestStalenessAlert report={mockStaleReport} loading={false} onCheck={vi.fn()} />);
      expect(
        screen.getByText("2 of 5 source files have tests that may need updating"),
      ).toBeInTheDocument();
    });

    it("should list stale source files", () => {
      render(<TestStalenessAlert report={mockStaleReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("src/components/App.tsx")).toBeInTheDocument();
      expect(screen.getByText("src/hooks/useHealth.ts")).toBeInTheDocument();
    });

    it("should show test file paths for stale items", () => {
      render(<TestStalenessAlert report={mockStaleReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("Test: src/components/App.test.tsx")).toBeInTheDocument();
      expect(screen.getByText("Test: src/hooks/useHealth.test.ts")).toBeInTheDocument();
    });

    it("should show reasons for stale items", () => {
      render(<TestStalenessAlert report={mockStaleReport} loading={false} onCheck={vi.fn()} />);
      expect(
        screen.getByText(
          "src/components/App.tsx was modified but src/components/App.test.tsx was not",
        ),
      ).toBeInTheDocument();
    });

    it("should NOT show non-stale items in the list", () => {
      render(<TestStalenessAlert report={mockStaleReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.queryByText("src/lib/utils.ts")).not.toBeInTheDocument();
    });
  });

  describe("clean results", () => {
    it("should show all-clear message", () => {
      render(<TestStalenessAlert report={mockCleanReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("All tests are up to date")).toBeInTheDocument();
    });

    it("should show checked file count", () => {
      render(<TestStalenessAlert report={mockCleanReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.getByText("Checked 3 source files")).toBeInTheDocument();
    });

    it("should NOT show stale count badge when count is 0", () => {
      render(<TestStalenessAlert report={mockCleanReport} loading={false} onCheck={vi.fn()} />);
      expect(screen.queryByText("0 stale")).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("should call onCheck when button is clicked", () => {
      const onCheck = vi.fn();
      render(<TestStalenessAlert report={null} loading={false} onCheck={onCheck} />);
      fireEvent.click(screen.getByText("Check Staleness"));
      expect(onCheck).toHaveBeenCalledTimes(1);
    });

    it("should not pass the click event to onCheck", () => {
      const onCheck = vi.fn();
      render(<TestStalenessAlert report={null} loading={false} onCheck={onCheck} />);
      fireEvent.click(screen.getByText("Check Staleness"));
      // onCheck must be called with no arguments to prevent SyntheticEvent
      // from leaking into Tauri IPC serialization (causes cyclic JSON error)
      expect(onCheck).toHaveBeenCalledWith();
    });
  });
});
