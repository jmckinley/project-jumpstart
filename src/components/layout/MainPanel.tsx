/**
 * @module components/layout/MainPanel
 * @description Main content area that renders the active section view
 *
 * PURPOSE:
 * - Render the correct view based on active section
 * - Provide consistent content area styling
 * - Handle section transitions
 * - Show project name in the header bar
 *
 * DEPENDENCIES:
 * - @tauri-apps/api/event - listen() for file-changed events from backend
 * - @/components/dashboard/HealthScore - Circular score display with component breakdown
 * - @/components/dashboard/QuickWins - Improvement suggestions list
 * - @/components/dashboard/ContextRotAlert - Staleness risk alert banner
 * - @/components/dashboard/RecentActivity - Activity timeline
 * - @/components/dashboard/RefreshDocsButton - One-click documentation refresh button
 * - @/components/claude-md/Editor - CLAUDE.md editor view
 * - @/components/modules/FileTree - Module file tree with status icons
 * - @/components/modules/DocStatus - Coverage statistics bar
 * - @/components/modules/DocPreview - Documentation preview panel
 * - @/components/modules/BatchGenerator - Batch generation controls
 * - @/components/modules/ProjectKickstart - Kickstart prompt generator for empty projects
 * - @/components/skills/SkillsList - Skills list with tab filtering
 * - @/components/skills/SkillEditor - Skill create/edit form
 * - @/components/skills/PatternDetector - Pattern detection results
 * - @/components/ralph/CommandCenter - RALPH prompt input and controls
 * - @/components/ralph/PromptAnalyzer - Prompt quality analysis display
 * - @/components/ralph/LoopMonitor - Active and recent loop monitor
 * - @/components/context/HealthMonitor - Context health overview with checkpoints
 * - @/components/context/TokenBreakdown - Token usage breakdown chart
 * - @/components/context/McpOptimizer - MCP server status and recommendations
 * - @/components/enforcement/GitHookSetup - Git hook installation and status
 * - @/components/enforcement/CISetup - CI integration templates
 * - @/components/settings/SettingsView - User settings and app info panel
 * - @/components/test-plans/* - Test plan management components
 * - @/hooks/useTestPlans - Test plan CRUD and execution actions
 * - @/hooks/useTDDWorkflow - TDD workflow session management
 * - @/hooks/useHealth - Health score data and refresh action
 * - @/hooks/useModules - Module scanning and generation actions
 * - @/hooks/useSkills - Skills CRUD and pattern detection actions
 * - @/hooks/useRalph - RALPH loop and prompt analysis actions
 * - @/hooks/useContextHealth - Context health and MCP monitoring actions
 * - @/hooks/useEnforcement - Enforcement hook/CI status and actions
 * - @/stores/projectStore - Active project for display name
 * - @/lib/tauri (getRecentActivities, startFileWatcher, stopFileWatcher) - Backend IPC
 *
 * EXPORTS:
 * - MainPanel - Content area component
 *
 * PATTERNS:
 * - Switch on activeSection to render the correct view
 * - "dashboard" section renders health cards and activity feed
 * - "kickstart" section renders ProjectKickstart for new project setup
 * - "claude-md" section renders the Editor component
 * - "modules" section renders file tree, doc preview, and batch generator (or ProjectKickstart for empty projects)
 * - "test-plans" section renders test plans list, TDD workflow, and tools (subagent/hooks generators)
 * - "skills" section renders skills list, skill editor, and pattern detector
 * - "ralph" section renders command center, prompt analyzer, and loop monitor
 * - "context" section renders health monitor, token breakdown, and MCP optimizer
 * - "enforcement" section renders git hook setup and CI integration templates
 * - "settings" section renders SettingsView for preferences and app info
 * - Other sections show a placeholder message
 * - useHealth().refresh() is called in useEffect when dashboard is active
 * - useSkills().loadSkills() and detectProjectPatterns() are called in useEffect when skills is active
 * - DashboardView polls activities every 15 seconds
 * - MainPanel starts/stops file watcher when active project changes
 * - File change events from the backend trigger a state counter increment for re-renders
 * - onCompletionChange callback is passed to views and called when actions complete
 * - This allows the sidebar to show checkmarks for completed sections
 *
 * CLAUDE NOTES:
 * - All section views are fully implemented and functional
 * - The dashboard layout uses a 2-column grid for HealthScore and QuickWins
 * - ContextRotAlert is placed at the top of the dashboard and returns null for "low" risk
 * - RecentActivity is rendered full-width below the grid with real data from getRecentActivities
 * - RefreshDocsButton in dashboard header triggers CLAUDE.md + stale module docs regeneration
 * - handleRefreshComplete callback refreshes health score and activities after docs refresh
 * - The Editor component manages its own state via useClaudeMd hook
 * - SkillsView manages selectedSkill and editing state locally
 * - SkillsView uses a 2-column grid (SkillsList left, SkillEditor right) with PatternDetector below
 * - AgentsView follows same pattern as SkillsView with library tab support
 * - RalphView uses a 2-column grid (CommandCenter left, PromptAnalyzer right) with LoopMonitor below
 * - ContextView uses a 2-column grid (HealthMonitor left, TokenBreakdown right) with McpOptimizer below
 * - EnforcementView uses a 2-column grid (GitHookSetup left, CISetup right)
 * - KickstartView renders ProjectKickstart for empty projects
 */

