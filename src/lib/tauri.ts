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
 * - checkFreshness - Check freshness of a single file
 * - getStaleFiles - Get files with outdated or missing docs
 * - listSkills - List skills for a project
 * - createSkill - Create a new skill
 * - updateSkill - Update an existing skill
 * - deleteSkill - Delete a skill
 * - detectPatterns - Detect project patterns for skill suggestions
 * - incrementSkillUsage - Bump usage count for a skill
 * - analyzeRalphPrompt - Analyze prompt quality for RALPH loops
 * - startRalphLoop - Start a new RALPH loop
 * - pauseRalphLoop - Pause an active RALPH loop
 * - listRalphLoops - List loops for a project
 * - getContextHealth - Get context health with token breakdown
 * - getMcpStatus - Get MCP server status and recommendations
 * - createCheckpoint - Create a context checkpoint
 * - listCheckpoints - List checkpoints for a project
 * - installGitHooks - Install pre-commit hook for doc enforcement
 * - getHookStatus - Check if hooks are installed
 * - getEnforcementEvents - List recent enforcement events
 * - getCiSnippets - Generate CI integration templates
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
import type { HealthScore, ContextHealth, McpServerStatus, Checkpoint } from "@/types/health";
import type { ModuleStatus, ModuleDoc } from "@/types/module";
import type { Skill, Pattern } from "@/types/skill";
import type { RalphLoop, PromptAnalysis } from "@/types/ralph";
import type { EnforcementEvent, HookStatus, CiSnippet } from "@/types/enforcement";

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

export interface FreshnessCheckResult {
  score: number;
  status: string;
  changes: string[];
}

export async function checkFreshness(filePath: string, projectPath: string): Promise<FreshnessCheckResult> {
  return invoke<FreshnessCheckResult>("check_freshness", { filePath, projectPath });
}

export async function getStaleFiles(projectPath: string): Promise<ModuleStatus[]> {
  return invoke<ModuleStatus[]>("get_stale_files", { projectPath });
}

export async function listSkills(projectId?: string): Promise<Skill[]> {
  return invoke<Skill[]>("list_skills", { projectId: projectId ?? null });
}

export async function createSkill(
  name: string,
  description: string,
  content: string,
  projectId?: string,
): Promise<Skill> {
  return invoke<Skill>("create_skill", {
    name,
    description,
    content,
    projectId: projectId ?? null,
  });
}

export async function updateSkill(
  id: string,
  name: string,
  description: string,
  content: string,
): Promise<Skill> {
  return invoke<Skill>("update_skill", { id, name, description, content });
}

export async function deleteSkill(id: string): Promise<void> {
  return invoke<void>("delete_skill", { id });
}

export async function detectPatterns(projectPath: string): Promise<Pattern[]> {
  return invoke<Pattern[]>("detect_patterns", { projectPath });
}

export async function incrementSkillUsage(id: string): Promise<number> {
  return invoke<number>("increment_skill_usage", { id });
}

export async function analyzeRalphPrompt(prompt: string): Promise<PromptAnalysis> {
  return invoke<PromptAnalysis>("analyze_ralph_prompt", { prompt });
}

export async function startRalphLoop(
  projectId: string,
  prompt: string,
  enhancedPrompt: string | null,
  qualityScore: number,
): Promise<RalphLoop> {
  return invoke<RalphLoop>("start_ralph_loop", { projectId, prompt, enhancedPrompt, qualityScore });
}

export async function pauseRalphLoop(loopId: string): Promise<void> {
  return invoke<void>("pause_ralph_loop", { loopId });
}

export async function listRalphLoops(projectId: string): Promise<RalphLoop[]> {
  return invoke<RalphLoop[]>("list_ralph_loops", { projectId });
}

export async function getContextHealth(projectPath: string): Promise<ContextHealth> {
  return invoke<ContextHealth>("get_context_health", { projectPath });
}

export async function getMcpStatus(projectPath: string): Promise<McpServerStatus[]> {
  return invoke<McpServerStatus[]>("get_mcp_status", { projectPath });
}

export async function createCheckpoint(
  projectId: string,
  label: string,
  summary: string,
  projectPath: string,
): Promise<Checkpoint> {
  return invoke<Checkpoint>("create_checkpoint", { projectId, label, summary, projectPath });
}

export async function listCheckpoints(projectId: string): Promise<Checkpoint[]> {
  return invoke<Checkpoint[]>("list_checkpoints", { projectId });
}

export async function installGitHooks(projectPath: string, mode: string): Promise<HookStatus> {
  return invoke<HookStatus>("install_git_hooks", { projectPath, mode });
}

export async function getHookStatus(projectPath: string): Promise<HookStatus> {
  return invoke<HookStatus>("get_hook_status", { projectPath });
}

export async function getEnforcementEvents(
  projectId: string,
  limit?: number,
): Promise<EnforcementEvent[]> {
  return invoke<EnforcementEvent[]>("get_enforcement_events", { projectId, limit: limit ?? null });
}

export async function getCiSnippets(projectPath: string): Promise<CiSnippet[]> {
  return invoke<CiSnippet[]>("get_ci_snippets", { projectPath });
}
