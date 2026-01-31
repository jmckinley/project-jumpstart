/**
 * @module App
 * @description Root application component with layout shell, first-use welcome, and onboarding routing
 *
 * PURPOSE:
 * - Show first-use welcome screen on initial app launch
 * - Load project list on mount from the Tauri backend
 * - Show onboarding wizard when no projects exist
 * - Render the main application layout (sidebar + main panel + status bar) when projects exist
 * - Handle top-level view switching between sections
 *
 * DEPENDENCIES:
 * - @/components/layout/Sidebar - Navigation sidebar
 * - @/components/layout/MainPanel - Content area
 * - @/components/layout/StatusBar - Bottom status bar
 * - @/components/onboarding/WizardShell - Onboarding wizard
 * - @/components/onboarding/FirstUseWelcome - First-use welcome screen
 * - @/stores/projectStore - Project list state
 * - @/stores/onboardingStore - Onboarding wizard state
 * - @/stores/settingsStore - Settings state including hasApiKey
 * - @/lib/tauri - listProjects(), getSetting() IPC calls
 *
 * EXPORTS:
 * - App (default) - Root component
 *
 * PATTERNS:
 * - On mount, checks has_seen_welcome setting first
 * - If not seen welcome, shows FirstUseWelcome screen
 * - After welcome, fetches project list and last_active_project_id from backend
 * - Restores last active project on load, falls back to first project
 * - Saves last_active_project_id when project changes
 * - If no projects and not loading, renders WizardShell
 * - If projects exist, renders main layout with Sidebar + MainPanel + StatusBar
 * - onComplete from WizardShell adds project to store and resets onboarding state
 *
 * CLAUDE NOTES:
 * - This is the first component rendered after main.tsx
 * - activeSection drives which view MainPanel renders
 * - No URL routing; desktop app uses state-based navigation
 * - FirstUseWelcome blocks all other UI until dismissed
 * - App name: Project Jumpstart
 * - last_active_project_id is saved whenever user switches projects or completes onboarding
 */

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { StatusBar } from "@/components/layout/StatusBar";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { FirstUseWelcome } from "@/components/onboarding/FirstUseWelcome";
import { useProjectStore } from "@/stores/projectStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSectionCompletion } from "@/hooks/useSectionCompletion";
import { useModules } from "@/hooks/useModules";
import { listProjects, getSetting, saveSetting } from "@/lib/tauri";
import type { Project } from "@/types/project";

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean | null>(null);
  const [checkingWelcome, setCheckingWelcome] = useState(true);

  const projects = useProjectStore((s) => s.projects);
  const loading = useProjectStore((s) => s.loading);
  const setProjects = useProjectStore((s) => s.setProjects);
  const setLoading = useProjectStore((s) => s.setLoading);
  const addProject = useProjectStore((s) => s.addProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setHasApiKey = useSettingsStore((s) => s.setHasApiKey);
  const { completion, refresh: refreshCompletion } = useSectionCompletion();
  const { modules, hasScanned, scan: scanModules } = useModules();

  // Check if project is empty (no source files) - used for Kickstart visibility
  const isEmptyProject = hasScanned && modules.length === 0;

  // Check if this is first launch
  useEffect(() => {
    setCheckingWelcome(true);
    Promise.all([
      getSetting("has_seen_welcome"),
      getSetting("anthropic_api_key"),
    ])
      .then(([welcomeSeen, apiKey]) => {
        setHasSeenWelcome(welcomeSeen === "true");
        setHasApiKey(!!apiKey && apiKey.length > 0);
      })
      .catch((err) => {
        console.error("Failed to check welcome status:", err);
        setHasSeenWelcome(false);
      })
      .finally(() => {
        setCheckingWelcome(false);
      });
  }, [setHasApiKey]);

  // Load projects after welcome is complete, restoring last active project
  useEffect(() => {
    if (hasSeenWelcome !== true) return;

    setLoading(true);
    Promise.all([listProjects(), getSetting("last_active_project_id")])
      .then(([projects, lastActiveId]) => {
        setProjects(projects);
        if (projects.length > 0) {
          // Try to restore last active project, fallback to first
          const lastProject = lastActiveId
            ? projects.find((p) => p.id === lastActiveId)
            : null;
          setActiveProject(lastProject ?? projects[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hasSeenWelcome, setProjects, setActiveProject, setLoading]);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleOnboardingComplete = (project: Project) => {
    addProject(project);
    setActiveProject(project);
    saveSetting("last_active_project_id", project.id).catch(console.error);
    resetOnboarding();
    setShowOnboarding(false);
  };

  const handleWelcomeComplete = () => {
    setHasSeenWelcome(true);
  };

  const handleProjectChange = (project: Project) => {
    setActiveProject(project);
    saveSetting("last_active_project_id", project.id).catch(console.error);
    setActiveSection("dashboard"); // Reset to dashboard on project switch
  };

  const handleNewProject = () => {
    resetOnboarding();
    setShowOnboarding(true);
  };

  const handleCancelOnboarding = () => {
    setShowOnboarding(false);
  };

  // Scan modules when active project changes to determine if it's empty
  useEffect(() => {
    const activeProject = useProjectStore.getState().activeProject;
    if (activeProject) {
      scanModules();
    }
  }, [projects, scanModules]);

  // Show loading while checking welcome status
  if (checkingWelcome) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-500" />
          <p className="text-sm text-neutral-400">Starting Project Jumpstart...</p>
        </div>
      </div>
    );
  }

  // Show first-use welcome screen
  if (!hasSeenWelcome) {
    return <FirstUseWelcome onComplete={handleWelcomeComplete} />;
  }

  // Show loading while fetching projects
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-500" />
          <p className="text-sm text-neutral-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  // Show onboarding wizard when no projects OR when user clicks "New Project"
  if (projects.length === 0 || showOnboarding) {
    return (
      <div className="h-screen w-screen bg-neutral-950 text-neutral-100">
        <WizardShell
          onComplete={handleOnboardingComplete}
          onCancel={projects.length > 0 ? handleCancelOnboarding : undefined}
        />
      </div>
    );
  }

  const activeProject = useProjectStore.getState().activeProject;

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
          completion={completion}
          projects={projects}
          activeProject={activeProject}
          onProjectChange={handleProjectChange}
          onNewProject={handleNewProject}
          isEmptyProject={isEmptyProject}
        />
        <MainPanel
          activeSection={activeSection}
          onNavigate={setActiveSection}
          onCompletionChange={refreshCompletion}
        />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
