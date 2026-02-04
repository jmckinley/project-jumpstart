/**
 * @module hooks/useSessionAnalysis
 * @description Hook for AI-powered analysis of Claude Code session transcripts
 *
 * PURPOSE:
 * - Analyze recent Claude Code session activity
 * - Generate context-aware recommendations (agents, tests, patterns, docs)
 * - Cache analysis results to avoid redundant API calls
 *
 * DEPENDENCIES:
 * - react (useState, useCallback) - State management
 * - @/lib/tauri (analyzeSession, getSessionTranscript) - Backend calls
 * - @/types/session-analysis - Type definitions
 * - @/stores/projectStore - Active project context
 *
 * EXPORTS:
 * - useSessionAnalysis - Hook for session analysis functionality
 *
 * PATTERNS:
 * - Call analyze() to trigger AI analysis (requires API key)
 * - Analysis is cached for 5 minutes to avoid redundant calls
 * - Use getTranscript() for debugging/inspection
 *
 * CLAUDE NOTES:
 * - Analysis requires an Anthropic API key configured in settings
 * - Only analyzes last 30 messages to control costs
 * - Recommendations include type, priority, and actionable details
 * - Cache timestamp stored to throttle requests
 */

import { useState, useCallback, useRef } from "react";
import { analyzeSession, getSessionTranscript } from "@/lib/tauri";
import { useProjectStore } from "@/stores/projectStore";
import type { SessionAnalysis, SessionRecommendation } from "@/types/session-analysis";

interface UseSessionAnalysisReturn {
  /** Current analysis result (null if not yet analyzed) */
  analysis: SessionAnalysis | null;
  /** Individual recommendations for easy access */
  recommendations: SessionRecommendation[];
  /** Whether analysis is currently running */
  analyzing: boolean;
  /** Error message if analysis failed */
  error: string | null;
  /** Trigger a new analysis */
  analyze: () => Promise<SessionAnalysis | null>;
  /** Get raw transcript for debugging */
  getTranscript: (maxMessages?: number) => Promise<string[]>;
  /** Clear cached analysis */
  clearCache: () => void;
  /** Timestamp of last analysis */
  lastAnalyzedAt: Date | null;
  /** Whether enough time has passed for a new analysis */
  canAnalyze: boolean;
}

const ANALYSIS_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function useSessionAnalysis(): UseSessionAnalysisReturn {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

  // Use ref for cache timestamp to persist across renders
  const cacheTimestamp = useRef<number>(0);

  const canAnalyze = useCallback(() => {
    if (!activeProject) return false;
    const now = Date.now();
    return now - cacheTimestamp.current > ANALYSIS_COOLDOWN_MS;
  }, [activeProject]);

  const analyze = useCallback(async (): Promise<SessionAnalysis | null> => {
    if (!activeProject) {
      setError("No project selected");
      return null;
    }

    // Check cooldown
    const now = Date.now();
    if (now - cacheTimestamp.current < ANALYSIS_COOLDOWN_MS && analysis) {
      // Return cached result
      return analysis;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeSession(
        activeProject.path,
        activeProject.name,
        activeProject.language || undefined,
        activeProject.framework || undefined,
      );

      setAnalysis(result);
      setLastAnalyzedAt(new Date());
      cacheTimestamp.current = now;

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, [activeProject, analysis]);

  const getTranscript = useCallback(async (maxMessages?: number): Promise<string[]> => {
    if (!activeProject) {
      return [];
    }

    try {
      return await getSessionTranscript(activeProject.path, maxMessages);
    } catch (err) {
      console.error("Failed to get transcript:", err);
      return [];
    }
  }, [activeProject]);

  const clearCache = useCallback(() => {
    setAnalysis(null);
    setLastAnalyzedAt(null);
    cacheTimestamp.current = 0;
    setError(null);
  }, []);

  return {
    analysis,
    recommendations: analysis?.recommendations ?? [],
    analyzing,
    error,
    analyze,
    getTranscript,
    clearCache,
    lastAnalyzedAt,
    canAnalyze: canAnalyze(),
  };
}