import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { QuickWins } from "@/components/dashboard/QuickWins";
import { ContextRotAlert } from "@/components/dashboard/ContextRotAlert";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RefreshDocsButton } from "@/components/dashboard/RefreshDocsButton";
import type { Activity } from "@/components/dashboard/RecentActivity";
import { getRecentActivities, startFileWatcher, stopFileWatcher } from "@/lib/tauri";
import { Editor } from "@/components/claude-md/Editor";
import { FileTree } from "@/components/modules/FileTree";
import { DocStatus } from "@/components/modules/DocStatus";
import { DocPreview } from "@/components/modules/DocPreview";
import { BatchGenerator } from "@/components/modules/BatchGenerator";
import { ProjectKickstart } from "@/components/modules/ProjectKickstart";
import { useHealth } from "@/hooks/useHealth";
import { useModules } from "@/hooks/useModules";
import { useSkills } from "@/hooks/useSkills";
import { useProjectStore } from "@/stores/projectStore";
import { SkillsList } from "@/components/skills/SkillsList";
import { SkillEditor } from "@/components/skills/SkillEditor";
import { PatternDetector } from "@/components/skills/PatternDetector";
import { SkillLibrary } from "@/components/skills/SkillLibrary";
import { AgentLibrary } from "@/components/agents/AgentLibrary";
import { AgentsList } from "@/components/agents/AgentsList";
import { AgentEditor } from "@/components/agents/AgentEditor";
import { SuggestedAgents } from "@/components/agents/SuggestedAgents";
import { useAgents } from "@/hooks/useAgents";
import type { ModuleDoc } from "@/types/module";
import type { LibrarySkill } from "@/types/skill";
import type { Agent, LibraryAgent, AgentWorkflowStep, AgentTool } from "@/types/agent";
import { CommandCenter } from "@/components/ralph/CommandCenter";
import { PromptAnalyzer } from "@/components/ralph/PromptAnalyzer";
import { LoopMonitor } from "@/components/ralph/LoopMonitor";
import { useRalph } from "@/hooks/useRalph";
import { HealthMonitor } from "@/components/context/HealthMonitor";
import { TokenBreakdownChart } from "@/components/context/TokenBreakdown";
import { McpOptimizer } from "@/components/context/McpOptimizer";
import { useContextHealth } from "@/hooks/useContextHealth";
import { GitHookSetup } from "@/components/enforcement/GitHookSetup";
import { CISetup } from "@/components/enforcement/CISetup";
import { useEnforcement } from "@/hooks/useEnforcement";
import { SettingsView } from "@/components/settings/SettingsView";
import { HelpView } from "@/components/help/HelpView";
import type { Skill } from "@/types/skill";
import { useTestPlans } from "@/hooks/useTestPlans";
import { useTDDWorkflow, TDD_PHASES } from "@/hooks/useTDDWorkflow";
import {
  TestPlansList,
  TestPlanEditor,
  TestCasesList,
  TestCaseEditor,
  TestRunProgress,
  TestRunHistory,
  TestCoverageChart,
  TestSuggestions,
  TDDWorkflow,
  SubagentGenerator,
  HooksGenerator,
} from "@/components/test-plans";
import type { TestPlan, TestCase, TestPlanStatus, GeneratedTestSuggestion } from "@/types/test-plan";
import { getSetting } from "@/lib/tauri";

interface MainPanelProps {
  activeSection: string;
  onNavigate?: (section: string) => void;
  onCompletionChange?: () => void;
}

