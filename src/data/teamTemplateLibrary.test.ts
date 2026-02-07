/**
 * @module data/teamTemplateLibrary.test
 * @description Unit tests for the curated team template library catalog
 *
 * PURPOSE:
 * - Verify all templates have required fields and valid data
 * - Ensure unique slugs across all templates
 * - Validate categories and orchestration patterns
 * - Check teammate and task structure integrity
 *
 * DEPENDENCIES:
 * - @/data/teamTemplateLibrary - TEAM_TEMPLATE_LIBRARY array
 * - @/types/team-template - Type definitions for validation
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Tests structural validity of all templates in the library
 * - Uses forEach to ensure every template meets requirements
 *
 * CLAUDE NOTES:
 * - Valid categories: feature-development, testing, code-review, refactoring, migration, documentation, devops
 * - Valid patterns: leader, pipeline, parallel, swarm, council
 * - Each template must have at least 1 teammate with role and spawnPrompt
 */

import { describe, it, expect } from "vitest";
import { TEAM_TEMPLATE_LIBRARY } from "./teamTemplateLibrary";

const VALID_CATEGORIES = [
  "feature-development",
  "testing",
  "code-review",
  "refactoring",
  "migration",
  "documentation",
  "devops",
];

const VALID_PATTERNS = ["leader", "pipeline", "parallel", "swarm", "council"];

describe("TEAM_TEMPLATE_LIBRARY", () => {
  describe("required fields", () => {
    it("should have at least one template", () => {
      expect(TEAM_TEMPLATE_LIBRARY.length).toBeGreaterThan(0);
    });

    it("all templates have required fields", () => {
      TEAM_TEMPLATE_LIBRARY.forEach((template) => {
        expect(template.name).toBeTruthy();
        expect(typeof template.name).toBe("string");

        expect(template.slug).toBeTruthy();
        expect(typeof template.slug).toBe("string");

        expect(template.description).toBeTruthy();
        expect(typeof template.description).toBe("string");

        expect(template.orchestrationPattern).toBeTruthy();
        expect(typeof template.orchestrationPattern).toBe("string");

        expect(template.category).toBeTruthy();
        expect(typeof template.category).toBe("string");

        expect(template.teammates).toBeInstanceOf(Array);
        expect(template.tasks).toBeInstanceOf(Array);
        expect(template.hooks).toBeInstanceOf(Array);

        expect(template.leadSpawnInstructions).toBeTruthy();
        expect(typeof template.leadSpawnInstructions).toBe("string");

        expect(template.tags).toBeInstanceOf(Array);
      });
    });
  });

  describe("unique slugs", () => {
    it("all slugs should be unique across templates", () => {
      const slugs = TEAM_TEMPLATE_LIBRARY.map((t) => t.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe("valid categories", () => {
    it("all templates have valid categories", () => {
      TEAM_TEMPLATE_LIBRARY.forEach((template) => {
        expect(VALID_CATEGORIES).toContain(template.category);
      });
    });
  });

  describe("valid orchestration patterns", () => {
    it("all templates have valid orchestration patterns", () => {
      TEAM_TEMPLATE_LIBRARY.forEach((template) => {
        expect(VALID_PATTERNS).toContain(template.orchestrationPattern);
      });
    });
  });

  describe("teammates", () => {
    it("each template has at least 1 teammate", () => {
      TEAM_TEMPLATE_LIBRARY.forEach((template) => {
        expect(template.teammates.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("each teammate has role and spawnPrompt", () => {
      TEAM_TEMPLATE_LIBRARY.forEach((template) => {
        template.teammates.forEach((mate) => {
          expect(mate.role).toBeTruthy();
          expect(typeof mate.role).toBe("string");

          expect(mate.spawnPrompt).toBeTruthy();
          expect(typeof mate.spawnPrompt).toBe("string");
        });
      });
    });
  });

  describe("tags", () => {
    it("tags array is non-empty for all templates", () => {
      TEAM_TEMPLATE_LIBRARY.forEach((template) => {
        expect(template.tags.length).toBeGreaterThan(0);
      });
    });
  });
});
