/**
 * @module test/setup
 * @description Global test setup for Vitest with jsdom environment
 *
 * PURPOSE:
 * - Configure testing-library matchers
 * - Mock Tauri APIs that aren't available in jsdom
 * - Provide common test utilities
 *
 * DEPENDENCIES:
 * - @testing-library/jest-dom - Custom DOM matchers
 * - vitest - Test framework
 *
 * EXPORTS:
 * - None (setup file)
 *
 * PATTERNS:
 * - Mocks @tauri-apps/api/core invoke function
 * - Mocks @tauri-apps/plugin-dialog open function
 * - Use vi.mocked() to type mock return values in tests
 *
 * CLAUDE NOTES:
 * - All Tauri IPC calls are mocked by default
 * - Tests should set up specific mock implementations as needed
 * - Mock implementations can be overridden per-test with vi.mocked()
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Tauri core API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Tauri dialog plugin
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

// Mock Tauri event API
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
