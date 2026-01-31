/**
 * @module components/modules/ProjectKickstart
 * @description Form component for generating Claude Code kickstart prompts for new/empty projects
 *
 * PURPOSE:
 * - Collect information about a new project (purpose, users, features, tech stack)
 * - Generate a comprehensive CLAUDE.md-style prompt using AI
 * - Display generated prompt with copy functionality
 * - Create and save an initial CLAUDE.md file based on project details
 *
 * DEPENDENCIES:
 * - @/lib/tauri - generateKickstartPrompt, generateKickstartClaudeMd for AI generation
 * - @/types/kickstart - KickstartInput type
 * - @/types/project - LANGUAGES, FRAMEWORKS, DATABASES, STYLING_OPTIONS for dropdowns
 * - @/stores/projectStore - Active project for context
 *
 * EXPORTS:
 * - ProjectKickstart - Kickstart form component
 *
 * PATTERNS:
 * - Accordion-style sections for App Basics, Features, Tech Stack
 * - Generate button triggers AI call
 * - Result displayed in scrollable container with copy button
 * - Uses same tech options as onboarding flow
 *
 * CLAUDE NOTES:
 * - This component is shown in ModulesView when the project has no source files
 * - Key features uses a dynamic list with add/remove functionality
 * - Tech stack dropdowns are filtered by selected language (for frameworks)
 * - Token estimate is shown with the generated prompt
 * - "Create CLAUDE.md" button generates and auto-saves a CLAUDE.md file to the project
 * - The kickstart prompt and CLAUDE.md are different: prompt is for bootstrapping, CLAUDE.md is documentation
 */

import { useState, useMemo, useCallback } from "react";
import { generateKickstartPrompt, generateKickstartClaudeMd } from "@/lib/tauri";
import type { KickstartInput } from "@/types/kickstart";
import {
  LANGUAGES,
  FRAMEWORKS,
  DATABASES,
  STYLING_OPTIONS,
} from "@/types/project";
import { useProjectStore } from "@/stores/projectStore";

