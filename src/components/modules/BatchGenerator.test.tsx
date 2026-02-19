/**
 * @module components/modules/BatchGenerator.test
 * @description Unit tests for BatchGenerator component
 *
 * PURPOSE:
 * - Test rendering of batch generation controls
 * - Test quick-select buttons (Missing, Outdated, Current, All Files)
 * - Test file checkbox selection and toggle behavior
 * - Test cancel button visibility during generation
 * - Test onCancel callback when cancel button is clicked
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - Component rendering and queries
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Render BatchGenerator with mock modules and callbacks
 * - Use fireEvent for button clicks and checkbox toggles
 *
 * CLAUDE NOTES:
 * - Cancel button only renders when generating=true AND onCancel is provided
 * - onCancel prop is optional; if omitted, no cancel button appears
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BatchGenerator } from "./BatchGenerator";
import type { ModuleStatus } from "@/types/module";

const mockModules: ModuleStatus[] = [
  { path: "src/App.tsx", status: "current", freshnessScore: 100 },
  { path: "src/utils.ts", status: "missing", freshnessScore: 0 },
  { path: "src/hooks/useData.ts", status: "outdated", freshnessScore: 40 },
];

describe("BatchGenerator", () => {
  const defaultProps = {
    modules: mockModules,
    generating: false,
    progress: null,
    onGenerateSelected: vi.fn(),
    onCancel: vi.fn(),
  };

  it("should render batch generation controls", () => {
    render(<BatchGenerator {...defaultProps} />);

    expect(screen.getByText("Batch Generate")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("Outdated")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("All Files")).toBeInTheDocument();
  });

  it("should show file list with checkboxes for actionable modules", () => {
    render(<BatchGenerator {...defaultProps} />);

    // Missing and outdated modules shown by default
    expect(screen.getByText("src/utils.ts")).toBeInTheDocument();
    expect(screen.getByText("src/hooks/useData.ts")).toBeInTheDocument();
  });

  it("should select missing modules when Missing button is clicked", () => {
    render(<BatchGenerator {...defaultProps} />);

    fireEvent.click(screen.getByText("Missing"));

    // The generate button should show count
    expect(screen.getByText("Generate Selected (1)")).toBeInTheDocument();
  });

  it("should not show Cancel button when not generating", () => {
    render(<BatchGenerator {...defaultProps} />);

    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("should show Cancel button when generating", () => {
    render(
      <BatchGenerator
        {...defaultProps}
        generating={true}
        progress={{ current: 1, total: 3 }}
      />,
    );

    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should call onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();

    render(
      <BatchGenerator
        {...defaultProps}
        generating={true}
        progress={{ current: 1, total: 3 }}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should not show Cancel button when generating but onCancel is not provided", () => {
    render(
      <BatchGenerator
        modules={mockModules}
        generating={true}
        progress={{ current: 1, total: 3 }}
        onGenerateSelected={vi.fn()}
      />,
    );

    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("should show progress text when generating", () => {
    render(
      <BatchGenerator
        {...defaultProps}
        generating={true}
        progress={{ current: 2, total: 5 }}
      />,
    );

    expect(screen.getByText("Generating 2 of 5...")).toBeInTheDocument();
  });

  it("should disable quick-select buttons when generating", () => {
    render(
      <BatchGenerator
        {...defaultProps}
        generating={true}
        progress={{ current: 1, total: 3 }}
      />,
    );

    const missingBtn = screen.getByText("Missing").closest("button")!;
    expect(missingBtn).toBeDisabled();
  });

  it("should show all documented message when no actionable modules", () => {
    const currentOnly: ModuleStatus[] = [
      { path: "src/App.tsx", status: "current", freshnessScore: 100 },
    ];

    render(
      <BatchGenerator
        {...defaultProps}
        modules={currentOnly}
      />,
    );

    expect(screen.getByText("All files are documented")).toBeInTheDocument();
  });
});