function DashboardView({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { score, components, quickWins, contextRotRisk, refresh } = useHealth();
  const { modules, hasScanned, scan: scanModules } = useModules();
  const activeProject = useProjectStore((s) => s.activeProject);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Check if this is an empty project (no source files after scanning)
  const isEmptyProject = hasScanned && modules.length === 0;

  const fetchActivities = useCallback(() => {
    if (activeProject) {
      getRecentActivities(activeProject.id)
        .then((items) => {
          setActivities(
            items.map((item) => ({
              type: item.activityType,
              message: item.message,
              timestamp: item.createdAt,
            })),
          );
        })
        .catch(() => {
          setActivities([]);
        });
    }
  }, [activeProject]);

  useEffect(() => {
    refresh();
    scanModules();
    fetchActivities();

    // Poll activities every 15 seconds
    const interval = setInterval(() => {
      fetchActivities();
    }, 15_000);

    return () => clearInterval(interval);
  }, [refresh, scanModules, fetchActivities]);

  const handleRefreshComplete = useCallback(() => {
    refresh();
    fetchActivities();
  }, [refresh, fetchActivities]);

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
          Project Overview
        </h3>
        {activeProject && (
          <RefreshDocsButton onComplete={handleRefreshComplete} />
        )}
      </div>

      <ContextRotAlert
        risk={contextRotRisk}
        onReview={() => onNavigate?.("modules")}
      />

      {/* Kickstart Card for Empty Projects */}
      {isEmptyProject && (
        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-blue-950/30 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-600">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-100">
                New Project?
              </h3>
              <p className="mt-1 text-sm text-neutral-400">
                Generate a Claude Code kickstart prompt to bootstrap your project with AI-powered best practices.
              </p>
              <button
                onClick={() => onNavigate?.("modules")}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generate Kickstart Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HealthScore score={score} components={components} />
        <QuickWins
          quickWins={quickWins}
          onAction={(win) => {
            const title = win.title.toLowerCase();
            if (title.includes("claude.md")) onNavigate?.("claude-md");
            else if (title.includes("test") || title.includes("tdd") || title.includes("coverage")) onNavigate?.("test-plans");
            else if (title.includes("module") || title.includes("doc")) onNavigate?.("modules");
            else if (title.includes("skill")) onNavigate?.("skills");
            else if (title.includes("enforce") || title.includes("hook")) onNavigate?.("enforcement");
            else if (title.includes("context") || title.includes("mcp")) onNavigate?.("context");
            else onNavigate?.("modules");
          }}
        />
      </div>

      <RecentActivity activities={activities} />
    </div>
  );
}

function ModulesView({ onDocApplied, onNavigate }: { onDocApplied?: () => void; onNavigate?: (section: string) => void }) {
  const {
    modules,
    totalFiles,
    documentedFiles,
    missingFiles,
    coverage,
    loading,
    generating,
    hasScanned,
    scan,
    getExistingDoc,
    generateDoc,
    applyDoc,
    batchGenerate,
    progress,
  } = useModules();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ModuleDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const activeProject = useProjectStore((s) => s.activeProject);

  useEffect(() => {
    scan();
  }, [scan]);

  // For files with existing docs, parse instantly. For missing, generate new.
  const handleSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      if (!activeProject) return;
      setPreviewLoading(true);

      const absolutePath = `${activeProject.path}/${path}`;
      const module = modules.find((m) => m.path === path);
      const hasExistingDoc = module?.status === "current" || module?.status === "outdated";

      let doc: ModuleDoc | null = null;
      if (hasExistingDoc) {
        // Fast path: parse existing doc header (no AI call)
        doc = await getExistingDoc(absolutePath);
      }

      // If no existing doc found (missing status or parsing failed), generate new
      if (!doc) {
        doc = await generateDoc(absolutePath);
      }

      setPreviewDoc(doc);
      setPreviewLoading(false);
    },
    [activeProject, modules, getExistingDoc, generateDoc],
  );

  const handleApply = useCallback(async () => {
    if (!selectedPath || !previewDoc || !activeProject) return;
    setPreviewLoading(true);
    setApplySuccess(false);
    try {
      const absolutePath = `${activeProject.path}/${selectedPath}`;
      const success = await applyDoc(absolutePath, previewDoc);
      if (success) {
        setApplySuccess(true);
        // Clear success message after 2 seconds
        setTimeout(() => setApplySuccess(false), 2000);
      }
      onDocApplied?.();
    } catch (err) {
      console.error("Failed to apply doc:", err);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedPath, previewDoc, activeProject, applyDoc, onDocApplied]);

  // Force regenerate documentation using AI (for files that already have docs)
  const handleRegenerate = useCallback(async () => {
    if (!selectedPath || !activeProject) return;
    setPreviewLoading(true);
    const absolutePath = `${activeProject.path}/${selectedPath}`;
    const doc = await generateDoc(absolutePath);
    setPreviewDoc(doc);
    setPreviewLoading(false);
  }, [selectedPath, activeProject, generateDoc]);

  const handleBatchGenerate = useCallback(
    async (paths: string[]) => {
      if (!activeProject) return;
      const absolutePaths = paths.map((p) => `${activeProject.path}/${p}`);
      await batchGenerate(absolutePaths);
      // Force a rescan to ensure counts are up to date
      // (batchGenerate does this internally, but this ensures the UI refreshes)
      await scan();
      onDocApplied?.();
    },
    [activeProject, batchGenerate, scan, onDocApplied],
  );

  if (loading && modules.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        <p>Scanning modules...</p>
      </div>
    );
  }

  // Show Kickstart for empty projects (no source files found after scanning)
  const isEmptyProject = hasScanned && !loading && modules.length === 0;
  if (isEmptyProject) {
    return <ProjectKickstart onClaudeMdCreated={onDocApplied} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6">
      <DocStatus
        totalFiles={totalFiles}
        documentedFiles={documentedFiles}
        missingFiles={missingFiles}
        coverage={coverage}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <FileTree
            modules={modules}
            selectedPath={selectedPath}
            onSelect={handleSelect}
          />
        </div>
        <div className="lg:col-span-2">
          <DocPreview
            filePath={selectedPath ?? ""}
            doc={previewDoc}
            onApply={handleApply}
            onRegenerate={handleRegenerate}
            loading={previewLoading}
            applySuccess={applySuccess}
          />
        </div>
      </div>

      <BatchGenerator
        modules={modules}
        generating={generating}
        progress={progress}
        onGenerateSelected={handleBatchGenerate}
      />
    </div>
  );
}

