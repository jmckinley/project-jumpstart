/**
 * @module types/index
 * @description Central re-export of all TypeScript type definitions
 *
 * PURPOSE:
 * - Provide a single import point for commonly used types
 * - Re-export types from domain-specific type files
 *
 * EXPORTS:
 * - All types from project.ts
 * - All types from module.ts
 * - All types from health.ts
 *
 * PATTERNS:
 * - Import from '@/types' for commonly used types
 * - Import from '@/types/project' for domain-specific types
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust models in src-tauri/src/models/
 * - Add new type files here as they are created
 */

export type {
  Project,
  DetectionResult,
  DetectedValue,
  ProjectSetup,
  ClaudeMdInfo,
} from "./project";
export type { ModuleStatus, ModuleDoc } from "./module";
export type {
  HealthScore,
  HealthComponents,
  QuickWin,
  ContextHealth,
  TokenBreakdown,
} from "./health";
