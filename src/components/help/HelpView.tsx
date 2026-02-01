/**
 * @module components/help/HelpView
 * @description Help section with FAQ, feature guides, and tips for using Project Jumpstart
 *
 * PURPOSE:
 * - Explain what context rot is and why it matters
 * - Emphasize the importance of adding an API key for AI features
 * - Document all features: Kickstart, Dashboard, CLAUDE.md, Modules, Skills, Agents, RALPH, Context, Enforcement
 * - Explain enforcement modes (off, warn, block, auto-update)
 * - Answer frequently asked questions
 * - Help new and experienced users get the most out of the app
 *
 * DEPENDENCIES:
 * - None (self-contained presentational component)
 *
 * EXPORTS:
 * - HelpView - Main help page component
 *
 * PATTERNS:
 * - Accordion-style FAQ sections
 * - Collapsible feature guides
 * - Highlighted info boxes for key concepts (context rot, API key)
 * - Quick start checklist with numbered steps
 *
 * CLAUDE NOTES:
 * - This is a beta help page - content should be updated as features evolve
 * - Keep explanations concise and actionable
 * - Focus on the "why" not just the "how"
 * - API key section uses amber styling to draw attention
 * - Refresh Docs is the first feature guide since it's the main dashboard action
 */

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FeatureGuide {
  title: string;
  description: string;
  tips: string[];
}

const FAQS: FAQItem[] = [
  {
    question: "What is context rot?",
    answer:
      "Context rot happens when Claude's context window fills up during a coding session. When this happens, Claude compacts or drops older context, 'forgetting' important information about your project. You end up re-explaining your architecture, patterns, and conventions over and over again.",
  },
  {
    question: "How does Project Jumpstart prevent context rot?",
    answer:
      "Instead of relying on Claude's memory, we bake important information directly into your source files. CLAUDE.md provides project-level context, and module documentation headers ensure Claude understands each file it opens - even after context resets.",
  },
  {
    question: "I'm new to Claude Code. Do I need to learn best practices first?",
    answer:
      "No! That's exactly what Project Jumpstart is for. We install best practices automatically - CLAUDE.md templates, skills, agents, documentation standards - then keep them current as you build. You get what experienced users have learned, without the learning curve.",
  },
  {
    question: "What is Project Kickstart?",
    answer:
      "Project Kickstart helps you bootstrap new or empty projects. Describe what you're building, your target users, and key features, and it generates a comprehensive starter prompt for Claude Code. It sets up the right foundation from day one - tech stack decisions, initial prompts, and project structure recommendations.",
  },
  {
    question: "Why is adding an API key so important?",
    answer:
      "The API key unlocks Project Jumpstart's most powerful features. Without it, you only get basic templates that require manual editing. With an API key, you get: (1) AI-generated CLAUDE.md tailored to your actual codebase, (2) Smart module documentation that understands your code's purpose and patterns, (3) Auto-update enforcement that generates missing docs at commit time, (4) Enhanced RALPH prompts with project-aware suggestions. The difference is dramatic - AI generation produces production-ready documentation in seconds.",
  },
  {
    question: "Is my API key secure?",
    answer:
      "Yes. Your API key is encrypted using AES-256-GCM before being stored locally in SQLite. The encryption key is derived from your machine's unique identifier, so the encrypted key only works on your computer. The key is never transmitted anywhere except directly to Anthropic's API.",
  },
  {
    question: "What are the enforcement modes?",
    answer:
      "There are four enforcement modes for git hooks: (1) Off - no documentation checks, (2) Warn - allows commits but shows warnings for missing docs, (3) Block - prevents commits with missing documentation headers, (4) Auto-Update (recommended) - automatically generates missing documentation using AI and stages it before committing. You can set this in Settings or the Enforcement tab - they stay in sync.",
  },
  {
    question: "How does auto-update enforcement work?",
    answer:
      "When you commit with auto-update mode enabled, the pre-commit hook checks staged files for @module/@description headers. If any are missing, it calls the Claude API to generate documentation, prepends it to the file, and re-stages it. Your commit proceeds with properly documented code. This requires an API key configured in Settings.",
  },
  {
    question: "What is the health score?",
    answer:
      "The health score (0-100) measures your project's documentation quality across six components: CLAUDE.md (25 points), Module docs (25 points), Freshness (15 points), Skills (15 points), Context (10 points), and Enforcement (10 points). Higher scores mean better context preservation. The dashboard shows a breakdown so you can see exactly where to improve.",
  },
  {
    question: "What are Quick Wins?",
    answer:
      "Quick Wins are prioritized suggestions shown on the dashboard. They identify high-impact, low-effort improvements to boost your health score. Each shows the potential point gain and difficulty level. Click 'Fix' to jump directly to the relevant section.",
  },
  {
    question: "What does the 'Refresh Docs' button do?",
    answer:
      "The 'Refresh Docs' button in the dashboard header is a one-click way to update all your documentation. It regenerates CLAUDE.md with fresh project analysis and updates any module files that have become stale or are missing documentation headers. The badge shows how many files need attention.",
  },
  {
    question: "What file types are supported?",
    answer:
      "Currently supported: TypeScript (.ts, .tsx), JavaScript (.js, .jsx), Rust (.rs), Python (.py), Go (.go), Java (.java), Kotlin (.kt), and Swift (.swift). Each language uses its native documentation format (JSDoc, Rust doc comments, Python docstrings, etc.).",
  },
  {
    question: "What is RALPH?",
    answer:
      "RALPH is an automated agentic coding technique that repeatedly feeds your prompt to Claude Code until the task is complete. Each iteration starts with a fresh context, solving the 'context accumulation' problem where AI loses focus as conversations grow. The prompt analyzer scores your prompts on clarity, specificity, context, and scope.",
  },
  {
    question: "How do the sidebar checkmarks work?",
    answer:
      "Checkmarks indicate completed setup steps for each project: CLAUDE.md exists with content, at least one module has documentation, skills/agents are added, a RALPH loop has been started, and git hooks are installed. They're tracked per-project and update automatically.",
  },
  {
    question: "Can I use this with multiple projects?",
    answer:
      "Yes! Use the project dropdown at the top of the sidebar to switch between projects. Each project has its own isolated data - health scores, checkmarks, skills, agents, and enforcement settings are all per-project.",
  },
];

