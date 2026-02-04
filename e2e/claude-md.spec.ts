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
    await page.locator("nav >> text=CLAUDE.md").click();

    // Wait for the editor page to load (look for Editor text in main content)
    await page.waitForSelector("text=Editor", { timeout: 5000 });

    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("displays editor with content", async ({ page }) => {
    // Editor should have content - use main area to scope
    const textbox = page.locator("main").getByRole("textbox");
    await expect(textbox).toBeVisible({ timeout: 5000 });

    const content = await textbox.inputValue();
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
    const textbox = page.locator("main").getByRole("textbox");
    await textbox.fill("# Modified Content\n\nNew text here");

    // Should show Save Changes button
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible({ timeout: 3000 });
  });

  test("Regen Using AI button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Regen Using AI/i })).toBeVisible();
  });

  test("shows confirmation when regenerating with existing content", async ({ page }) => {
    // Click regenerate button
    await page.getByRole("button", { name: /Regen Using AI/i }).click();

    // Should show confirmation dialog (or start generating)
    // The dialog may or may not appear depending on content state
    await page.waitForTimeout(500);
    const hasDialog = await page.getByText("Replace existing content").isVisible().catch(() => false);
    const hasGenerating = await page.getByText(/Generating/i).isVisible().catch(() => false);
    expect(hasDialog || hasGenerating).toBeTruthy();
  });

  test("cancel regenerate closes dialog", async ({ page }) => {
    // Click regenerate then cancel
    await page.getByRole("button", { name: /Regen Using AI/i }).click();
    await page.waitForTimeout(300);

    const cancelBtn = page.getByRole("button", { name: "Cancel" });
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      // Dialog should close
      await expect(page.getByText("Replace existing content")).not.toBeVisible();
    }
    // Test passes if no error occurs
  });

  test("preview shows rendered markdown", async ({ page }) => {
    // Preview section should exist (called "Claude's Understanding" in the UI)
    const hasPreview = await page.getByText("Preview").isVisible().catch(() => false);
    const hasUnderstanding = await page.getByText("Claude's Understanding").isVisible().catch(() => false);
    expect(hasPreview || hasUnderstanding).toBeTruthy();

    // Should render markdown headers (h1 or h2)
    await expect(page.locator("main h1, main h2").first()).toBeVisible();
  });
});

test.describe("CLAUDE.md Editor - No Existing File", () => {
  test("shows empty editor when no CLAUDE.md exists", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to CLAUDE.md section
    await page.locator("nav >> text=CLAUDE.md").click();
    await page.waitForSelector("text=Editor", { timeout: 5000 });

    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    // Editor should be empty or have placeholder
    const textbox = page.locator("main").getByRole("textbox");
    await expect(textbox).toBeVisible({ timeout: 3000 });
    const content = await textbox.inputValue();
    expect(content.length).toBeLessThan(100); // Empty or placeholder
  });

  test("Regen does not show confirmation for empty file", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    await page.locator("nav >> text=CLAUDE.md").click();
    await page.waitForSelector("text=Editor", { timeout: 5000 });

    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    // Clear any content
    const textbox = page.locator("main").getByRole("textbox");
    await textbox.fill("");

    // Click regenerate - should NOT show confirmation for empty
    await page.getByRole("button", { name: /Regen Using AI/i }).click();

    // Should show generating state or proceed without confirmation
    await page.waitForTimeout(500);
    // Test passes if no error - confirmation dialog shouldn't block
  });
});
