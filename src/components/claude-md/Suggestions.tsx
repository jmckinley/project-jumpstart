/**
 * @module components/claude-md/Suggestions
 * @description Analyzes CLAUDE.md content and surfaces actionable improvement suggestions
 *
 * PURPOSE:
 * - Detect missing sections in the CLAUDE.md (Tech Stack, Commands, Code Patterns, CLAUDE NOTES)
 * - Flag content that is too short to be useful
 * - Provide one-click "Add" buttons that insert template snippets via onApply
 *
 * DEPENDENCIES:
 * - react - useMemo for memoized analysis
 *
 * EXPORTS:
 * - Suggestions - Suggestion panel component
 *
 * PATTERNS:
 * - Receives raw content string and onApply callback via props
 * - Runs analysis via useMemo so suggestions recompute only when content changes
 * - Each suggestion includes a pre-built template snippet that onApply inserts into the editor
 * - Show a "No suggestions" message when all sections are present and content is long enough
 *
 * CLAUDE NOTES:
 * - Section detection is case-insensitive heading search (## Tech Stack, ## Commands, etc.)
 * - The 200-character threshold for "too short" is intentionally low to avoid false positives
 * - Templates use \n\n prefix to ensure proper markdown spacing when appended
 * - onApply receives the full template string; the parent (Editor) decides where to insert it
 */

import { useMemo } from "react";

interface SuggestionsProps {
  content: string;
  onApply: (suggestion: string) => void;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  template: string;
}

const SECTION_CHECKS: {
  id: string;
  title: string;
  description: string;
  heading: string;
  template: string;
}[] = [
  {
    id: "tech-stack",
    title: "Add Tech Stack section",
    description:
      "Document the languages, frameworks, and tools used in this project so Claude knows what technologies are in play.",
    heading: "## Tech Stack",
    template: `\n\n## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Language** | | |
| **Framework** | | |
| **Build Tool** | | |
| **Package Manager** | | |
| **Database** | | |
| **Testing** | | |
`,
  },
  {
    id: "commands",
    title: "Add Commands section",
    description:
      "List the key commands for building, testing, and running the project so Claude can execute them correctly.",
    heading: "## Commands",
    template: `\n\n## Commands

\`\`\`bash
# Development
# npm run dev          # Start dev server

# Building
# npm run build        # Production build

# Testing
# npm test             # Run test suite

# Linting
# npm run lint         # Run linter
\`\`\`
`,
  },
  {
    id: "code-patterns",
    title: "Add Code Patterns section",
    description:
      "Document recurring patterns and conventions so Claude follows them consistently when writing new code.",
    heading: "## Code Patterns",
    template: `\n\n## Code Patterns

### Naming Conventions
- Files:
- Functions:
- Components:

### Error Handling
-

### State Management
-
`,
  },
  {
    id: "claude-notes",
    title: "Add CLAUDE NOTES section",
    description:
      "Include important reminders and gotchas that Claude should always keep in mind when working on this project.",
    heading: "## CLAUDE NOTES",
    template: `\n\n## CLAUDE NOTES

-
-
-
`,
  },
];

function analyzeContent(content: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const lowerContent = content.toLowerCase();

  // Check for missing sections
  for (const check of SECTION_CHECKS) {
    if (!lowerContent.includes(check.heading.toLowerCase())) {
      suggestions.push({
        id: check.id,
        title: check.title,
        description: check.description,
        template: check.template,
      });
    }
  }

  // Check content length
  if (content.trim().length > 0 && content.trim().length < 200) {
    suggestions.push({
      id: "too-short",
      title: "Content is too short",
      description:
        "Your CLAUDE.md has fewer than 200 characters. A more detailed file helps Claude understand your project better and prevents context rot.",
      template: "",
    });
  }

  return suggestions;
}

export function Suggestions({ content, onApply }: SuggestionsProps) {
  const suggestions = useMemo(() => analyzeContent(content), [content]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      {/* Header */}
      <div className="border-b border-neutral-800 px-4 py-2">
        <h3 className="text-sm font-semibold text-neutral-300">
          Suggestions
        </h3>
      </div>

      {/* Suggestions List */}
      <div className="p-3">
        {suggestions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-3">
            <svg
              className="h-4 w-4 flex-shrink-0 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm text-neutral-400">
              No suggestions -- your CLAUDE.md covers all key sections.
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="rounded-md border border-neutral-800 bg-neutral-950 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-amber-400">
                      {suggestion.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                      {suggestion.description}
                    </p>
                  </div>
                  {suggestion.template && (
                    <button
                      onClick={() => onApply(suggestion.template)}
                      className="flex-shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                    >
                      Add
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
