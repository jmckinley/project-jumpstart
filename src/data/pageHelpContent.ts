/**
 * @module data/pageHelpContent
 * @description Help content for each page in the application
 *
 * PURPOSE:
 * - Define contextual help text for each page/section
 * - Provide key concepts, tips, and descriptions
 * - Centralize help content for easy maintenance
 *
 * EXPORTS:
 * - PAGE_HELP - Record of page IDs to help content
 *
 * PATTERNS:
 * - Each page has: title, description, concepts[], tips[]
 * - Keep descriptions under 2 sentences
 * - Concepts are term/definition pairs for jargon
 * - Tips are actionable quick-start guidance
 *
 * CLAUDE NOTES:
 * - Update when adding new pages or features
 * - Keep tips focused on getting started, not comprehensive docs
 * - Concepts should explain project-specific terminology
 */

import type { PageHelpContent } from "@/components/layout/PageHelp";

export const PAGE_HELP: Record<string, PageHelpContent> = {
  dashboard: {
    title: "Dashboard",
    description:
      "Your project's documentation health at a glance. Monitor coverage, spot issues, and find quick improvements.",
    concepts: [
      {
        term: "Health Score",
        definition: "0-100 rating based on documentation coverage, freshness, and best practices.",
      },
      {
        term: "Context Rot",
        definition: "When documentation becomes stale and no longer matches the code.",
      },
      {
        term: "Quick Wins",
        definition: "High-impact, low-effort improvements to boost your score.",
      },
    ],
    tips: [
      "Click a Quick Win to jump directly to that section",
      "Use 'Refresh Docs' to update stale documentation with AI",
      "Check the dashboard after major code changes",
    ],
  },

  "claude-md": {
    title: "CLAUDE.md Editor",
    description:
      "Edit your project's CLAUDE.md file—the central documentation that gives Claude context about your codebase.",
    concepts: [
      {
        term: "CLAUDE.md",
        definition: "A markdown file that tells Claude about your project's structure, patterns, and conventions.",
      },
      {
        term: "Sections",
        definition: "CLAUDE.md is organized into sections like Overview, Commands, Patterns, and Notes.",
      },
    ],
    tips: [
      "Keep the Overview section concise but comprehensive",
      "Document commands developers run frequently",
      "Add CLAUDE NOTES for things you want Claude to always remember",
      "Use the AI suggestions to fill in missing sections",
    ],
  },

  modules: {
    title: "Module Documentation",
    description:
      "Add documentation headers to source files so Claude understands each module's purpose and dependencies.",
    concepts: [
      {
        term: "Module Doc",
        definition: "A structured comment at the top of each file describing its purpose, exports, and patterns.",
      },
      {
        term: "Coverage",
        definition: "Percentage of source files that have documentation headers.",
      },
      {
        term: "Freshness",
        definition: "Whether the documentation still matches the current code.",
      },
    ],
    tips: [
      "Start with high-traffic files that Claude reads often",
      "Use 'Generate' to create docs with AI, then review and apply",
      "Batch generate to document multiple files at once",
      "Green = documented, Yellow = outdated, Red = missing",
    ],
  },

  "test-plans": {
    title: "Test Plans",
    description:
      "Plan, track, and generate test cases for your codebase. Use AI to analyze code and suggest tests.",
    concepts: [
      {
        term: "Test Plan",
        definition: "A collection of related test cases with a coverage target.",
      },
      {
        term: "TDD Workflow",
        definition: "Red → Green → Refactor cycle for test-driven development.",
      },
      {
        term: "Coverage Target",
        definition: "The percentage of code you aim to cover with tests.",
      },
    ],
    tips: [
      "Use 'Generate Tests' to let AI analyze your code and suggest test cases",
      "Filter test cases by type, priority, or status to manage large lists",
      "Try the TDD Workflow tab for guided test-driven development",
      "Use Tools tab to generate subagent configs and hooks",
    ],
  },

  skills: {
    title: "Skills Workshop",
    description:
      "Create reusable prompt snippets that teach Claude specific tasks or patterns for your project.",
    concepts: [
      {
        term: "Skill",
        definition: "A reusable prompt template that tells Claude how to perform a specific task.",
      },
      {
        term: "Pattern Detection",
        definition: "AI analysis of your codebase to suggest skills based on your conventions.",
      },
    ],
    tips: [
      "Browse the Skill Library for pre-built skills to add",
      "Create custom skills for project-specific patterns",
      "Use pattern detection to discover skills from your code",
      "Skills are included in Claude's context when relevant",
    ],
  },

  agents: {
    title: "Agents",
    description:
      "Configure specialized Claude agents for complex, multi-step tasks like testing, debugging, or code review.",
    concepts: [
      {
        term: "Agent",
        definition: "A specialized configuration that tells Claude how to handle a category of tasks.",
      },
      {
        term: "Tier",
        definition: "Agent complexity: Basic (focused), Standard (workflow), Advanced (comprehensive).",
      },
      {
        term: "Workflow",
        definition: "Sequence of steps the agent follows to complete its task.",
      },
    ],
    tips: [
      "Start with agents from the library, customize as needed",
      "Use 'Enhance with AI' to improve agent instructions",
      "Match agent tier to task complexity",
      "Trigger patterns help Claude recognize when to use an agent",
    ],
  },

  "team-templates": {
    title: "Team Templates",
    description:
      "Browse and deploy pre-configured multi-agent team compositions for complex tasks like feature development, testing, and refactoring.",
    concepts: [
      {
        term: "Agent Team",
        definition: "Multiple Claude Code instances coordinating via shared task lists and peer messaging.",
      },
      {
        term: "Orchestration Pattern",
        definition: "How teammates are organized: leader-led, pipeline, parallel, swarm, or council.",
      },
      {
        term: "Lead Prompt",
        definition: "A paste-ready markdown document that sets up the entire team in a Claude Code session.",
      },
    ],
    tips: [
      "Browse the library for pre-built team compositions",
      "Use 'Deploy' to generate a paste-ready prompt for Claude Code",
      "Customize templates by saving them to your project first",
      "Teams are expensive — start with 2-3 teammates for best results",
    ],
  },

  ralph: {
    title: "RALPH Command Center",
    description:
      "Analyze and optimize prompts before sending them to Claude. Monitor long-running task loops.",
    concepts: [
      {
        term: "RALPH",
        definition: "Review, Analyze, List, Plan, Handoff—a methodology for effective prompting.",
      },
      {
        term: "Quality Score",
        definition: "0-100 rating based on prompt clarity, specificity, context, and scope.",
      },
      {
        term: "Loop",
        definition: "A tracked session of iterative Claude interactions for a single task.",
      },
    ],
    tips: [
      "Analyze prompts before starting large tasks",
      "Higher quality scores lead to better Claude responses",
      "Use PRD mode for multi-story task execution",
      "Review past loops to learn from mistakes",
    ],
  },

  context: {
    title: "Context Health",
    description:
      "Monitor how much context Claude has available and optimize what's included in the conversation.",
    concepts: [
      {
        term: "Context Window",
        definition: "The total amount of text Claude can 'see' at once (measured in tokens).",
      },
      {
        term: "Token",
        definition: "A unit of text, roughly 4 characters or 0.75 words on average.",
      },
      {
        term: "MCP Server",
        definition: "Model Context Protocol servers that provide Claude with external capabilities.",
      },
    ],
    tips: [
      "Keep context utilization under 80% for best performance",
      "Create checkpoints before major context-heavy operations",
      "Use MCP servers to offload capabilities Claude doesn't need in context",
      "Documentation headers help Claude understand code without reading it all",
    ],
  },

  enforcement: {
    title: "Enforcement",
    description:
      "Automate documentation standards with git hooks and CI integration to prevent context rot.",
    concepts: [
      {
        term: "Git Hook",
        definition: "Script that runs automatically before commits to check/enforce rules.",
      },
      {
        term: "Enforcement Mode",
        definition: "How strictly to enforce: Warn (allow), Block (fail), Auto-update (fix automatically).",
      },
    ],
    tips: [
      "Start with 'Warn' mode to see what would be flagged",
      "Use 'Auto-update' to generate missing docs at commit time",
      "Copy CI snippets to add checks to your pipeline",
      "Works with Husky if you already have it set up",
    ],
  },

  settings: {
    title: "Settings",
    description: "Configure your API key, preferences, and application behavior.",
    concepts: [
      {
        term: "API Key",
        definition: "Your Anthropic API key for AI-powered features like doc generation.",
      },
    ],
    tips: [
      "API key is required for AI generation features",
      "Key is stored encrypted locally, never sent to our servers",
      "Enforcement level here syncs with the Enforcement page",
    ],
  },

  help: {
    title: "Help & Resources",
    description: "Documentation, guides, and resources for getting the most out of Project Jumpstart.",
    tips: [
      "Check the Claude Code docs for prompting best practices",
      "Report issues on GitHub",
      "Join the community for tips and templates",
    ],
  },

  kickstart: {
    title: "Project Kickstart",
    description:
      "Bootstrap a new project with AI-generated CLAUDE.md and documentation structure.",
    concepts: [
      {
        term: "Kickstart Prompt",
        definition: "An AI-generated prompt to help Claude set up your project's documentation.",
      },
    ],
    tips: [
      "Use for new or undocumented projects",
      "Review and customize the generated CLAUDE.md",
      "The prompt includes your detected tech stack",
    ],
  },
};
