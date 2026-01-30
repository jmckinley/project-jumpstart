/**
 * @module lib/skillRelevance.test
 * @description Unit tests for skill relevance scoring with stack extras
 *
 * PURPOSE:
 * - Test getProjectTags extracts tags from all project fields including stackExtras
 * - Test scoreSkillRelevance correctly scores skills based on tag matches
 * - Test rankLibrarySkills properly ranks and caps recommendations
 *
 * PATTERNS:
 * - Uses Vitest globals (describe, it, expect)
 * - Creates mock projects and skills for testing
 *
 * CLAUDE NOTES:
 * - Focus on stackExtras integration since that's the new feature
 * - Existing tag extraction is covered; tests ensure no regression
 */

import { describe, it, expect } from "vitest";
import {
  getProjectTags,
  scoreSkillRelevance,
  rankLibrarySkills,
  MAX_RECOMMENDED_SKILLS,
} from "./skillRelevance";
import type { Project } from "@/types/project";
import type { LibrarySkill } from "@/types/skill";

// Base project without stackExtras
const baseProject: Project = {
  id: "test-project",
  name: "Test Project",
  path: "/path/to/project",
  description: "Test description",
  projectType: "Web App",
  language: "TypeScript",
  framework: "Next.js",
  database: "PostgreSQL",
  testing: "Vitest",
  styling: "Tailwind CSS",
  stackExtras: null,
  healthScore: 75,
  createdAt: "2024-01-01T00:00:00Z",
};

// Project with full stackExtras
const projectWithExtras: Project = {
  ...baseProject,
  stackExtras: {
    auth: "Clerk",
    hosting: "Vercel",
    payments: "Stripe",
    monitoring: "PostHog",
    email: "Resend",
  },
};

// Project with partial stackExtras
const projectWithPartialExtras: Project = {
  ...baseProject,
  stackExtras: {
    payments: "Stripe",
  },
};

// Project with cache extra
const projectWithCache: Project = {
  ...baseProject,
  stackExtras: {
    cache: "Redis",
  },
};

// Mock skills for testing
const stripeSkill: LibrarySkill = {
  slug: "stripe-integration",
  name: "Stripe Integration",
  description: "Integrate Stripe payments",
  category: "api-design",
  tags: ["stripe", "typescript"],
  content: "Stripe integration skill content",
};

const clerkSkill: LibrarySkill = {
  slug: "clerk-auth",
  name: "Clerk Authentication",
  description: "Set up Clerk auth",
  category: "api-design",
  tags: ["clerk", "nextjs"],
  content: "Clerk auth skill content",
};

const sentrySkill: LibrarySkill = {
  slug: "sentry-setup",
  name: "Sentry Error Tracking",
  description: "Set up Sentry monitoring",
  category: "error-handling",
  tags: ["sentry", "typescript"],
  content: "Sentry setup skill content",
};

const universalSkill: LibrarySkill = {
  slug: "module-doc",
  name: "Module Documentation",
  description: "Add module headers",
  category: "documentation",
  tags: ["universal"],
  content: "Universal skill content",
};

const typescriptPatternsSkill: LibrarySkill = {
  slug: "typescript-patterns",
  name: "TypeScript Patterns",
  description: "TypeScript best practices",
  category: "language-patterns",
  tags: ["typescript"],
  content: "TypeScript patterns content",
};

const unrelatedSkill: LibrarySkill = {
  slug: "python-flask",
  name: "Flask API",
  description: "Build Flask APIs",
  category: "api-design",
  tags: ["python", "flask"],
  content: "Flask API skill content",
};