const FEATURE_GUIDES: FeatureGuide[] = [
  {
    title: "Project Kickstart (New Projects)",
    description:
      "Starting a new project? Kickstart helps you set the right foundation from day one. Describe what you're building, your target users, and key features - it generates a comprehensive starter prompt for Claude Code with tech stack recommendations and project structure.",
    tips: [
      "Appears in the sidebar when you add an empty project folder",
      "Fill in app purpose, target users, and at least one key feature",
      "Optional fields let you specify framework, database, and styling preferences",
      "The generated prompt gives Claude Code everything it needs to scaffold your project",
      "After generating, the Kickstart section disappears and you can create your CLAUDE.md",
    ],
  },
  {
    title: "Dashboard & Health Score",
    description:
      "Your project health at a glance. The health score (0-100) measures documentation quality across six components. Quick Wins show prioritized improvements. The Context Rot alert warns when documentation is falling behind.",
    tips: [
      "Health score components: CLAUDE.md (25), Modules (25), Freshness (15), Skills (15), Context (10), Enforcement (10)",
      "Click Quick Wins 'Fix' buttons to jump directly to issues",
      "Green score (70+) means Claude has good context preservation",
      "Check Recent Activity to see what's been happening in your project",
    ],
  },
  {
    title: "Refresh Docs (One-Click Update)",
    description:
      "The 'Refresh Docs' button in the dashboard header regenerates all your documentation in one click. It updates CLAUDE.md with current project analysis and regenerates documentation for any files that have become stale or are missing headers.",
    tips: [
      "Use it after making significant changes to your codebase",
      "The badge shows how many files need updating",
      "Requires an API key for AI-powered generation",
      "Updates both CLAUDE.md and all stale module files at once",
      "Health score updates automatically after refresh",
    ],
  },
  {
    title: "CLAUDE.md",
    description:
      "Your project's documentation hub. This file lives at the root of your project and tells Claude everything it needs to know: tech stack, commands, patterns, and architectural decisions.",
    tips: [
      "Generate with AI for best results - it analyzes your actual codebase",
      "Keep the Overview section concise - Claude reads this first",
      "Update the 'Current Focus' section when starting new work",
      "Add gotchas and common mistakes to CLAUDE NOTES",
      "Use 'Refresh Docs' to regenerate when your project evolves",
    ],
  },
  {
    title: "Module Documentation",
    description:
      "Documentation headers at the top of each source file. These survive context compaction because Claude sees them every time it opens a file.",
    tips: [
      "Start with high-traffic files that Claude reads often",
      "Use batch generation for multiple files at once",
      "Focus on PURPOSE and CLAUDE NOTES sections",
      "Update docs when you change exports or add dependencies",
      "Or use Auto-Update enforcement to generate docs automatically at commit time",
    ],
  },
  {
    title: "Skills Library",
    description:
      "Pre-built prompt templates matched to your tech stack. Skills save time by giving you starting points for common tasks like commits, code reviews, and testing.",
    tips: [
      "Check the 'Recommended' tab first - skills are matched to your project's tech stack",
      "60+ battle-tested skills available across multiple categories",
      "Add skills to your project to customize them for your codebase",
      "Create custom skills for repetitive tasks specific to your workflow",
    ],
  },
  {
    title: "Agents Library",
    description:
      "More complex prompt templates that guide Claude through multi-step workflows. Agents are like skills but with structured instructions, tools, and trigger patterns.",
    tips: [
      "Use agents for complex tasks like refactoring, debugging, or code review",
      "Agents are tiered: Essential, Advanced, and Specialized",
      "Customize agent instructions with AI enhancement",
      "Agents can include workflow steps and tool configurations",
    ],
  },
  {
    title: "RALPH Loops",
    description:
      "An automated agentic coding technique that repeatedly feeds your prompt to Claude Code until the task is complete. Each iteration starts fresh, solving the 'context accumulation' problem.",
    tips: [
      "Aim for a quality score of 70+ before starting a loop",
      "Include specific file paths and function names in your prompt",
      "Define clear boundaries - what should NOT change",
      "Use the auto-enhance feature for low-scoring prompts",
      "Monitor active loops and pause/resume as needed",
    ],
  },
  {
    title: "Context Health",
    description:
      "Monitor how much of Claude's context window your persistent documentation consumes. Shows token breakdown by category and MCP server status.",
    tips: [
      "Keep total persistent context under 20% of the window",
      "Large CLAUDE.md files can be trimmed if needed",
      "MCP servers add to context - the status shows which are active",
      "Create checkpoints to snapshot your context state",
    ],
  },
  {
    title: "Enforcement",
    description:
      "Git hooks that check for documentation before commits. Four modes: Off (no checks), Warn (show warnings), Block (prevent commits), and Auto-Update (generate missing docs with AI).",
    tips: [
      "Auto-Update mode (recommended) generates missing docs automatically at commit time",
      "Start with 'Warn' mode to see what would be flagged without blocking",
      "Settings and Enforcement tabs stay in sync - change in either place",
      "Auto-Update requires an API key configured in Settings",
      "Use the CI snippets for GitHub Actions or GitLab CI integration",
      "Hooks check for @module and @description in staged source files",
    ],
  },
  {
    title: "Settings",
    description:
      "Configure your API key, notification preferences, and default enforcement level. Settings apply globally but enforcement can be customized per-project.",
    tips: [
      "API key is required for AI features - add it here first",
      "Enforcement level syncs with the Enforcement tab",
      "Your API key is encrypted and stored locally - never sent to our servers",
    ],
  },
];

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-neutral-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium text-neutral-100">
          {item.question}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <p className="pb-4 text-sm leading-relaxed text-neutral-400">
          {item.answer}
        </p>
      )}
    </div>
  );
}

