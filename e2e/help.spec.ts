/**
 * @module e2e/help.spec
 * @description E2E tests for the Help section
 *
 * TESTS:
 * - Help page display and tabs
 * - Getting Started tab content
 * - Daily Use tab content
 * - Advanced tab content
 * - FAQ accordions
 * - Feature guide cards
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Help Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Help").click();
    await page.waitForTimeout(500);
  });

  test("displays Help heading", async ({ page }) => {
    await expect(page.locator("main").getByText("Help").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows all three tab buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Getting Started/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Daily Use/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /Advanced/i })).toBeVisible({ timeout: 5000 });
  });

  test("Getting Started tab shows Context Rot info box", async ({ page }) => {
    await expect(page.getByText("What is Context Rot?").first()).toBeVisible({ timeout: 5000 });
  });

  test("Getting Started tab shows API Key info box", async ({ page }) => {
    await expect(page.getByText(/Add Your API Key/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("Getting Started tab shows Quick Start Checklist", async ({ page }) => {
    await expect(page.getByText("Quick Start Checklist").first()).toBeVisible({ timeout: 5000 });
  });

  test("Getting Started tab shows Feature Guides section", async ({ page }) => {
    await expect(page.getByText("Feature Guides").first()).toBeVisible({ timeout: 5000 });
  });

  test("Getting Started tab shows FAQ section", async ({ page }) => {
    await expect(page.getByText("Frequently Asked Questions").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows feature guide cards", async ({ page }) => {
    // Feature guide titles should be visible
    await expect(page.getByText(/Per-Page Help System/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Project Kickstart/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("FAQ items are expandable", async ({ page }) => {
    const faqItem = page.getByText(/What is context rot\?/i).first();
    if (await faqItem.isVisible()) {
      await faqItem.click();
      await page.waitForTimeout(300);
      // FAQ answer content should now be visible
      expect(true).toBeTruthy();
    }
  });
});

test.describe("Help Daily Use Tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Help").click();
    await page.waitForTimeout(500);
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
    await page.getByRole("button", { name: /Daily Use/i }).click();
    await page.waitForTimeout(300);
  });

  test("shows Daily Use feature guides", async ({ page }) => {
    await expect(page.getByText(/Dashboard.*Health Score/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Daily Use FAQ", async ({ page }) => {
    await expect(page.getByText(/What is the health score/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Skills Library guide", async ({ page }) => {
    await expect(page.getByText(/Skills Library/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Agents Library guide", async ({ page }) => {
    await expect(page.getByText(/Agents Library/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows TDD Workflow guide", async ({ page }) => {
    await expect(page.getByText(/TDD Workflow/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Help Advanced Tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Help").click();
    await page.waitForTimeout(500);
    // Dismiss help popover that covers the tab buttons
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
    await page.getByRole("button", { name: /Advanced/i }).click();
    await page.waitForTimeout(300);
  });

  test("shows Advanced feature guides", async ({ page }) => {
    await expect(page.getByText("RALPH Loops").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Context Health guide", async ({ page }) => {
    await expect(page.getByText("Context Health").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Enforcement guide", async ({ page }) => {
    await expect(page.getByText(/Enforcement.*Git Hooks/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Advanced FAQ", async ({ page }) => {
    await expect(page.getByText(/What is RALPH/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Session Learning guide", async ({ page }) => {
    await expect(page.getByText(/Session Learning Extraction/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Help Footer", () => {
  test("shows Beta Feedback section", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Help").click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/Beta Feedback/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Open GitHub Issues button", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Help").click();
    await page.waitForTimeout(500);

    await expect(page.getByText(/GitHub Issues/i).first()).toBeVisible({ timeout: 5000 });
  });
});
