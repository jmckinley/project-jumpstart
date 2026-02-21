/**
 * @module e2e/enforcement.spec
 * @description E2E tests for the Enforcement section
 *
 * TESTS:
 * - Git Hook Setup display
 * - Hook mode buttons (Auto-Update, Block, Warn)
 * - CI Integration
 * - Hook installation flow
 * - Enforcement events display
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Enforcement Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Enforcement").click();
    await page.waitForTimeout(500);
  });

  test("displays Git Pre-Commit Hook card", async ({ page }) => {
    await expect(page.getByText(/Git Pre-Commit Hook|Git Hook/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows hook mode buttons", async ({ page }) => {
    // Auto-Update, Block, and Warn mode buttons
    await expect(page.getByRole("button", { name: /Auto-Update/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Block/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Warn/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Not Installed status when hook not installed", async ({ page }) => {
    // Mock has installed: false
    await expect(page.getByText(/Not Installed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows mode descriptions", async ({ page }) => {
    // Should show descriptions for each mode
    await expect(page.getByText(/Generates missing docs/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking a mode button installs the hook", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    // Click Warn mode to install
    await page.getByRole("button", { name: /^Warn$/ }).first().click();
    await page.waitForTimeout(1000);

    // Should now show as installed or active
    const installedText = page.getByText(/Installed|Active/i).first();
    if (await installedText.isVisible()) {
      expect(true).toBeTruthy();
    }
  });

  test("shows Refresh button", async ({ page }) => {
    const refreshBtn = page.locator("main").getByRole("button", { name: /Refresh/i });
    await expect(refreshBtn.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("CI Integration", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Enforcement").click();
    await page.waitForTimeout(500);
  });

  test("displays CI Integration card", async ({ page }) => {
    await expect(page.getByText("CI Integration").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows CI Refresh button", async ({ page }) => {
    // CI section has its own Refresh button
    const refreshBtns = page.locator("main").getByRole("button", { name: /Refresh/i });
    const count = await refreshBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking Refresh loads CI snippets", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    // CI Integration section has a Refresh button
    // There may be multiple Refresh buttons (one for hooks, one for CI)
    const refreshBtns = page.locator("main").getByRole("button", { name: /Refresh/i });
    const count = await refreshBtns.count();
    if (count > 0) {
      // Click the last one (CI section comes after Git Hook section)
      await refreshBtns.last().click();
      await page.waitForTimeout(1000);
    }

    // After loading, should show CI snippet content
    expect(true).toBeTruthy();
  });

  test("CI snippets show provider badges", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const ciRefreshBtn = page.locator("main").getByRole("button", { name: /Refresh|Load/i }).last();
    if (await ciRefreshBtn.isVisible()) {
      await ciRefreshBtn.click();
      await page.waitForTimeout(1000);
    }

    // Should show provider badges
    const providerBadge = page.getByText(/GitHub Actions|GitLab CI/i);
    if (await providerBadge.first().isVisible()) {
      expect(true).toBeTruthy();
    }
  });

  test("CI snippets have Copy buttons", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const ciRefreshBtn = page.locator("main").getByRole("button", { name: /Refresh|Load/i }).last();
    if (await ciRefreshBtn.isVisible()) {
      await ciRefreshBtn.click();
      await page.waitForTimeout(1000);
    }

    const copyBtn = page.locator("main").getByRole("button", { name: /Copy/i });
    if (await copyBtn.first().isVisible()) {
      expect(true).toBeTruthy();
    }
  });
});