function SkillsView({ onSkillsChange }: { onSkillsChange?: () => void }) {
  const {
    skills,
    patterns,
    loading,
    detecting,
    error,
    loadSkills,
    addSkill,
    editSkill,
    removeSkill,
    detectProjectPatterns,
    removePattern,
  } = useSkills();

  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-skills" | "library">("library");

  useEffect(() => {
    loadSkills();
    detectProjectPatterns();
  }, [loadSkills, detectProjectPatterns]);

  const handleSelect = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
    setEditing(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedSkill(null);
    setEditing(true);
  }, []);

  const handleSave = useCallback(
    async (name: string, description: string, content: string) => {
      if (selectedSkill && selectedSkill.id !== "") {
        await editSkill(selectedSkill.id, name, description, content);
      } else {
        await addSkill(name, description, content);
        onSkillsChange?.();
      }
      setSelectedSkill(null);
      setEditing(false);
    },
    [selectedSkill, editSkill, addSkill, onSkillsChange],
  );

  const handleCancel = useCallback(() => {
    setSelectedSkill(null);
    setEditing(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await removeSkill(id);
      if (selectedSkill?.id === id) {
        setSelectedSkill(null);
        setEditing(false);
      }
    },
    [removeSkill, selectedSkill],
  );

  const handleCreateFromPattern = useCallback(
    (patternId: string, description: string, content: string) => {
      // Remove pattern from list immediately so user sees feedback
      removePattern(patternId);
      setEditing(true);
      setSelectedSkill({
        id: "",
        name: description,
        description: "Auto-generated from detected pattern",
        content,
        projectId: null,
        usageCount: 0,
        createdAt: "",
        updatedAt: "",
      });
    },
    [removePattern],
  );

  const handleAddFromLibrary = useCallback(
    async (librarySkill: LibrarySkill) => {
      await addSkill(librarySkill.name, librarySkill.description, librarySkill.content);
      onSkillsChange?.();
      // Stay on library tab so user can continue browsing
    },
    [addSkill, onSkillsChange],
  );

  const handleSwitchToExpert = useCallback((librarySkill: LibrarySkill) => {
    setActiveTab("my-skills");
    setEditing(true);
    setSelectedSkill({
      id: "",
      name: librarySkill.name,
      description: librarySkill.description,
      content: librarySkill.content,
      projectId: null,
      usageCount: 0,
      createdAt: "",
      updatedAt: "",
    });
  }, []);

  if (loading && skills.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        <p>Loading skills...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("my-skills")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "my-skills"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          My Skills ({skills.length})
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "library"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Skill Library
        </button>
      </div>

      {activeTab === "my-skills" ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <SkillsList
                skills={skills}
                selectedId={selectedSkill?.id ?? null}
                onSelect={handleSelect}
                onCreateNew={handleCreateNew}
                onDelete={handleDelete}
              />
            </div>
            <div className="lg:col-span-2">
              {editing ? (
                <SkillEditor
                  skill={selectedSkill}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
                  <p className="text-sm">
                    Select a skill to edit or click "New Skill" to create one.
                  </p>
                </div>
              )}
            </div>
          </div>

          <PatternDetector
            patterns={patterns}
            detecting={detecting}
            onDetect={detectProjectPatterns}
            onCreateFromPattern={handleCreateFromPattern}
          />
        </>
      ) : (
        <SkillLibrary
          existingSkillNames={skills.map((s) => s.name)}
          onAddSkill={handleAddFromLibrary}
          onSwitchToExpert={handleSwitchToExpert}
        />
      )}
    </div>
  );
}

