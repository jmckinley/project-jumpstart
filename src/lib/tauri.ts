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
 * Project Management:
 * - scanProject - Scan a directory for tech stack detection
 * - saveProject - Save a configured project to the database
 * - checkGitInstalled - Check if git is available on the system
 * - installGit - Trigger OS-appropriate git installation
 * - listProjects - Fetch all projects
 * - getProject - Fetch a single project by ID
 * - removeProject - Delete a project record
 * - pickFolder - Open native folder picker dialog
 * - openUrl - Open a URL in the default browser
 *
 * CLAUDE.md:
 * - readClaudeMd - Read CLAUDE.md file with metadata
 * - writeClaudeMd - Write content to CLAUDE.md file
 * - generateClaudeMd - Generate CLAUDE.md from project template
 * - getHealthScore - Calculate health score for a project
 *
 * Module Documentation:
 * - scanModules - Scan project files for documentation status
 * - parseModuleDoc - Parse existing doc header from a file (local, no AI)
 * - generateModuleDoc - Generate doc template for a single file using AI
 * - applyModuleDoc - Apply doc header to a file on disk
 * - batchGenerateDocs - Generate and apply docs for multiple files
 * - checkFreshness - Check freshness of a single file
 * - getStaleFiles - Get files with outdated or missing docs
 *
 * Skills:
 * - listSkills - List skills for a project
 * - createSkill - Create a new skill
 * - updateSkill - Update an existing skill
 * - deleteSkill - Delete a skill
 * - detectPatterns - Detect project patterns for skill suggestions
 * - incrementSkillUsage - Bump usage count for a skill
 *
 * Agents:
 * - listAgents - List agents for a project
 * - createAgent - Create a new agent
 * - updateAgent - Update an existing agent
 * - deleteAgent - Delete an agent
 * - incrementAgentUsage - Bump usage count for an agent
 * - enhanceAgentInstructions - AI-enhance agent instructions
 *
 * RALPH:
 * - analyzeRalphPrompt - Analyze prompt quality for RALPH loops (heuristic)
 * - analyzeRalphPromptWithAi - AI-powered prompt analysis with project context
 * - startRalphLoop - Start a new RALPH loop (iterative mode)
 * - startRalphLoopPrd - Start a new RALPH loop in PRD mode (fresh context per story)
 * - pauseRalphLoop - Pause an active RALPH loop
 * - resumeRalphLoop - Resume a paused RALPH loop
 * - killRalphLoop - Kill a running or paused RALPH loop
 * - listRalphLoops - List loops for a project
 * - listRalphMistakes - List mistakes for a project
 * - getRalphContext - Get CLAUDE.md summary, recent mistakes, and project patterns
 * - recordRalphMistake - Record a mistake from a RALPH loop for learning
 * - updateClaudeMdWithPattern - Append learned pattern to CLAUDE.md
 *
 * Context Health:
 * - getContextHealth - Get context health with token breakdown
 * - getMcpStatus - Get MCP server status and recommendations
 * - createCheckpoint - Create a context checkpoint
 * - listCheckpoints - List checkpoints for a project
 *
 * Enforcement:
 * - installGitHooks - Install pre-commit hook for doc enforcement
 * - initGit - Initialize a git repository in project directory
 * - getHookStatus - Check if hooks are installed
 * - getEnforcementEvents - List recent enforcement events
 * - getCiSnippets - Generate CI integration templates
 *
 * Activity:
 * - logActivity - Log an activity event for a project
 * - getRecentActivities - Fetch recent activity events for a project
 *
 * File Watcher:
 * - startFileWatcher - Start watching a project directory for file changes
 * - stopFileWatcher - Stop the current file watcher
 *
 * Settings:
 * - getSetting - Retrieve a single setting by key
 * - saveSetting - Persist a single setting key-value pair
 * - getAllSettings - Retrieve all persisted settings as a key-value map
 * - validateApiKey - Validate API key format and test with API call
 *
 * Kickstart:
 * - generateKickstartPrompt - Generate a kickstart prompt for new projects
 * - generateKickstartClaudeMd - Generate and save initial CLAUDE.md from kickstart input
 * - inferTechStack - Use AI to suggest optimal tech stack based on project description
 *
 * Test Plans:
 * - listTestPlans - List test plans for a project
 * - getTestPlan - Get a test plan with summary stats
 * - createTestPlan - Create a new test plan
 * - updateTestPlan - Update an existing test plan
 * - deleteTestPlan - Delete a test plan
 * - listTestCases - List test cases for a plan
 * - createTestCase - Create a new test case
 * - updateTestCase - Update an existing test case
 * - deleteTestCase - Delete a test case
 * - detectProjectTestFramework - Detect test framework for a project
 * - runTestPlan - Execute tests for a plan
 * - getTestRuns - Get test run history
 * - generateTestSuggestions - AI-powered test suggestions
 * - checkTestStaleness - Detect stale tests by comparing source vs test modification
 * - createTddSession - Start a new TDD workflow session
 * - updateTddSession - Update TDD session phase/status
 * - getTddSession - Get a TDD session
 * - listTddSessions - List TDD sessions for a project
 * - generateSubagentConfig - Generate Claude Code subagent markdown
 * - generateHooksConfig - Generate PostToolUse hooks JSON
 *
 * Session Analysis:
 * - analyzeSession - AI-powered analysis of session transcript for recommendations
 * - getSessionTranscript - Get raw transcript content for debugging
 *
 * Memory Management:
 * - listMemorySources - List all memory source files for a project
 * - listLearnings - List extracted learnings for a project
 * - updateLearningStatus - Update a learning's status (verify, deprecate, archive)
 * - analyzeClaudeMd - Run quality analysis on CLAUDE.md
 * - getMemoryHealth - Get overall memory health metrics
 * - promoteLearning - Promote a learning to CLAUDE.md or rules file
 * - appendToProjectFile - Append content to a file relative to project root
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
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import type { ClaudeMdInfo, DetectionResult, Project, ProjectSetup } from "@/types/project";
import type { HealthScore, ContextHealth, McpServerStatus, Checkpoint } from "@/types/health";
import type { ModuleStatus, ModuleDoc } from "@/types/module";
import type { Skill, Pattern } from "@/types/skill";
import type { RalphLoop, PromptAnalysis, RalphMistake, RalphLoopContext } from "@/types/ralph";
import type { EnforcementEvent, HookStatus, CiSnippet } from "@/types/enforcement";
import type { Agent, AgentWorkflowStep, AgentTool } from "@/types/agent";
import type { KickstartInput, KickstartPrompt, InferStackInput, InferredStack } from "@/types/kickstart";
import type {
  TestPlan,
  TestPlanSummary,
  TestCase,
  TestRun,
  TDDSession,
  GeneratedTestSuggestion,
  TestFrameworkInfo,
  TestStalenessReport,
} from "@/types/test-plan";

