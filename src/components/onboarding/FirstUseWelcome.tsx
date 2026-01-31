/**
 * @module components/onboarding/FirstUseWelcome
 * @description Welcome screen shown on first app launch with app introduction and mandatory API key setup
 *
 * PURPOSE:
 * - Introduce users to Project Jumpstart on first launch
 * - Explain the app's purpose and key features
 * - Require API key entry before proceeding (mandatory for AI features)
 * - Transition user to main app or onboarding wizard
 *
 * DEPENDENCIES:
 * - @/lib/tauri - saveSetting, validateApiKey for persistence and validation
 * - @/stores/settingsStore - setHasApiKey for UI state
 *
 * EXPORTS:
 * - FirstUseWelcome - Welcome screen component
 *
 * PATTERNS:
 * - Displayed only when has_seen_welcome setting is false/null
 * - API key is mandatory - validates format and tests with API before proceeding
 * - On completion, sets has_seen_welcome to "true"
 *
 * CLAUDE NOTES:
 * - This screen blocks all other UI until dismissed
 * - API key is saved via the save_setting command (encrypted in backend)
 * - Format validation: must start with sk-ant- and be 20+ chars
 * - API validation: makes minimal API call to test key validity
 */

import { useState, useMemo } from "react";
import { saveSetting, validateApiKey } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";

const FEATURES = [
  "Auto-generate CLAUDE.md files",
  "Track module documentation freshness",
  "Skills & agents library",
  "RALPH loop prompt optimization",
  "One-click fixes",
  "Avoid context rot!",
];

interface FirstUseWelcomeProps {
  onComplete: () => void;
}

export function FirstUseWelcome({ onComplete }: FirstUseWelcomeProps) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);
  const setHasApiKey = useSettingsStore((s) => s.setHasApiKey);

  // Format validation
  const isValidFormat = useMemo(() => {
    const trimmed = apiKey.trim();
    return trimmed.startsWith("sk-ant-") && trimmed.length >= 20;
  }, [apiKey]);

  // Update format error as user types
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setError(null);

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setFormatError(null);
    } else if (!trimmed.startsWith("sk-ant-")) {
      setFormatError("Key must start with 'sk-ant-'");
    } else if (trimmed.length < 20) {
      setFormatError("Key is too short");
    } else {
      setFormatError(null);
    }
  };

  const handleComplete = async () => {
    if (!isValidFormat) {
      setError("Please enter a valid API key");
      return;
    }

    setSaving(true);
    setValidating(true);
    setError(null);

    try {
      // Validate API key with backend (format check + API call)
      await validateApiKey(apiKey.trim());

      // Save API key
      await saveSetting("anthropic_api_key", apiKey.trim());
      setHasApiKey(true);

      // Mark welcome as seen
      await saveSetting("has_seen_welcome", "true");

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate API key");
      setSaving(false);
      setValidating(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <img
              src="/app-icon.png"
              alt="Project Jumpstart"
              className="h-24 w-24 drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-neutral-100">
            Welcome to Project Jumpstart
          </h1>
          <p className="mt-3 text-lg text-neutral-400">
            You're 10 minutes away from using Claude Code best practices in your project.
          </p>
        </div>

        {/* Features */}
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-neutral-300">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <div className="mb-6 h-px bg-neutral-800" />

        {/* API Key Input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-neutral-300">
            Anthropic API Key{" "}
            <span className="font-normal text-red-400">(required)</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="sk-ant-..."
            className={`w-full rounded-lg border px-4 py-3 text-neutral-100 placeholder-neutral-500 transition-colors focus:outline-none focus:ring-1 ${
              formatError
                ? "border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500"
                : isValidFormat
                  ? "border-green-500 bg-green-950/20 focus:border-green-500 focus:ring-green-500"
                  : "border-neutral-700 bg-neutral-800 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {formatError ? (
            <p className="mt-2 text-sm text-red-400">{formatError}</p>
          ) : isValidFormat ? (
            <p className="mt-2 text-sm text-green-400">Format looks good</p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              An API key is required for AI-powered documentation generation.
              Get one at{" "}
              <a
                href="https://console.anthropic.com/account/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300"
              >
                console.anthropic.com
              </a>
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => handleComplete()}
            disabled={saving || !isValidFormat}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {validating ? "Validating..." : saving ? "Saving..." : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  );
}
