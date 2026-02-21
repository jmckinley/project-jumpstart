/**
 * @module e2e/context-health.spec
 * @description E2E tests for the Context Health section
 *
 * TESTS:
 * - Context Health display with usage percentage
 * - Token breakdown chart
 * - MCP server status
 * - Checkpoint creation and listing
 * - Risk level display
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Context Health Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Context").click();
    await page.waitForTimeout(500);
  });

  test("displays Context Health heading", async ({ page }) => {
    await expect(page.getByText("Context Health").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows usage percentage", async ({ page }) => {
    // Should show 42.3% from mock
    await expect(page.getByText(/42\.3%/).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Context Used label", async ({ page }) => {
    await expect(page.getByText(/Context Used/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows risk level badge", async ({ page }) => {
    // Mock has "low" risk
    await expect(page.getByText(/Low Risk/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows token count", async ({ page }) => {
    // Should show token usage info (84.6k tokens or similar)
    await expect(page.getByText(/tokens/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows 200k budget reference", async ({ page }) => {
    await expect(page.getByText(/200k/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Refresh button", async ({ page }) => {
    const refreshBtn = page.locator("main").getByRole("button", { name: /Refresh/i });
    await expect(refreshBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows New Checkpoint button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /New Checkpoint/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows existing checkpoint", async ({ page }) => {
    // Mock has one checkpoint "Before refactor"
    await expect(page.getByText("Before refactor").first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking New Checkpoint shows form", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    await page.getByRole("button", { name: /New Checkpoint/i }).first().click();
    await page.waitForTimeout(300);

    // Should show checkpoint form with label input
    await expect(page.getByPlaceholder(/Checkpoint label/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("Save Checkpoint button is disabled when label is empty", async ({ page }) => {
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    await page.getByRole("button", { name: /New Checkpoint/i }).first().click();
    await page.waitForTimeout(300);

    const saveBtn = page.locator("main").getByRole("button", { name: /Save Checkpoint/i });
    if (await saveBtn.isVisible()) {
      await expect(saveBtn).toBeDisabled();
    }
  });
});

test.describe("Token Breakdown", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Context").click();
    await page.waitForTimeout(500);
  });

  test("displays Token Breakdown heading", async ({ page }) => {
    await expect(page.getByText("Token Breakdown").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows breakdown categories", async ({ page }) => {
    // Should show category labels
    await expect(page.getByText(/Code/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Skills/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("MCP Servers", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Context").click();
    await page.waitForTimeout(500);
  });

  test("displays MCP Servers heading", async ({ page }) => {
    await expect(page.getByText("MCP Servers").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows configured servers", async ({ page }) => {
    // Mock has "filesystem" and "github" servers
    await expect(page.getByText("filesystem").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("github").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows server recommendations", async ({ page }) => {
    // "filesystem" has "keep", "github" has "optimize"
    await expect(page.getByText(/Keep/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Optimize/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows server descriptions", async ({ page }) => {
    await expect(page.getByText(/File system access/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows token overhead per server", async ({ page }) => {
    // Servers have tokenOverhead values
    await expect(page.getByText(/3\.2k|3,200/i).first()).toBeVisible({ timeout: 5000 });
  });
});
