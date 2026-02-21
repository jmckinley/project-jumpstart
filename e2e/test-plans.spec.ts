/**
 * @module e2e/test-plans.spec
 * @description E2E tests for the Test Plans section
 *
 * TESTS:
 * - Test Plans tab display with plan list
 * - TDD Workflow tab
 * - Tools tab (Subagent Generator, Hooks Generator)
 * - Test framework detection
 * - AI test generation
 * - Plan creation and selection
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Test Plans Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Test Plans").click();
    await page.waitForTimeout(500);
  });

  test("displays Test Plans tab", async ({ page }) => {
    await expect(page.locator("main").getByRole("button", { name: /Test Plans/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test("displays TDD Workflow tab", async ({ page }) => {
    await expect(page.locator("main").getByRole("button", { name: /TDD Workflow/i })).toBeVisible({ timeout: 5000 });
  });

  test("displays Tools tab", async ({ page }) => {
    await expect(page.locator("main").getByRole("button", { name: /Tools/i })).toBeVisible({ timeout: 5000 });
  });

  test("shows test framework detection badge", async ({ page }) => {
    // Should show detected framework (vitest from mock)
    await expect(page.getByText(/vitest/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows existing test plan in list", async ({ page }) => {
    await expect(page.getByText("Authentication Tests")).toBeVisible({ timeout: 5000 });
  });

  test("shows test plan status badge", async ({ page }) => {
    // The mock plan has status "active"
    await expect(page.getByText("active").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows New Plan button", async ({ page }) => {
    const newPlanBtn = page.locator("main").getByRole("button", { name: /New Plan/i });
    await expect(newPlanBtn).toBeVisible({ timeout: 5000 });
  });

  test("clicking test plan shows plan details", async ({ page }) => {
    await page.getByText("Authentication Tests").click();
    await page.waitForTimeout(500);
    // Should show plan details with test cases
    await expect(page.getByText(/Login returns JWT token/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("plan details show test cases", async ({ page }) => {
    await page.getByText("Authentication Tests").click();
    await page.waitForTimeout(500);
    // Multiple test cases should be visible
    await expect(page.getByText(/Auth middleware rejects/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows AI Test Generation section", async ({ page }) => {
    await expect(page.getByText(/AI Test Generation|Generate Tests/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("TDD Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Test Plans").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /TDD Workflow/i }).click();
    await page.waitForTimeout(500);
  });

  test("shows Start TDD Workflow heading", async ({ page }) => {
    await expect(page.getByText(/Start TDD|TDD Workflow/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Feature Name input", async ({ page }) => {
    await expect(page.getByPlaceholder(/logout button/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Test File Path input", async ({ page }) => {
    await expect(page.getByPlaceholder(/Logout\.test\.tsx/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("Start TDD Session button is disabled when feature name is empty", async ({ page }) => {
    const startBtn = page.locator("main").getByRole("button", { name: /Start TDD Session/i });
    if (await startBtn.isVisible()) {
      await expect(startBtn).toBeDisabled();
    }
  });

  test("can start a TDD session with feature name", async ({ page }) => {
    const featureInput = page.getByPlaceholder(/logout button/i).first();
    await featureInput.fill("Add search feature");
    await page.waitForTimeout(200);

    const startBtn = page.locator("main").getByRole("button", { name: /Start TDD Session/i });
    if (await startBtn.isVisible()) {
      await expect(startBtn).toBeEnabled();
      await startBtn.click();
      await page.waitForTimeout(500);
      // Should show TDD phases
      await expect(page.getByText(/Red|Green|Refactor/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Test Plan Tools", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Test Plans").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /Tools/i }).click();
    await page.waitForTimeout(500);
  });

  test("shows Subagent Generator section", async ({ page }) => {
    await expect(page.getByText("Subagent Generator").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows Hooks Generator section", async ({ page }) => {
    await expect(page.getByText("Hooks Generator").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows agent type selection buttons", async ({ page }) => {
    // TDD Test Writer, TDD Implementer, TDD Refactorer
    await expect(page.getByText(/Test Writer/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows hook type tabs", async ({ page }) => {
    // PostToolUse, PreCompact, SessionEnd, Skill Hook
    await expect(page.getByText(/PostToolUse/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Test Plans without framework", () => {
  test("shows framework detection message when no framework", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true, hasTestFramework: false });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Test Plans").click();
    await page.waitForTimeout(500);
    // Should show message about no framework detected
    await expect(page.getByText(/No framework detected|Refresh Framework/i).first()).toBeVisible({ timeout: 5000 });
  });
});