describe("skillRelevance", () => {
  describe("getProjectTags", () => {
    it("should return empty array for null project", () => {
      const tags = getProjectTags(null);
      expect(tags).toEqual([]);
    });

    it("should extract language tag (TypeScript -> typescript)", () => {
      const tags = getProjectTags(baseProject);
      expect(tags).toContain("typescript");
    });

    it("should extract framework tag (Next.js -> nextjs)", () => {
      const tags = getProjectTags(baseProject);
      expect(tags).toContain("nextjs");
    });

    it("should extract database tag (PostgreSQL -> postgresql)", () => {
      const tags = getProjectTags(baseProject);
      expect(tags).toContain("postgresql");
    });

    it("should extract testing tag (Vitest -> vitest)", () => {
      const tags = getProjectTags(baseProject);
      expect(tags).toContain("vitest");
    });

    it("should extract styling tag (Tailwind CSS -> tailwind)", () => {
      const tags = getProjectTags(baseProject);
      expect(tags).toContain("tailwind");
    });

    it("should not add duplicates", () => {
      const tags = getProjectTags(baseProject);
      const uniqueTags = new Set(tags);
      expect(tags.length).toBe(uniqueTags.size);
    });

    describe("with stackExtras", () => {
      it("should extract auth tag (Clerk -> clerk)", () => {
        const tags = getProjectTags(projectWithExtras);
        expect(tags).toContain("clerk");
      });

      it("should extract hosting tag (Vercel -> vercel)", () => {
        const tags = getProjectTags(projectWithExtras);
        expect(tags).toContain("vercel");
      });

      it("should extract payments tag (Stripe -> stripe)", () => {
        const tags = getProjectTags(projectWithExtras);
        expect(tags).toContain("stripe");
      });

      it("should extract monitoring tag (PostHog -> posthog)", () => {
        const tags = getProjectTags(projectWithExtras);
        expect(tags).toContain("posthog");
      });

      it("should extract email tag (Resend -> resend)", () => {
        const tags = getProjectTags(projectWithExtras);
        expect(tags).toContain("resend");
      });

      it("should extract cache tag (Redis -> redis)", () => {
        const tags = getProjectTags(projectWithCache);
        expect(tags).toContain("redis");
      });

      it("should handle partial stackExtras (only some fields set)", () => {
        const tags = getProjectTags(projectWithPartialExtras);

        // Should have stripe from stackExtras
        expect(tags).toContain("stripe");

        // Should still have core tags
        expect(tags).toContain("typescript");
        expect(tags).toContain("nextjs");
      });

      it("should handle null stackExtras", () => {
        const tags = getProjectTags(baseProject);

        // Should not throw, should still return core tags
        expect(tags).toContain("typescript");
        expect(tags).not.toContain("clerk");
        expect(tags).not.toContain("stripe");
      });

      it("should combine core and extras tags", () => {
        const tags = getProjectTags(projectWithExtras);

        // Core tags
        expect(tags).toContain("typescript");
        expect(tags).toContain("nextjs");
        expect(tags).toContain("postgresql");
        expect(tags).toContain("vitest");
        expect(tags).toContain("tailwind");

        // Extras tags
        expect(tags).toContain("clerk");
        expect(tags).toContain("vercel");
        expect(tags).toContain("stripe");
        expect(tags).toContain("posthog");
        expect(tags).toContain("resend");
      });
    });
  });

  describe("scoreSkillRelevance", () => {
    it("should score stripe skill higher when payments=Stripe", () => {
      const projectTags = getProjectTags(projectWithExtras);
      const result = scoreSkillRelevance(stripeSkill, projectTags);

      // Stripe skill matches stripe + typescript = 2 matches
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.isRecommended).toBe(true);
      expect(result.matchedTags).toContain("stripe");
    });

    it("should not match stripe skill when payments is not set", () => {
      const projectTags = getProjectTags(baseProject);
      const result = scoreSkillRelevance(stripeSkill, projectTags);

      // Only matches typescript, not stripe
      expect(result.matchedTags).toContain("typescript");
      expect(result.matchedTags).not.toContain("stripe");
    });

    it("should score clerk skill for auth=Clerk", () => {
      const projectTags = getProjectTags(projectWithExtras);
      const result = scoreSkillRelevance(clerkSkill, projectTags);

      expect(result.matchedTags).toContain("clerk");
      expect(result.matchedTags).toContain("nextjs");
      expect(result.isRecommended).toBe(true);
    });

    it("should score sentry skill for monitoring=Sentry", () => {
      const projectWithSentry: Project = {
        ...baseProject,
        stackExtras: {
          monitoring: "Sentry",
        },
      };

      const projectTags = getProjectTags(projectWithSentry);
      const result = scoreSkillRelevance(sentrySkill, projectTags);

      expect(result.matchedTags).toContain("sentry");
      expect(result.isRecommended).toBe(true);
    });

    it("should give universal skills a score of 75", () => {
      const projectTags = getProjectTags(baseProject);
      const result = scoreSkillRelevance(universalSkill, projectTags);

      expect(result.score).toBe(75);
      expect(result.isRecommended).toBe(true);
      expect(result.matchedTags).toEqual(["universal"]);
    });

    it("should give language-patterns skills priority (score 85)", () => {
      const projectTags = getProjectTags(baseProject);
      const result = scoreSkillRelevance(typescriptPatternsSkill, projectTags);

      expect(result.score).toBe(85);
      expect(result.isRecommended).toBe(true);
    });

    it("should return score 0 for unrelated skills", () => {
      const projectTags = getProjectTags(baseProject);
      const result = scoreSkillRelevance(unrelatedSkill, projectTags);

      expect(result.score).toBe(0);
      expect(result.isRecommended).toBe(false);
      expect(result.matchedTags).toEqual([]);
    });
  });

  describe("rankLibrarySkills with extras", () => {
    const allSkills: LibrarySkill[] = [
      stripeSkill,
      clerkSkill,
      sentrySkill,
      universalSkill,
      typescriptPatternsSkill,
      unrelatedSkill,
    ];

    it("should recommend Stripe skill when payments=Stripe", () => {
      const ranked = rankLibrarySkills(allSkills, projectWithExtras);

      const stripeRanked = ranked.find((s) => s.skill.slug === "stripe-integration");
      expect(stripeRanked).toBeDefined();
      expect(stripeRanked!.isRecommended).toBe(true);
      expect(stripeRanked!.matchedTags).toContain("stripe");
    });

    it("should recommend multiple extras skills (Clerk, Stripe)", () => {
      const ranked = rankLibrarySkills(allSkills, projectWithExtras);

      const stripeRanked = ranked.find((s) => s.skill.slug === "stripe-integration");
      const clerkRanked = ranked.find((s) => s.skill.slug === "clerk-auth");

      expect(stripeRanked!.isRecommended).toBe(true);
      expect(clerkRanked!.isRecommended).toBe(true);
    });

    it("should cap recommendations at MAX_RECOMMENDED_SKILLS", () => {
      // Create many skills that would all be recommended
      const manySkills: LibrarySkill[] = [
        stripeSkill,
        clerkSkill,
        typescriptPatternsSkill,
        universalSkill,
        {
          slug: "vercel-deploy",
          name: "Vercel Deploy",
          description: "Deploy to Vercel",
          category: "api-design",
          tags: ["vercel", "nextjs"],
          content: "content",
        },
        {
          slug: "posthog-analytics",
          name: "PostHog Analytics",
          description: "Add PostHog",
          category: "api-design",
          tags: ["posthog", "typescript"],
          content: "content",
        },
        {
          slug: "resend-email",
          name: "Resend Email",
          description: "Send emails with Resend",
          category: "api-design",
          tags: ["resend", "typescript"],
          content: "content",
        },
      ];

      const ranked = rankLibrarySkills(manySkills, projectWithExtras);
      const recommendedCount = ranked.filter((s) => s.isRecommended).length;

      expect(recommendedCount).toBeLessThanOrEqual(MAX_RECOMMENDED_SKILLS);
    });

    it("should sort recommended skills first, then alphabetically", () => {
      const ranked = rankLibrarySkills(allSkills, projectWithExtras);

      // Find where recommended skills end
      let lastRecommendedIndex = -1;
      for (let i = 0; i < ranked.length; i++) {
        if (ranked[i].isRecommended) {
          lastRecommendedIndex = i;
        }
      }

      // All recommended should be at the start
      for (let i = 0; i <= lastRecommendedIndex; i++) {
        expect(ranked[i].isRecommended).toBe(true);
      }

      // Non-recommended should be after
      for (let i = lastRecommendedIndex + 1; i < ranked.length; i++) {
        expect(ranked[i].isRecommended).toBe(false);
      }
    });

    it("should not recommend unrelated skills", () => {
      const ranked = rankLibrarySkills(allSkills, projectWithExtras);

      const pythonFlask = ranked.find((s) => s.skill.slug === "python-flask");
      expect(pythonFlask).toBeDefined();
      expect(pythonFlask!.isRecommended).toBe(false);
      expect(pythonFlask!.score).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty skills array", () => {
      const ranked = rankLibrarySkills([], projectWithExtras);
      expect(ranked).toEqual([]);
    });

    it("should handle project with no matching tags", () => {
      const pythonProject: Project = {
        ...baseProject,
        language: "Python",
        framework: "Flask",
        database: null,
        testing: null,
        styling: null,
        stackExtras: null,
      };

      const ranked = rankLibrarySkills(
        [stripeSkill, clerkSkill],
        pythonProject
      );

      // Neither skill matches python/flask
      expect(ranked[0].isRecommended).toBe(false);
      expect(ranked[1].isRecommended).toBe(false);
    });

    it("should handle stackExtras with unknown values", () => {
      const projectWithUnknown: Project = {
        ...baseProject,
        stackExtras: {
          auth: "SomeUnknownAuth",
        },
      };

      const tags = getProjectTags(projectWithUnknown);

      // Unknown values should not produce tags
      expect(tags).not.toContain("someunknownauth");

      // Core tags should still work
      expect(tags).toContain("typescript");
    });
  });
});
