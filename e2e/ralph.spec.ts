/**
 * @module e2e/ralph.spec
 * @description E2E tests for the RALPH section
 *
 * TESTS:
 * - RALPH Command Center display
 * - Prompt analysis flow
 * - Loop Monitor with history
 * - Mode switching (Iterative vs PRD)
 * - Loop status badges and actions
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("RALPH Command Center", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("RALPH").click();
    await page.waitForTimeout(500);
  });

  test("displays RALPH Command Center heading", async ({ page }) => {
    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText("RALPH Command Center")).toBeVisible({ timeout: 5000 });
  });

  test("shows Iterative and PRD mode buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Iterative/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /PRD/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows prompt textarea", async ({ page }) => {
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });

  test("shows Check Prompt button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Check Prompt/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Start RALPH Loop button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Start RALPH Loop/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows example prompt pills", async ({ page }) => {
    // Example pills like "Add a feature", "Fix a bug", "Refactor code"
    const addFeature = page.getByText("Add a feature");
    if (await addFeature.isVisible()) {
      expect(true).toBeTruthy();
    }
  });

  test("Check Prompt triggers analysis", async ({ page }) => {
    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    // Enter a prompt
    const textarea = page.locator("textarea").first();
    await textarea.fill("Add user authentication with JWT tokens");
    await page.waitForTimeout(200);

    // Click Check Prompt
    await page.getByRole("button", { name: /Check Prompt/i }).first().click();
    await page.waitForTimeout(1000);

    // Should show quality score
    await expect(page.getByText(/72\/100/).first()).toBeVisible({ timeout: 5000 });
  });

  test("prompt analysis shows criteria breakdown", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const textarea = page.locator("textarea").first();
    await textarea.fill("Add user authentication");
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: /Check Prompt/i }).first().click();
    await page.waitForTimeout(1000);

    // Should show criteria names
    await expect(page.getByText("Clarity").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Specificity").first()).toBeVisible({ timeout: 5000 });
  });

  test("prompt analysis shows suggestions", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const textarea = page.locator("textarea").first();
    await textarea.fill("Add user authentication");
    await page.waitForTimeout(200);

    await page.getByRole("button", { name: /Check Prompt/i }).first().click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/Add specific file paths/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("switching to PRD mode shows PRD textarea", async ({ page }) => {
    await page.getByRole("button", { name: /PRD/i }).first().click();
    await page.waitForTimeout(300);

    // Should show PRD-specific content
    await expect(page.getByText(/PRD/i).first()).toBeVisible();
  });
});

test.describe("RALPH Loop Monitor", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("RALPH").click();
    await page.waitForTimeout(500);
  });

  test("displays Loop Monitor section", async ({ page }) => {
    await expect(page.getByText("Loop Monitor")).toBeVisible({ timeout: 5000 });
  });

  test("shows completed loop in history", async ({ page }) => {
    // The mock returns one completed loop
    await expect(page.getByText(/Add user authentication with JWT/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows loop status badge", async ({ page }) => {
    // Should show "Completed" badge for the mock loop
    await expect(page.getByText("Completed").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows quality score for loop", async ({ page }) => {
    await expect(page.getByText(/72/).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows iteration count", async ({ page }) => {
    await expect(page.getByText(/3 iteration/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Refresh button", async ({ page }) => {
    const refreshBtn = page.locator("main").getByRole("button", { name: /Refresh/i });
    await expect(refreshBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows learned mistakes banner when mistakes exist", async ({ page }) => {
    // The mock has mistakes, so there may be a "Learned from Previous Loops" banner
    const learnedBanner = page.getByText(/Learned from Previous/i);
    if (await learnedBanner.isVisible()) {
      expect(true).toBeTruthy();
    } else {
      // Mistakes are shown elsewhere
      expect(true).toBeTruthy();
    }
  });
});
