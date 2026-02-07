/**
 * @module lib/teamRelevance.test
 * @description Unit tests for team template relevance scoring
 *
 * PURPOSE:
 * - Verify universal templates score 75
 * - Verify non-matching templates score 0
 * - Verify matching templates get expected scores (30 + 20 * matches, cap 60, + specificity bonus)
 * - Verify rankLibraryTeams sorts recommended first
 * - Verify MAX_RECOMMENDED_TEAMS = 3 cap works
 * - Verify non-recommended sorted alphabetically
 *
 * DEPENDENCIES:
 * - @/lib/teamRelevance - scoreTeamRelevance, rankLibraryTeams, MAX_RECOMMENDED_TEAMS
 * - @/types/team-template - LibraryTeamTemplate type
 * - @/types/skill - TechTag type
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Uses minimal LibraryTeamTemplate objects for focused testing
 * - Tests scoring formula edge cases
 *
 * CLAUDE NOTES:
 * - Scoring formula: 30 base + 20 per match (capped at 60) + 10 specificity bonus
 * - Universal templates always score 75
 * - MAX_RECOMMENDED_TEAMS is 3 (lower than agents)
 */

import { describe, it, expect } from "vitest";
import {
  scoreTeamRelevance,
  rankLibraryTeams,
  MAX_RECOMMENDED_TEAMS,
} from "./teamRelevance";
import type { LibraryTeamTemplate } from "@/types/team-template";
import type { TechTag } from "@/types/skill";

function makeTemplate(
  overrides: Partial<LibraryTeamTemplate> & { slug: string; name: string; tags: TechTag[] },
): LibraryTeamTemplate {
  return {
    description: "A test template",
    orchestrationPattern: "leader",
    category: "feature-development",
    teammates: [{ role: "Dev", description: "Developer", spawnPrompt: "You are a dev" }],
    tasks: [],
    hooks: [],
    leadSpawnInstructions: "Coordinate the team",
    ...overrides,
  };
}

describe("scoreTeamRelevance", () => {
  it("universal templates score 75", () => {
    const template = makeTemplate({
      slug: "universal-team",
      name: "Universal Team",
      tags: ["universal"],
    });

    const result = scoreTeamRelevance(template, ["typescript", "react"]);
    expect(result.score).toBe(75);
    expect(result.isRecommended).toBe(true);
    expect(result.matchedTags).toEqual(["universal"]);
  });

  it("non-matching templates score 0", () => {
    const template = makeTemplate({
      slug: "python-team",
      name: "Python Team",
      tags: ["python", "django"],
    });

    const result = scoreTeamRelevance(template, ["typescript", "react"]);
    expect(result.score).toBe(0);
    expect(result.isRecommended).toBe(false);
    expect(result.matchedTags).toEqual([]);
  });

  it("1 match with low specificity scores 50", () => {
    // 1 match out of 4 tags = 25% match ratio (< 50%), no specificity bonus
    // 30 + 20 = 50
    const template = makeTemplate({
      slug: "broad-team",
      name: "Broad Team",
      tags: ["typescript", "python", "rust", "go"],
    });

    const result = scoreTeamRelevance(template, ["typescript"]);
    expect(result.score).toBe(50);
    expect(result.isRecommended).toBe(true);
  });

  it("1 match with high specificity scores 60", () => {
    // 1 match out of 1 tag = 100% match ratio (>= 50%), +10 specificity bonus
    // 30 + 20 + 10 = 60
    const template = makeTemplate({
      slug: "focused-team",
      name: "Focused Team",
      tags: ["typescript"],
    });

    const result = scoreTeamRelevance(template, ["typescript"]);
    expect(result.score).toBe(60);
    expect(result.isRecommended).toBe(true);
  });

  it("2 matches scores 70-80", () => {
    // 2 matches out of 3 tags = 67% match ratio (>= 50%), +10 specificity bonus
    // 30 + 40 + 10 = 80
    const template = makeTemplate({
      slug: "ts-react-team",
      name: "TS React Team",
      tags: ["typescript", "react", "nextjs"],
    });

    const result = scoreTeamRelevance(template, ["typescript", "react"]);
    expect(result.score).toBe(80);
    expect(result.isRecommended).toBe(true);
    expect(result.matchedTags).toEqual(["typescript", "react"]);
  });

  it("3+ matches capped correctly", () => {
    // 3 matches out of 3 tags = 100% match ratio (>= 50%), +10 specificity bonus
    // 30 + min(60, 60) + 10 = 100
    const template = makeTemplate({
      slug: "full-match-team",
      name: "Full Match Team",
      tags: ["typescript", "react", "vitest"],
    });

    const result = scoreTeamRelevance(template, [
      "typescript",
      "react",
      "vitest",
    ]);
    expect(result.score).toBe(100);
    expect(result.isRecommended).toBe(true);
  });

  it("score never exceeds 100", () => {
    // 4 matches but matchBonus capped at 60
    // 30 + 60 + 10 = 100, capped at 100
    const template = makeTemplate({
      slug: "many-tags",
      name: "Many Tags",
      tags: ["typescript", "react", "vitest", "nextjs"],
    });

    const result = scoreTeamRelevance(template, [
      "typescript",
      "react",
      "vitest",
      "nextjs",
    ]);
    expect(result.score).toBe(100);
  });
});

