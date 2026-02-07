/**
 * @module components/layout/Sidebar
 * @description Navigation sidebar with project selector, section links, and completion checkmarks
 *
 * PURPOSE:
 * - Display clickable app logo and branding at top (navigates to dashboard)
 * - Display project selector dropdown for switching between projects
 * - Render navigation links for all main sections
 * - Show active section highlighting
 * - Show checkmarks for completed sections (per-project)
 * - Provide "New Project" button to start onboarding
 * - Show temporary "Kickstart" section for empty projects
 *
 * DEPENDENCIES:
 * - @/hooks/useSectionCompletion - SectionCompletion type for completion status
 * - @/types/project - Project type definition
 *
 * EXPORTS:
 * - Sidebar - Navigation sidebar component
 *
 * PATTERNS:
 * - Uses onNavigate callback to communicate section selection to parent
 * - Uses onProjectChange callback to switch active project
 * - Uses onNewProject callback to start new project onboarding
 * - Active section is highlighted with accent color
 * - Checkmark icon shown for sections with completion status true
 * - Checkmarks are per-project - refresh automatically on project switch
 * - Kickstart shown when isEmptyProject=true AND CLAUDE.md not yet created
 * - Hooks Setup shown when showHooksSetup=true (test framework detected, no hooks configured)
 *
 * CLAUDE NOTES:
 * - Clicking the app logo/title at top navigates to dashboard
 * - Sections: Dashboard, CLAUDE.md, Modules, Test Plans, Skills, Agents, Team Templates, RALPH, Context Health, Enforcement, Settings
 * - Kickstart section is temporary - disappears after CLAUDE.md is created
 * - Hooks Setup section is temporary - disappears after hooks are configured
 * - Sections with completion tracking: claude-md, modules, skills, agents, ralph, enforcement
 * - Project selector is at the top of the sidebar
 * - Completion state is fetched per-project by useSectionCompletion hook
 */

import { useState } from "react";
import type { SectionCompletion } from "@/hooks/useSectionCompletion";
import type { Project } from "@/types/project";

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  completion?: SectionCompletion;
  projects?: Project[];
  activeProject?: Project | null;
  onProjectChange?: (project: Project) => void;
  onNewProject?: () => void;
  isEmptyProject?: boolean;
  /** Show hooks setup banner when true (test framework detected, no hooks) */
  showHooksSetup?: boolean;
}

const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "claude-md", label: "CLAUDE.md" },
  { id: "modules", label: "Modules" },
  { id: "test-plans", label: "Test Plans" },
  { id: "skills", label: "Skills" },
  { id: "agents", label: "Agents" },
  { id: "team-templates", label: "Team Templates" },
  { id: "ralph", label: "RALPH" },
  { id: "context", label: "Context Health" },
  { id: "enforcement", label: "Enforcement" },
  { id: "settings", label: "Settings" },
  { id: "help", label: "Help" },
];

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-emerald-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      className="h-4 w-4 text-purple-400"
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
  );
}

function LightningIcon() {
  return (
    <svg
      className="h-4 w-4 text-blue-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

export function Sidebar({
  activeSection,
  onNavigate,
  completion = {},
  projects = [],
  activeProject,
  onProjectChange,
  onNewProject,
  isEmptyProject = false,
  showHooksSetup = false,
}: SidebarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Show Kickstart when project is empty and CLAUDE.md hasn't been created yet
  const showKickstart = isEmptyProject && !completion["claude-md"];

  const handleProjectSelect = (project: Project) => {
    onProjectChange?.(project);
    setIsDropdownOpen(false);
  };

  return (
    <aside className="flex w-56 flex-col border-r border-neutral-800 bg-neutral-900">
      {/* App Logo - clickable to navigate to dashboard */}
      <button
        onClick={() => onNavigate("dashboard")}
        className="flex w-full items-center gap-2 border-b border-neutral-800 px-3 py-2 text-left transition-colors hover:bg-neutral-800"
      >
        <img src="/icon-64.png" alt="Project Jumpstart" className="h-6 w-6" />
        <span className="text-sm font-semibold text-neutral-200">Project Jumpstart</span>
      </button>

      {/* Project Selector */}
      <div className="border-b border-neutral-800 p-3">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between rounded-md bg-neutral-800 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-700"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FolderIcon />
              <span className="truncate font-medium text-neutral-100">
                {activeProject?.name || "Select Project"}
              </span>
            </div>
            <ChevronDownIcon />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-800 shadow-lg">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-700 ${
                    activeProject?.id === project.id
                      ? "bg-neutral-700 text-neutral-100"
                      : "text-neutral-300"
                  }`}
                >
                  <FolderIcon />
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-medium">{project.name}</div>
                    <div className="truncate text-xs text-neutral-500">
                      {project.path.split("/").slice(-2).join("/")}
                    </div>
                  </div>
                  {activeProject?.id === project.id && (
                    <CheckIcon />
                  )}
                </button>
              ))}

              {/* New Project Button */}
              <div className="border-t border-neutral-700">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onNewProject?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-400 transition-colors hover:bg-neutral-700 hover:text-blue-300"
                >
                  <PlusIcon />
                  <span>New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Kickstart - shown only for empty projects without CLAUDE.md */}
        {showKickstart && (
          <div className="mb-4">
            <button
              onClick={() => onNavigate("kickstart")}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeSection === "kickstart"
                  ? "border-purple-500/50 bg-purple-600/20 text-purple-300"
                  : "border-purple-500/30 bg-gradient-to-r from-purple-950/30 to-blue-950/30 text-purple-300 hover:border-purple-500/50 hover:bg-purple-600/20"
              }`}
            >
              <SparkleIcon />
              <span>Kickstart</span>
            </button>
          </div>
        )}

        {/* Hooks Setup - shown when test framework detected but no hooks configured */}
        {showHooksSetup && (
          <div className="mb-4">
            <button
              onClick={() => onNavigate("hooks-setup")}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeSection === "hooks-setup"
                  ? "border-blue-500/50 bg-blue-600/20 text-blue-300"
                  : "border-blue-500/30 bg-gradient-to-r from-blue-950/30 to-cyan-950/30 text-blue-300 hover:border-blue-500/50 hover:bg-blue-600/20"
              }`}
            >
              <LightningIcon />
              <span>Set Up Hooks</span>
              <span className="ml-auto rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs">
                New
              </span>
            </button>
          </div>
        )}

        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Navigation
        </div>
        <nav className="flex flex-col gap-1">
          {sections.map((section) => {
            const isComplete = completion[section.id as keyof SectionCompletion];
            return (
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === section.id
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                }`}
              >
                <span>{section.label}</span>
                {isComplete && <CheckIcon />}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
