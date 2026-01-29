/**
 * @module components/onboarding/ProjectSelect
 * @description Step 1 of onboarding wizard - welcome screen with folder picker
 *
 * PURPOSE:
 * - Show a welcoming first screen for the onboarding flow
 * - Let the user pick a project folder via native OS dialog
 * - Trigger project scanning after folder selection
 * - Show scanning progress spinner
 * - Auto-advance to step 2 after scan completes
 *
 * DEPENDENCIES:
 * - @/stores/onboardingStore - useOnboardingStore for wizard state
 * - @/lib/tauri - pickFolder() for native dialog, scanProject() for detection
 *
 * EXPORTS:
 * - ProjectSelect - Step 1 wizard component
 *
 * PATTERNS:
 * - Big centered UI with prominent action button
 * - After folder picked, immediately scans and applies detection results
 * - Auto-advances to step 2 on successful scan
 * - Error state shown inline if scanning fails
 *
 * CLAUDE NOTES:
 * - pickFolder() returns null if user cancels the dialog
 * - scanProject() can throw on invalid paths or permission errors
 * - applyDetection() populates language, framework, etc. from scan results
 * - Always set scanning=false in finally block to avoid stuck state
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { pickFolder, scanProject } from "@/lib/tauri";

export function ProjectSelect() {
  const projectPath = useOnboardingStore((s) => s.projectPath);
  const scanning = useOnboardingStore((s) => s.scanning);
  const setProjectPath = useOnboardingStore((s) => s.setProjectPath);
  const setScanning = useOnboardingStore((s) => s.setScanning);
  const applyDetection = useOnboardingStore((s) => s.applyDetection);
  const setStep = useOnboardingStore((s) => s.setStep);

  const [error, setError] = useState<string | null>(null);

  const handlePickFolder = async () => {
    setError(null);

    try {
      const folder = await pickFolder();
      if (!folder) return; // User cancelled

      setProjectPath(folder);
      setScanning(true);

      const result = await scanProject(folder);
      applyDetection(result);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to scan project folder"
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20">
          <svg
            className="h-8 w-8 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
        </div>

        {/* Title & Description */}
        <h2 className="mb-2 text-2xl font-semibold text-neutral-100">
          Welcome to Project Jumpstart
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-neutral-400">
          Select a project folder to get started. We'll scan your codebase to
          detect the tech stack and set up best-practice documentation.
        </p>

        {/* Folder Picker Button / Scanning State */}
        {scanning ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-500" />
            <p className="text-sm text-neutral-400">
              Scanning project...
            </p>
            {projectPath && (
              <p className="max-w-sm truncate text-xs text-neutral-500">
                {projectPath}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handlePickFolder}
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Select Project Folder
            </button>

            {projectPath && !error && (
              <p className="max-w-sm truncate text-xs text-neutral-500">
                Selected: {projectPath}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-4 rounded-md border border-red-800/50 bg-red-900/20 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
