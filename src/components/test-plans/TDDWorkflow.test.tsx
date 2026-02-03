/**
 * @module components/test-plans/TDDWorkflow.test
 * @description Tests for the TDDWorkflow component
 *
 * PURPOSE:
 * - Verify TDD workflow renders correctly in different states
 * - Test session start form validation
 * - Test phase progression and status display
 * - Test completion state
 *
 * PATTERNS:
 * - Uses vitest and @testing-library/react
 * - Tests both empty state (no session) and active session states
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TDDWorkflow } from "./TDDWorkflow";
import type { TDDSession, TDDPhaseConfig } from "@/types/test-plan";

const mockPhases: TDDPhaseConfig[] = [
  {
    id: "red",
    emoji: "🔴",
    title: "Red",
    description: "Write a failing test",
    expectedOutcome: "Test should fail initially",
    color: "red",
  },
  {
    id: "green",
    emoji: "🟢",
    title: "Green",
    description: "Make the test pass",
    expectedOutcome: "Test should pass with minimal code",
    color: "green",
  },
  {
    id: "refactor",
    emoji: "🔵",
    title: "Refactor",
    description: "Clean up the code",
    expectedOutcome: "Code is clean, tests still pass",
    color: "blue",
  },
];

const mockSession: TDDSession = {
  id: "session-1",
  projectId: "project-1",
  featureName: "User logout button",
  testFilePath: "src/components/Logout.test.tsx",
  currentPhase: "red",
  phaseStatus: "active",
  redPrompt: "Write a test for the logout button",
  redOutput: null,
  greenPrompt: null,
  greenOutput: null,
  refactorPrompt: null,
  refactorOutput: null,
  createdAt: "2024-01-01T00:00:00Z",
  completedAt: null,
};

describe("TDDWorkflow", () => {
  describe("No Session State", () => {
    it("should render the start session form when no session exists", () => {
      render(
        <TDDWorkflow
          session={null}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("Start TDD Workflow")).toBeInTheDocument();
      expect(screen.getByText("Feature Name")).toBeInTheDocument();
      expect(screen.getByText("Test File Path (optional)")).toBeInTheDocument();
      expect(screen.getByText("Start TDD Session")).toBeInTheDocument();
    });

    it("should disable start button when feature name is empty", () => {
      render(
        <TDDWorkflow
          session={null}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      const startButton = screen.getByText("Start TDD Session");
      expect(startButton).toBeDisabled();
    });

    it("should enable start button when feature name is provided", () => {
      render(
        <TDDWorkflow
          session={null}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      const featureInput = screen.getByPlaceholderText("e.g., Add user logout button");
      fireEvent.change(featureInput, { target: { value: "New feature" } });

      const startButton = screen.getByText("Start TDD Session");
      expect(startButton).not.toBeDisabled();
    });

    it("should call onStartSession with feature name and test path", () => {
      const onStartSession = vi.fn();
      render(
        <TDDWorkflow
          session={null}
          phases={mockPhases}
          onStartSession={onStartSession}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      const featureInput = screen.getByPlaceholderText("e.g., Add user logout button");
      const testPathInput = screen.getByPlaceholderText("e.g., src/components/Logout.test.tsx");

      fireEvent.change(featureInput, { target: { value: "My Feature" } });
      fireEvent.change(testPathInput, { target: { value: "src/test.ts" } });
      fireEvent.click(screen.getByText("Start TDD Session"));

      expect(onStartSession).toHaveBeenCalledWith("My Feature", "src/test.ts");
    });

    it("should call onStartSession with undefined test path if not provided", () => {
      const onStartSession = vi.fn();
      render(
        <TDDWorkflow
          session={null}
          phases={mockPhases}
          onStartSession={onStartSession}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      const featureInput = screen.getByPlaceholderText("e.g., Add user logout button");
      fireEvent.change(featureInput, { target: { value: "My Feature" } });
      fireEvent.click(screen.getByText("Start TDD Session"));

      expect(onStartSession).toHaveBeenCalledWith("My Feature", undefined);
    });
  });

  describe("Active Session State", () => {
    it("should display the feature name in header", () => {
      render(
        <TDDWorkflow
          session={mockSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("TDD: User logout button")).toBeInTheDocument();
    });

    it("should display the test file path", () => {
      render(
        <TDDWorkflow
          session={mockSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("src/components/Logout.test.tsx")).toBeInTheDocument();
    });

    it("should display the close button", () => {
      render(
        <TDDWorkflow
          session={mockSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("Close")).toBeInTheDocument();
    });

    it("should call onCloseSession when close button is clicked", () => {
      const onCloseSession = vi.fn();
      render(
        <TDDWorkflow
          session={mockSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={onCloseSession}
        />
      );

      fireEvent.click(screen.getByText("Close"));
      expect(onCloseSession).toHaveBeenCalled();
    });

    it("should display progress bar showing 1/3 phases for red phase", () => {
      render(
        <TDDWorkflow
          session={mockSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("Progress")).toBeInTheDocument();
      expect(screen.getByText("1/3 phases")).toBeInTheDocument();
    });

    it("should display progress bar showing 2/3 phases for green phase", () => {
      const greenSession = { ...mockSession, currentPhase: "green" as const };
      render(
        <TDDWorkflow
          session={greenSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("2/3 phases")).toBeInTheDocument();
    });

    it("should render all three phase cards", () => {
      render(
        <TDDWorkflow
          session={mockSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("Red")).toBeInTheDocument();
      expect(screen.getByText("Green")).toBeInTheDocument();
      expect(screen.getByText("Refactor")).toBeInTheDocument();
    });
  });

  describe("Completed Session State", () => {
    it("should display completion message when session is completed", () => {
      const completedSession = {
        ...mockSession,
        currentPhase: "refactor" as const,
        completedAt: "2024-01-01T01:00:00Z",
      };
      render(
        <TDDWorkflow
          session={completedSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("TDD Cycle Complete!")).toBeInTheDocument();
      expect(
        screen.getByText("You've successfully completed the red-green-refactor cycle.")
      ).toBeInTheDocument();
    });

    it("should show 3/3 phases for completed session", () => {
      const completedSession = {
        ...mockSession,
        currentPhase: "refactor" as const,
        completedAt: "2024-01-01T01:00:00Z",
      };
      render(
        <TDDWorkflow
          session={completedSession}
          phases={mockPhases}
          onStartSession={vi.fn()}
          onAdvancePhase={vi.fn()}
          onFailPhase={vi.fn()}
          onRetryPhase={vi.fn()}
          onRecordOutput={vi.fn()}
          onCloseSession={vi.fn()}
        />
      );

      expect(screen.getByText("3/3 phases")).toBeInTheDocument();
    });
  });
});
