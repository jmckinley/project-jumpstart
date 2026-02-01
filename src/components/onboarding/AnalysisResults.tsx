/**
 * @module components/onboarding/AnalysisResults
 * @description Step 2 of onboarding wizard - shows detection results with editable fields
 *
 * PURPOSE:
 * - Display auto-detected project values (language, framework, database, testing, styling)
 * - Allow the user to override any detected value via dropdown selects
 * - Show confidence badges for auto-detected values
 * - Collect project name, description, and type
 * - Filter framework options based on the currently selected language
 * - Provide stack templates for quick project setup
 * - Collect additional services (auth, hosting, payments, monitoring, email)
 *
 * DEPENDENCIES:
 * - @/stores/onboardingStore - useOnboardingStore for wizard state and detection results
 * - @/types/project - LANGUAGES, FRAMEWORKS, DATABASES, TESTING_FRAMEWORKS, STYLING_OPTIONS,
 *                      PROJECT_TYPES, AUTH_OPTIONS, HOSTING_OPTIONS, PAYMENTS_OPTIONS,
 *                      MONITORING_OPTIONS, EMAIL_OPTIONS, StackExtras constants for dropdown options
 * - @/data/stackTemplates - STACK_TEMPLATES for template picker
 * - lucide-react - Icons for template cards
 *
 * EXPORTS:
 * - AnalysisResults - Step 2 wizard component
 *
 * PATTERNS:
 * - Each detected field is a row: Label | Select dropdown | Confidence badge
 * - Framework dropdown options are filtered by the selected language
 * - All values read from and write to useOnboardingStore
 * - Confidence badge shows "Auto-detected (XX%)" when a detection result exists
 * - Stack templates shown prominently above tech stack (expanded by default for new projects)
 * - Additional services are shown in a separate section below tech stack
 *
 * CLAUDE NOTES:
 * - FRAMEWORKS is a Record<string, string[]> keyed by language name
 * - TESTING_FRAMEWORKS is also keyed by language, but not all languages have entries
 * - When language changes, reset framework if current framework is not in new language's list
 * - DetectedValue has { value, confidence (0-1), source } - multiply confidence by 100 for display
 * - Database, testing, styling can be null (user may not select one)
 * - Stack templates apply all fields including stackExtras via applyTemplate
 * - Additional services (stackExtras) are all optional
 */

import { useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  LANGUAGES,
  FRAMEWORKS,
  DATABASES,
  TESTING_FRAMEWORKS,
  STYLING_OPTIONS,
  PROJECT_TYPES,
  AUTH_OPTIONS,
  HOSTING_OPTIONS,
  PAYMENTS_OPTIONS,
  MONITORING_OPTIONS,
  EMAIL_OPTIONS,
  type StackExtras,
} from "@/types/project";
import { STACK_TEMPLATES, type StackTemplate } from "@/data/stackTemplates";
import {
  Building2,
  Server,
  Rocket,
  Smartphone,
  Sparkles,
  Radio,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  FileText,
  Store,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  Building2,
  Server,
  Rocket,
  Smartphone,
  Sparkles,
  Radio,
  ShoppingCart,
  LayoutDashboard,
  BarChart3,
  FileText,
  Store,
  Terminal,
};

function getTemplateIcon(iconName: string) {
  return TEMPLATE_ICONS[iconName] || Sparkles;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Auto-detected ({percent}%)
    </span>
  );
}

