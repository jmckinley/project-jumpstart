/**
 * @module e2e/claude-md.spec
 * @description E2E tests for the CLAUDE.md Editor
 *
 * TESTS:
 * - Editor loads with content
 * - Preview shows markdown
 * - Save button state
 * - Regenerate button
 * - Token count display
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("CLAUDE.md Editor", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to CLAUDE.md section
    await page.locator("text=CLAUDE.md").first().click();
    await page.waitForSelector("textarea", { timeout: 5000 });
  });

  test("displays editor with content", async ({ page }) => {
    // Editor should have content
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    const content = await textarea.inputValue();
    expect(content).toContain("Test Project");
  });

  test("shows token estimate in header", async ({ page }) => {
    // Token count should be displayed
    await expect(page.locator("text=/\\d+ tokens/")).toBeVisible();
  });

  test("shows Saved state when no changes", async ({ page }) => {
    // Should show "Saved" when content matches
    await expect(page.locator("text=Saved")).toBeVisible();
  });

  test("shows Save Changes when content modified", async ({ page }) => {
    // Modify content
    const textarea = page.locator("textarea");
    await textarea.fill("# Modified Content\n\nNew text here");

    // Should show Save Changes button
    await expect(page.locator("button:has-text('Save Changes')")).toBeVisible();
    await expect(page.locator("text=Saved")).not.toBeVisible();
  });

  test("Regen Using AI button is visible", async ({ page }) => {
    await expect(page.locator("button:has-text('Regen Using AI')")).toBeVisible();
  });

  test("shows confirmation when regenerating with existing content", async ({ page }) => {
    // Click regenerate button
    await page.locator("button:has-text('Regen Using AI')").click();

    // Should show confirmation dialog
    await expect(page.locator("text=Replace existing content")).toBeVisible();
    await expect(page.locator("button:has-text('Cancel')")).toBeVisible();
    await expect(page.locator("button:has-text('Replace & Generate')")).toBeVisible();
  });

  test("cancel regenerate closes dialog", async ({ page }) => {
    // Click regenerate then cancel
    await page.locator("button:has-text('Regen Using AI')").click();
    await page.locator("button:has-text('Cancel')").click();

    // Dialog should close
    await expect(page.locator("text=Replace existing content")).not.toBeVisible();
  });

  test("preview shows rendered markdown", async ({ page }) => {
    // Preview section should exist
    await expect(page.locator("text=Preview")).toBeVisible();

    // Should render markdown headers
    const preview = page.locator("[class*='Preview']");
    await expect(preview.locator("h1")).toBeVisible();
  });
});

test.describe("CLAUDE.md Editor - No Existing File", () => {
  test("shows empty editor when no CLAUDE.md exists", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to CLAUDE.md section
    await page.locator("text=CLAUDE.md").first().click();
    await page.waitForSelector("textarea", { timeout: 5000 });

    // Editor should be empty or have placeholder
    const textarea = page.locator("textarea");
    const content = await textarea.inputValue();
    expect(content.length).toBeLessThan(50); // Empty or placeholder
  });

  test("Regen does not show confirmation for empty file", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    await page.locator("text=CLAUDE.md").first().click();
    await page.waitForSelector("textarea", { timeout: 5000 });

    // Clear any content
    await page.locator("textarea").fill("");

    // Click regenerate - should NOT show confirmation for empty
    await page.locator("button:has-text('Regen Using AI')").click();

    // Should show generating state, not confirmation
    // (Because content is empty, no need to confirm)
    await expect(page.locator("text=Generating")).toBeVisible({ timeout: 2000 });
  });
});
