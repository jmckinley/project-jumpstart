/**
 * @module components/onboarding/WizardShell
 * @description Container for the entire onboarding wizard with step indicator and navigation
 *
 * PURPOSE:
 * - Render step indicator showing progress through steps 1-4
 * - Display the active step component based on current step
 * - Provide Back/Next navigation buttons at the bottom
 * - Orchestrate the overall onboarding flow
 *
 * DEPENDENCIES:
 * - @/stores/onboardingStore - useOnboardingStore for wizard state (step, projectPath, projectName)
 * - @/components/onboarding/ProjectSelect - Step 1 component
 * - @/components/onboarding/AnalysisResults - Step 2 component
 * - @/components/onboarding/GoalsSelect - Step 3 component
 * - @/components/onboarding/ReviewGenerate - Step 4 component
 *
 * EXPORTS:
 * - WizardShell - Main wizard container component
 *
 * PATTERNS:
 * - Reads all state from useOnboardingStore (no props)
 * - Step indicator highlights completed and current steps
 * - Back button disabled on step 1, Next button disabled when step is incomplete
 * - Step 4 hides Next button (ReviewGenerate has its own "Create Project" button)
 *
 * CLAUDE NOTES:
 * - Steps: 1=ProjectSelect, 2=AnalysisResults, 3=GoalsSelect, 4=ReviewGenerate
 * - Back/Next buttons are hidden on steps that manage their own navigation (step 1 auto-advances)
 * - The onComplete callback should be passed through to ReviewGenerate
 * - Step validation: step 1 needs projectPath, step 2 needs language+projectName, step 3 always valid
 */

import { useOnboardingStore } from "@/stores/onboardingStore";
import { ProjectSelect } from "@/components/onboarding/ProjectSelect";
import { AnalysisResults } from "@/components/onboarding/AnalysisResults";
import { GoalsSelect } from "@/components/onboarding/GoalsSelect";
import { ReviewGenerate } from "@/components/onboarding/ReviewGenerate";
import type { Project } from "@/types/project";

const STEPS = [
  { number: 1, label: "Select Project" },
  { number: 2, label: "Analysis" },
  { number: 3, label: "Goals" },
  { number: 4, label: "Review" },
];

interface WizardShellProps {
  onComplete: (project: Project) => void;
}

export function WizardShell({ onComplete }: WizardShellProps) {
  const step = useOnboardingStore((s) => s.step);
  const setStep = useOnboardingStore((s) => s.setStep);
  const projectPath = useOnboardingStore((s) => s.projectPath);
  const projectName = useOnboardingStore((s) => s.projectName);
  const language = useOnboardingStore((s) => s.language);
  const scanning = useOnboardingStore((s) => s.scanning);

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return !!projectPath && !scanning;
      case 2:
        return !!language && !!projectName;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleNext = () => {
    if (step < 4 && canGoNext()) {
      setStep(step + 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <ProjectSelect />;
      case 2:
        return <AnalysisResults />;
      case 3:
        return <GoalsSelect />;
      case 4:
        return <ReviewGenerate onComplete={onComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col bg-neutral-950">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 border-b border-neutral-800 px-6 py-4">
        {STEPS.map((s, index) => (
          <div key={s.number} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  step > s.number
                    ? "bg-blue-600 text-white"
                    : step === s.number
                      ? "border-2 border-blue-500 bg-blue-600/20 text-blue-400"
                      : "border border-neutral-700 bg-neutral-800 text-neutral-500"
                }`}
              >
                {step > s.number ? (
                  <svg
                    className="h-4 w-4"
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
                ) : (
                  s.number
                )}
              </div>
              <span
                className={`text-sm ${
                  step >= s.number ? "text-neutral-100" : "text-neutral-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-3 h-px w-12 ${
                  step > s.number ? "bg-blue-600" : "bg-neutral-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Active Step Content */}
      <div className="flex-1 overflow-y-auto">{renderStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-neutral-800 px-6 py-4">
        <button
          onClick={handleBack}
          disabled={step <= 1}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            step <= 1
              ? "cursor-not-allowed text-neutral-600"
              : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          }`}
        >
          Back
        </button>

        {step < 4 && (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
              canGoNext()
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "cursor-not-allowed bg-neutral-800 text-neutral-500"
            }`}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
