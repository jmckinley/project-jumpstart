/**
 * @module types/kickstart
 * @description TypeScript type definitions for Project Kickstart prompt generator
 *
 * PURPOSE:
 * - Define input data structure for kickstart prompt generation
 * - Define output structure for generated prompt
 * - Define types for AI-powered tech stack inference
 *
 * EXPORTS:
 * - TechPreferences - Tech stack preferences for a project
 * - KickstartInput - User-provided information about the new project
 * - KickstartPrompt - Generated kickstart prompt with token estimate
 * - StackSuggestion - A single tech stack suggestion with reasoning
 * - InferStackInput - Input for tech stack inference
 * - InferredStack - Result of AI-powered stack inference
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
 * - Stack inference distinguishes between user selections and AI suggestions
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

/**
 * A single tech stack suggestion with reasoning
 */
export interface StackSuggestion {
  value: string;
  reason: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Input for tech stack inference
 */
export interface InferStackInput {
  appPurpose: string;
  targetUsers: string;
  keyFeatures: string[];
  constraints?: string;
  currentLanguage?: string;
  currentFramework?: string;
  currentDatabase?: string;
  currentStyling?: string;
}

/**
 * Result of AI-powered stack inference
 */
export interface InferredStack {
  language: StackSuggestion | null;
  framework: StackSuggestion | null;
  database: StackSuggestion | null;
  styling: StackSuggestion | null;
  warnings: string[];
}
