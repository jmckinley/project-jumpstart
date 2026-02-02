/**
 * @module components/help/HelpView
 * @description Help section with tabbed navigation for new projects, existing projects, and advanced features
 *
 * PURPOSE:
 * - Organize help content into Getting Started, Daily Use, and Advanced tabs
 * - Explain what context rot is and why it matters
 * - Emphasize the importance of adding an API key for AI features
 * - Document all features: Kickstart, Dashboard, CLAUDE.md, Modules, Skills, Agents, RALPH, Context Health, Enforcement
 * - Help new and experienced users get the most out of the app
 *
 * DEPENDENCIES:
 * - None (self-contained presentational component)
 *
 * EXPORTS:
 * - HelpView - Main help page component
 *
 * PATTERNS:
 * - Tabbed navigation for content organization
 * - Accordion-style FAQ sections
 * - Collapsible feature guides
 * - Highlighted info boxes for key concepts
 *
 * CLAUDE NOTES:
 * - Three tabs: Getting Started (new users), Daily Use (existing projects), Advanced (RALPH, enforcement)
 * - Context rot and API key sections appear in Getting Started
 * - FAQ appears at bottom of each tab with relevant questions
 * - Keep explanations concise and actionable
 */

import { useState } from "react";

type TabId = "getting-started" | "daily-use" | "advanced";