export function ProjectKickstart() {
  const activeProject = useProjectStore((s) => s.activeProject);

  // Form state
  const [appPurpose, setAppPurpose] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [keyFeatures, setKeyFeatures] = useState<string[]>([""]);
  const [language, setLanguage] = useState("");
  const [framework, setFramework] = useState("");
  const [database, setDatabase] = useState("");
  const [styling, setStyling] = useState("");
  const [constraints, setConstraints] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [creatingClaudeMd, setCreatingClaudeMd] = useState(false);
  const [claudeMdCreated, setClaudeMdCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Available frameworks based on selected language
  const availableFrameworks = useMemo(() => {
    if (!language) return [];
    return FRAMEWORKS[language] || [];
  }, [language]);

  // Handle language change - reset framework if it's no longer valid
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    if (!FRAMEWORKS[newLanguage]?.includes(framework)) {
      setFramework("");
    }
  };

  // Feature list management
  const addFeature = () => {
    setKeyFeatures([...keyFeatures, ""]);
  };

  const removeFeature = (index: number) => {
    if (keyFeatures.length > 1) {
      setKeyFeatures(keyFeatures.filter((_, i) => i !== index));
    }
  };

  const updateFeature = (index: number, value: string) => {
    const updated = [...keyFeatures];
    updated[index] = value;
    setKeyFeatures(updated);
  };

  // Validation
  const isValid = useMemo(() => {
    return (
      appPurpose.trim().length > 0 &&
      targetUsers.trim().length > 0 &&
      keyFeatures.some((f) => f.trim().length > 0) &&
      language.length > 0
    );
  }, [appPurpose, targetUsers, keyFeatures, language]);

  // Generate kickstart prompt
  const handleGenerate = useCallback(async () => {
    if (!isValid) return;

    setGenerating(true);
    setError(null);
    setGeneratedPrompt(null);

    const input: KickstartInput = {
      appPurpose: appPurpose.trim(),
      targetUsers: targetUsers.trim(),
      keyFeatures: keyFeatures.filter((f) => f.trim().length > 0),
      techPreferences: {
        language,
        framework: framework || null,
        database: database || null,
        styling: styling || null,
      },
      constraints: constraints.trim() || undefined,
    };

    try {
      const result = await generateKickstartPrompt(input);
      setGeneratedPrompt(result.fullPrompt);
      setTokenEstimate(result.tokenEstimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prompt");
    } finally {
      setGenerating(false);
    }
  }, [isValid, appPurpose, targetUsers, keyFeatures, language, framework, database, styling, constraints]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  // Create CLAUDE.md from kickstart input
  const handleCreateClaudeMd = useCallback(async () => {
    if (!activeProject || !isValid) return;

    setCreatingClaudeMd(true);
    setError(null);

    const input: KickstartInput = {
      appPurpose: appPurpose.trim(),
      targetUsers: targetUsers.trim(),
      keyFeatures: keyFeatures.filter((f) => f.trim().length > 0),
      techPreferences: {
        language,
        framework: framework || null,
        database: database || null,
        styling: styling || null,
      },
      constraints: constraints.trim() || undefined,
    };

    try {
      await generateKickstartClaudeMd(input, activeProject.path);
      setClaudeMdCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create CLAUDE.md");
    } finally {
      setCreatingClaudeMd(false);
    }
  }, [activeProject, isValid, appPurpose, targetUsers, keyFeatures, language, framework, database, styling, constraints]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-600">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-100">
              Project Kickstart
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {activeProject?.name
                ? `Generate a Claude Code kickstart prompt for ${activeProject.name}`
                : "Generate a Claude Code kickstart prompt for your new project"}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              This will create a comprehensive CLAUDE.md-style prompt you can use to bootstrap your project with AI assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form or Result */}
      {generatedPrompt ? (
        <div className="space-y-4">
          {/* Result Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-medium text-neutral-300">
                Generated Prompt
              </h4>
              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                ~{tokenEstimate.toLocaleString()} tokens
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
              >
                {copied ? (
                  <>
                    <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => setGeneratedPrompt(null)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Generated Content */}
          <div className="max-h-[400px] overflow-auto rounded-xl border border-neutral-800 bg-neutral-950 p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-300">
              {generatedPrompt}
            </pre>
          </div>

          {/* Create CLAUDE.md Card */}
          {claudeMdCreated ? (
            <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-green-300">CLAUDE.md Created</h4>
                  <p className="text-sm text-green-400/70">
                    Your initial CLAUDE.md has been saved to the project.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-purple-950/30 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-neutral-200">Create Initial CLAUDE.md</h4>
                    <p className="mt-1 text-sm text-neutral-400">
                      Generate and save an initial CLAUDE.md file based on your project details.
                      This gives Claude Code essential context about your project.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCreateClaudeMd}
                  disabled={creatingClaudeMd}
                  className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingClaudeMd ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Create CLAUDE.md
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* App Basics Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
              App Basics
            </h4>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  What does your app do? <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={appPurpose}
                  onChange={(e) => setAppPurpose(e.target.value)}
                  placeholder="A task management app that helps teams collaborate on projects..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Who are the target users? <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={targetUsers}
                  onChange={(e) => setTargetUsers(e.target.value)}
                  placeholder="Small to medium development teams, project managers..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
              Key Features
            </h4>
            <div className="space-y-3">
              {keyFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder={`Feature ${index + 1}...`}
                    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {keyFeatures.length > 1 && (
                    <button
                      onClick={() => removeFeature(index)}
                      className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-red-400"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addFeature}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add another feature
              </button>
            </div>
          </div>

          {/* Tech Stack Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
              Tech Stack
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Language <span className="text-red-400">*</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-100 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select language...</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Framework
                </label>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  disabled={!language || availableFrameworks.length === 0}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-100 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {!language
                      ? "Select language first..."
                      : availableFrameworks.length === 0
                        ? "None available"
                        : "Select framework..."}
                  </option>
                  {availableFrameworks.map((fw) => (
                    <option key={fw} value={fw}>
                      {fw}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Database
                </label>
                <select
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-100 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">None / Not decided</option>
                  {DATABASES.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Styling
                </label>
                <select
                  value={styling}
                  onChange={(e) => setStyling(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-100 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">None / Not decided</option>
                  {STYLING_OPTIONS.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Constraints Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-400">
              Constraints (Optional)
            </h4>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Any specific requirements, limitations, or constraints for the project..."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!isValid || generating}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate Kickstart Prompt
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
