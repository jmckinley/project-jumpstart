/**
 * @module hooks/useSessionHandoff.test
 * @description Unit tests for useSessionHandoff hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useSessionHandoff } from "./useSessionHandoff";
import { useProjectStore } from "@/stores/projectStore";

vi.mock("@/stores/projectStore", () => ({
  useProjectStore: vi.fn(),
}));

vi.mock("@/stores/toastStore", () => ({
  useToastStore: vi.fn((selector) =>
    selector({ addToast: vi.fn() })
  ),
}));

const mockProject = {
  id: "test-project-id",
  name: "Test Project",
  path: "/test/project/path",
  description: "A test project",
  projectType: "Web App",
  language: "TypeScript",
  framework: "React",
  database: null,
  testing: "Vitest",
  styling: "Tailwind CSS",
  stackExtras: null,
  healthScore: 50,
  createdAt: "2024-01-01T00:00:00Z",
};

const mockSnapshot = {
  id: "snap-1",
  projectId: "test-project-id",
  sessionId: "session-abc",
  summary: "Built auth middleware",
  pendingItems: ["Add tests"],
  gitState: "main (clean)",
  nextSteps: ["Write unit tests"],
  filesModified: ["src/auth.ts"],
  createdAt: "2026-02-23T12:00:00Z",
};

describe("useSessionHandoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: mockProject } as ReturnType<typeof useProjectStore.getState>)
    );
  });

  it("should initialize with null snapshot", () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const { result } = renderHook(() => useSessionHandoff());

    expect(result.current.snapshot).toBeNull();
    expect(result.current.capturing).toBe(false);
    expect(result.current.installing).toBe(false);
  });

  it("should auto-load snapshot on mount", async () => {
    vi.mocked(invoke).mockResolvedValue(mockSnapshot);

    const { result } = renderHook(() => useSessionHandoff());

    // Wait for auto-load effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(invoke).toHaveBeenCalledWith("get_latest_snapshot", {
      projectId: "test-project-id",
    });
    expect(result.current.snapshot).toEqual(mockSnapshot);
  });

  it("should capture snapshot and update state", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(null) // initial load
      .mockResolvedValueOnce(mockSnapshot); // capture

    const { result } = renderHook(() => useSessionHandoff());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.captureSnapshot();
    });

    expect(invoke).toHaveBeenCalledWith("generate_handoff_context", {
      projectPath: "/test/project/path",
      projectId: "test-project-id",
    });
    expect(result.current.snapshot).toEqual(mockSnapshot);
    expect(result.current.capturing).toBe(false);
  });

  it("should handle capture error", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(null) // initial load
      .mockRejectedValueOnce(new Error("No transcript found")); // capture

    const { result } = renderHook(() => useSessionHandoff());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.captureSnapshot();
    });

    expect(result.current.error).toBe("No transcript found");
    expect(result.current.capturing).toBe(false);
  });

  it("should install hook and return path", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(mockSnapshot) // initial load
      .mockResolvedValueOnce("/test/project/.claude/hooks/session-handoff.sh"); // install

    const { result } = renderHook(() => useSessionHandoff());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.installHook();
    });

    expect(invoke).toHaveBeenCalledWith("generate_session_start_script", {
      projectPath: "/test/project/path",
    });
    expect(result.current.installing).toBe(false);
  });

  it("should handle install error", async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(mockSnapshot) // initial load
      .mockRejectedValueOnce(new Error("No snapshot found")); // install

    const { result } = renderHook(() => useSessionHandoff());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.installHook();
    });

    expect(result.current.error).toBe("No snapshot found");
    expect(result.current.installing).toBe(false);
  });

  it("should not call IPC without active project", async () => {
    vi.mocked(useProjectStore).mockImplementation((selector) =>
      selector({ activeProject: null } as ReturnType<typeof useProjectStore.getState>)
    );

    const { result } = renderHook(() => useSessionHandoff());

    await act(async () => {
      await result.current.captureSnapshot();
    });

    expect(invoke).not.toHaveBeenCalled();
  });
});
