/**
 * @module components/performance/ArchitectureReview.test
 * @description Unit tests for ArchitectureReview component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchitectureReview } from "./ArchitectureReview";
import type { ArchitectureFinding } from "@/types/performance";

const mockFindings: ArchitectureFinding[] = [
  {
    id: "1",
    category: "caching",
    status: "good",
    title: "Client-side caching",
    description: "Using React Query for caching",
    recommendation: "",
  },
  {
    id: "2",
    category: "api-design",
    status: "warning",
    title: "Heavy dependency",
    description: "moment.js detected",
    recommendation: "Use date-fns instead",
  },
  {
    id: "3",
    category: "api-design",
    status: "missing",
    title: "No rate limiting",
    description: "API without rate limiting",
    recommendation: "Add express-rate-limit",
  },
];

describe("ArchitectureReview", () => {
  it("should render the heading", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("Architecture Review")).toBeInTheDocument();
  });

  it("should display status summary counts", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("1 good")).toBeInTheDocument();
    expect(screen.getByText("1 warnings")).toBeInTheDocument();
    expect(screen.getByText("1 missing")).toBeInTheDocument();
  });

  it("should render all findings", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("Client-side caching")).toBeInTheDocument();
    expect(screen.getByText("Heavy dependency")).toBeInTheDocument();
    expect(screen.getByText("No rate limiting")).toBeInTheDocument();
  });

  it("should display status badges", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
  });

  it("should show recommendations for warning/missing items", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("Use date-fns instead")).toBeInTheDocument();
    expect(screen.getByText("Add express-rate-limit")).toBeInTheDocument();
  });

  it("should not show recommendation for good items", () => {
    const goodOnly: ArchitectureFinding[] = [
      {
        id: "1",
        category: "caching",
        status: "good",
        title: "Good caching",
        description: "All good",
        recommendation: "Not shown",
      },
    ];

    render(<ArchitectureReview findings={goodOnly} />);

    expect(screen.queryByText("Recommendation:")).not.toBeInTheDocument();
  });

  it("should show category labels", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("caching")).toBeInTheDocument();
    expect(screen.getAllByText("api-design")).toHaveLength(2);
  });

  it("should show placeholder when no findings", () => {
    render(<ArchitectureReview findings={[]} />);

    expect(
      screen.getByText(/No architecture findings yet/)
    ).toBeInTheDocument();
  });

  it("should show descriptions", () => {
    render(<ArchitectureReview findings={mockFindings} />);

    expect(screen.getByText("Using React Query for caching")).toBeInTheDocument();
    expect(screen.getByText("moment.js detected")).toBeInTheDocument();
    expect(screen.getByText("API without rate limiting")).toBeInTheDocument();
  });
});
