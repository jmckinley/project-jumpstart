/**
 * @module e2e/memory.spec
 * @description E2E tests for Memory Management feature
 *
 * TESTS:
 * - Navigation to Memory section
 * - Memory Dashboard (health score, sources, stats)
 * - Learning Browser (filters, actions, promote)
 * - CLAUDE.md Analyzer (trigger analysis, view results)
 * - Tab switching between Dashboard, Learnings, Analyzer
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Memory Management", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    // Navigate to Memory section
    await page.locator("nav >> text=Claude Memory").click();
    await page.waitForTimeout(500);
  });

  test.describe("Navigation", () => {
    test("Claude Memory appears in sidebar", async ({ page }) => {
      await expect(page.locator("nav >> text=Claude Memory")).toBeVisible();
    });

    test("Claude Memory section loads with Dashboard tab", async ({ page }) => {
      await expect(page.locator("main").getByText("Memory Health").first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Dashboard Tab", () => {
    test("displays health score", async ({ page }) => {
      await expect(page.locator("main").getByText("85")).toBeVisible({ timeout: 5000 });
    });

    test("displays health rating badge", async ({ page }) => {
      await expect(page.locator("main").getByText("Excellent")).toBeVisible({ timeout: 5000 });
    });

    test("displays memory sources heading", async ({ page }) => {
      await expect(page.locator("main").getByText("Memory Sources").first()).toBeVisible({ timeout: 5000 });
    });

    test("lists memory sources", async ({ page }) => {
      await expect(page.locator("main").getByText("CLAUDE.md").first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator("main").getByText("testing.md")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("main").getByText("tdd-workflow")).toBeVisible({ timeout: 5000 });
    });

    test("groups sources by scope", async ({ page }) => {
      const main = page.locator("main");
      await expect(main.getByText("Project Sources")).toBeVisible({ timeout: 5000 });
      await expect(main.getByText("Global Sources")).toBeVisible({ timeout: 5000 });
    });

    test("shows global CLAUDE.md source", async ({ page }) => {
      await expect(
        page.locator("main").getByText("~/.claude/CLAUDE.md"),
      ).toBeVisible({ timeout: 5000 });
    });

    test("displays quick stats", async ({ page }) => {
      await expect(page.locator("main").getByText("Total Learnings")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("main").getByText("Active Learnings")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("main").getByText("Rules Files")).toBeVisible({ timeout: 5000 });
    });

    test("displays token usage bar", async ({ page }) => {
      await expect(page.locator("main").getByText("Estimated Token Usage")).toBeVisible({ timeout: 5000 });
    });

    test("refresh button works", async ({ page }) => {
      // Scroll the main panel to make the refresh button fully visible
      const main = page.locator("main");
      const refreshButton = main.locator("button:has-text('Refresh')");
      await expect(refreshButton).toBeVisible({ timeout: 10000 });
      await refreshButton.click({ force: true });
      // Allow loading to complete
      await page.waitForTimeout(1000);
      // After refresh, should still show the dashboard
      await expect(main.getByText("Memory Health").first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Tab Switching", () => {
    test("switches to Learnings tab", async ({ page }) => {
      await page.locator("main").getByText("Learnings (3)").click();
      await expect(page.locator("main").getByText("Filters")).toBeVisible({ timeout: 5000 });
    });

    test("switches to Analyzer tab", async ({ page }) => {
      await page.locator("main").getByText("Analyzer").click();
      await expect(page.locator("main").getByText("CLAUDE.md Analysis")).toBeVisible({ timeout: 5000 });
    });

    test("switches back to Dashboard from Learnings", async ({ page }) => {
      // Go to Learnings
      await page.locator("main").getByText("Learnings (3)").click();
      await expect(page.locator("main").getByText("Filters")).toBeVisible({ timeout: 5000 });

      // Go back to Dashboard
      await page.locator("main").getByText("Dashboard").first().click();
      await expect(page.locator("main").getByText("Memory Health").first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Learnings Tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.locator("main").getByText("Learnings (3)").click();
      await page.waitForTimeout(300);
    });

    test("displays filter pills for categories", async ({ page }) => {
      const main = page.locator("main");
      await expect(main.getByRole("button", { name: "Preference" })).toBeVisible({ timeout: 5000 });
      await expect(main.getByRole("button", { name: "Solution" })).toBeVisible();
      await expect(main.getByRole("button", { name: "Pattern" })).toBeVisible();
      await expect(main.getByRole("button", { name: "Gotcha" })).toBeVisible();
    });

    test("displays learning content", async ({ page }) => {
      const main = page.locator("main");
      await expect(main.getByText("User prefers terse responses")).toBeVisible({ timeout: 5000 });
      await expect(main.getByText("SQLite database locked error")).toBeVisible();
      await expect(main.getByText("Always run tests after modifying Rust files")).toBeVisible();
    });

    test("shows learnings count", async ({ page }) => {
      await expect(page.locator("main").getByText("Showing 3 of 3 learnings")).toBeVisible({ timeout: 5000 });
    });

    test("filters by category", async ({ page }) => {
      const main = page.locator("main");

      // Click Pattern filter
      await main.getByRole("button", { name: "Pattern" }).click();

      // Should show only 1 result
      await expect(main.getByText("Showing 1 of 3 learnings")).toBeVisible({ timeout: 5000 });
      await expect(main.getByText("Always run tests after modifying Rust files")).toBeVisible();
    });

    test("shows Verify button for active learnings", async ({ page }) => {
      const main = page.locator("main");
      await expect(main.getByText("Verify").first()).toBeVisible({ timeout: 5000 });
    });

    test("shows Promote button for active learnings", async ({ page }) => {
      const main = page.locator("main");
      await expect(main.getByText("Promote").first()).toBeVisible({ timeout: 5000 });
    });

    test("opens promote dropdown", async ({ page }) => {
      const main = page.locator("main");
      await main.getByText("Promote").first().click();
      await expect(main.getByText("Move to CLAUDE.md")).toBeVisible({ timeout: 5000 });
      await expect(main.getByText("Move to rules file")).toBeVisible();
    });
  });

  test.describe("Test Staleness Alert", () => {
    test("shows Check Staleness button on dashboard", async ({ page }) => {
      await expect(
        page.locator("main").getByRole("button", { name: "Check Staleness" }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("shows placeholder before checking", async ({ page }) => {
      await expect(
        page.locator("main").getByText('Click "Check Staleness" to scan for stale tests.'),
      ).toBeVisible({ timeout: 5000 });
    });

    test("displays staleness results after checking", async ({ page }) => {
      const main = page.locator("main");
      await main.getByRole("button", { name: "Check Staleness" }).click();

      // Wait for results
      await expect(main.getByText("1 stale")).toBeVisible({ timeout: 5000 });
      await expect(main.getByText("src/components/App.tsx", { exact: true })).toBeVisible();
    });
  });

  test.describe("Analyzer Tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.locator("main").getByText("Analyzer").click();
      await page.waitForTimeout(300);
    });

    test("shows analyze button", async ({ page }) => {
      await expect(page.locator("main").getByRole("button", { name: "Analyze", exact: true })).toBeVisible({ timeout: 5000 });
    });

    test("shows placeholder before analysis", async ({ page }) => {
      await expect(
        page.locator("main").getByText('Click "Analyze" to evaluate your CLAUDE.md quality'),
      ).toBeVisible({ timeout: 5000 });
    });

    test("runs analysis and shows results", async ({ page }) => {
      const main = page.locator("main");
      await main.getByRole("button", { name: "Analyze", exact: true }).click();

      // Wait for analysis results - use first() for texts that appear multiple times
      await expect(main.getByText("Score").first()).toBeVisible({ timeout: 10000 });
      await expect(main.getByText("85").first()).toBeVisible();
      await expect(main.getByText("Lines", { exact: true }).first()).toBeVisible();
      await expect(main.getByText("Tokens").first()).toBeVisible();
    });

    test("displays detected sections after analysis", async ({ page }) => {
      const main = page.locator("main");
      await main.getByRole("button", { name: "Analyze", exact: true }).click();

      await expect(main.getByText("Detected Sections")).toBeVisible({ timeout: 10000 });
      await expect(main.getByText("Overview")).toBeVisible();
      await expect(main.getByText("Tech Stack")).toBeVisible();
    });

    test("displays suggestions after analysis", async ({ page }) => {
      const main = page.locator("main");
      await main.getByRole("button", { name: "Analyze", exact: true }).click();

      await expect(main.getByText("Suggestions (1)")).toBeVisible({ timeout: 10000 });
      await expect(main.getByText("Move", { exact: true }).first()).toBeVisible();
    });

    test("displays lines to move after analysis", async ({ page }) => {
      const main = page.locator("main");
      await main.getByRole("button", { name: "Analyze", exact: true }).click();

      await expect(main.getByText("Lines to Move (1)")).toBeVisible({ timeout: 10000 });
      await expect(main.getByText(".claude/rules/documentation.md", { exact: true }).first()).toBeVisible();
    });
  });
});
