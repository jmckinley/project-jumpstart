/**
 * @module e2e/settings.spec
 * @description E2E tests for Settings view
 *
 * TESTS:
 * - API key display
 * - API key validation
 * - Settings persistence
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Settings
    await page.locator("nav >> text=Settings").click();
    await page.waitForSelector("text=API Key", { timeout: 5000 });
  });

  test("displays API key section", async ({ page }) => {
    await expect(page.locator("text=API Key")).toBeVisible();
    await expect(page.locator("text=Anthropic")).toBeVisible();
  });

  test("shows masked API key when configured", async ({ page }) => {
    // API key should be masked (showing dots or partial)
    await expect(page.locator("text=/\\*{4,}|sk-.*\\.\\.\\./")).toBeVisible();
  });

  test("has save button", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: "Save" }).or(
      page.getByRole("button", { name: "Update" })
    );
    await expect(saveBtn.first()).toBeVisible();
  });
});

test.describe("Settings - No API Key", () => {
  test("shows empty state when no API key", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: false, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    await page.locator("nav >> text=Settings").click();
    await page.waitForSelector("text=API Key", { timeout: 5000 });

    // Should show input field or prompt to add key
    const input = page.locator("input[type='password'], input[type='text']").first();
    await expect(input).toBeVisible();
  });

  test("can enter new API key", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: false, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    await page.locator("nav >> text=Settings").click();
    await page.waitForSelector("text=API Key", { timeout: 5000 });

    // Find input and enter key
    const input = page.locator("input").first();
    await input.fill("sk-ant-test-new-key-12345");

    // Save button should be enabled
    const saveBtn = page.getByRole("button", { name: "Save" }).or(
      page.getByRole("button", { name: "Update" })
    );
    await expect(saveBtn.first()).toBeEnabled();
  });
});
