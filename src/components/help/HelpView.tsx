/**
 * @module components/help/HelpView
 * @description Help section with FAQ, feature guides, and tips for using Project Jumpstart
 *
 * PURPOSE:
 * - Explain what context rot is and why it matters
 * - Emphasize the importance of adding an API key for AI features
 * - Document the Refresh Docs one-click update feature
 * - Provide feature-by-feature guides
 * - Answer frequently asked questions
 * - Help beta users understand and test the app
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
    question: "Why is adding an API key so important?",
    answer:
      "The API key unlocks Project Jumpstart's most powerful features. Without it, you only get basic templates that require manual editing. With an API key, you get: (1) AI-generated CLAUDE.md tailored to your actual codebase, (2) Smart module documentation that understands your code's purpose and patterns, (3) Enhanced RALPH prompts with project-aware suggestions, (4) Agent instruction improvements based on your tech stack. The difference is dramatic - AI generation produces production-ready documentation in seconds, while templates require significant manual work.",
  },
  {
    question: "Is my API key secure?",
    answer:
      "Yes. Your API key is encrypted using AES-256-GCM before being stored locally. The encryption key is derived from your machine's unique identifier, so the encrypted key only works on your computer. The key is never transmitted anywhere except directly to Anthropic's API.",
  },
  {
    question: "What file types are supported for module documentation?",
    answer:
      "Currently supported: TypeScript (.ts, .tsx), JavaScript (.js, .jsx), Rust (.rs), Python (.py), Go (.go), Java (.java), Kotlin (.kt), and Swift (.swift). Each language uses its native documentation format (JSDoc, Rust doc comments, Python docstrings, Javadoc, KDoc, Swift markup, etc.).",
  },
  {
    question: "What does the 'Refresh Docs' button do?",
    answer:
      "The 'Refresh Docs' button in the dashboard header is a one-click way to update all your documentation. It regenerates CLAUDE.md with fresh project analysis and updates any module files that have become stale (code changed since docs were written) or are missing documentation headers. The badge shows how many files need attention. This is perfect for keeping docs in sync after significant code changes.",
  },
  {
    question: "How do I know when to refresh documentation?",
    answer:
      "Check the dashboard for signs: (1) The 'Refresh Docs' badge shows a count greater than 1, (2) Your health score has dropped, (3) The Context Rot alert shows 'medium' or 'high' risk, (4) You've made significant changes to your codebase. Running 'Refresh Docs' periodically (e.g., weekly or after major features) keeps your documentation accurate.",
  },
  {
    question: "What is RALPH?",
    answer:
      "RALPH is an automated agentic coding technique that repeatedly feeds your prompt to Claude Code until the task is complete. Each iteration starts with a fresh context, solving the 'context accumulation' problem where AI loses focus as conversations grow. The prompt analyzer scores your prompts on clarity, specificity, context, and scope to ensure high-quality inputs.",
  },
  {
    question: "How do the sidebar checkmarks work?",
    answer:
      "Checkmarks indicate completed setup steps for each project: CLAUDE.md exists with content, at least one module has documentation, skills/agents are added, a RALPH loop has been started, and git hooks are installed. They're tracked per-project.",
  },
  {
    question: "Can I use this with multiple projects?",
    answer:
      "Yes! Use the project dropdown at the top of the sidebar to switch between projects. Each project has its own isolated data - health scores, checkmarks, skills, and settings are all per-project.",
  },
];

const FEATURE_GUIDES: FeatureGuide[] = [
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
      "Generate a template first, then customize it for your project",
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
      "Use 'Refresh Docs' in the dashboard to update all stale files at once",
    ],
  },
  {
    title: "Skills Library",
    description:
      "Pre-built prompt templates matched to your tech stack. Skills save time by giving you starting points for common tasks.",
    tips: [
      "Check the 'Recommended' skills first - they match your project",
      "Add skills to your project to customize them",
      "Create custom skills for repetitive tasks specific to your codebase",
      "Skills are project-specific, so different projects can have different sets",
    ],
  },
  {
    title: "Agents Library",
    description:
      "More complex prompt templates that guide Claude through multi-step workflows. Agents are like skills but with more structure.",
    tips: [
      "Use agents for complex tasks like refactoring or debugging",
      "Agents are tiered by complexity: Basic, Standard, Advanced",
      "Customize agent instructions for your specific needs",
    ],
  },
  {
    title: "RALPH Loops",
    description:
      "An automated agentic coding technique that repeatedly feeds your prompt to Claude Code until the task is complete. Each iteration starts fresh, solving the 'context accumulation' problem where AI loses focus as conversations grow. Write a clear prompt and let RALPH handle the rest.",
    tips: [
      "Aim for a quality score of 70+ before starting a loop",
      "Include specific file paths and function names",
      "Define clear boundaries - what should NOT change",
      "Use the auto-enhance feature for low-scoring prompts",
      "Each loop iteration gets fresh context - no memory buildup",
    ],
  },
  {
    title: "Context Health",
    description:
      "Monitor how much of Claude's context window your persistent documentation consumes. Shows token breakdown and MCP server status.",
    tips: [
      "Keep total persistent context under 20% of the window",
      "Large CLAUDE.md files can be trimmed if needed",
      "MCP servers add to context - disable unused ones",
    ],
  },
  {
    title: "Enforcement",
    description:
      "Git hooks that check for documentation before commits. Helps teams maintain documentation standards.",
    tips: [
      "Start with 'Warn' mode to see what would be flagged",
      "Switch to 'Block' mode once the team is ready",
      "Use the CI snippets for GitHub Actions or GitLab CI",
      "Hooks check for @module and @description in staged files",
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
            href="https://github.com/jmckinley/claude-code-assistant/issues"
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
