/**
 * @module components/dashboard/SmartNextStep
 * @description Smart recommendation card that suggests the next best action based on project state
 *
 * PURPOSE:
 * - Guide users through setup and ongoing maintenance
 * - Prioritize recommendations based on project health and state
 * - Provide one-click navigation to take action
 *
 * DEPENDENCIES:
 * - react (useState, useEffect, useCallback) - State management
 * - @/lib/tauri (getSetting, saveSetting) - Persist dismissed state
 * - @/types/health - HealthScore, QuickWin types
 *
 * EXPORTS:
 * - SmartNextStep - Dashboard recommendation card component
 * - Recommendation - Type for recommendation data
 *
 * PATTERNS:
 * - Recommendations are prioritized by importance (setup > active > maintenance)
 * - "Later" dismisses for this session (or until condition changes)
 * - Action button navigates to the appropriate section
 *
 * CLAUDE NOTES:
 * - Setup phase items block AI features, so they're highest priority
 * - Active phase items improve project health
 * - Maintenance tips rotate when everything is healthy
 * - Dismissed state stored per-project in settings
 */

import { useState, useEffect, useCallback } from "react";
import { getSetting, saveSetting } from "@/lib/tauri";

export interface Recommendation {
  id: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  title: string;
  description: string;
  actionLabel: string;
  targetSection: string;
  priority: number; // Lower = higher priority
  category: "setup" | "active" | "maintenance";
}

interface SmartNextStepProps {
  // Project state
  hasApiKey: boolean;
  hasClaudeMd: boolean;
  isEmptyProject: boolean;
  moduleCoverage: number; // 0-100
  totalModules: number;
  staleModules: number;
  hasSkills: boolean;
  hasAgents: boolean;
  hasEnforcement: boolean;
  hasTestFramework: boolean;
  hasTestPlan: boolean;
  testCoverage: number; // 0-100
  contextRotRisk: "low" | "medium" | "high";
  projectId: string;
  // Actions
  onNavigate: (section: string) => void;
  onRefreshDocs?: () => void;
}

const RECOMMENDATIONS: Omit<Recommendation, "priority">[] = [
  // Setup Phase
  {
    id: "api-key",
    icon: "🔑",
    iconColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    title: "Add your Anthropic API key",
    description: "Required for AI-powered features like doc generation, test suggestions, and RALPH analysis.",
    actionLabel: "Add API Key",
    targetSection: "settings",
    category: "setup",
  },
  {
    id: "kickstart",
    icon: "🚀",
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    title: "Generate a Kickstart prompt",
    description: "Bootstrap your new project with AI-powered best practices and documentation structure.",
    actionLabel: "Generate Kickstart",
    targetSection: "modules",
    category: "setup",
  },
  {
    id: "claude-md",
    icon: "📄",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    title: "Generate your CLAUDE.md",
    description: "The foundation of context preservation. Claude reads this file every session to understand your project.",
    actionLabel: "Create CLAUDE.md",
    targetSection: "claude-md",
    category: "setup",
  },
  {
    id: "module-docs",
    icon: "📁",
    iconColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    title: "Document your key modules",
    description: "Add documentation headers to source files so Claude understands each module's purpose.",
    actionLabel: "Document Modules",
    targetSection: "modules",
    category: "setup",
  },
  {
    id: "skills",
    icon: "⚡",
    iconColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    title: "Add skills from the library",
    description: "Pre-built prompt templates for common tasks, matched to your tech stack.",
    actionLabel: "Browse Skills",
    targetSection: "skills",
    category: "setup",
  },
  {
    id: "enforcement",
    icon: "🔒",
    iconColor: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    title: "Set up documentation enforcement",
    description: "Git hooks ensure documentation stays current. Auto-update mode generates missing docs at commit time.",
    actionLabel: "Set Up Hooks",
    targetSection: "enforcement",
    category: "setup",
  },
  // Active Phase
  {
    id: "refresh-docs",
    icon: "🔄",
    iconColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    title: "Refresh your documentation",
    description: "Some module files have changed since their docs were written. Keep Claude's context accurate.",
    actionLabel: "Refresh Now",
    targetSection: "modules",
    category: "active",
  },
  {
    id: "test-plan",
    icon: "🧪",
    iconColor: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    title: "Set up a test plan",
    description: "We detected a test framework in your project. Track coverage and use AI to generate test cases.",
    actionLabel: "Create Test Plan",
    targetSection: "test-plans",
    category: "active",
  },
  {
    id: "test-coverage",
    icon: "📊",
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    title: "Improve test coverage",
    description: "Your test coverage is below target. Use AI to generate test cases for uncovered code.",
    actionLabel: "Generate Tests",
    targetSection: "test-plans",
    category: "active",
  },
  {
    id: "context-health",
    icon: "🧠",
    iconColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    title: "Review context health",
    description: "High context rot risk detected. Review and update stale documentation to keep Claude effective.",
    actionLabel: "Check Context",
    targetSection: "context",
    category: "active",
  },
  {
    id: "agents",
    icon: "🤖",
    iconColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    title: "Add agents for your workflow",
    description: "Agents guide Claude through complex multi-step tasks. Add ones matched to your tech stack.",
    actionLabel: "Browse Agents",
    targetSection: "agents",
    category: "active",
  },
  // Maintenance Phase
  {
    id: "all-good",
    icon: "✨",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    title: "Your project is in great shape!",
    description: "Documentation is current, tests are covered, and context is healthy. Keep it up!",
    actionLabel: "View Dashboard",
    targetSection: "dashboard",
    category: "maintenance",
  },
];

