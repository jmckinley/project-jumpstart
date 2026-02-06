/**
 * @module e2e/hooks-setup.spec
 * @description E2E tests for the hooks setup flow
 *
 * TESTS:
 * - Navigation to hooks-setup section
 * - QuickHooksSetup display and functionality
 * - Config generation and copy
 * - After setup navigation
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Hooks Setup", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      hasTestFramework: true,
      hasClaudeCodeHooks: false,
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
  });

  test("shows Set Up Hooks in sidebar when conditions met", async ({ page }) => {
    // With hasTestFramework=true and hasClaudeCodeHooks=false,
    // the sidebar should show the hooks setup option in sidebar (nav area)
    await expect(page.locator("aside").getByText("Set Up Hooks")).toBeVisible();
  });

  test("navigating to hooks-setup section shows setup view", async ({ page }) => {
    // Click on Set Up Hooks in sidebar
    await page.locator("aside").getByText("Set Up Hooks").click();

    // Should navigate to hooks setup view - look in main content
    await expect(page.locator("main").getByRole("heading", { name: "Claude Code Hooks" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator("main").getByText("Auto-run tests on every file change")).toBeVisible();
  });

  test("QuickHooksSetup displays detected framework info", async ({ page }) => {
    await page.locator("aside").getByText("Set Up Hooks").click();

    // Should show detected framework (vitest from mock)
    await expect(page.locator("main").getByText("Detected Framework")).toBeVisible({ timeout: 5000 });
    // Use exact match to avoid matching the command
    await expect(page.locator("main").getByText("Vitest", { exact: true })).toBeVisible();
  });

  test("Generate button produces configuration", async ({ page }) => {
    await page.locator("aside").getByText("Set Up Hooks").click();

    // Click generate button
    const generateButton = page.locator("main").getByRole("button", { name: /Generate & Copy/i });
    await expect(generateButton).toBeVisible({ timeout: 5000 });
    await generateButton.click();

    // Should show button text change to indicate copied, or show generated config
    await expect(
      page.locator("main").getByRole("button", { name: /Copied! Paste into/i })
        .or(page.locator("main").getByText("Generated Configuration"))
    ).toBeVisible({ timeout: 5000 });
  });

  test("explanation sections visible in full variant", async ({ page }) => {
    await page.locator("aside").getByText("Set Up Hooks").click();

    // Should show explanation sections in full variant
    await expect(page.locator("main").getByText("Detected Framework")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("main").getByText("Test Command")).toBeVisible();
    await expect(page.locator("main").getByText("File Patterns")).toBeVisible();
  });
});

test.describe("Hooks Setup - Already Configured", () => {
  test("hides Set Up Hooks when hooks already configured", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      hasTestFramework: true,
      hasClaudeCodeHooks: true, // Hooks already configured
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should NOT show Set Up Hooks in sidebar
    await expect(page.locator("aside").getByText("Set Up Hooks")).not.toBeVisible();
  });
});

test.describe("Hooks Setup - No Test Framework", () => {
  test("hides Set Up Hooks when no test framework", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: true,
      hasTestFramework: false, // No test framework
      hasClaudeCodeHooks: false,
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Should NOT show Set Up Hooks in sidebar
    await expect(page.locator("aside").getByText("Set Up Hooks")).not.toBeVisible();
  });
});
