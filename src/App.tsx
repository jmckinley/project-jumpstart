/**
 * @module App
 * @description Root application component with layout shell and onboarding routing
 *
 * PURPOSE:
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
 * - @/stores/projectStore - Project list state
 * - @/stores/onboardingStore - Onboarding wizard state
 * - @/lib/tauri - listProjects() IPC call
 *
 * EXPORTS:
 * - App (default) - Root component
 *
 * PATTERNS:
 * - On mount, fetches project list from backend
 * - If no projects and not loading, renders WizardShell
 * - If projects exist, renders main layout with Sidebar + MainPanel + StatusBar
 * - onComplete from WizardShell adds project to store and resets onboarding state
 *
 * CLAUDE NOTES:
 * - This is the first component rendered after main.tsx
 * - activeSection drives which view MainPanel renders
 * - No URL routing; desktop app uses state-based navigation
 * - Onboarding can also be triggered manually from sidebar (future)
 */

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainPanel } from "@/components/layout/MainPanel";
import { StatusBar } from "@/components/layout/StatusBar";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { useProjectStore } from "@/stores/projectStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { listProjects } from "@/lib/tauri";
import type { Project } from "@/types/project";

function App() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const projects = useProjectStore((s) => s.projects);
  const loading = useProjectStore((s) => s.loading);
  const setProjects = useProjectStore((s) => s.setProjects);
  const setLoading = useProjectStore((s) => s.setLoading);
  const addProject = useProjectStore((s) => s.addProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const resetOnboarding = useOnboardingStore((s) => s.reset);

  useEffect(() => {
    setLoading(true);
    listProjects()
      .then((projects) => {
        setProjects(projects);
        if (projects.length > 0) {
          setActiveProject(projects[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [setProjects, setActiveProject, setLoading]);

  const handleOnboardingComplete = (project: Project) => {
    addProject(project);
    setActiveProject(project);
    resetOnboarding();
  };

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

  if (projects.length === 0) {
    return (
      <div className="h-screen w-screen bg-neutral-950 text-neutral-100">
        <WizardShell onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />
        <MainPanel activeSection={activeSection} />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
