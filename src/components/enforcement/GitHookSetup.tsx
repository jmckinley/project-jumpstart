/**
 * @module components/enforcement/GitHookSetup
 * @description Git pre-commit hook installation and status management
 *
 * PURPOSE:
 * - Display current git hook installation status
 * - Allow installing/updating pre-commit hooks with block, warn, or auto-update mode
 * - Show Husky detection if present
 * - Provide one-click git initialization if no repository exists
 *
 * DEPENDENCIES:
 * - @/components/ui/card - Card layout
 * - @/components/ui/button - Action buttons
 * - @/components/ui/badge - Status badges
 * - @/types/enforcement - HookStatus type
 * - @/stores/settingsStore - Sync enforcement level to settings
 * - @/lib/tauri - saveSetting, initGit for persisting enforcement level and git init
 *
 * EXPORTS:
 * - GitHookSetup - Hook setup and status component
 *
 * PATTERNS:
 * - Receives hookStatus, projectPath, loading, installing from parent
 * - onInstall callback triggers hook installation with selected mode
 * - onRefresh callback refreshes hook status
 * - Shows status badge: green for installed, yellow for external, gray for not installed
 * - Active mode button shows "(Active)" suffix with ring styling
 * - No git repo shows warning with one-click "Initialize Git Repository" button
 *
 * CLAUDE NOTES:
 * - Hook modes:
 *   - "block" (exit 1, prevents commit)
 *   - "warn" (exit 0, allows commit with warning)
 *   - "auto-update" (generates missing docs via AI, stages them, allows commit)
 * - "external" mode means a non-Jumpstart hook is already present
 * - hasGit flag indicates if .git directory exists
 * - hasHusky flag indicates Husky framework is detected alongside
 * - Auto-update mode requires API key configured in Project Jumpstart settings
 * - Installing a hook syncs the mode to the Settings enforcement level
 * - Auto-update button has blue fill, active buttons have ring styling
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HookStatus, HookHealth } from "@/types/enforcement";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveSetting, initGit } from "@/lib/tauri";

interface GitHookSetupProps {
  hookStatus: HookStatus | null;
  hookHealth?: HookHealth | null;
  projectPath: string;
  loading: boolean;
  installing: boolean;
  onInstall: (mode: "warn" | "block" | "auto-update") => void;
  onRefresh: () => void;
  onResetHealth?: () => void;
}

function getStatusBadge(status: HookStatus | null) {
  if (!status) {
    return <Badge variant="outline" className="text-neutral-500">Unknown</Badge>;
  }
  if (status.installed) {
    return <Badge className="bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50">Installed ({status.mode})</Badge>;
  }
  if (status.mode === "external") {
    return <Badge className="bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/50">External Hook</Badge>;
  }
  return <Badge variant="outline" className="text-neutral-500">Not Installed</Badge>;
}

export function GitHookSetup({ hookStatus, hookHealth, projectPath, loading, installing, onInstall, onRefresh, onResetHealth }: GitHookSetupProps) {
  const setEnforcementLevel = useSettingsStore((s) => s.setEnforcementLevel);
  const [initializingGit, setInitializingGit] = useState(false);

  async function handleInstall(mode: "warn" | "block" | "auto-update") {
    // Sync with settings store
    setEnforcementLevel(mode);
    await saveSetting("enforcementLevel", mode);
    // Call the actual install
    onInstall(mode);
  }

  async function handleInitGit() {
    setInitializingGit(true);
    try {
      await initGit(projectPath);
      // Auto-install auto-update hook after git init
      await handleInstall("auto-update");
      onRefresh();
    } catch (err) {
      console.error("Failed to initialize git:", err);
      onRefresh(); // Still refresh to show git was created
    } finally {
      setInitializingGit(false);
    }
  }

  const isActive = (mode: string) => hookStatus?.installed && hookStatus?.mode === mode;

  return (
    <Card className="border-neutral-800 bg-neutral-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Git Pre-Commit Hook</CardTitle>
          {getStatusBadge(hookStatus)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-400">
          Install a pre-commit hook to enforce documentation headers on every commit.
          Staged source files without <code className="rounded bg-neutral-800 px-1 py-0.5 text-xs">@module</code> or{" "}
          <code className="rounded bg-neutral-800 px-1 py-0.5 text-xs">@description</code> headers will be flagged.
        </p>

        {/* No git repository detected */}
        {hookStatus && !hookStatus.hasGit && (
          <div className="rounded-md border border-amber-800 bg-amber-950/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">No Git Repository</span>
            </div>
            <p className="text-sm text-amber-300/80">
              This project doesn't have a git repository. Initialize git to enable pre-commit hooks.
            </p>
            <Button
              size="sm"
              onClick={handleInitGit}
              disabled={initializingGit}
              className="bg-amber-500 hover:bg-amber-400 text-neutral-900 font-medium"
            >
              {initializingGit ? "Initializing..." : "Initialize Git Repository"}
            </Button>
          </div>
        )}

        {hookStatus?.hasHusky && (
          <div className="rounded-md border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-400">
            Husky detected — the hook will be installed alongside your existing Husky setup.
          </div>
        )}

        {hookStatus?.mode === "external" && (
          <div className="rounded-md border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-400">
            An external pre-commit hook is already installed. Installing will replace it.
          </div>
        )}

        {/* Outdated hook warning */}
        {hookStatus?.installed && hookStatus?.outdated && (
          <div className="rounded-md border border-orange-800 bg-orange-950/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-orange-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">Hook Update Available</span>
            </div>
            <p className="text-sm text-orange-300/80">
              Your hook (v{hookStatus.version}) is outdated. Version {hookStatus.currentVersion} includes
              important fixes: proper JSON parsing with jq, better error handling, and security improvements.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleInstall(hookStatus.mode as "warn" | "block" | "auto-update")}
                disabled={installing}
                className="bg-orange-500 hover:bg-orange-400 text-neutral-900 font-medium"
              >
                {installing ? "Updating..." : "Update Hook Now"}
              </Button>
              {hookStatus.mode === "auto-update" && (
                <span className="text-xs text-orange-400">Requires jq to be installed</span>
              )}
            </div>
          </div>
        )}

        {/* Self-healing downgrade alert */}
        {hookHealth?.downgraded && (
          <div className="rounded-md border border-red-800 bg-red-950/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">Auto-Update Disabled (Self-Healed)</span>
            </div>
            <p className="text-sm text-red-300/80">
              Auto-update was disabled after {hookHealth.consecutiveFailures} consecutive failed commits
              to protect your files from corruption.
              {hookHealth.lastFailureReason && (
                <> Last failure: {hookHealth.lastFailureReason}</>
              )}
            </p>
            <div className="flex items-center gap-3">
              <div className="text-xs text-red-400/60">
                Total: {hookHealth.totalSuccesses} succeeded, {hookHealth.totalFailures} failed
              </div>
              {onResetHealth && (
                <Button
                  size="sm"
                  onClick={onResetHealth}
                  className="bg-red-500 hover:bg-red-400 text-white font-medium"
                >
                  Re-enable Auto-Update
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Only show hook buttons if git exists */}
        {hookStatus?.hasGit && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleInstall("auto-update")}
                disabled={installing || loading}
                className={isActive("auto-update")
                  ? "bg-blue-500 hover:bg-blue-500 ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-900"
                  : "bg-blue-600 hover:bg-blue-500"
                }
              >
                {installing ? "Installing..." : isActive("auto-update") ? "Auto-Update (Active)" : "Auto-Update (Recommended)"}
              </Button>
              <Button
                size="sm"
                variant={isActive("block") ? "default" : "destructive"}
                onClick={() => handleInstall("block")}
                disabled={installing || loading}
                className={isActive("block")
                  ? "bg-red-500 hover:bg-red-500 ring-2 ring-red-400 ring-offset-2 ring-offset-neutral-900"
                  : ""
                }
              >
                {installing ? "Installing..." : isActive("block") ? "Block (Active)" : "Block"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleInstall("warn")}
                disabled={installing || loading}
                className={isActive("warn")
                  ? "border-yellow-500 bg-yellow-500/20 text-yellow-400 ring-2 ring-yellow-400 ring-offset-2 ring-offset-neutral-900"
                  : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                }
              >
                {installing ? "Installing..." : isActive("warn") ? "Warn (Active)" : "Warn"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                disabled={loading}
                className="text-neutral-400 hover:text-neutral-200"
              >
                Refresh
              </Button>
            </div>

            <div className="text-xs text-neutral-500 space-y-1">
              <p><span className="font-medium text-blue-400">Auto-update</span> — Generates missing docs via AI, stages them, then commits</p>
              <p><span className="font-medium text-red-400">Block</span> — Prevents commits with missing doc headers (must fix manually)</p>
              <p><span className="font-medium text-yellow-400">Warn</span> — Allows commits but prints warnings about missing docs</p>
            </div>

            {hookStatus?.installed && (
              <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500 space-y-1">
                <p>Hook path: {hookStatus.hookPath}</p>
                <p>
                  Version: {hookStatus.version || "unknown"}
                  {hookStatus.outdated && (
                    <span className="text-orange-400 ml-2">(update available: v{hookStatus.currentVersion})</span>
                  )}
                  {!hookStatus.outdated && hookStatus.version && (
                    <span className="text-emerald-400 ml-2">(up to date)</span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
