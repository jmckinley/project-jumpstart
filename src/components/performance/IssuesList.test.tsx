/**
 * @module components/performance/IssuesList.test
 * @description Unit tests for IssuesList component
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IssuesList } from "./IssuesList";
import type { PerformanceIssue } from "@/types/performance";

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

describe("IssuesList", () => {
  it("should display issue count in heading", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("Issues (3)")).toBeInTheDocument();
  });

  it("should display severity summary counts", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("1 critical")).toBeInTheDocument();
    expect(screen.getByText("1 warnings")).toBeInTheDocument();
    expect(screen.getByText("1 info")).toBeInTheDocument();
  });

  it("should render all issues", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("N+1 query detected")).toBeInTheDocument();
    expect(screen.getByText("Inline handlers")).toBeInTheDocument();
    expect(screen.getByText("Minor memory concern")).toBeInTheDocument();
  });

  it("should display severity badges", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("info")).toBeInTheDocument();
  });

  it("should show file path and line number", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("src/api/users.ts:42")).toBeInTheDocument();
  });

  it("should show file path without line number when null", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("src/App.tsx")).toBeInTheDocument();
  });

  it("should show suggestions", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("Use batch queries")).toBeInTheDocument();
    expect(screen.getByText("Use useCallback")).toBeInTheDocument();
  });

  it("should show placeholder when no issues", () => {
    render(<IssuesList issues={[]} />);

    expect(
      screen.getByText(/No issues found/)
    ).toBeInTheDocument();
  });

  it("should filter by category", () => {
    render(<IssuesList issues={mockIssues} />);

    const categorySelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(categorySelect, { target: { value: "rendering" } });

    expect(screen.getByText("Inline handlers")).toBeInTheDocument();
    expect(screen.queryByText("N+1 query detected")).not.toBeInTheDocument();
    expect(screen.queryByText("Minor memory concern")).not.toBeInTheDocument();
  });

  it("should filter by severity", () => {
    render(<IssuesList issues={mockIssues} />);

    const severitySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(severitySelect, { target: { value: "critical" } });

    expect(screen.getByText("N+1 query detected")).toBeInTheDocument();
    expect(screen.queryByText("Inline handlers")).not.toBeInTheDocument();
  });

  it("should show 'no match' message when filters exclude all", () => {
    render(<IssuesList issues={mockIssues} />);

    const categorySelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(categorySelect, { target: { value: "caching" } });

    expect(
      screen.getByText("No issues match the current filters.")
    ).toBeInTheDocument();
  });

  it("should sort issues by severity (critical first)", () => {
    const reversedIssues = [...mockIssues].reverse();
    render(<IssuesList issues={reversedIssues} />);

    const titles = screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(titles[0]).toBe("N+1 query detected");
    expect(titles[1]).toBe("Inline handlers");
    expect(titles[2]).toBe("Minor memory concern");
  });

  it("should display category labels on issues", () => {
    render(<IssuesList issues={mockIssues} />);

    expect(screen.getByText("query-patterns")).toBeInTheDocument();
    expect(screen.getByText("rendering")).toBeInTheDocument();
    expect(screen.getByText("memory")).toBeInTheDocument();
  });
});
