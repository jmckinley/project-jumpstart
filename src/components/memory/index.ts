/**
 * @module components/memory/index
 * @description Barrel exports for Memory Management components
 *
 * PURPOSE:
 * - Provide a single import point for all memory components
 *
 * EXPORTS:
 * - MemoryDashboard - Memory health overview with source listing and metrics
 * - LearningBrowser - Filterable learning list with status management and promotion
 * - ClaudeMdAnalyzer - CLAUDE.md quality analyzer with actionable suggestions
 *
 * PATTERNS:
 * - Import from '@/components/memory' for all memory components
 *
 * CLAUDE NOTES:
 * - Keep in sync when adding new memory components
 */

export { MemoryDashboard } from "./MemoryDashboard";
export { LearningBrowser } from "./LearningBrowser";
export { ClaudeMdAnalyzer } from "./ClaudeMdAnalyzer";
