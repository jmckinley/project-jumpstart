/**
 * @module hooks/usePerformance
 * @description Custom hook for performance engineering analysis
 *
 * PURPOSE:
 * - Run performance analysis on the active project
 * - Manage review history (load, delete)
 * - Track loading and error states
 *
 * DEPENDENCIES:
 * - @/lib/tauri - analyzePerformance, listPerformanceReviews, deletePerformanceReview IPC calls
 * - @/stores/projectStore - Active project for path and ID
 * - @/stores/toastStore - Success/error toast notifications
 * - @/types/performance - PerformanceReview type
 *
 * EXPORTS:
 * - usePerformance - Hook returning review state and actions
 *
 * PATTERNS:
 * - Call analyze() to run a new performance analysis
 * - Call loadHistory() to fetch previous reviews
 * - Returns { review, history, analyzing, loading, error, analyze, loadHistory, deleteReview }
 *
 * CLAUDE NOTES:
 * - analyze() stores the review in the database and returns it
 * - loadHistory() fetches the 20 most recent reviews
 */

import { useCallback, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";
import {
  analyzePerformance,
  listPerformanceReviews,
  deletePerformanceReview as deleteReviewApi,
} from "@/lib/tauri";
import type { PerformanceReview } from "@/types/performance";

interface PerformanceState {
  review: PerformanceReview | null;
  history: PerformanceReview[];
  analyzing: boolean;
  loading: boolean;
  error: string | null;
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
  });

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

  return {
    ...state,
    analyze,
    loadHistory,
    deleteReview,
  };
}
