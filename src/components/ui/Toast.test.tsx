/**
 * @module components/ui/Toast.test
 * @description Unit tests for ToastContainer component
 *
 * PURPOSE:
 * - Test rendering of success, error, info toasts
 * - Test auto-dismiss behavior with fake timers
 * - Test close button functionality
 * - Test empty state renders nothing
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @testing-library/react - Component rendering and queries
 * - @/stores/toastStore - Toast store for state setup
 *
 * EXPORTS:
 * - None (test file)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastContainer } from "./Toast";
import { useToastStore } from "@/stores/toastStore";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render nothing when toasts array is empty", () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe("");
  });

  it("should render a success toast with message", () => {
    useToastStore.setState({
      toasts: [{ id: "1", message: "Skill created", type: "success" }],
    });

    render(<ToastContainer />);

    expect(screen.getByText("Skill created")).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveClass("border-green-800");
  });

  it("should render an error toast with message", () => {
    useToastStore.setState({
      toasts: [{ id: "1", message: "Something failed", type: "error" }],
    });

    render(<ToastContainer />);

    expect(screen.getByText("Something failed")).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveClass("border-red-800");
  });

  it("should render an info toast with message", () => {
    useToastStore.setState({
      toasts: [{ id: "1", message: "FYI note", type: "info" }],
    });

    render(<ToastContainer />);

    expect(screen.getByText("FYI note")).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status).toHaveClass("border-blue-800");
  });

  it("should render multiple toasts", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", message: "First", type: "success" },
        { id: "2", message: "Second", type: "error" },
      ],
    });

    render(<ToastContainer />);

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("should auto-dismiss after default duration", () => {
    vi.useFakeTimers();

    useToastStore.setState({
      toasts: [{ id: "1", message: "Auto dismiss me", type: "success" }],
    });

    render(<ToastContainer />);
    expect(screen.getByText("Auto dismiss me")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("should auto-dismiss after custom duration", () => {
    vi.useFakeTimers();

    useToastStore.setState({
      toasts: [{ id: "1", message: "Quick toast", type: "info", duration: 2000 }],
    });

    render(<ToastContainer />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("should remove toast when close button is clicked", async () => {
    const user = userEvent.setup();

    useToastStore.setState({
      toasts: [{ id: "1", message: "Close me", type: "success" }],
    });

    render(<ToastContainer />);
    expect(screen.getByText("Close me")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
