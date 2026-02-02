/**
 * @module components/modules/ProjectKickstart
 * @description Form component for generating Claude Code kickstart prompts for new/empty projects
 *
 * PURPOSE:
 * - Collect information about a new project (purpose, users, features, tech stack)
 * - Use AI to infer optimal tech stack when user selections are incomplete
 * - Show a review step with suggestions before generation
 * - Generate a comprehensive CLAUDE.md-style prompt using AI
 * - Display generated prompt with copy functionality
 * - Create and save an initial CLAUDE.md file based on project details
 *
 * DEPENDENCIES:
 * - @/lib/tauri - generateKickstartPrompt, generateKickstartClaudeMd, inferTechStack for AI generation
 * - @/types/kickstart - KickstartInput, InferredStack types
 * - @/types/project - LANGUAGES, FRAMEWORKS, DATABASES, STYLING_OPTIONS for dropdowns
 * - @/stores/projectStore - Active project for context
 *
 * EXPORTS:
 * - ProjectKickstart - Kickstart form component
 *
 * PATTERNS:
 * - Three-step flow: Form -> Review (if needed) -> Result
 * - AI inference called when framework, database, or styling are missing
 * - Review step shows user selections vs AI suggestions
 * - Accept All applies all suggestions, Keep Mine skips suggestions
 *
 * CLAUDE NOTES:
 * - This component is shown in ModulesView when the project has no source files
 * - Key features uses a dynamic list with add/remove functionality
 * - Tech stack dropdowns are filtered by selected language (for frameworks)
 * - Token estimate is shown with the generated prompt
 * - "Create CLAUDE.md" button generates and auto-saves a CLAUDE.md file to the project
 * - onClaudeMdCreated callback notifies parent when CLAUDE.md is created
 */

import { useState, useMemo, useCallback } from "react";
import { generateKickstartPrompt, generateKickstartClaudeMd, inferTechStack } from "@/lib/tauri";
import type { KickstartInput, InferredStack } from "@/types/kickstart";
import {
  LANGUAGES,
  FRAMEWORKS,
  DATABASES,
  STYLING_OPTIONS,
} from "@/types/project";
import { useProjectStore } from "@/stores/projectStore";

// All frameworks flattened for matching (used when no language selected in review)
const ALL_FRAMEWORKS = Object.values(FRAMEWORKS).flat();

interface ProjectKickstartProps {
  onClaudeMdCreated?: () => void;
  onNavigate?: (section: string) => void;
}

type Step = "form" | "review" | "result";

