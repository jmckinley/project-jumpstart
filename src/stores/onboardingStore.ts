/**
 * @module stores/onboardingStore
 * @description Zustand store for the onboarding wizard state
 *
 * PURPOSE:
 * - Track current step in the onboarding wizard
 * - Store all user selections during setup (detection results, manual edits, goals)
 * - Manage generation progress state
 * - Provide computed values for the wizard flow
 *
 * DEPENDENCIES:
 * - zustand - State management
 * - @/types/project - DetectionResult, ProjectSetup types
 *
 * EXPORTS:
 * - useOnboardingStore - Zustand hook for onboarding state
 *
 * PATTERNS:
 * - Step numbers correspond to wizard screens (1-7)
 * - Detection results are stored and user edits overlay them
 * - Reset state when onboarding completes or is cancelled
 *
 * CLAUDE NOTES:
 * - Onboarding flow has two paths: existing project (auto-detect) and new project (guided)
 * - Step 1: Select folder, Step 2: Analysis/Manual, Step 3: Goals, Step 4: Review
 * - See spec Part 2 for the full flow
 */

import { create } from "zustand";
import type { DetectionResult } from "@/types/project";

interface OnboardingState {
  active: boolean;
  step: number;
  projectPath: string | null;
  isExistingProject: boolean;
  detectionResult: DetectionResult | null;
  scanning: boolean;
  generating: boolean;

  // User-editable fields (may override detection)
  projectName: string;
  projectDescription: string;
  projectType: string;
  language: string;
  framework: string | null;
  database: string | null;
  testing: string | null;
  styling: string | null;
  goals: string[];
  generateModuleDocs: boolean;
  setupEnforcement: boolean;

  // Actions
  setActive: (active: boolean) => void;
  setStep: (step: number) => void;
  setProjectPath: (path: string | null) => void;
  setIsExistingProject: (existing: boolean) => void;
  setDetectionResult: (result: DetectionResult | null) => void;
  setScanning: (scanning: boolean) => void;
  setGenerating: (generating: boolean) => void;
  setProjectName: (name: string) => void;
  setProjectDescription: (desc: string) => void;
  setProjectType: (type_: string) => void;
  setLanguage: (lang: string) => void;
  setFramework: (fw: string | null) => void;
  setDatabase: (db: string | null) => void;
  setTesting: (testing: string | null) => void;
  setStyling: (styling: string | null) => void;
  setGoals: (goals: string[]) => void;
  toggleGoal: (goal: string) => void;
  setGenerateModuleDocs: (generate: boolean) => void;
  setSetupEnforcement: (setup: boolean) => void;
  applyDetection: (result: DetectionResult) => void;
  reset: () => void;
}

const initialState = {
  active: false,
  step: 1,
  projectPath: null as string | null,
  isExistingProject: false,
  detectionResult: null as DetectionResult | null,
  scanning: false,
  generating: false,
  projectName: "",
  projectDescription: "",
  projectType: "",
  language: "",
  framework: null as string | null,
  database: null as string | null,
  testing: null as string | null,
  styling: null as string | null,
  goals: ["features", "documentation"] as string[],
  generateModuleDocs: true,
  setupEnforcement: true,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  setActive: (active) => set({ active }),
  setStep: (step) => set({ step }),
  setProjectPath: (projectPath) => set({ projectPath }),
  setIsExistingProject: (isExistingProject) => set({ isExistingProject }),
  setDetectionResult: (detectionResult) => set({ detectionResult }),
  setScanning: (scanning) => set({ scanning }),
  setGenerating: (generating) => set({ generating }),
  setProjectName: (projectName) => set({ projectName }),
  setProjectDescription: (projectDescription) => set({ projectDescription }),
  setProjectType: (projectType) => set({ projectType }),
  setLanguage: (language) => set({ language }),
  setFramework: (framework) => set({ framework }),
  setDatabase: (database) => set({ database }),
  setTesting: (testing) => set({ testing }),
  setStyling: (styling) => set({ styling }),
  setGoals: (goals) => set({ goals }),
  toggleGoal: (goal) =>
    set((state) => ({
      goals: state.goals.includes(goal)
        ? state.goals.filter((g) => g !== goal)
        : [...state.goals, goal],
    })),
  setGenerateModuleDocs: (generateModuleDocs) => set({ generateModuleDocs }),
  setSetupEnforcement: (setupEnforcement) => set({ setupEnforcement }),
  applyDetection: (result) =>
    set({
      detectionResult: result,
      projectName: result.projectName ?? "",
      isExistingProject: result.confidence !== "none",
      language: result.language?.value ?? "",
      framework: result.framework?.value ?? null,
      database: result.database?.value ?? null,
      testing: result.testing?.value ?? null,
      styling: result.styling?.value ?? null,
      projectType: result.projectType ?? "",
    }),
  reset: () => set(initialState),
}));
