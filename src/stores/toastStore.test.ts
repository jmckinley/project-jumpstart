/**
 * @module stores/toastStore.test
 * @description Unit tests for the toast notification store
 *
 * PURPOSE:
 * - Test addToast appends toasts with unique IDs
 * - Test removeToast filters by ID
 * - Test multiple toasts and all three types
 *
 * DEPENDENCIES:
 * - vitest - Test framework
 * - @/stores/toastStore - Store under test
 *
 * EXPORTS:
 * - None (test file)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore } from "./toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useToastStore.setState({ toasts: [] });
  });

  it("should start with empty toasts array", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("should add a toast with a generated ID", () => {
    useToastStore.getState().addToast({ message: "Hello", type: "success" });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Hello");
    expect(toasts[0].type).toBe("success");
    expect(toasts[0].id).toBeTruthy();
  });

  it("should remove a toast by ID", () => {
    useToastStore.getState().addToast({ message: "First", type: "success" });
    useToastStore.getState().addToast({ message: "Second", type: "error" });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);

    useToastStore.getState().removeToast(toasts[0].id);

    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe("Second");
  });

  it("should support multiple toasts", () => {
    useToastStore.getState().addToast({ message: "A", type: "success" });
    useToastStore.getState().addToast({ message: "B", type: "error" });
    useToastStore.getState().addToast({ message: "C", type: "info" });

    expect(useToastStore.getState().toasts).toHaveLength(3);
  });

  it("should support all three types", () => {
    useToastStore.getState().addToast({ message: "OK", type: "success" });
    useToastStore.getState().addToast({ message: "Err", type: "error" });
    useToastStore.getState().addToast({ message: "FYI", type: "info" });

    const types = useToastStore.getState().toasts.map((t) => t.type);
    expect(types).toEqual(["success", "error", "info"]);
  });

  it("should generate unique IDs for each toast", () => {
    useToastStore.getState().addToast({ message: "A", type: "success" });
    useToastStore.getState().addToast({ message: "B", type: "success" });

    const ids = useToastStore.getState().toasts.map((t) => t.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("should preserve optional duration field", () => {
    useToastStore.getState().addToast({ message: "Quick", type: "info", duration: 2000 });

    const toast = useToastStore.getState().toasts[0];
    expect(toast.duration).toBe(2000);
  });
});
