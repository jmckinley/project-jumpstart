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
 * - "claude-md" section renders the Editor component
 * - "modules" section renders file tree, doc preview, and batch generator (or ProjectKickstart for empty projects)
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
 * - The dashboard layout uses a 2-column grid for HealthScore and QuickWins
 * - ContextRotAlert is placed at the top of the dashboard and returns null for "low" risk
 * - RecentActivity is rendered full-width below the grid with real data from getRecentActivities
 * - RefreshDocsButton in dashboard header triggers CLAUDE.md + stale module docs regeneration
 * - handleRefreshComplete callback refreshes health score and activities after docs refresh
 * - The Editor component manages its own state via useClaudeMd hook
 * - SkillsView manages selectedSkill and editing state locally
 * - SkillsView uses a 2-column grid (SkillsList left, SkillEditor right) with PatternDetector below
 * - RalphView uses a 2-column grid (CommandCenter left, PromptAnalyzer right) with LoopMonitor below
 * - ContextView uses a 2-column grid (HealthMonitor left, TokenBreakdown right) with McpOptimizer below
 * - Section components will be added as they are built in later phases
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

function ModulesView({ onDocApplied }: { onDocApplied?: () => void }) {
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
    generateDoc,
    applyDoc,
    batchGenerate,
  } = useModules();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ModuleDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const activeProject = useProjectStore((s) => s.activeProject);

  useEffect(() => {
    scan();
  }, [scan]);

  const handleSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      if (!activeProject) return;
      setPreviewLoading(true);
      const absolutePath = `${activeProject.path}/${path}`;
      const doc = await generateDoc(absolutePath);
      setPreviewDoc(doc);
      setPreviewLoading(false);
    },
    [activeProject, generateDoc],
  );

  const handleApply = useCallback(async () => {
    if (!selectedPath || !previewDoc || !activeProject) return;
    setPreviewLoading(true);
    const absolutePath = `${activeProject.path}/${selectedPath}`;
    await applyDoc(absolutePath, previewDoc);
    setPreviewLoading(false);
    onDocApplied?.();
  }, [selectedPath, previewDoc, activeProject, applyDoc, onDocApplied]);

  const handleBatchGenerate = useCallback(
    async (paths: string[]) => {
      if (!activeProject) return;
      const absolutePaths = paths.map((p) => `${activeProject.path}/${p}`);
      await batchGenerate(absolutePaths);
      onDocApplied?.();
    },
    [activeProject, batchGenerate, onDocApplied],
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
    return <ProjectKickstart />;
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
            loading={previewLoading}
          />
        </div>
      </div>

      <BatchGenerator
        modules={modules}
        generating={generating}
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
    (description: string, content: string) => {
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
    [],
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
    analysis,
    analyzing,
    loading,
    error,
    analyzePrompt,
    startLoop,
    pauseLoop,
    loadLoops,
    clearAnalysis,
  } = useRalph();

  useEffect(() => {
    loadLoops();
  }, [loadLoops]);

  const handleStartLoop = useCallback(
    async (prompt: string) => {
      await startLoop(prompt);
      onLoopStarted?.();
    },
    [startLoop, onLoopStarted],
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
            analyzing={analyzing}
            loading={loading}
            onAnalyze={analyzePrompt}
            onStartLoop={handleStartLoop}
            onClearAnalysis={clearAnalysis}
          />
        </div>
        <div className="lg:col-span-1">
          <PromptAnalyzer analysis={analysis} />
        </div>
      </div>

      <LoopMonitor
        loops={loops}
        loading={loading}
        onPause={pauseLoop}
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
    async (mode: "warn" | "block") => {
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

function renderSection(
  section: string,
  onNavigate?: (section: string) => void,
  onCompletionChange?: () => void,
) {
  switch (section) {
    case "dashboard":
      return <DashboardView onNavigate={onNavigate} />;
    case "claude-md":
      return <Editor onSave={onCompletionChange} />;
    case "modules":
      return <ModulesView onDocApplied={onCompletionChange} />;
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