interface FAQItem {
  question: string;
  answer: string;
  tabs: TabId[];
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
    tabs: ["getting-started"],
  },
  {
    question: "How does Project Jumpstart prevent context rot?",
    answer:
      "Instead of relying on Claude's memory, we bake important information directly into your source files. CLAUDE.md provides project-level context, and module documentation headers ensure Claude understands each file it opens - even after context resets.",
    tabs: ["getting-started"],
  },
  {
    question: "I'm new to Claude Code. Do I need to learn best practices first?",
    answer:
      "No! That's exactly what Project Jumpstart is for. We install best practices automatically - CLAUDE.md templates, skills, agents, documentation standards - then keep them current as you build. You get what experienced users have learned, without the learning curve.",
    tabs: ["getting-started"],
  },
  {
    question: "Why is adding an API key so important?",
    answer:
      "Your Anthropic API key is required to use Project Jumpstart. It powers all the core features: (1) AI-generated CLAUDE.md tailored to your actual codebase, (2) Smart module documentation that understands your code's purpose and patterns, (3) Auto-update enforcement that generates missing docs at commit time, (4) Enhanced RALPH prompts with project-aware suggestions. AI generation produces production-ready documentation in seconds - what would take hours of manual work.",
    tabs: ["getting-started"],
  },
  {
    question: "Is my API key secure?",
    answer:
      "Yes. Your API key is encrypted using AES-256-GCM before being stored locally in SQLite. The encryption key is derived from your machine's unique identifier, so the encrypted key only works on your computer. The key is never transmitted anywhere except directly to Anthropic's API.",
    tabs: ["getting-started"],
  },
  {
    question: "What is Project Kickstart?",
    answer:
      "Project Kickstart helps you bootstrap new or empty projects. Describe what you're building, your target users, and key features, and it generates a comprehensive starter prompt for Claude Code. It sets up the right foundation from day one - tech stack decisions, initial prompts, and project structure recommendations.",
    tabs: ["getting-started"],
  },
  {
    question: "What is the health score?",
    answer:
      "The health score (0-100) measures your project's documentation quality across six components: CLAUDE.md (25 points), Module docs (25 points), Freshness (15 points), Skills (15 points), Context Health (10 points), and Enforcement (10 points). Higher scores mean better context preservation. The dashboard shows a breakdown so you can see exactly where to improve.",
    tabs: ["daily-use"],
  },
  {
    question: "What are Quick Wins?",
    answer:
      "Quick Wins are prioritized suggestions shown on the dashboard. They identify high-impact, low-effort improvements to boost your health score. Each shows the potential point gain and difficulty level. Click 'Fix' to jump directly to the relevant section.",
    tabs: ["daily-use"],
  },
  {
    question: "What does the 'Refresh Docs' button do?",
    answer:
      "The 'Refresh Docs' button in the dashboard header is a one-click way to update all your documentation. It regenerates CLAUDE.md with fresh project analysis and updates any module files that have become stale or are missing documentation headers. The badge shows how many files need attention.",
    tabs: ["daily-use"],
  },
  {
    question: "What file types are supported?",
    answer:
      "Currently supported: TypeScript (.ts, .tsx), JavaScript (.js, .jsx), Rust (.rs), Python (.py), Go (.go), Java (.java), Kotlin (.kt), and Swift (.swift). Each language uses its native documentation format (JSDoc, Rust doc comments, Python docstrings, etc.).",
    tabs: ["daily-use"],
  },
  {
    question: "What are the Claude Code Best Practices skills?",
    answer:
      "These are four prompting patterns recommended by the Claude Code team: (1) 'Grill Me On Changes' - ask Claude to aggressively review your code assuming bugs exist, (2) 'Prove It Works' - demand concrete test evidence instead of 'this should work', (3) 'Fresh Start Pattern' - the context rot escape hatch (save learnings to CLAUDE.md, start fresh), (4) 'Two-Claude Review' - use separate sessions for implementation vs. review. Find them in the Skills Library under the 'universal' tag.",
    tabs: ["daily-use"],
  },
  {
    question: "What are the one-click solutions?",
    answer:
      "Project Jumpstart is designed for minimal friction. For Skills: 'Detect Patterns' scans your codebase, then click 'Create Skill' to instantly generate a comprehensive skill with templates, examples, and DO/DON'T lists. For Agents: The 'Suggested for Your Project' section in the My Agents tab shows recommended agents - click 'Add' to create them instantly without filling out any forms. For Git: Click 'Initialize Git Repository' in the Enforcement tab to set up git AND auto-update hooks in one step. All features match recommendations to your tech stack.",
    tabs: ["daily-use"],
  },
  {
    question: "How do the sidebar checkmarks work?",
    answer:
      "Checkmarks indicate completed setup steps for each project: CLAUDE.md exists with content, at least one module has documentation, skills/agents are added, a RALPH loop has been started, and git hooks are installed. They're tracked per-project and update automatically.",
    tabs: ["daily-use"],
  },
  {
    question: "Can I use this with multiple projects?",
    answer:
      "Yes! Use the project dropdown at the top of the sidebar to switch between projects. Each project has its own isolated data - health scores, checkmarks, skills, agents, and enforcement settings are all per-project.",
    tabs: ["daily-use"],
  },
  {
    question: "What is RALPH?",
    answer:
      "RALPH is an automated agentic coding technique that repeatedly feeds your prompt to Claude Code until the task is complete. Each iteration starts with a fresh context, solving the 'context accumulation' problem where AI loses focus as conversations grow. Just type your prompt and click 'Start RALPH Loop' - or optionally use 'Check Prompt' first to see analysis and quality score. RALPH also learns from past mistakes - it shows 'Learned from Previous Loops' before you start, so you don't repeat the same errors.",
    tabs: ["advanced"],
  },
  {
    question: "How does RALPH learn from mistakes?",
    answer:
      "RALPH now records mistakes during coding sessions. Before starting a new loop, you'll see a 'Learned from Previous Loops' banner showing recent mistakes and their resolutions. You can also 'learn patterns' which appends them to your CLAUDE.md file, making them persist across all future sessions. This prevents repeating the same errors.",
    tabs: ["advanced"],
  },
  {
    question: "What is the Skeptical Reviewer agent?",
    answer:
      "The Skeptical Reviewer is an advanced agent that's automatically added to new projects. It has a 6-step workflow: read CLAUDE.md and past mistakes, examine changes with suspicion, trace edge cases, challenge assumptions, check test coverage, and report findings with severity levels. Trigger it with words like 'review', 'check', 'grill', or 'find bugs'.",
    tabs: ["advanced"],
  },
  {
    question: "What are the enforcement modes?",
    answer:
      "There are four enforcement modes for git hooks: (1) Off - no documentation checks, (2) Warn - allows commits but shows warnings for missing docs, (3) Block - prevents commits with missing documentation headers, (4) Auto-Update (recommended) - automatically generates missing documentation using AI and stages it before committing. You can set this in Settings or the Enforcement tab - they stay in sync.",
    tabs: ["advanced"],
  },
  {
    question: "How does auto-update enforcement work?",
    answer:
      "When you commit with auto-update mode enabled, the pre-commit hook checks staged files for @module/@description headers. If any are missing, it calls the Claude API to generate documentation, prepends it to the file, and re-stages it. Your commit proceeds with properly documented code. This requires an API key configured in Settings.",
    tabs: ["advanced"],
  },
  {
    question: "What are the important default settings, and how do I change them?",
    answer:
      "The key defaults are: (1) API Key - required for all AI features; add yours in Settings first. (2) Enforcement Mode - defaults to 'Auto-Update' which automatically generates missing documentation at commit time. Change this in Settings or the Enforcement tab. (3) Module Documentation - new projects auto-expand the file tree and show all files. (4) Git Hooks - installed automatically when you enable enforcement during onboarding. To change settings, click 'Settings' in the sidebar - enforcement level, API key, and preferences are all there.",
    tabs: ["advanced"],
  },
];