function FeatureCard({ guide }: { guide: FeatureGuide }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="font-medium text-neutral-100">{guide.title}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <div className="border-t border-neutral-800 p-4">
          <p className="text-sm leading-relaxed text-neutral-400">
            {guide.description}
          </p>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Tips
            </p>
            <ul className="space-y-2">
              {guide.tips.map((tip, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-neutral-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function HelpView() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-100">Help</h1>
          <p className="mt-2 text-neutral-400">
            Learn how to use Project Jumpstart to prevent context rot and boost
            your productivity with Claude Code.
          </p>
        </div>

        {/* What is Context Rot - Hero Section */}
        <div className="mb-8 rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
          <h2 className="mb-3 text-lg font-semibold text-blue-300">
            What is Context Rot?
          </h2>
          <p className="text-sm leading-relaxed text-neutral-300">
            When you use Claude Code for extended sessions, the context window
            eventually fills up. Claude then compacts or drops older context to
            make room for new information. This means Claude "forgets" your
            project details - architecture decisions, naming conventions, file
            relationships - and you have to re-explain everything.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">
            <strong className="text-blue-300">Project Jumpstart fixes this</strong>{" "}
            by embedding critical information directly in your source files.
            CLAUDE.md and module documentation headers are always visible to
            Claude when it reads your code, regardless of context resets.
          </p>
        </div>

        {/* API Key Importance - Highlighted Section */}
        <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
          <h2 className="mb-3 text-lg font-semibold text-amber-300">
            Why Add Your API Key?
          </h2>
          <p className="text-sm leading-relaxed text-neutral-300">
            <strong className="text-amber-300">Your API key is the difference between basic templates and intelligent documentation.</strong>{" "}
            Without a key, you'll spend hours manually writing documentation. With a key, AI generates
            production-ready content in seconds.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-neutral-900/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                Without API Key
              </p>
              <ul className="space-y-1 text-xs text-neutral-400">
                <li>• Generic templates only</li>
                <li>• Manual editing required</li>
                <li>• No code analysis</li>
                <li>• Basic prompt scoring</li>
              </ul>
            </div>
            <div className="rounded-md bg-neutral-900/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                With API Key
              </p>
              <ul className="space-y-1 text-xs text-neutral-400">
                <li>• AI-generated CLAUDE.md</li>
                <li>• Smart module documentation</li>
                <li>• Code-aware analysis</li>
                <li>• Enhanced RALPH prompts</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-400">
            Add your key in Settings. It's encrypted locally and never shared.
          </p>
        </div>

        {/* Quick Start */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Quick Start (5 minutes)
          </h2>
          <ol className="space-y-3">
            {[
              "Add your Anthropic API key in Settings (unlocks AI features)",
              "Select your project folder in the onboarding wizard",
              "Review the auto-detected tech stack and adjust if needed",
              "Generate your CLAUDE.md file with AI-powered analysis",
              "Generate module docs for your most important files",
              "Use 'Refresh Docs' in the dashboard to keep everything updated",
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                  {index + 1}
                </span>
                <span className="text-sm text-neutral-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Feature Guides */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Feature Guides
          </h2>
          <div className="space-y-3">
            {FEATURE_GUIDES.map((guide) => (
              <FeatureCard key={guide.title} guide={guide} />
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Frequently Asked Questions
          </h2>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4">
            {FAQS.map((faq, index) => (
              <FAQAccordion key={index} item={faq} />
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-center">
          <h3 className="mb-2 font-medium text-neutral-100">
            Beta Feedback Welcome
          </h3>
          <p className="text-sm text-neutral-400">
            Found a bug or have a suggestion? Open an issue on GitHub.
          </p>
          <a
            href="https://github.com/jmckinley/project-jumpstart/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
          >
            Open GitHub Issues
          </a>
        </div>
      </div>
    </div>
  );
}