function getRecommendation(props: SmartNextStepProps, dismissedIds: string[]): Recommendation | null {
  const validRecommendations: Recommendation[] = [];

  // Setup Phase (priority 1-6)
  if (!props.hasApiKey) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "api-key")!, priority: 1 });
  }

  // Only recommend kickstart if empty project AND no CLAUDE.md yet
  if (props.hasApiKey && props.isEmptyProject && !props.hasClaudeMd) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "kickstart")!, priority: 2 });
  }

  if (props.hasApiKey && !props.isEmptyProject && !props.hasClaudeMd) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "claude-md")!, priority: 3 });
  }

  if (props.hasApiKey && props.hasClaudeMd && props.moduleCoverage < 50 && props.totalModules > 0) {
    const rec = RECOMMENDATIONS.find(r => r.id === "module-docs")!;
    const undocumented = Math.round(props.totalModules * (1 - props.moduleCoverage / 100));
    validRecommendations.push({
      ...rec,
      description: `${undocumented} of ${props.totalModules} source files need documentation headers.`,
      priority: 4,
    });
  }

  if (props.hasApiKey && props.hasClaudeMd && !props.hasSkills) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "skills")!, priority: 5 });
  }

  if (props.hasApiKey && props.hasClaudeMd && !props.hasEnforcement) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "enforcement")!, priority: 6 });
  }

  // Active Phase (priority 10-15)
  if (props.staleModules > 0) {
    const rec = RECOMMENDATIONS.find(r => r.id === "refresh-docs")!;
    validRecommendations.push({
      ...rec,
      description: `${props.staleModules} module file${props.staleModules > 1 ? "s have" : " has"} changed since docs were written.`,
      priority: 10,
    });
  }

  if (props.hasTestFramework && !props.hasTestPlan) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "test-plan")!, priority: 11 });
  }

  if (props.hasTestPlan && props.testCoverage < 50) {
    const rec = RECOMMENDATIONS.find(r => r.id === "test-coverage")!;
    validRecommendations.push({
      ...rec,
      description: `Test coverage is at ${props.testCoverage}%. Use AI to generate test cases for uncovered code.`,
      priority: 12,
    });
  }

  if (props.contextRotRisk === "high") {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "context-health")!, priority: 13 });
  }

  if (props.hasClaudeMd && props.hasSkills && !props.hasAgents && props.totalModules > 10) {
    validRecommendations.push({ ...RECOMMENDATIONS.find(r => r.id === "agents")!, priority: 14 });
  }

  // Filter out dismissed recommendations
  const available = validRecommendations.filter(r => !dismissedIds.includes(r.id));

  // Sort by priority and return the top one
  available.sort((a, b) => a.priority - b.priority);

  if (available.length > 0) {
    return available[0];
  }

  // Maintenance mode - everything is good
  if (props.hasApiKey && props.hasClaudeMd && props.moduleCoverage >= 50) {
    return { ...RECOMMENDATIONS.find(r => r.id === "all-good")!, priority: 100 };
  }

  return null;
}

