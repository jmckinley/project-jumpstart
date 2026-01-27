/**
 * @module hooks/useOnboarding
 * @description Custom hook for onboarding wizard operations
 *
 * PURPOSE:
 * - Manage onboarding wizard step progression
 * - Expose all wizard state (project info, tech stack, goals, flags)
 * - Provide convenience actions for step navigation
 * - Bridge between onboarding store and Tauri backend
 *
 * DEPENDENCIES:
 * - @/stores/onboardingStore - Onboarding state
 * - @/lib/tauri - Backend IPC calls (pickFolder, scanProject, saveProject)
 *
 * EXPORTS:
 * - useOnboarding - Hook returning full onboarding state and actions
 *
 * PATTERNS:
 * - Returns all onboarding state plus convenience methods (nextStep, prevStep)
 * - Components can use this hook or access useOnboardingStore directly
 * - nextStep() / prevStep() clamp to valid step range (1-4)
 *
 * CLAUDE NOTES:
 * - Onboarding has two paths: existing project (auto-detect) and new project (manual)
 * - Steps: 1=ProjectSelect, 2=AnalysisResults, 3=GoalsSelect, 4=ReviewGenerate
 * - applyDetection() populates editable fields from scan results
 * - Most onboarding components access the store directly for fine-grained selectors
 */

import { useOnboardingStore } from "@/stores/onboardingStore";

export function useOnboarding() {
  const step = useOnboardingStore((s) => s.step);
  const projectPath = useOnboardingStore((s) => s.projectPath);
  const isExistingProject = useOnboardingStore((s) => s.isExistingProject);
  const detectionResult = useOnboardingStore((s) => s.detectionResult);
  const scanning = useOnboardingStore((s) => s.scanning);
  const generating = useOnboardingStore((s) => s.generating);
  const projectName = useOnboardingStore((s) => s.projectName);
  const projectDescription = useOnboardingStore((s) => s.projectDescription);
  const projectType = useOnboardingStore((s) => s.projectType);
  const language = useOnboardingStore((s) => s.language);
  const framework = useOnboardingStore((s) => s.framework);
  const database = useOnboardingStore((s) => s.database);
  const testing = useOnboardingStore((s) => s.testing);
  const styling = useOnboardingStore((s) => s.styling);
  const goals = useOnboardingStore((s) => s.goals);
  const generateModuleDocs = useOnboardingStore((s) => s.generateModuleDocs);
  const setupEnforcement = useOnboardingStore((s) => s.setupEnforcement);

  const setStep = useOnboardingStore((s) => s.setStep);
  const reset = useOnboardingStore((s) => s.reset);

  const nextStep = () => setStep(Math.min(4, step + 1));
  const prevStep = () => setStep(Math.max(1, step - 1));

  return {
    // State
    step,
    projectPath,
    isExistingProject,
    detectionResult,
    scanning,
    generating,
    projectName,
    projectDescription,
    projectType,
    language,
    framework,
    database,
    testing,
    styling,
    goals,
    generateModuleDocs,
    setupEnforcement,

    // Actions
    nextStep,
    prevStep,
    reset,
  };
}
