/**
 * @module types/kickstart
 * @description TypeScript type definitions for Project Kickstart prompt generator
 *
 * PURPOSE:
 * - Define input data structure for kickstart prompt generation
 * - Define output structure for generated prompt
 *
 * EXPORTS:
 * - KickstartInput - User-provided information about the new project
 * - KickstartPrompt - Generated kickstart prompt with token estimate
 *
 * PATTERNS:
 * - Types mirror Rust structs in commands/kickstart.rs
 * - Use camelCase (TypeScript convention), Rust uses snake_case
 *
 * CLAUDE NOTES:
 * - Keep in sync with Rust structs in src-tauri/src/commands/kickstart.rs
 * - Tauri IPC automatically converts snake_case to camelCase
 * - keyFeatures is an array of strings, user can add multiple features
 * - techPreferences uses same values as LANGUAGES, FRAMEWORKS from project.ts
 */

/**
 * Tech stack preferences for the new project
 */
export interface TechPreferences {
  language: string;
  framework: string | null;
  database: string | null;
  styling: string | null;
}

/**
 * User-provided information about the new project for kickstart generation
 */
export interface KickstartInput {
  appPurpose: string;
  targetUsers: string;
  keyFeatures: string[];
  techPreferences: TechPreferences;
  constraints?: string;
}

/**
 * Generated kickstart prompt with metadata
 */
export interface KickstartPrompt {
  fullPrompt: string;
  tokenEstimate: number;
}
