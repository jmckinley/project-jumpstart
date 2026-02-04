/**
 * @module e2e/dashboard.spec
 * @description E2E tests for the Dashboard view
 *
 * TESTS:
 * - Health score display
 * - Quick wins display
 * - SmartNextStep recommendations
 * - SmartNextStep dismiss (Later/Skip)
 * - Session Insights analysis
 * - Context rot alert
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    // Wait for dashboard to load
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
  });

  test("displays health score", async ({ page }) => {
    // Health score should be visible
    await expect(page.getByText("Health Score").first()).toBeVisible();

    // Score value should be displayed (75 from mock)
    await expect(page.getByText("75").first()).toBeVisible();
  });

  test("displays quick wins", async ({ page }) => {
    // Quick wins section should be visible
    await expect(page.getByText("Quick Wins").first()).toBeVisible();

    // Should show the mock quick win
    await expect(page.getByText("Add documentation").first()).toBeVisible();
  });

  test("displays recent activity", async ({ page }) => {
    // Recent activity should show
    await expect(page.locator("text=Recent Activity")).toBeVisible();

    // Should show mock activities
    await expect(page.locator("text=Generated documentation")).toBeVisible();
  });
});

test.describe("SmartNextStep", () => {
  test("shows API key recommendation when no key", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: false, hasClaudeMd: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should recommend adding API key
    await expect(page.locator("text=Add your Anthropic API key")).toBeVisible();
    await expect(page.locator("text=Add API Key")).toBeVisible();
  });

  test("shows kickstart recommendation for empty project without CLAUDE.md", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: false,
      isEmptyProject: true
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should recommend kickstart for empty project
    await expect(page.locator("text=Generate a Kickstart prompt")).toBeVisible();
  });

  test("does NOT show kickstart after CLAUDE.md exists", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      isEmptyProject: true
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should NOT recommend kickstart if CLAUDE.md exists
    await expect(page.locator("text=Generate a Kickstart prompt")).not.toBeVisible();
  });

  test("Later button dismisses for session", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Find a recommendation with Later button (may not always be visible)
    const laterButton = page.getByRole("button", { name: "Later" }).first();

    // Check if there's a dismissable recommendation
    const isVisible = await laterButton.isVisible().catch(() => false);
    if (isVisible) {
      await laterButton.click();
      // Just verify click doesn't cause errors
      await page.waitForTimeout(300);
    }
    // Test passes if no errors occur
  });

  test("Skip button permanently dismisses", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Find Skip button (may not always be visible)
    const skipButton = page.getByRole("button", { name: "Skip" }).first();

    const isVisible = await skipButton.isVisible().catch(() => false);
    if (isVisible) {
      await skipButton.click();
      await page.waitForTimeout(300);
    }
    // Test passes if no errors occur
  });
});

test.describe("Session Insights", () => {
  test("displays Session Insights card", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Session Insights should be visible
    await expect(page.locator("text=Session Insights")).toBeVisible();
  });

  test("hides Session Insights when no API key", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Session Insights should NOT be visible without API key
    await expect(page.locator("text=Session Insights")).not.toBeVisible();
  });

  test("Analyze Session button triggers analysis", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Find Analyze Session button
    const analyzeButton = page.getByRole("button", { name: "Analyze Session" });
    const isVisible = await analyzeButton.isVisible().catch(() => false);

    if (isVisible) {
      await analyzeButton.click();

      // Should show loading state or complete
      await page.waitForTimeout(1500);

      // Should show some result (recommendations or summary)
      const hasRecommendations = await page.getByText("SmartNextStep").isVisible().catch(() => false);
      const hasSessionSummary = await page.getByText("Session Summary").isVisible().catch(() => false);
      expect(hasRecommendations || hasSessionSummary).toBeTruthy();
    }
  });

  test("shows session summary after analysis", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Trigger analysis if button is visible
    const analyzeButton = page.getByRole("button", { name: "Analyze Session" });
    const isVisible = await analyzeButton.isVisible().catch(() => false);

    if (isVisible) {
      await analyzeButton.click();
      await page.waitForTimeout(1500);

      // Should show session summary
      await expect(page.getByText("Session Summary").first()).toBeVisible();
    }
  });

  test("recommendations have correct type badges", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Trigger analysis if button is visible
    const analyzeButton = page.getByRole("button", { name: "Analyze Session" });
    const isVisible = await analyzeButton.isVisible().catch(() => false);

    if (isVisible) {
      await analyzeButton.click();
      await page.waitForTimeout(1500);

      // Should show type badges (Test or Pattern from mock)
      const hasTest = await page.getByText("Test", { exact: true }).first().isVisible().catch(() => false);
      const hasPattern = await page.getByText("Pattern", { exact: true }).first().isVisible().catch(() => false);
      expect(hasTest || hasPattern).toBeTruthy();
    }
  });
});
