/**
 * @module components/dashboard/RefreshDocsButton
 * @description One-click button to refresh all project documentation (CLAUDE.md + stale module docs)
 *
 * PURPOSE:
 * - Provide a prominent button to regenerate documentation in the dashboard header
 * - Show badge with count of stale files needing updates
 * - Show loading state during refresh and success/error feedback after completion
 *
 * DEPENDENCIES:
 * - @/hooks/useRefreshDocs - Hook for stale file scanning and refresh orchestration
 * - @/components/ui/button - Button primitive for consistent styling
 * - @/components/ui/badge - Badge for stale count display
 *
 * EXPORTS:
 * - RefreshDocsButton - Dashboard header button component
 *
 * PATTERNS:
 * - Single-click refresh with no confirmation (content is machine-generated)
 * - Shows spinner and disables button during refresh
 * - Calls onComplete callback after successful refresh to trigger dashboard updates
 * - Success/error feedback shown as temporary banners
 *
 * CLAUDE NOTES:
 * - Badge shows totalToRefresh count (stale + missing + 1 for CLAUDE.md)
 * - Badge is hidden when totalToRefresh <= 1 (only CLAUDE.md, no stale files)
 * - Success banner auto-dismisses after 3 seconds
 * - Error banner persists until user closes it or starts a new refresh
 * - No confirmation needed since docs are AI-generated, not user-crafted
 */

import { useCallback, useState } from "react";
import { useRefreshDocs } from "@/hooks/useRefreshDocs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RefreshDocsButtonProps {
  onComplete: () => void;
}

export function RefreshDocsButton({ onComplete }: RefreshDocsButtonProps) {
  const {
    refreshing,
    staleCount,
    missingCount,
    totalToRefresh,
    refreshAll,
  } = useRefreshDocs();

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setError(null);
    setShowSuccess(false);

    try {
      const result = await refreshAll();
      setSuccessMessage(
        `Refreshed CLAUDE.md${result.modules > 0 ? ` and ${result.modules} module files` : ""}`,
      );
      setShowSuccess(true);
      onComplete();

      // Auto-dismiss success after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh documentation");
    }
  }, [refreshAll, onComplete]);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  const moduleCount = staleCount + missingCount;

  return (
    <div className="relative flex flex-col">
      {/* Main Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <svg
                className="mr-2 h-3.5 w-3.5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Docs
            </>
          )}
        </Button>

        {moduleCount > 0 && !refreshing && (
          <Badge className="bg-amber-900/50 text-amber-300">
            {totalToRefresh}
          </Badge>
        )}
      </div>

      {/* Success Banner */}
      {showSuccess && (
        <div className="absolute right-0 top-full z-10 mt-2 min-w-[280px] rounded-md border border-emerald-900 bg-emerald-950/95 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-emerald-400"
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
            <p className="text-sm text-emerald-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="absolute right-0 top-full z-10 mt-2 min-w-[280px] rounded-md border border-red-900 bg-red-950/95 px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 shrink-0 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={handleDismissError}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
