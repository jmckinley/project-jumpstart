/**
 * @module components/performance/PerformanceScore.test
 * @description Unit tests for PerformanceScore component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PerformanceScore } from "./PerformanceScore";
import type { PerformanceComponents } from "@/types/performance";

const mockComponents: PerformanceComponents = {
  queryPatterns: 18,
  rendering: 17,
  memory: 15,
  bundle: 12,
  caching: 13,
  apiDesign: 10,
};

describe("PerformanceScore", () => {
  it("should display the score value", () => {
    render(
      <PerformanceScore
        score={85}
        components={mockComponents}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("should display the 'Performance Score' heading", () => {
    render(
      <PerformanceScore
        score={50}
        components={mockComponents}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("Performance Score")).toBeInTheDocument();
  });

  it("should render all 6 component breakdown bars", () => {
    render(
      <PerformanceScore
        score={85}
        components={mockComponents}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("Query Patterns")).toBeInTheDocument();
    expect(screen.getByText("Rendering")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Bundle Size")).toBeInTheDocument();
    expect(screen.getByText("Caching")).toBeInTheDocument();
    expect(screen.getByText("API Design")).toBeInTheDocument();
  });

  it("should show component scores with max values", () => {
    render(
      <PerformanceScore
        score={85}
        components={mockComponents}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("18 / 20")).toBeInTheDocument();
    expect(screen.getByText("17 / 20")).toBeInTheDocument();
    expect(screen.getByText("15 / 15")).toBeInTheDocument();
    expect(screen.getByText("12 / 15")).toBeInTheDocument();
  });

  it("should show 'Run Analysis' button", () => {
    render(
      <PerformanceScore
        score={0}
        components={null}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("should call onAnalyze when button is clicked", () => {
    const mockAnalyze = vi.fn();
    render(
      <PerformanceScore
        score={0}
        components={null}
        analyzing={false}
        onAnalyze={mockAnalyze}
      />
    );

    fireEvent.click(screen.getByText("Run Analysis"));
    expect(mockAnalyze).toHaveBeenCalledTimes(1);
  });

  it("should show 'Analyzing...' when analyzing", () => {
    render(
      <PerformanceScore
        score={0}
        components={null}
        analyzing={true}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("should disable button when analyzing", () => {
    render(
      <PerformanceScore
        score={0}
        components={null}
        analyzing={true}
        onAnalyze={vi.fn()}
      />
    );

    const button = screen.getByText("Analyzing...").closest("button");
    expect(button).toBeDisabled();
  });

  it("should show placeholder when no components", () => {
    render(
      <PerformanceScore
        score={0}
        components={null}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Click "Run Analysis" to scan your project/)
    ).toBeInTheDocument();
  });

  it("should not show breakdown when components is null", () => {
    render(
      <PerformanceScore
        score={0}
        components={null}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.queryByText("Breakdown")).not.toBeInTheDocument();
  });

  it("should show breakdown heading when components exist", () => {
    render(
      <PerformanceScore
        score={85}
        components={mockComponents}
        analyzing={false}
        onAnalyze={vi.fn()}
      />
    );

    expect(screen.getByText("Breakdown")).toBeInTheDocument();
  });
});
