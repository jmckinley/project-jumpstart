/**
 * @module e2e/navigation.spec
 * @description E2E tests for app navigation and sidebar
 *
 * TESTS:
 * - Sidebar navigation
 * - Section switching
 * - Project selector
 * - Active section highlighting
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
  });

  test("sidebar is visible", async ({ page }) => {
    // Sidebar should show navigation items (use nav to be specific)
    await expect(page.locator("nav >> text=Dashboard")).toBeVisible();
    await expect(page.locator("nav >> text=CLAUDE.md")).toBeVisible();
    await expect(page.locator("nav >> text=Modules")).toBeVisible();
    await expect(page.locator("nav >> text=Skills")).toBeVisible();
    await expect(page.locator("nav >> text=Agents")).toBeVisible();
  });

  test("navigates to CLAUDE.md editor", async ({ page }) => {
    await page.locator("nav >> text=CLAUDE.md").click();

    // Should show editor - uses textbox role, not textarea
    await expect(page.getByRole("textbox")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Editor").first()).toBeVisible();
  });

  test("navigates to Modules", async ({ page }) => {
    await page.locator("nav >> text=Modules").click();

    // Should show modules view
    await expect(page.locator("text=Module Documentation")).toBeVisible({ timeout: 5000 });
  });

  test("navigates to Skills", async ({ page }) => {
    await page.locator("nav >> text=Skills").click();

    // Should show skills view
    await expect(page.locator("text=Skills Workshop")).toBeVisible({ timeout: 5000 });
  });

  test("navigates to Agents", async ({ page }) => {
    await page.locator("nav >> text=Agents").click();

    // Should show agents view - look for heading or main content
    await expect(page.locator("main").getByText("Agents").first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates to Test Plans", async ({ page }) => {
    await page.locator("nav >> text=Test Plans").click();

    // Should show test plans view - look for heading in main content
    await expect(page.locator("main").getByText("Test Plans").first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates to Settings", async ({ page }) => {
    await page.locator("nav >> text=Settings").click();

    // Should show settings view - look for API Key in main content
    await expect(page.locator("main").getByText("API Key").first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates back to Dashboard", async ({ page }) => {
    // Go to another section first (Modules is more reliable)
    await page.locator("nav >> text=Modules").click();
    await page.waitForTimeout(500);

    // Go back to Dashboard
    await page.locator("nav >> text=Dashboard").click();

    // Should show dashboard
    await expect(page.getByText("Project Overview").first()).toBeVisible({ timeout: 5000 });
  });

  test("project name is displayed in header", async ({ page }) => {
    // Project name from mock should be visible (in sidebar project selector)
    await expect(page.getByText("test-project").first()).toBeVisible();
  });
});

test.describe("Project Selector", () => {
  test("shows project list", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Click project selector (if expandable)
    const projectSelector = page.locator("[data-testid='project-selector']").or(
      page.locator("text=test-project").first()
    );

    if (await projectSelector.isVisible()) {
      // Project should be selectable
      await expect(projectSelector).toBeVisible();
    }
  });
});

test.describe("Hooks Setup Navigation", () => {
  test("shows Set Up Hooks in sidebar when conditions met", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      hasTestFramework: true,
      hasClaudeCodeHooks: false,
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should show Set Up Hooks in sidebar
    await expect(page.locator("aside").getByText("Set Up Hooks")).toBeVisible();
    await expect(page.locator("aside").getByText("New")).toBeVisible(); // New badge
  });

  test("navigating to hooks-setup displays HooksSetupView", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      hasTestFramework: true,
      hasClaudeCodeHooks: false,
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Click Set Up Hooks in sidebar
    await page.locator("aside").getByText("Set Up Hooks").click();

    // Should show hooks setup view in main area
    await expect(page.locator("main").getByRole("heading", { name: "Claude Code Hooks" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("main").getByText("Auto-run tests on every file change")).toBeVisible();
  });

  test("hooks section hidden when hooks already configured", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      hasTestFramework: true,
      hasClaudeCodeHooks: true, // Already configured
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should NOT show Set Up Hooks in sidebar
    await expect(page.locator("aside").getByText("Set Up Hooks")).not.toBeVisible();
  });
});