function AgentsView({ onAgentsChange }: { onAgentsChange?: () => void }) {
  const {
    agents,
    loading,
    error,
    loadAgents,
    addAgent,
    editAgent,
    removeAgent,
    addFromLibrary,
  } = useAgents();

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-agents" | "library">("library");

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleSelect = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setEditing(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedAgent(null);
    setEditing(true);
  }, []);

  const handleSave = useCallback(
    async (
      name: string,
      description: string,
      tier: string,
      category: string,
      instructions: string,
      workflow: AgentWorkflowStep[] | null,
      tools: AgentTool[] | null,
      triggerPatterns: string[] | null,
    ) => {
      if (selectedAgent && selectedAgent.id !== "") {
        await editAgent(selectedAgent.id, name, description, tier, category, instructions, workflow, tools, triggerPatterns);
      } else {
        await addAgent(name, description, tier, category, instructions, workflow, tools, triggerPatterns);
        onAgentsChange?.();
      }
      setSelectedAgent(null);
      setEditing(false);
    },
    [selectedAgent, editAgent, addAgent, onAgentsChange],
  );

  const handleCancel = useCallback(() => {
    setSelectedAgent(null);
    setEditing(false);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await removeAgent(id);
      if (selectedAgent?.id === id) {
        setSelectedAgent(null);
        setEditing(false);
      }
    },
    [removeAgent, selectedAgent],
  );

  const handleAddFromLibrary = useCallback(
    async (libraryAgent: LibraryAgent) => {
      await addFromLibrary(libraryAgent);
      onAgentsChange?.();
      // Stay on library tab so user can continue browsing
    },
    [addFromLibrary, onAgentsChange],
  );

  const handleSwitchToExpert = useCallback((libraryAgent: LibraryAgent) => {
    setActiveTab("my-agents");
    setEditing(true);
    setSelectedAgent({
      id: "",
      name: libraryAgent.name,
      description: libraryAgent.description,
      tier: libraryAgent.tier,
      category: libraryAgent.category,
      instructions: libraryAgent.instructions,
      workflow: libraryAgent.workflow ?? null,
      tools: libraryAgent.tools ?? null,
      triggerPatterns: libraryAgent.triggerPatterns ?? null,
      projectId: null,
      usageCount: 0,
      createdAt: "",
      updatedAt: "",
    });
  }, []);

  if (loading && agents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        <p>Loading agents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("my-agents")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "my-agents"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          My Agents ({agents.length})
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "library"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Agent Library
        </button>
      </div>

      {activeTab === "my-agents" ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AgentsList
                agents={agents}
                selectedId={selectedAgent?.id ?? null}
                onSelect={handleSelect}
                onCreateNew={handleCreateNew}
                onDelete={handleDelete}
              />
            </div>
            <div className="lg:col-span-2">
              {editing ? (
                <AgentEditor
                  agent={selectedAgent}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
                  <p className="text-sm">
                    Select an agent to edit or click "New Agent" to create one.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* One-click suggested agents */}
          <SuggestedAgents
            existingAgentNames={agents.map((a) => a.name)}
            onAddAgent={handleAddFromLibrary}
            loading={loading}
          />
        </>
      ) : (
        <AgentLibrary
          existingAgentNames={agents.map((a) => a.name)}
          onAddAgent={handleAddFromLibrary}
          onSwitchToExpert={handleSwitchToExpert}
        />
      )}
    </div>
  );
}

