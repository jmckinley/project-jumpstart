/**
 * @module data/agentLibrary.test
 * @description Unit tests for Skeptical Reviewer agent in the agent library
 *
 * PURPOSE:
 * - Verify Skeptical Reviewer agent exists with correct structure
 * - Validate agent tier, category, and tags
 * - Ensure workflow, tools, and trigger patterns are properly defined
 *
 * DEPENDENCIES:
 * - @/data/agentLibrary - AGENT_LIBRARY array of agents
 *
 * EXPORTS:
 * - None (test file)
 *
 * PATTERNS:
 * - Test agent metadata and advanced tier features
 * - Verify workflow has all required steps
 * - Verify tools include required file_read and git_diff
 *
 * CLAUDE NOTES:
 * - Skeptical Reviewer is auto-added to new projects
 * - Agent tier is "advanced" (has workflow, tools, trigger patterns)
 * - Category is "code-review"
 */

import { describe, it, expect } from "vitest";
import { AGENT_LIBRARY } from "./agentLibrary";

describe("Skeptical Reviewer Agent", () => {
  const agent = AGENT_LIBRARY.find((a) => a.slug === "skeptical-reviewer");

  describe("existence and basic metadata", () => {
    it("should exist in the library", () => {
      expect(agent).toBeDefined();
    });

    it("should have correct name", () => {
      expect(agent?.name).toBe("Skeptical Reviewer");
    });

    it("should have a description about finding bugs", () => {
      expect(agent?.description).toContain("bug");
    });
  });

  describe("tier and category", () => {
    it("should be advanced tier", () => {
      expect(agent?.tier).toBe("advanced");
    });

    it("should be in code-review category", () => {
      expect(agent?.category).toBe("code-review");
    });
  });

  describe("tags", () => {
    it("should have tags array", () => {
      expect(agent?.tags).toBeInstanceOf(Array);
    });

    it("should have universal tag", () => {
      expect(agent?.tags).toContain("universal");
    });
  });

  describe("instructions", () => {
    it("should have instructions content", () => {
      expect(agent?.instructions).toBeTruthy();
      expect(typeof agent?.instructions).toBe("string");
    });

    it("should mention reading CLAUDE.md", () => {
      expect(agent?.instructions).toContain("CLAUDE.md");
    });

    it("should mention edge cases", () => {
      expect(agent?.instructions).toContain("edge case");
    });

    it("should include severity levels", () => {
      expect(agent?.instructions).toContain("Critical");
      expect(agent?.instructions).toContain("High");
      expect(agent?.instructions).toContain("Medium");
      expect(agent?.instructions).toContain("Low");
    });
  });

  describe("workflow", () => {
    it("should have workflow array", () => {
      expect(agent?.workflow).toBeInstanceOf(Array);
    });

    it("should have 6 workflow steps", () => {
      expect(agent?.workflow).toHaveLength(6);
    });

    it("should start with read_context action", () => {
      expect(agent?.workflow?.[0].action).toBe("read_context");
      expect(agent?.workflow?.[0].step).toBe(1);
    });

    it("should end with report action", () => {
      expect(agent?.workflow?.[5].action).toBe("report");
      expect(agent?.workflow?.[5].step).toBe(6);
    });

    it("should have all required actions", () => {
      const actions = agent?.workflow?.map((w) => w.action);
      expect(actions).toContain("read_context");
      expect(actions).toContain("examine_changes");
      expect(actions).toContain("trace_edge_cases");
      expect(actions).toContain("challenge_assumptions");
      expect(actions).toContain("check_tests");
      expect(actions).toContain("report");
    });

    it("should have descriptions for all steps", () => {
      agent?.workflow?.forEach((step) => {
        expect(step.description).toBeTruthy();
        expect(typeof step.description).toBe("string");
      });
    });
  });

  describe("tools", () => {
    it("should have tools array", () => {
      expect(agent?.tools).toBeInstanceOf(Array);
    });

    it("should have file_read tool", () => {
      const fileReadTool = agent?.tools?.find((t) => t.name === "file_read");
      expect(fileReadTool).toBeDefined();
      expect(fileReadTool?.required).toBe(true);
    });

    it("should have git_diff tool", () => {
      const gitDiffTool = agent?.tools?.find((t) => t.name === "git_diff");
      expect(gitDiffTool).toBeDefined();
      expect(gitDiffTool?.required).toBe(true);
    });

    it("should have test_runner tool", () => {
      const testRunnerTool = agent?.tools?.find((t) => t.name === "test_runner");
      expect(testRunnerTool).toBeDefined();
      expect(testRunnerTool?.required).toBe(false);
    });

    it("should have descriptions for all tools", () => {
      agent?.tools?.forEach((tool) => {
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe("string");
      });
    });
  });

  describe("trigger patterns", () => {
    it("should have trigger patterns array", () => {
      expect(agent?.triggerPatterns).toBeInstanceOf(Array);
    });

    it("should include 'review' trigger", () => {
      expect(agent?.triggerPatterns).toContain("review");
    });

    it("should include 'check' trigger", () => {
      expect(agent?.triggerPatterns).toContain("check");
    });

    it("should include 'grill' trigger", () => {
      expect(agent?.triggerPatterns).toContain("grill");
    });

    it("should include 'find bugs' trigger", () => {
      expect(agent?.triggerPatterns).toContain("find bugs");
    });
  });
});
