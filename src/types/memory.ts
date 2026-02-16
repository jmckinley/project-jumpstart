/**
 * @module types/memory
 * @description TypeScript types for the Memory Management feature
 *
 * PURPOSE:
 * - Define memory source, learning, and health types
 * - Mirror Rust models in src-tauri/src/models/memory.rs
 *
 * EXPORTS:
 * - MemorySource - A memory file (CLAUDE.md, rules, skills, etc.)
 * - Learning - An extracted learning with metadata
 * - MemoryHealth - Overall memory health metrics
 * - ClaudeMdAnalysis - CLAUDE.md quality analysis
 * - AnalysisSuggestion - Improvement suggestion
 * - LineRemovalSuggestion - Line removal recommendation
 * - LineMoveTarget - Line move recommendation
 * - LearningCategory, LearningTopic, LearningStatus, ConfidenceLevel, HealthRating types
 *
 * PATTERNS:
 * - Import from '@/types/memory' for memory-specific types
 * - Or import from '@/types' for convenience re-exports
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/memory.rs
 * - MemorySource.sourceType values: "claude-md", "rules", "skills", "local-md", etc.
 * - HealthRating is derived from claudeMdScore and overall metrics
 */

export type LearningCategory = 'Preference' | 'Solution' | 'Pattern' | 'Gotcha';
export type LearningTopic = 'debugging' | 'patterns' | 'tools' | 'project' | 'workflow';
export type LearningStatus = 'active' | 'verified' | 'deprecated' | 'archived';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type HealthRating = 'excellent' | 'good' | 'needs-attention' | 'poor';

export interface MemorySource {
  path: string;
  sourceType: string;
  name: string;
  lineCount: number;
  sizeBytes: number;
  lastModified: string;
  description: string;
}

export interface Learning {
  id: string;
  sessionId: string;
  category: LearningCategory;
  content: string;
  topic: LearningTopic | null;
  confidence: ConfidenceLevel;
  status: LearningStatus;
  sourceFile: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryHealth {
  totalSources: number;
  totalLines: number;
  totalLearnings: number;
  activeLearnings: number;
  claudeMdLines: number;
  claudeMdScore: number;
  rulesFileCount: number;
  skillsCount: number;
  estimatedTokenUsage: number;
  healthRating: HealthRating;
}

export interface ClaudeMdAnalysis {
  totalLines: number;
  estimatedTokens: number;
  score: number;
  sections: string[];
  suggestions: AnalysisSuggestion[];
  linesToRemove: LineRemovalSuggestion[];
  linesToMove: LineMoveTarget[];
}

export interface AnalysisSuggestion {
  suggestionType: string;
  message: string;
  lineRange: [number, number] | null;
  target: string | null;
}

export interface LineRemovalSuggestion {
  lineNumber: number;
  content: string;
  reason: string;
}

export interface LineMoveTarget {
  lineRange: [number, number];
  contentPreview: string;
  targetFile: string;
  reason: string;
}
