/**
 * @module stores/onboardingStore.test
 * @description Unit tests for onboardingStore Zustand store
 *
 * PURPOSE:
 * - Test initial state values including stackExtras
 * - Test setStackExtras action
 * - Test applyTemplate action
 * - Test reset action clears stackExtras
 * - Verify integration with existing fields
 *
 * PATTERNS:
 * - Uses Vitest globals (describe, it, expect)
 * - Resets store state in beforeEach()
 * - Uses act() for state updates
 *
 * CLAUDE NOTES:
 * - Store is reset before each test to avoid state leakage
 * - applyTemplate sets multiple fields at once from a template
 * - stackExtras can be null or a partial StackExtras object
 */

import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { useOnboardingStore } from "./onboardingStore";
import type { StackTemplate } from "@/data/stackTemplates";
import type { StackExtras } from "@/types/project";

// Mock template for testing
const mockTemplate: StackTemplate = {
  id: "test-template",
  name: "Test Template",
  description: "For testing",
  icon: "Sparkles",
  language: "TypeScript",
  framework: "Next.js",
  database: "PostgreSQL",
  testing: "Vitest",
  styling: "Tailwind CSS",
  extras: {
    auth: "Clerk",
    hosting: "Vercel",
    payments: "Stripe",
  },
};

// Template with minimal fields
const minimalTemplate: StackTemplate = {
  id: "minimal-template",
  name: "Minimal Template",
  description: "Minimal for testing",
  icon: "Terminal",
  language: "TypeScript",
  framework: "Express",
  database: null,
  testing: null,
  styling: null,
  extras: {},
};

// Template matching B2B SaaS
const b2bSaasTemplate: StackTemplate = {
  id: "b2b-saas",
  name: "B2B SaaS",
  description: "Full-stack app with auth, payments, and analytics",
  icon: "Building2",
  language: "TypeScript",
  framework: "Next.js",
  database: "PostgreSQL",
  testing: "Vitest",
  styling: "Tailwind CSS",
  extras: {
    auth: "Clerk",
    hosting: "Vercel",
    payments: "Stripe",
    monitoring: "PostHog",
    email: "Resend",
  },
};

