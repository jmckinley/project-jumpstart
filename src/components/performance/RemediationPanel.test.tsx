/**
 * @module components/performance/RemediationPanel.test
 * @description Unit tests for RemediationPanel component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RemediationPanel } from "./RemediationPanel";
import type { PerformanceIssue, RemediationSummary } from "@/types/performance";

const mockIssues: PerformanceIssue[] = [
  {
    id: "1",
    category: "query-patterns",
    severity: "critical",
    title: "N+1 query detected",
    description: "Database call inside a loop",
    filePath: "src/api/users.ts",
    lineNumber: 42,
    suggestion: "Use batch queries",
  },
  {
    id: "2",
    category: "rendering",
    severity: "warning",
    title: "Inline handlers",
    description: "Multiple inline event handlers",
    filePath: "src/App.tsx",
    lineNumber: null,
    suggestion: "Use useCallback",
  },
  {
    id: "3",
    category: "memory",
    severity: "info",
    title: "Minor memory concern",
    description: "Consider cleanup",
    filePath: null,
    lineNumber: null,
    suggestion: "Add cleanup function",
  },
];

const defaultProps = {
  issues: mockIssues,
  remediating: false,
  progress: null,
  result: null,
  onRemediate: vi.fn(),
  onCancel: vi.fn(),
  onClearResult: vi.fn(),
};

describe("RemediationPanel", () => {
  it("should render quick-select buttons with counts", () => {
    render(<RemediationPanel {...defaultProps} />);

    expect(screen.getByText("All Issues")).toBeInTheDocument();
    // 2 remediable issues (those with filePath)
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Critical Only")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should show checkboxes for remediable issues only", () => {
    render(<RemediationPanel {...defaultProps} />);

    // Issues with filePath should be listed
    expect(screen.getByText("N+1 query detected")).toBeInTheDocument();
    expect(screen.getByText("Inline handlers")).toBeInTheDocument();
    // Issue without filePath should NOT be listed
    expect(screen.queryByText("Minor memory concern")).not.toBeInTheDocument();
  });

  it("should enable Fix button when issues are selected", () => {
    render(<RemediationPanel {...defaultProps} />);

    // Initially disabled
    const fixButton = screen.getByText("Fix Selected (0)");
    expect(fixButton).toBeDisabled();

    // Click "All Issues" to select
    fireEvent.click(screen.getByText("All Issues"));

    expect(screen.getByText("Fix Selected (2)")).not.toBeDisabled();
  });

  it("should call onRemediate with selected issues", () => {
    const onRemediate = vi.fn();
    render(<RemediationPanel {...defaultProps} onRemediate={onRemediate} />);

    // Select all
    fireEvent.click(screen.getByText("All Issues"));

    // Click fix
    fireEvent.click(screen.getByText("Fix Selected (2)"));

    expect(onRemediate).toHaveBeenCalledWith([
      mockIssues[0],
      mockIssues[1],
    ]);
  });

  it("should show progress spinner during remediation", () => {
    render(
      <RemediationPanel
        {...defaultProps}
        remediating={true}
        progress={{ current: 1, total: 2 }}
      />,
    );

    expect(screen.getByText("Fixing file 1 of 2...")).toBeInTheDocument();
  });

  it("should show Cancel button during remediation", () => {
    const onCancel = vi.fn();
    render(
      <RemediationPanel
        {...defaultProps}
        remediating={true}
        progress={{ current: 1, total: 2 }}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByText("Cancel");
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it("should display results summary after completion", () => {
    const result: RemediationSummary = {
      total: 3,
      fixed: 2,
      failed: 1,
      skipped: 0,
      results: [],
    };

    render(<RemediationPanel {...defaultProps} result={result} />);

    expect(screen.getByText("Remediation Complete")).toBeInTheDocument();
    expect(screen.getByText("2 fixed")).toBeInTheDocument();
    expect(screen.getByText("1 failed")).toBeInTheDocument();
  });

  it("should call onClearResult when dismiss is clicked", () => {
    const onClearResult = vi.fn();
    const result: RemediationSummary = {
      total: 1,
      fixed: 1,
      failed: 0,
      skipped: 0,
      results: [],
    };

    render(
      <RemediationPanel {...defaultProps} result={result} onClearResult={onClearResult} />,
    );

    fireEvent.click(screen.getByText("Dismiss"));
    expect(onClearResult).toHaveBeenCalled();
  });

  it("should select only critical issues with Critical Only button", () => {
    const onRemediate = vi.fn();
    render(<RemediationPanel {...defaultProps} onRemediate={onRemediate} />);

    fireEvent.click(screen.getByText("Critical Only"));
    fireEvent.click(screen.getByText("Fix Selected (1)"));

    expect(onRemediate).toHaveBeenCalledWith([mockIssues[0]]);
  });
});