export function AnalysisResults() {
  // Show templates expanded by default if no detection results (new/empty project)
  const detectionResult = useOnboardingStore((s) => s.detectionResult);
  const isNewProject = !detectionResult?.language && !detectionResult?.framework;
  const [templatesExpanded, setTemplatesExpanded] = useState(isNewProject);

  const projectName = useOnboardingStore((s) => s.projectName);
  const projectDescription = useOnboardingStore((s) => s.projectDescription);
  const projectType = useOnboardingStore((s) => s.projectType);
  const language = useOnboardingStore((s) => s.language);
  const framework = useOnboardingStore((s) => s.framework);
  const database = useOnboardingStore((s) => s.database);
  const testing = useOnboardingStore((s) => s.testing);
  const styling = useOnboardingStore((s) => s.styling);
  const stackExtras = useOnboardingStore((s) => s.stackExtras);

  const setProjectName = useOnboardingStore((s) => s.setProjectName);
  const setProjectDescription = useOnboardingStore(
    (s) => s.setProjectDescription
  );
  const setProjectType = useOnboardingStore((s) => s.setProjectType);
  const setLanguage = useOnboardingStore((s) => s.setLanguage);
  const setFramework = useOnboardingStore((s) => s.setFramework);
  const setDatabase = useOnboardingStore((s) => s.setDatabase);
  const setTesting = useOnboardingStore((s) => s.setTesting);
  const setStyling = useOnboardingStore((s) => s.setStyling);
  const setStackExtras = useOnboardingStore((s) => s.setStackExtras);
  const applyTemplate = useOnboardingStore((s) => s.applyTemplate);

  const frameworkOptions = language ? FRAMEWORKS[language] ?? [] : [];
  const testingOptions = language ? TESTING_FRAMEWORKS[language] ?? [] : [];

  const updateExtra = (key: keyof StackExtras, value: string | null) => {
    setStackExtras({
      ...(stackExtras || {}),
      [key]: value || undefined,
    });
  };

  const handleApplyTemplate = (template: StackTemplate) => {
    applyTemplate(template);
    setTemplatesExpanded(false);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    // Reset framework if it's not valid for the new language
    const newFrameworks = FRAMEWORKS[newLang] ?? [];
    if (framework && !newFrameworks.includes(framework)) {
      setFramework(null);
    }
    // Reset testing if it's not valid for the new language
    const newTesting = TESTING_FRAMEWORKS[newLang] ?? [];
    if (testing && !newTesting.includes(testing)) {
      setTesting(null);
    }
  };

  const selectClasses =
    "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const inputClasses =
    "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClasses = "text-sm font-medium text-neutral-300";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-1 text-xl font-semibold text-neutral-100">
        Project Analysis
      </h2>
      <p className="mb-6 text-sm text-neutral-400">
        We detected the following about your project. You can adjust any values
        below.
      </p>

      {/* Project Info Section */}
      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Project Info
        </h3>
        <div className="flex flex-col gap-4">
          {/* Project Name */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses}>Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Project"
              className={inputClasses}
            />
          </div>

          {/* Project Description */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses}>Project Description</label>
            <input
              type="text"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="A brief description of your project"
              className={inputClasses}
            />
          </div>

          {/* Project Type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses}>Project Type</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className={selectClasses}
            >
              <option value="">Select type...</option>
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stack Templates Section - Prominent for new projects */}
      <div className={`mb-6 rounded-lg border p-5 ${isNewProject ? 'border-blue-500/50 bg-blue-950/20' : 'border-neutral-800 bg-neutral-900'}`}>
        <button
          onClick={() => setTemplatesExpanded(!templatesExpanded)}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className={`rounded-lg p-2 ${isNewProject ? 'bg-blue-500/20' : 'bg-neutral-800'}`}>
            <Sparkles className={`h-5 w-5 ${isNewProject ? 'text-blue-400' : 'text-neutral-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${isNewProject ? 'text-blue-300' : 'text-neutral-300'}`}>
              {isNewProject ? 'Quick Start Templates' : 'Use a Template'}
            </h3>
            <p className="text-xs text-neutral-500">
              {isNewProject
                ? '12 pre-configured stacks for common project types — saves setup time'
                : 'Override current settings with a pre-configured stack'}
            </p>
          </div>
          {templatesExpanded ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </button>

        {templatesExpanded && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {STACK_TEMPLATES.map((template) => {
              const Icon = getTemplateIcon(template.icon);
              return (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template)}
                  className="flex items-start gap-3 rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 text-left transition-colors hover:border-blue-500/50 hover:bg-neutral-800"
                >
                  <div className="rounded-md bg-neutral-700 p-2">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-neutral-200">{template.name}</div>
                    <div className="truncate text-xs text-neutral-500">{template.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tech Stack Section */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Tech Stack
        </h3>
        <div className="flex flex-col gap-4">
          {/* Language */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Language</label>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className={selectClasses}
            >
              <option value="">Select language...</option>
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <div className="w-44 shrink-0">
              {detectionResult?.language && (
                <ConfidenceBadge
                  confidence={detectionResult.language.confidence}
                />
              )}
            </div>
          </div>

          {/* Framework */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Framework</label>
            <select
              value={framework ?? ""}
              onChange={(e) =>
                setFramework(e.target.value || null)
              }
              className={selectClasses}
              disabled={frameworkOptions.length === 0}
            >
              <option value="">None</option>
              {frameworkOptions.map((fw) => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
            <div className="w-44 shrink-0">
              {detectionResult?.framework && (
                <ConfidenceBadge
                  confidence={detectionResult.framework.confidence}
                />
              )}
            </div>
          </div>

          {/* Database */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Database</label>
            <select
              value={database ?? ""}
              onChange={(e) =>
                setDatabase(e.target.value || null)
              }
              className={selectClasses}
            >
              <option value="">None</option>
              {DATABASES.map((db) => (
                <option key={db} value={db}>
                  {db}
                </option>
              ))}
            </select>
            <div className="w-44 shrink-0">
              {detectionResult?.database && (
                <ConfidenceBadge
                  confidence={detectionResult.database.confidence}
                />
              )}
            </div>
          </div>

          {/* Testing */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Testing</label>
            <select
              value={testing ?? ""}
              onChange={(e) =>
                setTesting(e.target.value || null)
              }
              className={selectClasses}
              disabled={testingOptions.length === 0}
            >
              <option value="">None</option>
              {testingOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="w-44 shrink-0">
              {detectionResult?.testing && (
                <ConfidenceBadge
                  confidence={detectionResult.testing.confidence}
                />
              )}
            </div>
          </div>

          {/* Styling */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Styling</label>
            <select
              value={styling ?? ""}
              onChange={(e) =>
                setStyling(e.target.value || null)
              }
              className={selectClasses}
            >
              <option value="">None</option>
              {STYLING_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="w-44 shrink-0">
              {detectionResult?.styling && (
                <ConfidenceBadge
                  confidence={detectionResult.styling.confidence}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Services Section */}
      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Additional Services (Optional)
        </h3>
        <div className="flex flex-col gap-4">
          {/* Authentication */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>
              Authentication
            </label>
            <select
              value={stackExtras?.auth ?? ""}
              onChange={(e) => updateExtra("auth", e.target.value || null)}
              className={selectClasses}
            >
              <option value="">None</option>
              {AUTH_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Hosting */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Hosting</label>
            <select
              value={stackExtras?.hosting ?? ""}
              onChange={(e) => updateExtra("hosting", e.target.value || null)}
              className={selectClasses}
            >
              <option value="">None</option>
              {HOSTING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Payments */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Payments</label>
            <select
              value={stackExtras?.payments ?? ""}
              onChange={(e) => updateExtra("payments", e.target.value || null)}
              className={selectClasses}
            >
              <option value="">None</option>
              {PAYMENTS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Monitoring */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Monitoring</label>
            <select
              value={stackExtras?.monitoring ?? ""}
              onChange={(e) => updateExtra("monitoring", e.target.value || null)}
              className={selectClasses}
            >
              <option value="">None</option>
              {MONITORING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4">
            <label className={`w-28 shrink-0 ${labelClasses}`}>Email</label>
            <select
              value={stackExtras?.email ?? ""}
              onChange={(e) => updateExtra("email", e.target.value || null)}
              className={selectClasses}
            >
              <option value="">None</option>
              {EMAIL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