export async function scanProject(path: string): Promise<DetectionResult> {
  return invoke<DetectionResult>("scan_project", { path });
}

export async function saveProject(setup: ProjectSetup): Promise<Project> {
  return invoke<Project>("save_project", { setup });
}

export async function checkGitInstalled(): Promise<boolean> {
  return invoke<boolean>("check_git_installed");
}

export async function installGit(): Promise<string> {
  return invoke<string>("install_git");
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

export async function openUrl(url: string): Promise<void> {
  return tauriOpenUrl(url);
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

/**
 * Parse and return existing documentation from a file (local-only, no AI).
 * Returns null if the file has no doc header.
 */
export async function parseModuleDoc(filePath: string, projectPath: string): Promise<ModuleDoc | null> {
  return invoke<ModuleDoc | null>("parse_module_doc", { filePath, projectPath });
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

export async function analyzeRalphPromptWithAi(
  prompt: string,
  projectName: string | null,
  projectLanguage: string | null,
  projectFramework: string | null,
  projectFiles: string[] | null,
): Promise<PromptAnalysis> {
  return invoke<PromptAnalysis>("analyze_ralph_prompt_with_ai", {
    prompt,
    projectName,
    projectLanguage,
    projectFramework,
    projectFiles,
  });
}

export async function startRalphLoop(
  projectId: string,
  prompt: string,
  enhancedPrompt: string | null,
  qualityScore: number,
): Promise<RalphLoop> {
  return invoke<RalphLoop>("start_ralph_loop", { projectId, prompt, enhancedPrompt, qualityScore });
}

export async function startRalphLoopPrd(
  projectId: string,
  prdJson: string,
): Promise<RalphLoop> {
  return invoke<RalphLoop>("start_ralph_loop_prd", { projectId, prdJson });
}

export async function pauseRalphLoop(loopId: string): Promise<void> {
  return invoke<void>("pause_ralph_loop", { loopId });
}

export async function resumeRalphLoop(loopId: string): Promise<void> {
  return invoke<void>("resume_ralph_loop", { loopId });
}

export async function killRalphLoop(loopId: string): Promise<void> {
  return invoke<void>("kill_ralph_loop", { loopId });
}

export async function listRalphLoops(projectId: string): Promise<RalphLoop[]> {
  return invoke<RalphLoop[]>("list_ralph_loops", { projectId });
}

export async function listRalphMistakes(projectId: string): Promise<RalphMistake[]> {
  return invoke<RalphMistake[]>("list_ralph_mistakes", { projectId });
}

export async function getRalphContext(projectId: string, projectPath: string): Promise<RalphLoopContext> {
  return invoke<RalphLoopContext>("get_ralph_context", { projectId, projectPath });
}

export async function recordRalphMistake(
  projectId: string,
  loopId: string | null,
  mistakeType: string,
  description: string,
  context: string | null,
  resolution: string | null,
  learnedPattern: string | null,
): Promise<RalphMistake> {
  return invoke<RalphMistake>("record_ralph_mistake", {
    projectId,
    loopId,
    mistakeType,
    description,
    context,
    resolution,
    learnedPattern,
  });
}

export async function updateClaudeMdWithPattern(projectPath: string, pattern: string): Promise<void> {
  return invoke<void>("update_claude_md_with_pattern", { projectPath, pattern });
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

export async function initGit(projectPath: string): Promise<void> {
  return invoke<void>("init_git", { projectPath });
}

export async function getHookStatus(projectPath: string): Promise<HookStatus> {
  return invoke<HookStatus>("get_hook_status", { projectPath });
}

/**
 * Check if Claude Code PostToolUse hooks are configured for the project.
 * Looks for hooks in .claude/settings.json or .claude/settings.local.json.
 */
export async function checkHooksConfigured(projectPath: string): Promise<boolean> {
  return invoke<boolean>("check_hooks_configured", { projectPath });
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

export async function logActivity(
  projectId: string,
  activityType: string,
  message: string,
): Promise<{ id: string; projectId: string; activityType: string; message: string; createdAt: string }> {
  return invoke<{ id: string; projectId: string; activityType: string; message: string; createdAt: string }>("log_activity", { projectId, activityType, message });
}

export async function getRecentActivities(
  projectId: string,
  limit?: number,
): Promise<{ id: string; projectId: string; activityType: string; message: string; createdAt: string }[]> {
  return invoke<{ id: string; projectId: string; activityType: string; message: string; createdAt: string }[]>("get_recent_activities", { projectId, limit: limit ?? null });
}

export async function startFileWatcher(projectPath: string): Promise<void> {
  return invoke<void>("start_file_watcher", { projectPath });
}

export async function stopFileWatcher(): Promise<void> {
  return invoke<void>("stop_file_watcher");
}

export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

export async function saveSetting(key: string, value: string): Promise<void> {
  return invoke<void>("save_setting", { key, value });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  return invoke<Record<string, string>>("get_all_settings");
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>("validate_api_key", { apiKey });
}

export async function generateKickstartPrompt(input: KickstartInput): Promise<KickstartPrompt> {
  return invoke<KickstartPrompt>("generate_kickstart_prompt", { input });
}

export async function generateKickstartClaudeMd(input: KickstartInput, projectPath: string): Promise<string> {
  return invoke<string>("generate_kickstart_claude_md", { input, projectPath });
}

export async function inferTechStack(input: InferStackInput): Promise<InferredStack> {
  return invoke<InferredStack>("infer_tech_stack", { input });
}

export async function listAgents(projectId?: string): Promise<Agent[]> {
  return invoke<Agent[]>("list_agents", { projectId: projectId ?? null });
}

export async function createAgent(
  name: string,
  description: string,
  tier: string,
  category: string,
  instructions: string,
  workflow: AgentWorkflowStep[] | null,
  tools: AgentTool[] | null,
  triggerPatterns: string[] | null,
  projectId?: string,
): Promise<Agent> {
  return invoke<Agent>("create_agent", {
    name,
    description,
    tier,
    category,
    instructions,
    workflow,
    tools,
    triggerPatterns,
    projectId: projectId ?? null,
  });
}

export async function updateAgent(
  id: string,
  name: string,
  description: string,
  tier: string,
  category: string,
  instructions: string,
  workflow: AgentWorkflowStep[] | null,
  tools: AgentTool[] | null,
  triggerPatterns: string[] | null,
): Promise<Agent> {
  return invoke<Agent>("update_agent", {
    id,
    name,
    description,
    tier,
    category,
    instructions,
    workflow,
    tools,
    triggerPatterns,
  });
}

export async function deleteAgent(id: string): Promise<void> {
  return invoke<void>("delete_agent", { id });
}

export async function incrementAgentUsage(id: string): Promise<number> {
  return invoke<number>("increment_agent_usage", { id });
}

export async function enhanceAgentInstructions(
  name: string,
  description: string,
  instructions: string,
  tier?: string | null,
  category?: string | null,
  projectLanguage?: string | null,
  projectFramework?: string | null,
): Promise<string> {
  return invoke<string>("enhance_agent_instructions", {
    name,
    description,
    instructions,
    tier: tier ?? null,
    category: category ?? null,
    projectLanguage: projectLanguage ?? null,
    projectFramework: projectFramework ?? null,
  });
}

// =============================================================================
// Test Plan Commands
// =============================================================================

export async function listTestPlans(projectId: string): Promise<TestPlan[]> {
  return invoke<TestPlan[]>("list_test_plans", { projectId });
}

export async function getTestPlan(planId: string): Promise<TestPlanSummary> {
  return invoke<TestPlanSummary>("get_test_plan", { planId });
}

export async function createTestPlan(
  projectId: string,
  name: string,
  description: string,
  targetCoverage?: number,
): Promise<TestPlan> {
  return invoke<TestPlan>("create_test_plan", {
    projectId,
    name,
    description,
    targetCoverage: targetCoverage ?? null,
  });
}

export async function updateTestPlan(
  id: string,
  name?: string,
  description?: string,
  status?: string,
  targetCoverage?: number,
): Promise<TestPlan> {
  return invoke<TestPlan>("update_test_plan", {
    id,
    name: name ?? null,
    description: description ?? null,
    status: status ?? null,
    targetCoverage: targetCoverage ?? null,
  });
}

export async function deleteTestPlan(id: string): Promise<void> {
  return invoke<void>("delete_test_plan", { id });
}

export async function listTestCases(planId: string): Promise<TestCase[]> {
  return invoke<TestCase[]>("list_test_cases", { planId });
}

export async function createTestCase(
  planId: string,
  name: string,
  description: string,
  filePath?: string,
  testType?: string,
  priority?: string,
): Promise<TestCase> {
  return invoke<TestCase>("create_test_case", {
    planId,
    name,
    description,
    filePath: filePath ?? null,
    testType: testType ?? null,
    priority: priority ?? null,
  });
}

export async function updateTestCase(
  id: string,
  name?: string,
  description?: string,
  filePath?: string,
  testType?: string,
  priority?: string,
  status?: string,
): Promise<TestCase> {
  return invoke<TestCase>("update_test_case", {
    id,
    name: name ?? null,
    description: description ?? null,
    filePath: filePath ?? null,
    testType: testType ?? null,
    priority: priority ?? null,
    status: status ?? null,
  });
}

export async function deleteTestCase(id: string): Promise<void> {
  return invoke<void>("delete_test_case", { id });
}

export async function detectProjectTestFramework(projectPath: string): Promise<TestFrameworkInfo | null> {
  return invoke<TestFrameworkInfo | null>("detect_project_test_framework", { projectPath });
}

export async function runTestPlan(
  planId: string,
  projectPath: string,
  withCoverage?: boolean,
): Promise<TestRun> {
  return invoke<TestRun>("run_test_plan", {
    planId,
    projectPath,
    withCoverage: withCoverage ?? false,
  });
}

export async function getTestRuns(planId: string, limit?: number): Promise<TestRun[]> {
  return invoke<TestRun[]>("get_test_runs", { planId, limit: limit ?? null });
}

export async function generateTestSuggestions(
  projectPath: string,
  filePaths?: string[],
): Promise<GeneratedTestSuggestion[]> {
  return invoke<GeneratedTestSuggestion[]>("generate_test_suggestions", {
    projectPath,
    filePaths: filePaths ?? null,
  });
}

// =============================================================================
// Test Staleness Detection
// =============================================================================

export async function checkTestStaleness(
  projectPath: string,
  lookbackCommits?: number,
): Promise<TestStalenessReport> {
  return invoke<TestStalenessReport>("check_test_staleness", {
    projectPath,
    lookbackCommits: typeof lookbackCommits === "number" ? lookbackCommits : null,
  });
}

// =============================================================================
// TDD Workflow Commands
// =============================================================================

export async function createTddSession(
  projectId: string,
  featureName: string,
  testFilePath?: string,
): Promise<TDDSession> {
  return invoke<TDDSession>("create_tdd_session", {
    projectId,
    featureName,
    testFilePath: testFilePath ?? null,
  });
}

export async function updateTddSession(
  id: string,
  phase?: string,
  phaseStatus?: string,
  output?: string,
): Promise<TDDSession> {
  return invoke<TDDSession>("update_tdd_session", {
    id,
    phase: phase ?? null,
    phaseStatus: phaseStatus ?? null,
    output: output ?? null,
  });
}

export async function getTddSession(id: string): Promise<TDDSession> {
  return invoke<TDDSession>("get_tdd_session", { id });
}

export async function listTddSessions(
  projectId: string,
  includeCompleted?: boolean,
): Promise<TDDSession[]> {
  return invoke<TDDSession[]>("list_tdd_sessions", {
    projectId,
    includeCompleted: includeCompleted ?? null,
  });
}

export async function generateSubagentConfig(agentType: string): Promise<string> {
  return invoke<string>("generate_subagent_config", { agentType });
}

export async function generateHooksConfig(
  testCommand: string,
  filePatterns?: string[],
): Promise<string> {
  return invoke<string>("generate_hooks_config", {
    testCommand,
    filePatterns: filePatterns ?? null,
  });
}

// =============================================================================
// Session Analysis Commands
// =============================================================================

import type { TeamTemplate } from "@/types/team-template";
import type { SessionAnalysis } from "@/types/session-analysis";

/**
 * Analyze Claude Code session transcript with AI to generate recommendations.
 * Reads recent messages from ~/.claude/projects/{hash}/*.jsonl and uses AI
 * to suggest agents, tests, patterns, and documentation improvements.
 */
export async function analyzeSession(
  projectPath: string,
  projectName: string,
  projectLanguage?: string,
  projectFramework?: string,
): Promise<SessionAnalysis> {
  return invoke<SessionAnalysis>("analyze_session", {
    projectPath,
    projectName,
    projectLanguage: projectLanguage ?? null,
    projectFramework: projectFramework ?? null,
  });
}

// =============================================================================
// Team Template Commands
// =============================================================================

export async function listTeamTemplates(projectId?: string): Promise<TeamTemplate[]> {
  return invoke<TeamTemplate[]>("list_team_templates", { projectId: projectId ?? null });
}

export async function createTeamTemplate(
  name: string,
  description: string,
  orchestrationPattern: string,
  category: string,
  teammatesJson: string,
  tasksJson: string,
  hooksJson: string,
  leadSpawnInstructions: string,
  projectId?: string,
): Promise<TeamTemplate> {
  return invoke<TeamTemplate>("create_team_template", {
    name,
    description,
    orchestrationPattern,
    category,
    teammatesJson,
    tasksJson,
    hooksJson,
    leadSpawnInstructions,
    projectId: projectId ?? null,
  });
}

export async function updateTeamTemplate(
  id: string,
  name: string,
  description: string,
  orchestrationPattern: string,
  category: string,
  teammatesJson: string,
  tasksJson: string,
  hooksJson: string,
  leadSpawnInstructions: string,
): Promise<TeamTemplate> {
  return invoke<TeamTemplate>("update_team_template", {
    id,
    name,
    description,
    orchestrationPattern,
    category,
    teammatesJson,
    tasksJson,
    hooksJson,
    leadSpawnInstructions,
  });
}

export async function deleteTeamTemplate(id: string): Promise<void> {
  return invoke<void>("delete_team_template", { id });
}

export async function incrementTeamTemplateUsage(id: string): Promise<number> {
  return invoke<number>("increment_team_template_usage", { id });
}

export async function generateTeamDeployOutput(
  templateJson: string,
  format: string,
  projectContextJson?: string,
): Promise<string> {
  return invoke<string>("generate_team_deploy_output", {
    templateJson,
    format,
    projectContextJson: projectContextJson ?? null,
  });
}

/**
 * Get raw transcript content for debugging purposes.
 * Returns recent messages from the session transcript.
 */
export async function getSessionTranscript(
  projectPath: string,
  maxMessages?: number,
): Promise<string[]> {
  return invoke<string[]>("get_session_transcript", {
    projectPath,
    maxMessages: maxMessages ?? null,
  });
}

// =============================================================================
// Memory Management Commands
// =============================================================================

import type {
  MemorySource,
  Learning,
  MemoryHealth,
  ClaudeMdAnalysis,
} from "@/types/memory";

export async function listMemorySources(projectPath: string): Promise<MemorySource[]> {
  return invoke<MemorySource[]>("list_memory_sources", { projectPath });
}

export async function listLearnings(projectPath: string): Promise<Learning[]> {
  return invoke<Learning[]>("list_learnings", { projectPath });
}

export async function updateLearningStatus(id: string, status: string): Promise<Learning> {
  return invoke<Learning>("update_learning_status", { id, status });
}

export async function analyzeClaudeMd(projectPath: string): Promise<ClaudeMdAnalysis> {
  return invoke<ClaudeMdAnalysis>("analyze_claude_md", { projectPath });
}

export async function getMemoryHealth(projectPath: string): Promise<MemoryHealth> {
  return invoke<MemoryHealth>("get_memory_health", { projectPath });
}

export async function promoteLearning(id: string, target: string, projectPath: string): Promise<void> {
  return invoke<void>("promote_learning", { id, target, projectPath });
}

export async function appendToProjectFile(
  projectPath: string,
  relativePath: string,
  content: string,
): Promise<void> {
  return invoke<void>("append_to_project_file", { projectPath, relativePath, content });
}

// =============================================================================
// Performance Engineering Commands
// =============================================================================

import type { PerformanceReview, PerformanceIssue, RemediationResult } from "@/types/performance";

export async function analyzePerformance(projectPath: string): Promise<PerformanceReview> {
  return invoke<PerformanceReview>("analyze_performance", { projectPath });
}

export async function listPerformanceReviews(projectId: string): Promise<PerformanceReview[]> {
  return invoke<PerformanceReview[]>("list_performance_reviews", { projectId });
}

export async function getPerformanceReview(reviewId: string): Promise<PerformanceReview> {
  return invoke<PerformanceReview>("get_performance_review", { reviewId });
}

export async function deletePerformanceReview(reviewId: string): Promise<void> {
  return invoke<void>("delete_performance_review", { reviewId });
}

export async function remediatePerformanceFile(
  filePath: string,
  issues: PerformanceIssue[],
  projectPath: string,
): Promise<RemediationResult[]> {
  return invoke<RemediationResult[]>("remediate_performance_file", {
    filePath,
    issues,
    projectPath,
  });
}
