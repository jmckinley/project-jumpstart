/**
 * @module lib/tauri
 * @description Type-safe wrapper for Tauri IPC calls
 *
 * PURPOSE:
 * - Provide typed functions for all Tauri backend commands
 * - Abstract the invoke() API into domain-specific functions
 * - Centralize all IPC communication
 *
 * DEPENDENCIES:
 * - @tauri-apps/api/core - invoke function for IPC
 * - @tauri-apps/plugin-dialog - Native folder picker
 * - @/types - All shared type definitions
 *
 * EXPORTS:
 * - scanProject - Scan a directory for tech stack detection
 * - saveProject - Save a configured project to the database
 * - listProjects - Fetch all projects
 * - getProject - Fetch a single project by ID
 * - removeProject - Delete a project record
 * - pickFolder - Open native folder picker dialog
 * - readClaudeMd - Read CLAUDE.md file with metadata
 * - writeClaudeMd - Write content to CLAUDE.md file
 * - generateClaudeMd - Generate CLAUDE.md from project template
 * - getHealthScore - Calculate health score for a project
 * - scanModules - Scan project files for documentation status
 * - generateModuleDoc - Generate doc template for a single file
 * - applyModuleDoc - Apply doc header to a file on disk
 * - batchGenerateDocs - Generate and apply docs for multiple files
 *
 * PATTERNS:
 * - Each function wraps a single Tauri command
 * - Functions are async and return typed promises
 * - Command names must match Rust #[tauri::command] names
 *
 * CLAUDE NOTES:
 * - When adding a new Rust command, add a corresponding wrapper here
 * - Command name strings must exactly match the Rust function name (snake_case)
 * - Tauri automatically converts snake_case (Rust) to camelCase (TS) for struct fields
 */

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ClaudeMdInfo, DetectionResult, Project, ProjectSetup } from "@/types/project";
import type { HealthScore } from "@/types/health";
import type { ModuleStatus, ModuleDoc } from "@/types/module";

export async function scanProject(path: string): Promise<DetectionResult> {
  return invoke<DetectionResult>("scan_project", { path });
}

export async function saveProject(setup: ProjectSetup): Promise<Project> {
  return invoke<Project>("save_project", { setup });
}

export async function listProjects(): Promise<Project[]> {
  return invoke<Project[]>("list_projects");
}

export async function getProject(id: string): Promise<Project> {
  return invoke<Project>("get_project", { id });
}

export async function removeProject(id: string): Promise<void> {
  return invoke<void>("remove_project", { id });
}

export async function pickFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  return result as string | null;
}

export async function readClaudeMd(projectPath: string): Promise<ClaudeMdInfo> {
  return invoke<ClaudeMdInfo>("read_claude_md", { projectPath });
}

export async function writeClaudeMd(projectPath: string, content: string): Promise<void> {
  return invoke<void>("write_claude_md", { projectPath, content });
}

export async function generateClaudeMd(projectId: string): Promise<string> {
  return invoke<string>("generate_claude_md", { projectId });
}

export async function getHealthScore(projectPath: string): Promise<HealthScore> {
  return invoke<HealthScore>("get_health_score", { projectPath });
}

export async function scanModules(projectPath: string): Promise<ModuleStatus[]> {
  return invoke<ModuleStatus[]>("scan_modules", { projectPath });
}

export async function generateModuleDoc(filePath: string, projectPath: string): Promise<ModuleDoc> {
  return invoke<ModuleDoc>("generate_module_doc", { filePath, projectPath });
}

export async function applyModuleDoc(filePath: string, doc: ModuleDoc): Promise<void> {
  return invoke<void>("apply_module_doc", { filePath, doc });
}

export async function batchGenerateDocs(filePaths: string[], projectPath: string): Promise<ModuleStatus[]> {
  return invoke<ModuleStatus[]>("batch_generate_docs", { filePaths, projectPath });
}
