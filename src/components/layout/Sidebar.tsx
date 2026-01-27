/**
 * @module components/layout/Sidebar
 * @description Navigation sidebar with section links and project selector
 *
 * PURPOSE:
 * - Render navigation links for all main sections
 * - Show active section highlighting
 * - Display project selector dropdown
 *
 * DEPENDENCIES:
 * - @/lib/utils - cn() for class name composition
 *
 * EXPORTS:
 * - Sidebar - Navigation sidebar component
 *
 * PATTERNS:
 * - Uses onNavigate callback to communicate selection to parent
 * - Active section is highlighted with accent color
 * - Badge shows counts (e.g., outdated modules)
 *
 * CLAUDE NOTES:
 * - Sections: Dashboard, CLAUDE.md, Modules, Skills, RALPH, Context, Enforcement, Settings
 * - See spec Part 3.2 for full sidebar design
 */

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "claude-md", label: "CLAUDE.md" },
  { id: "modules", label: "Modules" },
  { id: "skills", label: "Skills" },
  { id: "ralph", label: "RALPH" },
  { id: "context", label: "Context" },
  { id: "enforcement", label: "Enforcement" },
  { id: "settings", label: "Settings" },
];

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-48 flex-col border-r border-neutral-800 bg-neutral-900 p-3">
      <div className="mb-4 px-2 text-sm font-semibold text-neutral-400">
        Navigation
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
              activeSection === section.id
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