describe("rankLibraryTeams", () => {
  it("sorts recommended first", () => {
    const templates: LibraryTeamTemplate[] = [
      makeTemplate({
        slug: "no-match",
        name: "No Match",
        tags: ["python"],
      }),
      makeTemplate({
        slug: "universal-team",
        name: "Universal Team",
        tags: ["universal"],
      }),
    ];

    const ranked = rankLibraryTeams(templates, {
      id: "p1",
      name: "Test",
      path: "/test",
      description: "",
      projectType: "Web App",
      language: "TypeScript",
      framework: "React",
      database: null,
      testing: null,
      styling: null,
      stackExtras: null,
      healthScore: 50,
      createdAt: "2024-01-01T00:00:00Z",
    });

    expect(ranked[0].template.slug).toBe("universal-team");
    expect(ranked[0].isRecommended).toBe(true);
    expect(ranked[1].template.slug).toBe("no-match");
    expect(ranked[1].isRecommended).toBe(false);
  });

  it("non-recommended sorted alphabetically", () => {
    const templates: LibraryTeamTemplate[] = [
      makeTemplate({
        slug: "zebra",
        name: "Zebra Team",
        tags: ["python"],
      }),
      makeTemplate({
        slug: "alpha",
        name: "Alpha Team",
        tags: ["go"],
      }),
      makeTemplate({
        slug: "middle",
        name: "Middle Team",
        tags: ["rust"],
      }),
    ];

    const ranked = rankLibraryTeams(templates, {
      id: "p1",
      name: "Test",
      path: "/test",
      description: "",
      projectType: "Web App",
      language: "TypeScript",
      framework: "React",
      database: null,
      testing: null,
      styling: null,
      stackExtras: null,
      healthScore: 50,
      createdAt: "2024-01-01T00:00:00Z",
    });

    // All non-recommended, sorted alphabetically
    expect(ranked[0].template.name).toBe("Alpha Team");
    expect(ranked[1].template.name).toBe("Middle Team");
    expect(ranked[2].template.name).toBe("Zebra Team");
  });

  it("MAX_RECOMMENDED_TEAMS = 3 cap works", () => {
    expect(MAX_RECOMMENDED_TEAMS).toBe(3);

    // Create 5 universal templates (all would be recommended)
    const templates: LibraryTeamTemplate[] = Array.from({ length: 5 }, (_, i) =>
      makeTemplate({
        slug: `universal-${i}`,
        name: `Universal Team ${i}`,
        tags: ["universal"],
      }),
    );

    const ranked = rankLibraryTeams(templates, {
      id: "p1",
      name: "Test",
      path: "/test",
      description: "",
      projectType: "Web App",
      language: "TypeScript",
      framework: "React",
      database: null,
      testing: null,
      styling: null,
      stackExtras: null,
      healthScore: 50,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const recommendedCount = ranked.filter((r) => r.isRecommended).length;
    expect(recommendedCount).toBe(MAX_RECOMMENDED_TEAMS);
  });

  it("returns empty for no templates", () => {
    const ranked = rankLibraryTeams([], null);
    expect(ranked).toEqual([]);
  });
});
