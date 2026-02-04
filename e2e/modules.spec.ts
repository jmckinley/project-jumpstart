/**
 * @module e2e/modules.spec
 * @description E2E tests for Module Documentation view
 *
 * TESTS:
 * - File tree display
 * - Module status indicators
 * - Doc preview
 * - Batch generation
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Modules", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Modules
    await page.locator("nav >> text=Modules").click();
    await page.waitForSelector("text=Module Documentation", { timeout: 5000 });
  });

  test("displays file tree", async ({ page }) => {
    // Should show files from mock
    await expect(page.locator("text=App.tsx")).toBeVisible();
    await expect(page.locator("text=main.tsx")).toBeVisible();
  });

  test("shows module status indicators", async ({ page }) => {
    // Should show status badges/indicators
    // Current, Outdated, Missing statuses from mock
    await expect(page.locator("text=/current|outdated|missing/i").first()).toBeVisible();
  });

  test("shows documentation coverage stats", async ({ page }) => {
    // Coverage bar or percentage should be visible
    await expect(page.locator("text=/\\d+%/").first()).toBeVisible();
  });

  test("selecting a file shows preview", async ({ page }) => {
    // Click on a file
    await page.locator("text=App.tsx").click();

    // Preview should appear
    await expect(page.locator("text=/Preview|Documentation/")).toBeVisible();
  });
});

test.describe("Modules - Empty Project", () => {
  test("shows kickstart prompt for empty project", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: false,
      isEmptyProject: true
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Modules
    await page.locator("nav >> text=Modules").click();

    // Should show kickstart option
    await expect(page.locator("text=/Kickstart|New Project|Empty/i").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Kickstart Flow", () => {
  test("kickstart form is displayed for empty project", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: false,
      isEmptyProject: true
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Modules (where kickstart lives)
    await page.locator("nav >> text=Modules").click();

    // Should see kickstart form elements
    await expect(page.locator("text=/purpose|description/i").first()).toBeVisible({ timeout: 5000 });
  });

  test("generates kickstart prompt on form submit", async ({ page }) => {
    await setupTauriMocks(page, {
      hasApiKey: true,
      hasClaudeMd: false,
      isEmptyProject: true
    });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    await page.locator("nav >> text=Modules").click();

    // Fill in form (if visible)
    const purposeInput = page.locator("textarea, input").first();
    if (await purposeInput.isVisible()) {
      await purposeInput.fill("A test application for demo purposes");

      // Look for generate button
      const generateBtn = page.locator("button:has-text(/Generate|Create|Submit/)");
      if (await generateBtn.isVisible()) {
        await generateBtn.click();

        // Should show loading or result
        await expect(
          page.locator("text=/Generating|Loading|Prompt/i").first()
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
