/**
 * @module types/session-analysis
 * @description Types for AI-powered session transcript analysis
 *
 * PURPOSE:
 * - Define structures for session recommendations
 * - Type AI-generated insights from Claude Code transcripts
 *
 * EXPORTS:
 * - SessionRecommendation - Individual AI-generated recommendation
 * - SessionAnalysis - Full analysis result with recommendations
 * - SessionRecommendationType - Type union for recommendation categories
 *
 * PATTERNS:
 * - Recommendations have types: agent, test, pattern, doc, skill
 * - Priority 1 (highest) to 5 (lowest)
 * - Timestamps in ISO 8601 format
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust SessionAnalysis in commands/session_analysis.rs
 * - recType matches rec_type from backend (camelCase conversion)
 */

/** Categories of recommendations from session analysis */
export type SessionRecommendationType =
  | "agent"    // Suggest adding a specialized agent
  | "test"     // Suggest specific test cases
  | "pattern"  // Suggest a pattern for CLAUDE.md
  | "doc"      // Suggest documentation updates
  | "skill";   // Suggest creating a skill

/** A single AI-generated recommendation from session analysis */
export interface SessionRecommendation {
  /** Type of recommendation */
  recType: SessionRecommendationType;
  /** Short title for the recommendation */
  title: string;
  /** Why this is recommended based on session context */
  reason: string;
  /** Specific action details (agent name, test case, pattern, etc.) */
  details: string;
  /** Priority: 1 (high) to 5 (low) */
  priority: number;
}

/** Full analysis result from session transcript */
export interface SessionAnalysis {
  /** List of AI-generated recommendations */
  recommendations: SessionRecommendation[];
  /** Summary of what user has been working on */
  sessionSummary: string;
  /** ISO 8601 timestamp of when analysis was performed */
  analyzedAt: string;
  /** Number of messages that were analyzed */
  messagesAnalyzed: number;
}
