/**
 * @module components/enforcement/GitHookSetup
 * @description Git pre-commit hook installation and status management
 *
 * PURPOSE:
 * - Display current git hook installation status
 * - Allow installing/updating pre-commit hooks with block or warn mode
 * - Show Husky detection if present
 *
 * DEPENDENCIES:
 * - @/components/ui/card - Card layout
 * - @/components/ui/button - Action buttons
 * - @/components/ui/badge - Status badges
 * - @/types/enforcement - HookStatus type
 *
 * EXPORTS:
 * - GitHookSetup - Hook setup and status component
 *
 * PATTERNS:
 * - Receives hookStatus, loading, installing from parent
 * - onInstall callback triggers hook installation with selected mode
 * - onRefresh callback refreshes hook status
 * - Shows status badge: green for installed, yellow for external, gray for not installed
 *
 * CLAUDE NOTES:
 * - Hook modes: "block" (exit 1, prevents commit) or "warn" (exit 0, allows commit)
 * - "external" mode means a non-Copilot hook is already present
 * - has_husky flag indicates Husky framework is detected alongside
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HookStatus } from "@/types/enforcement";

interface GitHookSetupProps {
  hookStatus: HookStatus | null;
  loading: boolean;
  installing: boolean;
  onInstall: (mode: "warn" | "block") => void;
  onRefresh: () => void;
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

export function GitHookSetup({ hookStatus, loading, installing, onInstall, onRefresh }: GitHookSetupProps) {
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

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onInstall("block")}
            disabled={installing || loading}
          >
            {installing ? "Installing..." : "Install (Block Mode)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onInstall("warn")}
            disabled={installing || loading}
            className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          >
            {installing ? "Installing..." : "Install (Warn Mode)"}
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
          <p><span className="font-medium text-red-400">Block mode</span> — Prevents commits with missing doc headers (exit 1)</p>
          <p><span className="font-medium text-yellow-400">Warn mode</span> — Allows commits but prints warnings (exit 0)</p>
        </div>

        {hookStatus?.installed && (
          <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500">
            Hook path: {hookStatus.hookPath}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
