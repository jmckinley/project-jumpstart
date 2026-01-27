/**
 * @module stores/settingsStore
 * @description Zustand store for user preferences and application settings
 *
 * PURPOSE:
 * - Store user preferences (theme, notifications, etc.)
 * - Track API key configuration status (NOT the key itself)
 * - Manage enforcement settings
 *
 * DEPENDENCIES:
 * - zustand - State management
 *
 * EXPORTS:
 * - useSettingsStore - Zustand hook for settings state
 *
 * PATTERNS:
 * - Settings are persisted to SQLite via Tauri commands
 * - API key is stored securely in the system keychain, never in state
 *
 * CLAUDE NOTES:
 * - NEVER store API keys in the store or local storage
 * - Settings load from SQLite on app startup
 * - Theme defaults to system preference
 */

import { create } from "zustand";

interface SettingsState {
  hasApiKey: boolean;
  notificationsEnabled: boolean;
  enforcementLevel: "off" | "warn" | "block";

  setHasApiKey: (hasKey: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setEnforcementLevel: (level: "off" | "warn" | "block") => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  hasApiKey: false,
  notificationsEnabled: true,
  enforcementLevel: "warn",

  setHasApiKey: (hasApiKey) => set({ hasApiKey }),
  setNotificationsEnabled: (notificationsEnabled) =>
    set({ notificationsEnabled }),
  setEnforcementLevel: (enforcementLevel) => set({ enforcementLevel }),
}));
