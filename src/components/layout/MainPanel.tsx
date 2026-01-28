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
 * - @/components/dashboard/HealthScore - Circular score display with component breakdown
 * - @/components/dashboard/QuickWins - Improvement suggestions list
 * - @/components/dashboard/ContextRotAlert - Staleness risk alert banner
 * - @/components/dashboard/RecentActivity - Activity timeline
 * - @/components/claude-md/Editor - CLAUDE.md editor view
 * - @/components/modules/FileTree - Module file tree with status icons
 * - @/components/modules/DocStatus - Coverage statistics bar
 * - @/components/modules/DocPreview - Documentation preview panel
 * - @/components/modules/BatchGenerator - Batch generation controls
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
 * - @/hooks/useHealth - Health score data and refresh action
 * - @/hooks/useModules - Module scanning and generation actions
 * - @/hooks/useSkills - Skills CRUD and pattern detection actions
 * - @/hooks/useRalph - RALPH loop and prompt analysis actions
 * - @/hooks/useContextHealth - Context health and MCP monitoring actions
 * - @/hooks/useEnforcement - Enforcement hook/CI status and actions
 * - @/stores/projectStore - Active project for display name
 *
 * EXPORTS:
 * - MainPanel - Content area component
 *
 * PATTERNS:
 * - Switch on activeSection to render the correct view
 * - "dashboard" section renders health cards and activity feed
 * - "claude-md" section renders the Editor component
 * - "modules" section renders file tree, doc preview, and batch generator
 * - "skills" section renders skills list, skill editor, and pattern detector
 * - "ralph" section renders command center, prompt analyzer, and loop monitor
 * - "context" section renders health monitor, token breakdown, and MCP optimizer
 * - "enforcement" section renders git hook setup and CI integration templates
 * - Other sections show a placeholder message
 * - useHealth().refresh() is called in useEffect when dashboard is active
 * - useSkills().loadSkills() and detectProjectPatterns() are called in useEffect when skills is active
 *
 * CLAUDE NOTES:
 * - The dashboard layout uses a 2-column grid for HealthScore and QuickWins
 * - ContextRotAlert is placed at the top of the dashboard and returns null for "low" risk
 * - RecentActivity is rendered full-width below the grid
 * - The Editor component manages its own state via useClaudeMd hook
 * - SkillsView manages selectedSkill and editing state locally
 * - SkillsView uses a 2-column grid (SkillsList left, SkillEditor right) with PatternDetector below
 * - RalphView uses a 2-column grid (CommandCenter left, PromptAnalyzer right) with LoopMonitor below
 * - ContextView uses a 2-column grid (HealthMonitor left, TokenBreakdown right) with McpOptimizer below
 * - Section components will be added as they are built in later phases
 */

import { useEffect, useState, useCallback } from "react";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { QuickWins } from "@/components/dashboard/QuickWins";
import { ContextRotAlert } from "@/components/dashboard/ContextRotAlert";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Editor } from "@/components/claude-md/Editor";
import { FileTree } from "@/components/modules/FileTree";
import { DocStatus } from "@/components/modules/DocStatus";
import { DocPreview } from "@/components/modules/DocPreview";
import { BatchGenerator } from "@/components/modules/BatchGenerator";
import { useHealth } from "@/hooks/useHealth";
import { useModules } from "@/hooks/useModules";
import { useSkills } from "@/hooks/useSkills";
import { useProjectStore } from "@/stores/projectStore";
import { SkillsList } from "@/components/skills/SkillsList";
import { SkillEditor } from "@/components/skills/SkillEditor";
import { PatternDetector } from "@/components/skills/PatternDetector";
import type { ModuleDoc } from "@/types/module";
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
import type { Skill } from "@/types/skill";

interface MainPanelProps {
  activeSection: string;
}

function DashboardView() {
  const { score, components, quickWins, contextRotRisk, refresh } = useHealth();

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <ContextRotAlert risk={contextRotRisk} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HealthScore score={score} components={components} />
        <QuickWins quickWins={quickWins} />
      </div>

      <RecentActivity />
    </div>
  );
}

function ModulesView() {
  const {
    modules,
    totalFiles,
    documentedFiles,
    missingFiles,
    coverage,
    loading,
    generating,
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
  }, [selectedPath, previewDoc, activeProject, applyDoc]);

  const handleBatchGenerate = useCallback(
    async (paths: string[]) => {
      if (!activeProject) return;
      const absolutePaths = paths.map((p) => `${activeProject.path}/${p}`);
      await batchGenerate(absolutePaths);
    },
    [activeProject, batchGenerate],
  );

  if (loading && modules.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500">
        <p>Scanning modules...</p>
      </div>
    );
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

function SkillsView() {
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
      }
      setSelectedSkill(null);
      setEditing(false);
    },
    [selectedSkill, editSkill, addSkill],
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
      // Create a pseudo-skill with empty id to pre-fill the editor in create mode.
      // The editor treats id="" as a new skill (shows "New Skill" title / "Create Skill" button).
      // The save handler also checks id !== "" to decide between addSkill and editSkill.
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
    </div>
  );
}

function RalphView() {
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
            onStartLoop={startLoop}
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

function EnforcementView() {
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
          onInstall={installHooks}
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

function renderSection(section: string) {
  switch (section) {
    case "dashboard":
      return <DashboardView />;
    case "claude-md":
      return <Editor />;
    case "modules":
      return <ModulesView />;
    case "skills":
      return <SkillsView />;
    case "ralph":
      return <RalphView />;
    case "context":
      return <ContextView />;
    case "enforcement":
      return <EnforcementView />;
    default:
      return (
        <div className="flex h-full items-center justify-center text-neutral-500">
          <p>{section.replace("-", " ")} view — coming soon</p>
        </div>
      );
  }
}

export function MainPanel({ activeSection }: MainPanelProps) {
  const activeProject = useProjectStore((s) => s.activeProject);

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
      <main className="flex-1 overflow-auto p-6">{renderSection(activeSection)}</main>
    </div>
  );
}