export function SmartNextStep(props: SmartNextStepProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed state
  useEffect(() => {
    const loadDismissed = async () => {
      try {
        const stored = await getSetting(`smart_next_dismissed_${props.projectId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Check if dismissals are still valid (reset after 24 hours, unless permanent)
          const now = Date.now();
          const validDismissals = parsed.filter((d: { id: string; at: number; permanent?: boolean }) =>
            d.permanent || (now - d.at < 24 * 60 * 60 * 1000)
          );
          setDismissedIds(validDismissals.map((d: { id: string }) => d.id));
        }
      } catch {
        setDismissedIds([]);
      }
    };
    loadDismissed();
  }, [props.projectId]);

  const handleDismiss = useCallback(async (id: string, permanent: boolean = false) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);

    // Load existing dismissals to preserve permanent flags
    let existingDismissals: { id: string; at: number; permanent?: boolean }[] = [];
    try {
      const stored = await getSetting(`smart_next_dismissed_${props.projectId}`);
      if (stored) {
        existingDismissals = JSON.parse(stored);
      }
    } catch {
      // Ignore
    }

    // Update or add the dismissal
    const updated = existingDismissals.filter(d => d.id !== id);
    updated.push({ id, at: Date.now(), permanent });

    try {
      await saveSetting(`smart_next_dismissed_${props.projectId}`, JSON.stringify(updated));
    } catch {
      // Non-critical
    }
  }, [dismissedIds, props.projectId]);

  const handleAction = useCallback((section: string) => {
    props.onNavigate(section);
  }, [props.onNavigate]);

  const recommendation = getRecommendation(props, dismissedIds);

  // Don't show if no recommendation or all-good was dismissed
  if (!recommendation) {
    return null;
  }

  // Don't show "all good" card if user dismissed it
  if (recommendation.id === "all-good" && dismissedIds.includes("all-good")) {
    return null;
  }

  return (
    <div className={`rounded-xl border ${recommendation.borderColor} ${recommendation.bgColor} p-5`}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800/50 text-xl">
          {recommendation.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Recommended {recommendation.category === "setup" ? "Setup" : recommendation.category === "active" ? "Action" : ""}
            </span>
          </div>
          <h3 className={`mt-1 text-base font-semibold ${recommendation.iconColor.replace("text-", "text-").replace("-400", "-300")}`}>
            {recommendation.title}
          </h3>
          <p className="mt-1 text-sm text-neutral-400">
            {recommendation.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {recommendation.id !== "all-good" && (
          <>
            <button
              onClick={() => handleDismiss(recommendation.id, true)}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-400"
              title="Permanently skip this recommendation for this project"
            >
              Skip
            </button>
            <button
              onClick={() => handleDismiss(recommendation.id, false)}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
              title="Dismiss for 24 hours"
            >
              Later
            </button>
          </>
        )}
        <button
          onClick={() => handleAction(recommendation.targetSection)}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium text-white transition-colors ${
            recommendation.iconColor.replace("text-", "bg-").replace("-400", "-600")
          } hover:${recommendation.iconColor.replace("text-", "bg-").replace("-400", "-500")}`}
          style={{
            backgroundColor: recommendation.iconColor.includes("amber") ? "rgb(217 119 6)" :
                           recommendation.iconColor.includes("purple") ? "rgb(147 51 234)" :
                           recommendation.iconColor.includes("blue") ? "rgb(37 99 235)" :
                           recommendation.iconColor.includes("cyan") ? "rgb(8 145 178)" :
                           recommendation.iconColor.includes("yellow") ? "rgb(202 138 4)" :
                           recommendation.iconColor.includes("green") ? "rgb(22 163 74)" :
                           recommendation.iconColor.includes("orange") ? "rgb(234 88 12)" :
                           recommendation.iconColor.includes("pink") ? "rgb(219 39 119)" :
                           recommendation.iconColor.includes("indigo") ? "rgb(79 70 229)" :
                           recommendation.iconColor.includes("red") ? "rgb(220 38 38)" :
                           recommendation.iconColor.includes("violet") ? "rgb(124 58 237)" :
                           recommendation.iconColor.includes("emerald") ? "rgb(5 150 105)" :
                           "rgb(59 130 246)"
          }}
        >
          {recommendation.actionLabel}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
