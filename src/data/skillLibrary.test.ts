/**
 * @module data/skillLibrary.test
 * @description Unit tests for Claude Code Best Practices skills in the skill library
 *
 * PURPOSE:
 * - Verify 4 new prompting pattern skills exist with correct structure
 * - Validate skills have proper categories and universal tags
 * - Ensure skill content includes expected key phrases
 *
 * DEPENDENCIES:
 * - @/data/skillLibrary - SKILL_LIBRARY array of skills
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Use getSkill helper to find skills by slug
 * - Test each skill's structure and content independently
 *
 * CLAUDE NOTES:
 * - All 4 skills should have tags: ["universal"]
 * - Categories: code-review (2), testing (1), debugging (1)
 */

import { describe, it, expect } from "vitest";
import { SKILL_LIBRARY } from "./skillLibrary";

describe("Claude Code Best Practices Skills", () => {
  const getSkill = (slug: string) =>
    SKILL_LIBRARY.find((s) => s.slug === slug);

  describe("grill-me-on-changes", () => {
    it("should exist in the skill library", () => {
      const skill = getSkill("grill-me-on-changes");
      expect(skill).toBeDefined();
    });

    it("should have correct metadata", () => {
      const skill = getSkill("grill-me-on-changes");
      expect(skill?.name).toBe("Grill Me On Changes");
      expect(skill?.category).toBe("code-review");
      expect(skill?.tags).toContain("universal");
    });

    it("should have content about aggressive review", () => {
      const skill = getSkill("grill-me-on-changes");
      expect(skill?.content).toContain("aggressively review");
    });

    it("should include edge cases checklist", () => {
      const skill = getSkill("grill-me-on-changes");
      expect(skill?.content).toContain("Edge cases");
      expect(skill?.content).toContain("Error handling");
    });
  });

  describe("prove-it-works", () => {
    it("should exist in the skill library", () => {
      const skill = getSkill("prove-it-works");
      expect(skill).toBeDefined();
    });

    it("should have correct metadata", () => {
      const skill = getSkill("prove-it-works");
      expect(skill?.name).toBe("Prove It Works");
      expect(skill?.category).toBe("testing");
      expect(skill?.tags).toContain("universal");
    });

    it("should demand concrete evidence", () => {
      const skill = getSkill("prove-it-works");
      expect(skill?.content).toContain("verification");
    });

    it("should mention test cases", () => {
      const skill = getSkill("prove-it-works");
      expect(skill?.content).toContain("test case");
    });
  });

  describe("fresh-start-pattern", () => {
    it("should exist in the skill library", () => {
      const skill = getSkill("fresh-start-pattern");
      expect(skill).toBeDefined();
    });

    it("should have correct metadata", () => {
      const skill = getSkill("fresh-start-pattern");
      expect(skill?.name).toBe("Fresh Start Pattern");
      expect(skill?.category).toBe("debugging");
      expect(skill?.tags).toContain("universal");
    });

    it("should mention context rot", () => {
      const skill = getSkill("fresh-start-pattern");
      expect(skill?.content).toContain("context");
    });

    it("should mention CLAUDE.md for saving learnings", () => {
      const skill = getSkill("fresh-start-pattern");
      expect(skill?.content).toContain("CLAUDE.md");
    });

    it("should mention fresh conversation", () => {
      const skill = getSkill("fresh-start-pattern");
      expect(skill?.content).toContain("fresh");
    });
  });

  describe("two-claude-review", () => {
    it("should exist in the skill library", () => {
      const skill = getSkill("two-claude-review");
      expect(skill).toBeDefined();
    });

    it("should have correct metadata", () => {
      const skill = getSkill("two-claude-review");
      expect(skill?.name).toBe("Two-Claude Review");
      expect(skill?.category).toBe("code-review");
      expect(skill?.tags).toContain("universal");
    });

    it("should describe separate sessions pattern", () => {
      const skill = getSkill("two-claude-review");
      expect(skill?.content).toContain("Session");
    });

    it("should mention independent review", () => {
      const skill = getSkill("two-claude-review");
      expect(skill?.content).toContain("independent");
    });
  });

  describe("all best practices skills", () => {
    const bestPracticeSlugs = [
      "grill-me-on-changes",
      "prove-it-works",
      "fresh-start-pattern",
      "two-claude-review",
    ];

    it("should all have universal tag", () => {
      for (const slug of bestPracticeSlugs) {
        const skill = getSkill(slug);
        expect(skill?.tags).toContain("universal");
      }
    });

    it("should all have required fields", () => {
      for (const slug of bestPracticeSlugs) {
        const skill = getSkill(slug);
        expect(skill).toBeDefined();
        expect(skill?.name).toBeTruthy();
        expect(skill?.description).toBeTruthy();
        expect(skill?.content).toBeTruthy();
        expect(skill?.category).toBeTruthy();
        expect(skill?.tags).toBeInstanceOf(Array);
      }
    });

    it("should have correct category distribution", () => {
      const skills = bestPracticeSlugs.map((slug) => getSkill(slug));
      const codeReviewSkills = skills.filter((s) => s?.category === "code-review");
      const testingSkills = skills.filter((s) => s?.category === "testing");
      const debuggingSkills = skills.filter((s) => s?.category === "debugging");

      expect(codeReviewSkills).toHaveLength(2);
      expect(testingSkills).toHaveLength(1);
      expect(debuggingSkills).toHaveLength(1);
    });
  });
});
