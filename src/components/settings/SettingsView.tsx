/**
 * @module components/settings/SettingsView
 * @description Settings panel for configuring enforcement level, notifications, API key status, and app info
 *
 * PURPOSE:
 * - Display and manage user-configurable application settings
 * - Organize settings into logical sections (enforcement, notifications, API, about)
 * - Persist setting changes to the SQLite backend via IPC
 * - Load saved settings from the backend on mount
 *
 * DEPENDENCIES:
 * - react - useEffect for loading settings on mount
 * - @/components/ui/card - Card, CardHeader, CardTitle, CardContent for section layout
 * - @/components/ui/button - Button for enforcement level selection
 * - @/components/ui/badge - Badge for API key status indicator
 * - @/stores/settingsStore - Zustand store for settings state
 * - @/lib/tauri - saveSetting, getAllSettings for IPC persistence
 *
 * EXPORTS:
 * - SettingsView - Main settings panel component
 *
 * PATTERNS:
 * - Settings are loaded from SQLite on mount via getAllSettings()
 * - Each change calls saveSetting() to persist immediately
 * - Zustand store is the single source of truth for UI state
 * - Enforcement level uses radio-style buttons (only one active at a time)
 * - Notifications toggle is a simple on/off button
 * - API key section is read-only (keys managed via system keychain)
 *
 * CLAUDE NOTES:
 * - The API key itself is NEVER stored in the frontend; only a boolean flag (hasApiKey)
 * - Enforcement levels: "off" (no checks), "warn" (show warnings), "block" (prevent commits)
 * - Settings are persisted as string key-value pairs; booleans are stored as "true"/"false"
 * - The about section is static and does not depend on any backend data
 */

import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveSetting, getAllSettings } from "@/lib/tauri";

const ENFORCEMENT_OPTIONS: Array<{
  value: "off" | "warn" | "block";
  label: string;
  description: string;
}> = [
  { value: "off", label: "Off", description: "No documentation checks" },
  { value: "warn", label: "Warn", description: "Show warnings for missing docs" },
  { value: "block", label: "Block", description: "Prevent commits without docs" },
];

export function SettingsView() {
  const enforcementLevel = useSettingsStore((s) => s.enforcementLevel);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const setEnforcementLevel = useSettingsStore((s) => s.setEnforcementLevel);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setHasApiKey = useSettingsStore((s) => s.setHasApiKey);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getAllSettings();
        if (settings.enforcementLevel) {
          const level = settings.enforcementLevel as "off" | "warn" | "block";
          if (level === "off" || level === "warn" || level === "block") {
            setEnforcementLevel(level);
          }
        }
        if (settings.notificationsEnabled !== undefined) {
          setNotificationsEnabled(settings.notificationsEnabled === "true");
        }
        if (settings.hasApiKey !== undefined) {
          setHasApiKey(settings.hasApiKey === "true");
        }
      } catch {
        // Settings may not be persisted yet; defaults from the store are fine
      }
    }
    loadSettings();
  }, [setEnforcementLevel, setNotificationsEnabled, setHasApiKey]);

  async function handleEnforcementChange(level: "off" | "warn" | "block") {
    setEnforcementLevel(level);
    await saveSetting("enforcementLevel", level);
  }

  async function handleNotificationsToggle() {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    await saveSetting("notificationsEnabled", String(next));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Enforcement Level */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">Enforcement Level</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-neutral-400">
            Control how strictly documentation requirements are enforced.
          </p>
          <div className="flex gap-3">
            {ENFORCEMENT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={enforcementLevel === option.value ? "default" : "outline"}
                className={
                  enforcementLevel === option.value
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100"
                }
                onClick={() => handleEnforcementChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            {ENFORCEMENT_OPTIONS.find((o) => o.value === enforcementLevel)?.description}
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-300">Enable notifications</p>
              <p className="text-xs text-neutral-500">
                Receive alerts for stale docs and context rot warnings.
              </p>
            </div>
            <Button
              variant="outline"
              className={
                notificationsEnabled
                  ? "border-green-700 bg-green-900/30 text-green-400 hover:bg-green-900/50 hover:text-green-300"
                  : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300"
              }
              onClick={handleNotificationsToggle}
            >
              {notificationsEnabled ? "On" : "Off"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Key Status */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">API Key Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge
              variant={hasApiKey ? "default" : "destructive"}
              className={
                hasApiKey
                  ? "bg-green-900/40 text-green-400 hover:bg-green-900/40"
                  : "bg-red-900/40 text-red-400 hover:bg-red-900/40"
              }
            >
              {hasApiKey ? "Configured" : "Not Configured"}
            </Badge>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            API keys are stored securely in the system keychain and are never saved in plain text.
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Application</span>
              <span className="text-neutral-200">Claude Code Copilot</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Version</span>
              <span className="text-neutral-200">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Specification</span>
              <a
                href="claude-code-copilot-desktop-spec-v2.md"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                claude-code-copilot-desktop-spec-v2.md
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