export function ProjectKickstart({ onClaudeMdCreated, onNavigate }: ProjectKickstartProps) {
  const activeProject = useProjectStore((s) => s.activeProject);

  // Current step
  const [step, setStep] = useState<Step>("form");

  // Form state
  const [appPurpose, setAppPurpose] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [keyFeatures, setKeyFeatures] = useState<string[]>([""]);
  const [language, setLanguage] = useState("");
  const [framework, setFramework] = useState("");
  const [database, setDatabase] = useState("");
  const [styling, setStyling] = useState("");
  const [constraints, setConstraints] = useState("");

  // Review state
  const [inferring, setInferring] = useState(false);
  const [inferredStack, setInferredStack] = useState<InferredStack | null>(null);
  const [reviewedLanguage, setReviewedLanguage] = useState<string>("");
  const [reviewedFramework, setReviewedFramework] = useState<string>("");
  const [reviewedDatabase, setReviewedDatabase] = useState<string>("");
  const [reviewedStyling, setReviewedStyling] = useState<string>("");
  const [additionalTech, setAdditionalTech] = useState<string>("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [creatingClaudeMd, setCreatingClaudeMd] = useState(false);
  const [claudeMdCreated, setClaudeMdCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

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

  // Validation - language is optional since AI will suggest it
  const isValid = useMemo(() => {
    return (
      appPurpose.trim().length > 0 &&
      targetUsers.trim().length > 0 &&
      keyFeatures.some((f) => f.trim().length > 0)
    );
  }, [appPurpose, targetUsers, keyFeatures]);

  // Check if stack is incomplete (missing optional but recommended fields)
  const isStackIncomplete = useMemo(() => {
    return !language || !framework || !database || !styling;
  }, [language, framework, database, styling]);

  // Handle next step from form
  const handleNextFromForm = useCallback(async () => {
    if (!isValid) return;

    // If stack is complete, skip review and go straight to generation
    if (!isStackIncomplete) {
      await handleGenerate();
      return;
    }

    // Infer tech stack suggestions
    setInferring(true);
    setError(null);

    try {
      const result = await inferTechStack({
        appPurpose: appPurpose.trim(),
        targetUsers: targetUsers.trim(),
        keyFeatures: keyFeatures.filter((f) => f.trim().length > 0),
        constraints: constraints.trim() || undefined,
        currentLanguage: language || undefined,
        currentFramework: framework || undefined,
        currentDatabase: database || undefined,
        currentStyling: styling || undefined,
      });

      setInferredStack(result);

      // Pre-fill reviewed values with current selections or suggestions
      setReviewedLanguage(language || result.language?.value || "");
      setReviewedFramework(framework || result.framework?.value || "");
      setReviewedDatabase(database || result.database?.value || "");
      setReviewedStyling(styling || result.styling?.value || "");

      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze project");
    } finally {
      setInferring(false);
    }
  }, [isValid, isStackIncomplete, appPurpose, targetUsers, keyFeatures, constraints, language, framework, database, styling]);

  // Regenerate stack suggestions with different approach
  const handleRegenerate = useCallback(async () => {
    setInferring(true);
    setError(null);

    try {
      // Build hint to get different suggestions, filtering out empty values
      const currentStack = [reviewedLanguage, reviewedFramework, reviewedDatabase, reviewedStyling]
        .filter(Boolean)
        .join(", ");
      const alternativeHint = currentStack
        ? `Please suggest alternative technologies than: ${currentStack}`
        : undefined;
      const fullConstraints = [constraints.trim(), alternativeHint]
        .filter(Boolean)
        .join(". ");

      const result = await inferTechStack({
        appPurpose: appPurpose.trim(),
        targetUsers: targetUsers.trim(),
        keyFeatures: keyFeatures.filter((f) => f.trim().length > 0),
        constraints: fullConstraints || undefined,
        // Don't pass current selections to get fresh suggestions
        currentLanguage: undefined,
        currentFramework: undefined,
        currentDatabase: undefined,
        currentStyling: undefined,
      });

      setInferredStack(result);
      setReviewedLanguage(result.language?.value || "");
      setReviewedFramework(result.framework?.value || "");
      setReviewedDatabase(result.database?.value || "");
      setReviewedStyling(result.styling?.value || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate stack");
    } finally {
      setInferring(false);
    }
  }, [appPurpose, targetUsers, keyFeatures, constraints, reviewedLanguage, reviewedFramework, reviewedDatabase, reviewedStyling]);

  // Generate kickstart prompt
  const handleGenerate = useCallback(async () => {
    if (!isValid) return;

    setGenerating(true);
    setError(null);
    setGeneratedPrompt(null);

    // Use reviewed values if in review step, otherwise use form values
    const finalLanguage = step === "review" ? reviewedLanguage : language;
    const finalFramework = step === "review" ? reviewedFramework : framework;
    const finalDatabase = step === "review" ? reviewedDatabase : database;
    const finalStyling = step === "review" ? reviewedStyling : styling;

    // Build constraints including additional tech and AI recommendations
    const fullConstraints = [
      constraints.trim(),
      additionalTech.trim() ? `Additional technologies to include: ${additionalTech.trim()}` : "",
      inferredStack?.warnings?.length ? `Recommendations: ${inferredStack.warnings.join(". ")}` : "",
    ].filter(Boolean).join("\n\n") || undefined;

    const input: KickstartInput = {
      appPurpose: appPurpose.trim(),
      targetUsers: targetUsers.trim(),
      keyFeatures: keyFeatures.filter((f) => f.trim().length > 0),
      techPreferences: {
        language: finalLanguage || null,
        framework: finalFramework || null,
        database: finalDatabase || null,
        styling: finalStyling || null,
      },
      constraints: fullConstraints,
    };

    try {
      const result = await generateKickstartPrompt(input);
      setGeneratedPrompt(result.fullPrompt);
      setTokenEstimate(result.tokenEstimate);
      setStep("result");

      // Automatically create CLAUDE.md if there's an active project
      if (activeProject) {
        setCreatingClaudeMd(true);
        try {
          await generateKickstartClaudeMd(input, activeProject.path);
          setClaudeMdCreated(true);
          onClaudeMdCreated?.();
        } catch (claudeErr) {
          // Don't fail the whole operation, just note the CLAUDE.md creation failed
          console.error("Failed to create CLAUDE.md:", claudeErr);
        } finally {
          setCreatingClaudeMd(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prompt");
    } finally {
      setGenerating(false);
    }
  }, [isValid, step, appPurpose, targetUsers, keyFeatures, language, framework, database, styling, reviewedLanguage, reviewedFramework, reviewedDatabase, reviewedStyling, constraints, activeProject, onClaudeMdCreated]);

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

      {/* Step: Result */}
      {step === "result" && generatedPrompt ? (
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
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isEditingPrompt
                    ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-500"
                    : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-700"
                }`}
              >
                {isEditingPrompt ? "Done" : "Edit"}
              </button>
              <button
                onClick={() => {
                  setStep("form");
                  setGeneratedPrompt(null);
                  setIsEditingPrompt(false);
                }}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* Generated Content */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950">
            {isEditingPrompt ? (
              <textarea
                value={generatedPrompt || ""}
                onChange={(e) => {
                  setGeneratedPrompt(e.target.value);
                  setTokenEstimate(Math.round(e.target.value.length / 4));
                }}
                className="h-[400px] w-full resize-none rounded-xl bg-transparent p-6 font-mono text-sm text-neutral-300 focus:outline-none"
              />
            ) : (
              <div className="max-h-[400px] overflow-auto p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-300">
                  {generatedPrompt}
                </pre>
              </div>
            )}
          </div>

          {/* CLAUDE.md Status */}
          {creatingClaudeMd ? (
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-950/20 px-4 py-3">
              <svg className="h-5 w-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-blue-300">Creating CLAUDE.md...</span>
            </div>
          ) : claudeMdCreated ? (
            <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-green-300">Project Kickstart Complete!</span>
                    <p className="text-xs text-green-400/70">CLAUDE.md has been created and saved to your project.</p>
                  </div>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("dashboard")}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
                  >
                    Go to Dashboard
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : step === "review" && inferredStack ? (
        /* Step: Review - Layered Tech Stack */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">Suggested Tech Stack</h3>
              <p className="text-sm text-neutral-400">Review and customize your stack, then generate your CLAUDE.md</p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={inferring}
              className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
            >
              {inferring ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Regenerate
            </button>
          </div>

          {/* Core Layer */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-transparent p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/20">
                <svg className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-purple-300">Core</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Language</label>
                <select
                  value={reviewedLanguage}
                  onChange={(e) => setReviewedLanguage(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/30 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select...</option>
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                {inferredStack.language?.reason && reviewedLanguage === inferredStack.language.value && (
                  <p className="mt-1 text-xs text-neutral-500">{inferredStack.language.reason}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Framework</label>
                <select
                  value={reviewedFramework}
                  onChange={(e) => setReviewedFramework(e.target.value)}
                  className="w-full rounded-lg border border-purple-500/30 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">None</option>
                  {(reviewedLanguage ? FRAMEWORKS[reviewedLanguage] || [] : ALL_FRAMEWORKS).map((fw) => (
                    <option key={fw} value={fw}>{fw}</option>
                  ))}
                </select>
                {inferredStack.framework?.reason && reviewedFramework === inferredStack.framework.value && (
                  <p className="mt-1 text-xs text-neutral-500">{inferredStack.framework.reason}</p>
                )}
              </div>
            </div>
          </div>

          {/* Data Layer */}
          <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 to-transparent p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/20">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-blue-300">Data</span>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Database</label>
              <select
                value={reviewedDatabase}
                onChange={(e) => setReviewedDatabase(e.target.value)}
                className="w-full rounded-lg border border-blue-500/30 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">None</option>
                {DATABASES.map((db) => (
                  <option key={db} value={db}>{db}</option>
                ))}
              </select>
              {inferredStack.database?.reason && reviewedDatabase === inferredStack.database.value && (
                <p className="mt-1 text-xs text-neutral-500">{inferredStack.database.reason}</p>
              )}
            </div>
          </div>

          {/* UI Layer */}
          <div className="rounded-xl border border-green-500/30 bg-gradient-to-br from-green-950/20 to-transparent p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-green-500/20">
                <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <span className="text-sm font-medium text-green-300">UI</span>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Styling</label>
              <select
                value={reviewedStyling}
                onChange={(e) => setReviewedStyling(e.target.value)}
                className="w-full rounded-lg border border-green-500/30 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-green-500 focus:outline-none"
              >
                <option value="">None</option>
                {STYLING_OPTIONS.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
              {inferredStack.styling?.reason && reviewedStyling === inferredStack.styling.value && (
                <p className="mt-1 text-xs text-neutral-500">{inferredStack.styling.reason}</p>
              )}
            </div>
          </div>

          {/* Additional Technologies */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-neutral-700">
                <svg className="h-3.5 w-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-neutral-300">Additional Technologies</span>
            </div>

            {/* AI Recommendations */}
            {inferredStack.warnings.length > 0 && (
              <div className="mb-3 rounded-lg bg-neutral-800/50 px-3 py-2">
                <p className="mb-1.5 text-xs font-medium text-neutral-400">AI Recommendations:</p>
                <ul className="space-y-1.5">
                  {inferredStack.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <span className="text-xs text-neutral-500">• {warning}</span>
                      <button
                        onClick={() => {
                          const newTech = additionalTech.trim()
                            ? `${additionalTech.trim()}, ${warning}`
                            : warning;
                          setAdditionalTech(newTech);
                        }}
                        className="flex-shrink-0 rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 transition-colors hover:bg-neutral-600"
                      >
                        + Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-neutral-500">Add more (e.g., Redis, Docker, Auth0, WebSockets...)</label>
              <input
                type="text"
                value={additionalTech}
                onChange={(e) => setAdditionalTech(e.target.value)}
                placeholder="Redis, Docker, AWS S3..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-600">These will be included in your generated CLAUDE.md</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep("form")}
              className="text-sm text-neutral-400 hover:text-neutral-300"
            >
              ← Back to form
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Accept & Generate
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Step: Form */
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
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-medium uppercase tracking-wider text-neutral-400">
                Tech Stack
              </h4>
              {isStackIncomplete && (
                <span className="text-xs text-purple-400">
                  Missing selections will be suggested by AI
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                  Language
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
              onClick={handleNextFromForm}
              disabled={!isValid || inferring || generating}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inferring ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : generating ? (
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
                  {isStackIncomplete ? "Review & Generate" : "Generate Kickstart Prompt"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