function RalphView({ onLoopStarted }: { onLoopStarted?: () => void }) {
  const {
    loops,
    mistakes,
    analysis,
    context,
    analyzing,
    loading,
    error,
    analyzePrompt,
    startLoop,
    startLoopPrd,
    pauseLoop,
    resumeLoop,
    killLoop,
    loadLoops,
    loadMistakes,
    loadContext,
    clearAnalysis,
  } = useRalph();

  useEffect(() => {
    loadLoops();
    loadMistakes();
    loadContext();

    // Poll for loop updates every 5 seconds while on RALPH tab
    const interval = setInterval(() => {
      loadLoops();
      loadMistakes();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadLoops, loadMistakes, loadContext]);

  const handleStartLoop = useCallback(
    async (prompt: string) => {
      await startLoop(prompt);
      onLoopStarted?.();
    },
    [startLoop, onLoopStarted],
  );

  const handleStartLoopPrd = useCallback(
    async (prdJson: string) => {
      await startLoopPrd(prdJson);
      onLoopStarted?.();
    },
    [startLoopPrd, onLoopStarted],
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CommandCenter
            analysis={analysis}
            context={context}
            analyzing={analyzing}
            loading={loading}
            onAnalyze={analyzePrompt}
            onStartLoop={handleStartLoop}
            onStartLoopPrd={handleStartLoopPrd}
            onClearAnalysis={clearAnalysis}
          />
        </div>
        <div className="lg:col-span-1">
          <PromptAnalyzer analysis={analysis} />
        </div>
      </div>

      <LoopMonitor
        loops={loops}
        mistakes={mistakes}
        loading={loading}
        onPause={pauseLoop}
        onResume={resumeLoop}
        onKill={killLoop}
        onRefresh={loadLoops}
      />
    </div>
  );
}

function ContextView() {
  const {
    contextHealth,
    mcpServers,
    checkpoints,
    loading,
    error,
    refresh,
    loadCheckpoints,
    addCheckpoint,
  } = useContextHealth();

  useEffect(() => {
    refresh();
    loadCheckpoints();
  }, [refresh, loadCheckpoints]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HealthMonitor
          contextHealth={contextHealth}
          checkpoints={checkpoints}
          onCreateCheckpoint={addCheckpoint}
          onRefresh={refresh}
          loading={loading}
        />
        <TokenBreakdownChart
          breakdown={contextHealth?.breakdown ?? null}
          totalTokens={contextHealth?.totalTokens ?? 0}
        />
      </div>

      <McpOptimizer servers={mcpServers} />
    </div>
  );
}

function EnforcementView({ onHooksInstalled }: { onHooksInstalled?: () => void }) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const {
    hookStatus,
    snippets,
    loading,
    installing,
    error,
    refreshHookStatus,
    installHooks,
    loadSnippets,
  } = useEnforcement();

  useEffect(() => {
    refreshHookStatus();
    loadSnippets();
  }, [refreshHookStatus, loadSnippets]);

  const handleInstall = useCallback(
    async (mode: "warn" | "block" | "auto-update") => {
      await installHooks(mode);
      onHooksInstalled?.();
    },
    [installHooks, onHooksInstalled],
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GitHookSetup
          hookStatus={hookStatus}
          projectPath={activeProject?.path ?? ""}
          loading={loading}
          installing={installing}
          onInstall={handleInstall}
          onRefresh={refreshHookStatus}
        />
        <CISetup
          snippets={snippets}
          loading={loading}
          onLoadSnippets={loadSnippets}
        />
      </div>
    </div>
  );
}

function KickstartView({ onClaudeMdCreated, onNavigate }: { onClaudeMdCreated?: () => void; onNavigate?: (section: string) => void }) {
  return <ProjectKickstart onClaudeMdCreated={onClaudeMdCreated} onNavigate={onNavigate} />;
}

function TestPlansView() {
  const {
    plans,
    selectedPlan,
    cases,
    runs,
    framework,
    suggestions,
    running,
    generating,
    error: testPlansError,
    loadTestPlans,
    selectPlan,
    addPlan,
    editPlan,
    removePlan,
    addCase,
    editCase,
    removeCase,
    runTests,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
    clearError: clearTestPlansError,
  } = useTestPlans();

  const {
    session,
    loadSessions,
    startSession,
    advancePhase,
    failPhase,
    retryPhase,
    recordOutput,
    closeSession,
    getSubagentConfig,
    getHooksConfig,
  } = useTDDWorkflow();

  const [activeTab, setActiveTab] = useState<"plans" | "tdd" | "tools">("plans");
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  useEffect(() => {
    loadTestPlans();
    loadSessions();
    // Check if API key is configured
    getSetting("api_key").then((key) => setHasApiKey(!!key));
  }, [loadTestPlans, loadSessions]);

  const handleCreatePlan = useCallback(() => {
    setEditingPlan(null);
    setIsCreatingPlan(true);
  }, []);

  const handleSelectPlan = useCallback(
    (plan: TestPlan) => {
      selectPlan(plan.id);
      setIsCreatingCase(false);
      setEditingCase(null);
    },
    [selectPlan],
  );


  // Track plan ID for auto-generation
  const [autoGenPlanId, setAutoGenPlanId] = useState<string | null>(null);

  const handleSavePlan = useCallback(
    async (data: { name: string; description: string; status?: TestPlanStatus; targetCoverage: number; autoGenerateTests?: boolean }) => {
      if (editingPlan) {
        await editPlan(editingPlan.id, data.name, data.description, data.status, data.targetCoverage);
      } else {
        const newPlan = await addPlan(data.name, data.description, data.targetCoverage);

        // Auto-generate test cases if requested
        if (data.autoGenerateTests && newPlan) {
          setAutoGenPlanId(newPlan.id);
          setIsAutoGenerating(true);
          selectPlan(newPlan.id);
          await generateSuggestions();
          // Suggestions will be auto-accepted via the effect below
        }
      }
      setEditingPlan(null);
      setIsCreatingPlan(false);
    },
    [editingPlan, editPlan, addPlan, generateSuggestions, selectPlan],
  );

  // Auto-accept generated suggestions when auto-generating for a new plan
  useEffect(() => {
    if (autoGenPlanId && suggestions.length > 0 && !generating) {
      const acceptAll = async () => {
        for (const suggestion of suggestions) {
          await acceptSuggestion(autoGenPlanId, suggestion);
        }
        setAutoGenPlanId(null);
        setIsAutoGenerating(false);
      };
      acceptAll();
    } else if (autoGenPlanId && !generating && suggestions.length === 0) {
      // Generation finished but no suggestions
      setAutoGenPlanId(null);
      setIsAutoGenerating(false);
    }
  }, [autoGenPlanId, suggestions, generating, acceptSuggestion]);

  const handleCancelPlan = useCallback(() => {
    setEditingPlan(null);
    setIsCreatingPlan(false);
  }, []);

  const handleDeletePlan = useCallback(
    async (id: string) => {
      await removePlan(id);
    },
    [removePlan],
  );

  const handleCreateCase = useCallback(() => {
    setEditingCase(null);
    setIsCreatingCase(true);
    setSelectedCaseId(null);
  }, []);

  const handleSelectCase = useCallback((testCase: TestCase) => {
    setEditingCase(testCase);
    setSelectedCaseId(testCase.id);
    setIsCreatingCase(true);
  }, []);

  const handleSaveCase = useCallback(
    async (data: { name: string; description: string; filePath?: string; testType: "unit" | "integration" | "e2e"; priority: "low" | "medium" | "high" | "critical" }) => {
      if (!selectedPlan) return;
      if (editingCase) {
        await editCase(editingCase.id, data.name, data.description, data.filePath, data.testType, data.priority);
      } else {
        await addCase(selectedPlan.plan.id, data.name, data.description, data.filePath, data.testType, data.priority);
      }
      setEditingCase(null);
      setIsCreatingCase(false);
      setSelectedCaseId(null);
    },
    [selectedPlan, editingCase, editCase, addCase],
  );

  const handleCancelCase = useCallback(() => {
    setEditingCase(null);
    setIsCreatingCase(false);
    setSelectedCaseId(null);
  }, []);

  const handleRunTests = useCallback(
    async (_withCoverage: boolean) => {
      if (!selectedPlan) return;
      await runTests(selectedPlan.plan.id);
    },
    [selectedPlan, runTests],
  );

  const handleAcceptSuggestion = useCallback(
    async (suggestion: GeneratedTestSuggestion) => {
      if (!selectedPlan) return;
      await acceptSuggestion(selectedPlan.plan.id, suggestion);
    },
    [selectedPlan, acceptSuggestion],
  );

  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "plans"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Test Plans
        </button>
        <button
          onClick={() => setActiveTab("tdd")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "tdd"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          TDD Workflow
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "tools"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Tools
        </button>
      </div>

      {activeTab === "plans" && (
        <>
          {/* Error display */}
          {testPlansError && (
            <div className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{testPlansError}</p>
              <button
                onClick={clearTestPlansError}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* AI Test Generation Hero */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-neutral-100">AI Test Generation</h3>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  {framework
                    ? `Analyze your codebase and generate test cases for ${framework.name}`
                    : "Analyze your codebase and generate test cases automatically"}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!hasApiKey) {
                    alert("Please add your Anthropic API key in Settings first.");
                    return;
                  }
                  // Create a new plan and auto-generate
                  const newPlan = await addPlan("AI Generated Tests", "Test cases generated by AI analysis", 80);
                  if (newPlan) {
                    setAutoGenPlanId(newPlan.id);
                    setIsAutoGenerating(true);
                    selectPlan(newPlan.id);
                    await generateSuggestions();
                  }
                }}
                disabled={generating || isAutoGenerating}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/25 transition-all hover:bg-purple-500 hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating || isAutoGenerating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Tests
                  </>
                )}
              </button>
            </div>
            {!hasApiKey && (
              <p className="mt-3 text-xs text-amber-400">
                Requires API key in Settings
              </p>
            )}
          </div>

          {/* Framework detection */}
          {framework && (
            <div className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm">
              <span className="text-neutral-400">Detected: </span>
              <span className="font-medium text-neutral-200">{framework.name}</span>
              {framework.configFile && (
                <span className="ml-2 text-xs text-neutral-500">({framework.configFile})</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column: Plans list */}
            <div className="space-y-4">
              <TestPlansList
                plans={plans}
                selectedId={selectedPlan?.plan.id ?? null}
                onSelect={handleSelectPlan}
                onCreateNew={handleCreatePlan}
                onDelete={handleDeletePlan}
              />
            </div>

            {/* Middle column: Plan editor or cases list */}
            <div className="lg:col-span-2">
              {isCreatingPlan ? (
                <TestPlanEditor
                  plan={editingPlan}
                  onSave={handleSavePlan}
                  onCancel={handleCancelPlan}
                  hasApiKey={hasApiKey}
                />
              ) : isAutoGenerating ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
                  <svg className="h-8 w-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-neutral-200">Generating test cases...</p>
                  <p className="mt-1 text-xs text-neutral-500">Analyzing your code with AI</p>
                </div>
              ) : selectedPlan ? (
                <div className="space-y-4">
                  {isCreatingCase ? (
                    <TestCaseEditor
                      testCase={editingCase}
                      planId={selectedPlan.plan.id}
                      onSave={handleSaveCase}
                      onCancel={handleCancelCase}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-neutral-200">{selectedPlan.plan.name}</h3>
                        <button
                          onClick={handleCreateCase}
                          className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
                        >
                          Add Test Case
                        </button>
                      </div>

                      <TestCasesList
                        cases={cases}
                        selectedId={selectedCaseId}
                        onSelect={handleSelectCase}
                        onCreateNew={handleCreateCase}
                        onDelete={removeCase}
                      />

                      <TestRunProgress
                        run={latestRun}
                        framework={framework}
                        isRunning={running}
                        onRunTests={handleRunTests}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-500">
                  <p className="text-sm">Select a test plan or create a new one</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom section: History and coverage */}
          {selectedPlan && runs.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TestRunHistory runs={runs} />
              <TestCoverageChart
                coverageTrend={selectedPlan.coverageTrend}
                targetCoverage={selectedPlan.plan.targetCoverage}
                currentCoverage={selectedPlan.currentCoverage}
              />
            </div>
          )}

          {/* AI Suggestions */}
          <TestSuggestions
            suggestions={suggestions}
            isGenerating={generating}
            onGenerate={generateSuggestions}
            onAccept={handleAcceptSuggestion}
            onDismiss={dismissSuggestion}
          />
        </>
      )}

      {activeTab === "tdd" && (
        <TDDWorkflow
          session={session}
          phases={TDD_PHASES}
          onStartSession={startSession}
          onAdvancePhase={advancePhase}
          onFailPhase={failPhase}
          onRetryPhase={retryPhase}
          onRecordOutput={recordOutput}
          onCloseSession={closeSession}
        />
      )}

      {activeTab === "tools" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SubagentGenerator onGenerate={getSubagentConfig} />
          <HooksGenerator
            defaultCommand={framework?.command}
            onGenerate={getHooksConfig}
          />
        </div>
      )}
    </div>
  );
}

