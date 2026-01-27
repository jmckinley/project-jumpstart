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
 * - @/hooks/useHealth - Health score data and refresh action
 * - @/hooks/useModules - Module scanning and generation actions
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
 * - Other sections show a placeholder message
 * - useHealth().refresh() is called in useEffect when dashboard is active
 *
 * CLAUDE NOTES:
 * - The dashboard layout uses a 2-column grid for HealthScore and QuickWins
 * - ContextRotAlert is placed at the top of the dashboard and returns null for "low" risk
 * - RecentActivity is rendered full-width below the grid
 * - The Editor component manages its own state via useClaudeMd hook
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
import { useProjectStore } from "@/stores/projectStore";
import type { ModuleDoc } from "@/types/module";

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

function renderSection(section: string) {
  switch (section) {
    case "dashboard":
      return <DashboardView />;
    case "claude-md":
      return <Editor />;
    case "modules":
      return <ModulesView />;
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