const GETTING_STARTED_GUIDES: FeatureGuide[] = [
  {
    title: "Project Kickstart (Empty Projects)",
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
    title: "CLAUDE.md (Your First Doc)",
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
    title: "Module Documentation (File Headers)",
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
];

const DAILY_USE_GUIDES: FeatureGuide[] = [
  {
    title: "Dashboard & Health Score",
    description:
      "Your project health at a glance. The health score (0-100) measures documentation quality across six components. Quick Wins show prioritized improvements. The Context Rot alert warns when documentation is falling behind.",
    tips: [
      "Health score components: CLAUDE.md (25), Modules (25), Freshness (15), Skills (15), Context Health (10), Enforcement (10)",
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
    title: "Skills Library",
    description:
      "Pre-built prompt templates matched to your tech stack. Skills save time by giving you starting points for common tasks like commits, code reviews, and testing. Includes Claude Code Best Practices from the team itself.",
    tips: [
      "Check the 'Recommended' tab first - skills are matched to your project's tech stack",
      "60+ battle-tested skills available across multiple categories",
      "Look for 'universal' tagged skills - they work with any project",
      "Try 'Grill Me On Changes' and 'Prove It Works' for better code quality",
      "'Fresh Start Pattern' is your escape hatch when context gets polluted",
      "Add skills to your project to customize them for your codebase",
      "Pattern Detection scans your codebase and suggests skills - one-click to create!",
    ],
  },
  {
    title: "Agents Library",
    description:
      "More complex prompt templates that guide Claude through multi-step workflows. Agents are like skills but with structured instructions, tools, and trigger patterns. The Skeptical Reviewer agent is auto-added to new projects.",
    tips: [
      "The Skeptical Reviewer has a 6-step workflow for finding bugs systematically",
      "Agents are tiered: Essential, Advanced, and Specialized",
      "'Suggested for Your Project' shows recommended agents right in the My Agents tab",
      "One-click 'Add' creates agents instantly - no form to fill out!",
      "'Great Match' badge indicates agents highly relevant to your tech stack",
      "Trigger patterns let you invoke agents with keywords like 'review' or 'debug'",
    ],
  },
];

const ADVANCED_GUIDES: FeatureGuide[] = [
  {
    title: "RALPH Loops",
    description:
      "An automated agentic coding technique that repeatedly feeds your prompt to Claude Code until the task is complete. Each iteration starts fresh, solving the 'context accumulation' problem. Now with mistake learning!",
    tips: [
      "Just type your prompt and click 'Start RALPH Loop' - no need to check first",
      "Use 'Check Prompt' optionally to see analysis and quality score",
      "Include specific file paths and function names in your prompt",
      "Define clear boundaries - what should NOT change",
      "Use the auto-enhance feature for low-scoring prompts",
      "Check the 'Learned from Previous Loops' banner before starting - it shows past mistakes",
      "Record mistakes during sessions so future loops can learn from them",
      "Use 'Learn Pattern' to add discoveries to CLAUDE.md permanently",
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
    title: "Enforcement (Git Hooks)",
    description:
      "Git hooks that check for documentation before commits. Four modes: Off (no checks), Warn (show warnings), Block (prevent commits), and Auto-Update (generate missing docs with AI).",
    tips: [
      "Auto-Update mode (recommended) generates missing docs automatically at commit time",
      "No git? Click 'Initialize Git Repository' - it auto-installs auto-update hooks in one step",
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

const TABS = [
  { id: "getting-started" as TabId, label: "Getting Started", description: "New to Project Jumpstart" },
  { id: "daily-use" as TabId, label: "Daily Use", description: "Existing projects" },
  { id: "advanced" as TabId, label: "Advanced", description: "RALPH, enforcement, context" },
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
    <div className="border-b border-neutral-800 last:border-b-0">
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

function GettingStartedTab() {
  const faqs = FAQS.filter((f) => f.tabs.includes("getting-started"));

  return (
    <div className="space-y-8">
      {/* What is Context Rot - Hero Section */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
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

      {/* API Key Required */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
        <h2 className="mb-3 text-lg font-semibold text-amber-300">
          First Step: Add Your API Key
        </h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          <strong className="text-amber-300">Your Anthropic API key powers all of Project Jumpstart's features.</strong>{" "}
          Add it in Settings to get started.
        </p>
        <div className="mt-4 rounded-md bg-neutral-900/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            What Your API Key Enables
          </p>
          <ul className="grid gap-1 text-xs text-neutral-400 sm:grid-cols-2">
            <li>• AI-generated CLAUDE.md</li>
            <li>• Smart module documentation</li>
            <li>• Code-aware analysis</li>
            <li>• Enhanced RALPH prompts</li>
            <li>• Auto-update enforcement</li>
            <li>• One-click doc refresh</li>
          </ul>
        </div>
        <p className="mt-4 text-xs text-neutral-400">
          Your key is encrypted locally using AES-256-GCM and never shared with anyone except Anthropic's API.
        </p>
      </div>

      {/* Quick Start */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Quick Start Checklist
        </h2>
        <ol className="space-y-3">
          {[
            "Add your Anthropic API key in Settings",
            "Select your project folder in the onboarding wizard",
            "Review the auto-detected tech stack",
            "Generate your CLAUDE.md file",
            "Generate module docs for key files",
            "Use 'Refresh Docs' to keep everything updated",
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
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Feature Guides
        </h2>
        <div className="space-y-3">
          {GETTING_STARTED_GUIDES.map((guide) => (
            <FeatureCard key={guide.title} guide={guide} />
          ))}
        </div>
      </div>

      {/* FAQ */}
      {faqs.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Frequently Asked Questions
          </h2>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} item={faq} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DailyUseTab() {
  const faqs = FAQS.filter((f) => f.tabs.includes("daily-use"));

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
        <p className="text-sm text-neutral-300">
          Once your project is set up, these are the features you'll use daily to maintain documentation and improve your workflow with Claude Code.
        </p>
      </div>

      {/* Feature Guides */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Feature Guides
        </h2>
        <div className="space-y-3">
          {DAILY_USE_GUIDES.map((guide) => (
            <FeatureCard key={guide.title} guide={guide} />
          ))}
        </div>
      </div>

      {/* FAQ */}
      {faqs.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Frequently Asked Questions
          </h2>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} item={faq} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdvancedTab() {
  const faqs = FAQS.filter((f) => f.tabs.includes("advanced"));

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
        <p className="text-sm text-neutral-300">
          <strong className="text-purple-300">Power user features</strong> for automated workflows, enforcement, and context optimization.
        </p>
      </div>

      {/* Feature Guides */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Feature Guides
        </h2>
        <div className="space-y-3">
          {ADVANCED_GUIDES.map((guide) => (
            <FeatureCard key={guide.title} guide={guide} />
          ))}
        </div>
      </div>

      {/* FAQ */}
      {faqs.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-neutral-100">
            Frequently Asked Questions
          </h2>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} item={faq} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function HelpView() {
  const [activeTab, setActiveTab] = useState<TabId>("getting-started");

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-100">Help</h1>
          <p className="mt-2 text-neutral-400">
            Learn how to use Project Jumpstart to prevent context rot and boost
            your productivity with Claude Code.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              <span className="block">{tab.label}</span>
              <span className={`block text-xs ${activeTab === tab.id ? "text-blue-200" : "text-neutral-500"}`}>
                {tab.description}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "getting-started" && <GettingStartedTab />}
        {activeTab === "daily-use" && <DailyUseTab />}
        {activeTab === "advanced" && <AdvancedTab />}

        {/* Feedback - Always visible */}
        <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-center">
          <h3 className="mb-2 font-medium text-neutral-100">
            Beta Feedback Welcome
          </h3>
          <p className="text-sm text-neutral-400">
            Found a bug or have a suggestion? Open an issue on GitHub.
          </p>
          <a
            href="https://github.com/jmckinley/project-jumpstart-feedback/issues"
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
