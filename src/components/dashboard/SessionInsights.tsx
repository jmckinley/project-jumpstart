/**
 * @module components/dashboard/SessionInsights
 * @description AI-powered insights card from session transcript analysis
 *
 * PURPOSE:
 * - Display AI-generated recommendations based on recent Claude Code activity
 * - Show what user has been working on with suggested improvements
 * - Provide actionable next steps based on session context
 *
 * DEPENDENCIES:
 * - react (useState) - State management
 * - @/hooks/useSessionAnalysis - Session analysis hook
 * - @/types/session-analysis - Type definitions
 *
 * EXPORTS:
 * - SessionInsights - Dashboard card for AI recommendations
 *
 * PATTERNS:
 * - Shows "Analyze Session" button when no analysis exists
 * - Displays recommendations grouped by type after analysis
 * - Recommendations are actionable with navigation targets
 *
 * CLAUDE NOTES:
 * - Requires API key for AI analysis
 * - Analysis is cached for 5 minutes to control costs
 * - Shows session summary and prioritized recommendations
 * - Types: agent, test, pattern, doc, skill
 */

import { useState } from "react";
import { useSessionAnalysis } from "@/hooks/useSessionAnalysis";
import type { SessionRecommendation, SessionRecommendationType } from "@/types/session-analysis";

interface SessionInsightsProps {
  hasApiKey: boolean;
  onNavigate: (section: string) => void;
}

const typeConfig: Record<SessionRecommendationType, {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  targetSection: string;
}> = {
  agent: {
    icon: "robot",
    label: "Agent",
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    targetSection: "agents",
  },
  test: {
    icon: "beaker",
    label: "Test",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    targetSection: "test-plans",
  },
  pattern: {
    icon: "puzzle",
    label: "Pattern",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    targetSection: "claude-md",
  },
  doc: {
    icon: "document",
    label: "Doc",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    targetSection: "modules",
  },
  skill: {
    icon: "bolt",
    label: "Skill",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    targetSection: "skills",
  },
};

function RecommendationIcon({ type }: { type: SessionRecommendationType }) {
  const config = typeConfig[type];

  // Simple icon rendering based on type
  switch (config.icon) {
    case "robot":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "beaker":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    case "puzzle":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      );
    case "document":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "bolt":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    default:
      return null;
  }
}

function RecommendationCard({
  rec,
  onAction,
}: {
  rec: SessionRecommendation;
  onAction: (section: string) => void;
}) {
  const config = typeConfig[rec.recType];

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${config.bgColor} ${config.color}`}>
          <RecommendationIcon type={rec.recType} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-neutral-500">
              Priority {rec.priority}
            </span>
          </div>
          <h4 className="mt-1 text-sm font-medium text-neutral-200">{rec.title}</h4>
          <p className="mt-0.5 text-xs text-neutral-400 line-clamp-2">{rec.reason}</p>
          {rec.details && (
            <p className="mt-1 rounded bg-neutral-800/50 px-2 py-1 text-xs text-neutral-300 font-mono">
              {rec.details}
            </p>
          )}
        </div>
        <button
          onClick={() => onAction(config.targetSection)}
          className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          title={`Go to ${config.label}`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function SessionInsights({ hasApiKey, onNavigate }: SessionInsightsProps) {
  const {
    analysis,
    recommendations,
    analyzing,
    error,
    analyze,
    lastAnalyzedAt,
    canAnalyze,
  } = useSessionAnalysis();

  const [collapsed, setCollapsed] = useState(false);

  const handleAnalyze = async () => {
    await analyze();
  };

  // Don't render if no API key
  if (!hasApiKey) {
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-200">Session Insights</h3>
            <p className="text-xs text-neutral-500">
              {analysis
                ? `Based on ${analysis.messagesAnalyzed} recent messages`
                : "AI-powered recommendations from your session"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-md p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300"
            >
              <svg
                className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !canAnalyze}
            className="flex items-center gap-1.5 rounded-md border border-indigo-600 bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {analysis ? "Refresh" : "Analyze Session"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-4">
          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {!analysis && !error && !analyzing && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
                <svg className="h-6 w-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm text-neutral-400">
                Analyze your recent Claude Code session to get smart recommendations
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                AI will suggest agents, tests, patterns, and documentation based on what you've been working on
              </p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Session Summary */}
              {analysis.sessionSummary && (
                <div className="rounded-lg bg-neutral-800/50 px-3 py-2">
                  <p className="text-xs font-medium text-neutral-400">Session Summary</p>
                  <p className="mt-1 text-sm text-neutral-200">{analysis.sessionSummary}</p>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-neutral-400">
                    Recommendations ({recommendations.length})
                  </p>
                  {recommendations
                    .sort((a, b) => a.priority - b.priority)
                    .map((rec, idx) => (
                      <RecommendationCard
                        key={idx}
                        rec={rec}
                        onAction={onNavigate}
                      />
                    ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-neutral-500">
                  No specific recommendations at this time
                </div>
              )}

              {/* Footer */}
              {lastAnalyzedAt && (
                <p className="text-center text-xs text-neutral-600">
                  Analyzed {lastAnalyzedAt.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
