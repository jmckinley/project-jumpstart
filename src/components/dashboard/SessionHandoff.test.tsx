/**
 * @module components/dashboard/SessionHandoff.test
 * @description Unit tests for SessionHandoff hero dashboard component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionHandoff } from "./SessionHandoff";
import type { SessionSnapshot } from "@/types/session-handoff";

const mockSnapshot: SessionSnapshot = {
  id: "snap-1",
  projectId: "proj-1",
  sessionId: "session-abc",
  summary: "Implemented authentication middleware and added JWT validation",
  pendingItems: ["Add rate limiting", "Write integration tests"],
  gitState: "feature/auth (3 modified)",
  nextSteps: ["Write unit tests for JWT validation", "Add refresh token support"],
  filesModified: ["src/middleware/auth.ts", "src/utils/jwt.ts", "src/routes/login.ts"],
  createdAt: new Date().toISOString(),
};

describe("SessionHandoff", () => {
  describe("empty state", () => {
    it("should render empty state when no snapshot", () => {
      render(
        <SessionHandoff
          snapshot={null}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText("Session Handoff")).toBeInTheDocument();
      expect(
        screen.getByText(/Capture your session state/),
      ).toBeInTheDocument();
      expect(screen.getByText("Capture First Snapshot")).toBeInTheDocument();
    });

    it("should show analyzing state on capture button", () => {
      render(
        <SessionHandoff
          snapshot={null}
          capturing={true}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });

    it("should call onCapture when clicking capture button", () => {
      const onCapture = vi.fn();
      render(
        <SessionHandoff
          snapshot={null}
          capturing={false}
          installing={false}
          onCapture={onCapture}
          onInstallHook={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Capture First Snapshot"));
      expect(onCapture).toHaveBeenCalledOnce();
    });
  });

  describe("snapshot display", () => {
    it("should render summary from snapshot", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText(mockSnapshot.summary)).toBeInTheDocument();
    });

    it("should render stat chips", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText("2 pending")).toBeInTheDocument();
      expect(screen.getByText("2 next steps")).toBeInTheDocument();
      expect(screen.getByText("3 files")).toBeInTheDocument();
      expect(screen.getByText("feature/auth")).toBeInTheDocument();
    });

    it("should render action buttons", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText("Capture Snapshot")).toBeInTheDocument();
      expect(screen.getByText("Install Hook")).toBeInTheDocument();
      expect(screen.getByText("View Details")).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("should not show details by default", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.queryByText("Pending Items")).not.toBeInTheDocument();
      expect(screen.queryByText("Add rate limiting")).not.toBeInTheDocument();
    });

    it("should expand details when clicking View Details", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("View Details"));

      expect(screen.getByText("Pending Items")).toBeInTheDocument();
      expect(screen.getByText("Add rate limiting")).toBeInTheDocument();
      expect(screen.getByText("Write integration tests")).toBeInTheDocument();
      expect(screen.getByText("Suggested Next Steps")).toBeInTheDocument();
      expect(screen.getByText("Write unit tests for JWT validation")).toBeInTheDocument();
      expect(screen.getByText("Files Modified")).toBeInTheDocument();
      expect(screen.getByText("src/middleware/auth.ts")).toBeInTheDocument();
    });

    it("should collapse when clicking Hide Details", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("View Details"));
      expect(screen.getByText("Hide Details")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Hide Details"));
      expect(screen.queryByText("Pending Items")).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should call onCapture when clicking Capture Snapshot", () => {
      const onCapture = vi.fn();
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={onCapture}
          onInstallHook={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Capture Snapshot"));
      expect(onCapture).toHaveBeenCalledOnce();
    });

    it("should call onInstallHook when clicking Install Hook", () => {
      const onInstallHook = vi.fn();
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={onInstallHook}
        />,
      );

      fireEvent.click(screen.getByText("Install Hook"));
      expect(onInstallHook).toHaveBeenCalledOnce();
    });

    it("should show loading state when capturing", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={true}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText("Capturing...")).toBeInTheDocument();
    });

    it("should show loading state when installing", () => {
      render(
        <SessionHandoff
          snapshot={mockSnapshot}
          capturing={false}
          installing={true}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.getByText("Installing...")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle snapshot with no pending items", () => {
      const snapshotNoPending = {
        ...mockSnapshot,
        pendingItems: [],
      };

      render(
        <SessionHandoff
          snapshot={snapshotNoPending}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.queryByText(/pending/)).not.toBeInTheDocument();
    });

    it("should handle snapshot with no next steps", () => {
      const snapshotNoSteps = {
        ...mockSnapshot,
        nextSteps: [],
      };

      render(
        <SessionHandoff
          snapshot={snapshotNoSteps}
          capturing={false}
          installing={false}
          onCapture={vi.fn()}
          onInstallHook={vi.fn()}
        />,
      );

      expect(screen.queryByText(/next steps/)).not.toBeInTheDocument();
    });
  });
});
