/**
 * @module hooks/usePerformance
 * @description Custom hook for performance engineering analysis and remediation
 *
 * PURPOSE:
 * - Run performance analysis on the active project
 * - Manage review history (load, delete)
 * - Auto-remediate performance issues via AI (per-file processing)
 * - Track loading, remediation progress, and error states
 *
 * DEPENDENCIES:
 * - @/lib/tauri - analyzePerformance, listPerformanceReviews, deletePerformanceReview, remediatePerformanceFile IPC calls
 * - @/stores/projectStore - Active project for path and ID
 * - @/stores/toastStore - Success/error toast notifications
 * - @/types/performance - PerformanceReview, PerformanceIssue, RemediationResult, RemediationSummary types
 *
 * EXPORTS:
 * - usePerformance - Hook returning review state, remediation state, and actions
 *
 * PATTERNS:
 * - Call analyze() to run a new performance analysis
 * - Call loadHistory() to fetch previous reviews
 * - Call remediate(issues) to auto-fix issues grouped by file
 * - Call cancelRemediation() to stop between files
 * - Call clearRemediationResult() to reset remediation summary
 * - Returns { review, history, analyzing, loading, error, remediating, remediationProgress, remediationResult, analyze, loadHistory, deleteReview, remediate, cancelRemediation, clearRemediationResult }
 *
 * CLAUDE NOTES:
 * - analyze() stores the review in the database and returns it
 * - loadHistory() fetches the 20 most recent reviews
 * - remediate() groups issues by filePath, iterates files, calls per-file backend command
 * - cancelledRef prevents re-renders while supporting cancellation between files
 */

import { useCallback, useRef, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";
import {
  analyzePerformance,
  listPerformanceReviews,
  deletePerformanceReview as deleteReviewApi,
  remediatePerformanceFile,
} from "@/lib/tauri";
import type {
  PerformanceReview,
  PerformanceIssue,
  RemediationResult,
  RemediationSummary,
} from "@/types/performance";

interface PerformanceState {
  review: PerformanceReview | null;
  history: PerformanceReview[];
  analyzing: boolean;
  loading: boolean;
  error: string | null;
  remediating: boolean;
  remediationProgress: { current: number; total: number } | null;
  remediationResult: RemediationSummary | null;
}

export function usePerformance() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const addToast = useToastStore((s) => s.addToast);

  const [state, setState] = useState<PerformanceState>({
    review: null,
    history: [],
    analyzing: false,
    loading: false,
    error: null,
    remediating: false,
    remediationProgress: null,
    remediationResult: null,
  });

  const cancelledRef = useRef(false);

  const analyze = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, analyzing: true, error: null }));
    try {
      const review = await analyzePerformance(activeProject.path);
      setState((s) => ({
        ...s,
        review,
        history: [review, ...s.history],
        analyzing: false,
      }));
      addToast({ message: `Performance analysis complete (score: ${review.overallScore})`, type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze performance";
      setState((s) => ({ ...s, analyzing: false, error: message }));
      addToast({ message: "Performance analysis failed", type: "error" });
    }
  }, [activeProject, addToast]);

  const loadHistory = useCallback(async () => {
    if (!activeProject) return;

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const reviews = await listPerformanceReviews(activeProject.id);
      setState((s) => ({
        ...s,
        history: reviews,
        review: reviews.length > 0 ? reviews[0] : s.review,
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load history",
      }));
    }
  }, [activeProject]);

  const deleteReview = useCallback(
    async (reviewId: string) => {
      try {
        await deleteReviewApi(reviewId);
        setState((s) => ({
          ...s,
          history: s.history.filter((r) => r.id !== reviewId),
          review: s.review?.id === reviewId ? null : s.review,
        }));
        addToast({ message: "Review deleted", type: "success" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete review";
        setState((s) => ({ ...s, error: message }));
        addToast({ message: "Failed to delete review", type: "error" });
      }
    },
    [addToast],
  );

  const remediate = useCallback(
    async (issues: PerformanceIssue[]) => {
      if (!activeProject) return;

      // Group issues by filePath
      const byFile = new Map<string, PerformanceIssue[]>();
      for (const issue of issues) {
        if (!issue.filePath) continue;
        const existing = byFile.get(issue.filePath) ?? [];
        existing.push(issue);
        byFile.set(issue.filePath, existing);
      }

      const fileKeys = Array.from(byFile.keys());
      const total = fileKeys.length;

      if (total === 0) {
        addToast({ message: "No issues with file paths to remediate", type: "error" });
        return;
      }

      cancelledRef.current = false;
      setState((s) => ({
        ...s,
        remediating: true,
        remediationProgress: { current: 0, total },
        remediationResult: null,
        error: null,
      }));

      const allResults: RemediationResult[] = [];

      for (let i = 0; i < fileKeys.length; i++) {
        if (cancelledRef.current) break;

        const filePath = fileKeys[i];
        const fileIssues = byFile.get(filePath)!;

        setState((s) => ({
          ...s,
          remediationProgress: { current: i + 1, total },
        }));

        try {
          const results = await remediatePerformanceFile(
            filePath,
            fileIssues,
            activeProject.path,
          );
          allResults.push(...results);
        } catch (err) {
          // Per-file error: mark all issues for this file as failed
          for (const issue of fileIssues) {
            allResults.push({
              issueId: issue.id,
              filePath,
              status: "failed",
              message: err instanceof Error ? err.message : "Remediation failed",
            });
          }
        }
      }

      const summary: RemediationSummary = {
        total: allResults.length,
        fixed: allResults.filter((r) => r.status === "fixed").length,
        failed: allResults.filter((r) => r.status === "failed").length,
        skipped: allResults.filter((r) => r.status === "skipped").length,
        results: allResults,
      };

      setState((s) => ({
        ...s,
        remediating: false,
        remediationProgress: null,
        remediationResult: summary,
      }));

      if (summary.fixed > 0) {
        addToast({
          message: `Fixed ${summary.fixed} of ${summary.total} issues`,
          type: "success",
        });
      } else if (summary.failed > 0) {
        addToast({ message: "Remediation encountered errors", type: "error" });
      }
    },
    [activeProject, addToast],
  );

  const cancelRemediation = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const clearRemediationResult = useCallback(() => {
    setState((s) => ({ ...s, remediationResult: null }));
  }, []);

  return {
    ...state,
    analyze,
    loadHistory,
    deleteReview,
    remediate,
    cancelRemediation,
    clearRemediationResult,
  };
}
