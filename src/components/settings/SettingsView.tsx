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
 * - react - useEffect, useState for loading settings on mount and API key input
 * - @/components/ui/card - Card, CardHeader, CardTitle, CardContent for section layout
 * - @/components/ui/button - Button for enforcement level selection and API key save
 * - @/components/ui/badge - Badge for API key status indicator
 * - @/stores/settingsStore - Zustand store for settings state
 * - @/stores/projectStore - Active project for git hook sync
 * - @/lib/tauri - saveSetting, getAllSettings, getSetting, installGitHooks, getHookStatus for IPC
 *
 * EXPORTS:
 * - SettingsView - Main settings panel component
 *
 * PATTERNS:
 * - Settings are loaded from SQLite on mount via getAllSettings() and getSetting()
 * - Each change calls saveSetting() to persist immediately
 * - Zustand store is the single source of truth for UI state
 * - Enforcement level uses radio-style buttons (only one active at a time)
 * - Notifications toggle is a simple on/off button
 * - API key input with masked display (last 4 chars), save and remove buttons
 *
 * CLAUDE NOTES:
 * - The API key is stored as "anthropic_api_key" in the settings table
 * - Frontend only displays a masked version (last 4 chars) and a boolean hasApiKey flag
 * - Enforcement levels: "off" (no checks), "warn" (warnings), "block" (prevent commits), "auto-update" (AI-generate docs)
 * - Settings are persisted as string key-value pairs; booleans are stored as "true"/"false"
 * - The about section is static and does not depend on any backend data
 * - Enforcement level syncs with git hook: changing level here updates the installed hook
 * - On mount, if a hook is installed, the settings are synced from the hook mode
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveSetting, getAllSettings, getSetting, installGitHooks, getHookStatus } from "@/lib/tauri";
import { useProjectStore } from "@/stores/projectStore";

const ENFORCEMENT_OPTIONS: Array<{
  value: "off" | "warn" | "block" | "auto-update";
  label: string;
  description: string;
}> = [
  { value: "off", label: "Off", description: "No documentation checks" },
  { value: "warn", label: "Warn", description: "Allow commits but show warnings for missing docs" },
  { value: "block", label: "Block", description: "Prevent commits with missing doc headers" },
  { value: "auto-update", label: "Auto-Update", description: "Generate missing docs via AI, stage them, then commit (Recommended)" },
];

export function SettingsView() {
  const enforcementLevel = useSettingsStore((s) => s.enforcementLevel);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const setEnforcementLevel = useSettingsStore((s) => s.setEnforcementLevel);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setHasApiKey = useSettingsStore((s) => s.setHasApiKey);
  const activeProject = useProjectStore((s) => s.activeProject);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyMask, setApiKeyMask] = useState<string | null>(null);
  const [apiKeySaving, setApiKeySaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getAllSettings();
        if (settings.enforcementLevel) {
          const level = settings.enforcementLevel as "off" | "warn" | "block" | "auto-update";
          if (level === "off" || level === "warn" || level === "block" || level === "auto-update") {
            setEnforcementLevel(level);
          }
        }
        if (settings.notificationsEnabled !== undefined) {
          setNotificationsEnabled(settings.notificationsEnabled === "true");
        }

        // Check if API key is set
        const key = await getSetting("anthropic_api_key");
        if (key && key.length > 4) {
          setHasApiKey(true);
          setApiKeyMask(`sk-...${key.slice(-4)}`);
        } else if (key) {
          setHasApiKey(true);
          setApiKeyMask("sk-...");
        } else {
          setHasApiKey(false);
          setApiKeyMask(null);
        }

        // Check hook status if project is active and sync enforcement level from installed hook
        if (activeProject) {
          const status = await getHookStatus(activeProject.path);
          if (status.installed && status.mode && status.mode !== "external") {
            const hookMode = status.mode as "off" | "warn" | "block" | "auto-update";
            if (hookMode !== settings.enforcementLevel) {
              setEnforcementLevel(hookMode);
              await saveSetting("enforcementLevel", hookMode);
            }
          }
        }
      } catch {
        // Settings may not be persisted yet; defaults from the store are fine
      }
    }
    loadSettings();
  }, [setEnforcementLevel, setNotificationsEnabled, setHasApiKey, activeProject]);

  async function handleSaveApiKey() {
    if (!apiKeyInput.trim()) return;
    setApiKeySaving(true);
    try {
      await saveSetting("anthropic_api_key", apiKeyInput.trim());
      setHasApiKey(true);
      setApiKeyMask(`sk-...${apiKeyInput.trim().slice(-4)}`);
      setApiKeyInput("");
    } catch {
      // Save failed
    } finally {
      setApiKeySaving(false);
    }
  }

  async function handleClearApiKey() {
    try {
      await saveSetting("anthropic_api_key", "");
      setHasApiKey(false);
      setApiKeyMask(null);
    } catch {
      // Clear failed
    }
  }

  async function handleEnforcementChange(level: "off" | "warn" | "block" | "auto-update") {
    setEnforcementLevel(level);
    await saveSetting("enforcementLevel", level);

    // Sync with git hook if project is active
    if (activeProject && level !== "off") {
      try {
        await installGitHooks(activeProject.path, level);
      } catch {
        // Hook installation may fail if no git repo, etc.
      }
    }
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
                variant={enforcementLevel === option.value ? "primary" : "outline"}
                className={
                  enforcementLevel === option.value
                    ? ""
                    : "border-neutral-700 bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-200"
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
                  : "border-neutral-700 bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-200"
              }
              onClick={handleNotificationsToggle}
            >
              {notificationsEnabled ? "On" : "Off"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anthropic API Key */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-neutral-100">Anthropic API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
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
            {apiKeyMask && (
              <span className="text-xs text-neutral-500 font-mono">{apiKeyMask}</span>
            )}
          </div>

          {hasApiKey ? (
            <div>
              <p className="text-sm text-neutral-400 mb-3">
                API key is set. AI-powered generation is enabled for CLAUDE.md and module docs.
              </p>
              <Button
                variant="outline"
                className="border-red-900 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300"
                onClick={handleClearApiKey}
              >
                Remove Key
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-neutral-400 mb-3">
                Enter your Anthropic API key to enable AI-powered documentation generation.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveApiKey();
                  }}
                />
                <Button
                  variant="primary"
                  onClick={handleSaveApiKey}
                  disabled={apiKeySaving || !apiKeyInput.trim()}
                >
                  {apiKeySaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-neutral-500">
            Your API key is stored locally in the SQLite database. It is never sent anywhere except to the Anthropic API.
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
              <span className="text-neutral-200">Project Jumpstart</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Version</span>
              <span className="text-neutral-200">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Specification</span>
              <a
                href="project-jumpstart-spec.md"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                project-jumpstart-spec.md
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