function renderSection(
  section: string,
  onNavigate?: (section: string) => void,
  onCompletionChange?: () => void,
) {
  switch (section) {
    case "dashboard":
      return <DashboardView onNavigate={onNavigate} />;
    case "kickstart":
      return <KickstartView onClaudeMdCreated={onCompletionChange} onNavigate={onNavigate} />;
    case "claude-md":
      return <Editor onSave={onCompletionChange} />;
    case "modules":
      return <ModulesView onDocApplied={onCompletionChange} onNavigate={onNavigate} />;
    case "test-plans":
      return <TestPlansView />;
    case "skills":
      return <SkillsView onSkillsChange={onCompletionChange} />;
    case "agents":
      return <AgentsView onAgentsChange={onCompletionChange} />;
    case "ralph":
      return <RalphView onLoopStarted={onCompletionChange} />;
    case "context":
      return <ContextView />;
    case "enforcement":
      return <EnforcementView onHooksInstalled={onCompletionChange} />;
    case "settings":
      return <SettingsView />;
    case "help":
      return <HelpView />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-neutral-500">
          <p>{section.replace("-", " ")} view — coming soon</p>
        </div>
      );
  }
}

export function MainPanel({ activeSection, onNavigate, onCompletionChange }: MainPanelProps) {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [, setFileChangeCounter] = useState(0);

  // Start/stop file watcher when active project changes
  useEffect(() => {
    if (!activeProject) return;

    startFileWatcher(activeProject.path).catch(() => {
      // Watcher start failed silently — non-critical feature
    });

    // Listen for file-changed events from the backend
    let unlisten: (() => void) | null = null;
    listen<{ path: string; kind: string }>("file-changed", () => {
      setFileChangeCounter((c) => c + 1);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      stopFileWatcher().catch(() => {});
      if (unlisten) unlisten();
    };
  }, [activeProject]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold capitalize">
            {activeSection.replace("-", " ")}
          </h2>
          {activeProject && (
            <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
              {activeProject.name}
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6">
        {renderSection(activeSection, onNavigate, onCompletionChange)}
      </main>
    </div>
  );
}
