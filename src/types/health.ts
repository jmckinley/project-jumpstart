/**
 * @module types/health
 * @description TypeScript type definitions for health scores and context monitoring
 *
 * PURPOSE:
 * - Define HealthScore with component breakdown
 * - Define ContextHealth for context monitoring
 * - Define QuickWin for improvement suggestions
 *
 * EXPORTS:
 * - HealthScore - Overall project health with component breakdown
 * - HealthComponents - Individual health component scores
 * - QuickWin - Prioritized improvement suggestion
 * - ContextHealth - Context usage and rot risk
 * - TokenBreakdown - Token usage by category
 * - McpServerStatus - MCP server status with overhead and recommendation
 * - Checkpoint - Context checkpoint snapshot
 *
 * PATTERNS:
 * - Health scores are always 0-100
 * - Quick wins are sorted by impact/effort ratio
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/project.rs and models/context.rs
 * - contextRotRisk uses lowercase string enum values
 * - McpServerStatus.recommendation: "keep" | "optimize" | "disable" | "none"
 */

export interface HealthScore {
  total: number;
  components: HealthComponents;
  quickWins: QuickWin[];
  contextRotRisk: "low" | "medium" | "high";
}

export interface HealthComponents {
  claudeMd: number;
  moduleDocs: number;
  freshness: number;
  skills: number;
  context: number;
  enforcement: number;
  tests: number;
}

export interface QuickWin {
  title: string;
  description: string;
  impact: number;
  effort: "low" | "medium" | "high";
}

export interface ContextHealth {
  totalTokens: number;
  usagePercent: number;
  breakdown: TokenBreakdown;
  rotRisk: "low" | "medium" | "high";
}

export interface TokenBreakdown {
  conversation: number;
  code: number;
  mcp: number;
  skills: number;
}

export interface McpServerStatus {
  name: string;
  status: string;
  tokenOverhead: number;
  recommendation: string;
  description: string;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  label: string;
  summary: string;
  tokenSnapshot: number;
  contextPercent: number;
  createdAt: string;
}