describe("onboardingStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useOnboardingStore.getState().reset();
    });
  });

  describe("initial state", () => {
    it("stackExtras should be null by default", () => {
      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toBeNull();
    });

    it("should have expected initial values for all fields", () => {
      const state = useOnboardingStore.getState();

      expect(state.active).toBe(false);
      expect(state.step).toBe(1);
      expect(state.projectPath).toBeNull();
      expect(state.isExistingProject).toBe(false);
      expect(state.detectionResult).toBeNull();
      expect(state.scanning).toBe(false);
      expect(state.generating).toBe(false);
      expect(state.projectName).toBe("");
      expect(state.projectDescription).toBe("");
      expect(state.projectType).toBe("");
      expect(state.language).toBe("");
      expect(state.framework).toBeNull();
      expect(state.database).toBeNull();
      expect(state.testing).toBeNull();
      expect(state.styling).toBeNull();
      expect(state.stackExtras).toBeNull();
      expect(state.goals).toEqual(["features", "tests", "reviews", "debugging", "documentation"]);
      expect(state.generateModuleDocs).toBe(true);
      expect(state.setupEnforcement).toBe(false);
    });
  });

  describe("setStackExtras", () => {
    it("should set stackExtras to a valid object", () => {
      const extras: StackExtras = {
        auth: "Clerk",
        hosting: "Vercel",
        payments: "Stripe",
        monitoring: "PostHog",
        email: "Resend",
      };

      act(() => {
        useOnboardingStore.getState().setStackExtras(extras);
      });

      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toEqual(extras);
    });

    it("should handle partial stackExtras (only auth)", () => {
      const partialExtras: StackExtras = {
        auth: "Clerk",
      };

      act(() => {
        useOnboardingStore.getState().setStackExtras(partialExtras);
      });

      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toEqual({ auth: "Clerk" });
    });

    it("should allow setting stackExtras to null", () => {
      // First set a value
      act(() => {
        useOnboardingStore.getState().setStackExtras({ auth: "Clerk" });
      });

      // Then set to null
      act(() => {
        useOnboardingStore.getState().setStackExtras(null);
      });

      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toBeNull();
    });

    it("should replace existing stackExtras", () => {
      // Set initial extras
      act(() => {
        useOnboardingStore.getState().setStackExtras({
          auth: "Clerk",
          hosting: "Vercel",
        });
      });

      // Replace with new extras
      act(() => {
        useOnboardingStore.getState().setStackExtras({
          auth: "Auth0",
        });
      });

      const state = useOnboardingStore.getState();
      // New extras should replace old ones entirely
      expect(state.stackExtras?.auth).toBe("Auth0");
      expect(state.stackExtras?.hosting).toBeUndefined();
    });
  });

  describe("applyTemplate", () => {
    it("should populate language from template", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      const state = useOnboardingStore.getState();
      expect(state.language).toBe("TypeScript");
    });

    it("should populate framework from template", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      const state = useOnboardingStore.getState();
      expect(state.framework).toBe("Next.js");
    });

    it("should populate database from template (can be null)", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      expect(useOnboardingStore.getState().database).toBe("PostgreSQL");

      // Apply minimal template with null database
      act(() => {
        useOnboardingStore.getState().applyTemplate(minimalTemplate);
      });

      expect(useOnboardingStore.getState().database).toBeNull();
    });

    it("should populate testing from template (can be null)", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      expect(useOnboardingStore.getState().testing).toBe("Vitest");

      // Apply minimal template with null testing
      act(() => {
        useOnboardingStore.getState().applyTemplate(minimalTemplate);
      });

      expect(useOnboardingStore.getState().testing).toBeNull();
    });

    it("should populate styling from template (can be null)", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      expect(useOnboardingStore.getState().styling).toBe("Tailwind CSS");

      // Apply minimal template with null styling
      act(() => {
        useOnboardingStore.getState().applyTemplate(minimalTemplate);
      });

      expect(useOnboardingStore.getState().styling).toBeNull();
    });

    it("should populate stackExtras from template", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toEqual({
        auth: "Clerk",
        hosting: "Vercel",
        payments: "Stripe",
      });
    });

    it("should NOT change projectName, projectDescription, projectType", () => {
      // Set some values first
      act(() => {
        useOnboardingStore.getState().setProjectName("My Project");
        useOnboardingStore.getState().setProjectDescription("My description");
        useOnboardingStore.getState().setProjectType("Web App");
      });

      // Apply template
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      const state = useOnboardingStore.getState();
      expect(state.projectName).toBe("My Project");
      expect(state.projectDescription).toBe("My description");
      expect(state.projectType).toBe("Web App");
    });

    it("should apply B2B SaaS template correctly", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(b2bSaasTemplate);
      });

      const state = useOnboardingStore.getState();
      expect(state.language).toBe("TypeScript");
      expect(state.framework).toBe("Next.js");
      expect(state.database).toBe("PostgreSQL");
      expect(state.testing).toBe("Vitest");
      expect(state.styling).toBe("Tailwind CSS");
      expect(state.stackExtras).toEqual({
        auth: "Clerk",
        hosting: "Vercel",
        payments: "Stripe",
        monitoring: "PostHog",
        email: "Resend",
      });
    });

    it("should apply Dev Tool template (empty extras)", () => {
      act(() => {
        useOnboardingStore.getState().applyTemplate(minimalTemplate);
      });

      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toEqual({});
    });
  });

  describe("reset", () => {
    it("should reset stackExtras to null", () => {
      // Set stackExtras
      act(() => {
        useOnboardingStore.getState().setStackExtras({
          auth: "Clerk",
          payments: "Stripe",
        });
      });

      expect(useOnboardingStore.getState().stackExtras).not.toBeNull();

      // Reset
      act(() => {
        useOnboardingStore.getState().reset();
      });

      expect(useOnboardingStore.getState().stackExtras).toBeNull();
    });

    it("should reset all fields to initial values", () => {
      // Set various fields
      act(() => {
        const state = useOnboardingStore.getState();
        state.setActive(true);
        state.setStep(3);
        state.setProjectPath("/some/path");
        state.setLanguage("Python");
        state.setFramework("Django");
        state.setStackExtras({ auth: "Auth0" });
      });

      // Reset
      act(() => {
        useOnboardingStore.getState().reset();
      });

      const state = useOnboardingStore.getState();
      expect(state.active).toBe(false);
      expect(state.step).toBe(1);
      expect(state.projectPath).toBeNull();
      expect(state.language).toBe("");
      expect(state.framework).toBeNull();
      expect(state.stackExtras).toBeNull();
    });
  });

  describe("integration with existing fields", () => {
    it("applyTemplate then manual override should work", () => {
      // Apply template
      act(() => {
        useOnboardingStore.getState().applyTemplate(mockTemplate);
      });

      expect(useOnboardingStore.getState().framework).toBe("Next.js");
      expect(useOnboardingStore.getState().stackExtras?.auth).toBe("Clerk");

      // Manually override framework
      act(() => {
        useOnboardingStore.getState().setFramework("React");
      });

      // Manually override stackExtras
      act(() => {
        useOnboardingStore.getState().setStackExtras({
          ...useOnboardingStore.getState().stackExtras,
          auth: "Auth0",
        });
      });

      const state = useOnboardingStore.getState();
      expect(state.framework).toBe("React");
      expect(state.stackExtras?.auth).toBe("Auth0");
      // Other extras should still be present
      expect(state.stackExtras?.hosting).toBe("Vercel");
      expect(state.stackExtras?.payments).toBe("Stripe");
    });

    it("setStackExtras should merge with existing extras when called in component", () => {
      // Initial extras
      act(() => {
        useOnboardingStore.getState().setStackExtras({
          auth: "Clerk",
          hosting: "Vercel",
        });
      });

      // Simulate component updating just the payments field
      act(() => {
        const current = useOnboardingStore.getState().stackExtras;
        useOnboardingStore.getState().setStackExtras({
          ...current,
          payments: "Stripe",
        });
      });

      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toEqual({
        auth: "Clerk",
        hosting: "Vercel",
        payments: "Stripe",
      });
    });
  });

  describe("applyDetection", () => {
    it("should not affect stackExtras when applying detection result", () => {
      // Set stackExtras first
      act(() => {
        useOnboardingStore.getState().setStackExtras({
          auth: "Clerk",
        });
      });

      // Apply detection (detection doesn't include stackExtras)
      act(() => {
        useOnboardingStore.getState().applyDetection({
          confidence: "high",
          language: { value: "Python", confidence: 0.9, source: "package.json" },
          framework: { value: "Django", confidence: 0.8, source: "requirements.txt" },
          database: null,
          testing: null,
          styling: null,
          projectName: "Detected Project",
          projectType: "Web App",
          fileCount: 50,
          hasExistingClaudeMd: false,
        });
      });

      // stackExtras should remain unchanged
      const state = useOnboardingStore.getState();
      expect(state.stackExtras).toEqual({ auth: "Clerk" });
      expect(state.language).toBe("Python");
      expect(state.framework).toBe("Django");
    });
  });
});
