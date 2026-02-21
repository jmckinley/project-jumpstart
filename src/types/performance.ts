/**
 * @module types/performance
 * @description TypeScript type definitions for performance engineering reviews
 *
 * PURPOSE:
 * - Define PerformanceReview interface matching Rust model
 * - Define PerformanceComponents for category scoring
 * - Define PerformanceIssue for code-level findings
 * - Define ArchitectureFinding for architecture-level analysis
 *
 * EXPORTS:
 * - PerformanceReview - Full performance review result
 * - PerformanceComponents - Score breakdown by category (0-100 total)
 * - PerformanceIssue - Individual code-level performance issue
 * - ArchitectureFinding - Architecture-level finding with status
 *
 * PATTERNS:
 * - Types mirror Rust structs in models/performance.rs
 * - Use camelCase (TypeScript convention), Rust uses snake_case
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/performance.rs
 * - Tauri IPC automatically converts snake_case to camelCase
 * - Overall score is sum of all component scores (max 100)
 */

export interface PerformanceReview {
  id: string;
  projectId: string;
  overallScore: number;
  components: PerformanceComponents;
  issues: PerformanceIssue[];
  architectureFindings: ArchitectureFinding[];
  createdAt: string;
}

export interface PerformanceComponents {
  queryPatterns: number;
  rendering: number;
  memory: number;
  bundle: number;
  caching: number;
  apiDesign: number;
}

export interface PerformanceIssue {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  filePath: string | null;
  lineNumber: number | null;
  suggestion: string;
}

export interface ArchitectureFinding {
  id: string;
  category: string;
  status: "good" | "warning" | "missing";
  title: string;
  description: string;
  recommendation: string;
}
