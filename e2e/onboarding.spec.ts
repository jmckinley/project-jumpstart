/**
 * @module e2e/onboarding.spec
 * @description E2E tests for the onboarding wizard
 *
 * TESTS:
 * - Wizard shows when no projects exist
 * - Step indicator displays all 4 steps
 * - Folder selection advances to step 2
 * - Enforcement checkbox defaults to unchecked in step 3
 * - Enforcement option has descriptive text
 * - Enforcement can be toggled on and appears in review
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

/** Navigate from step 1 through to the Goals step (step 3) */
async function navigateToGoalsStep(page: import("@playwright/test").Page) {
  // Step 1: Click "Select Project Folder" — dialog plugin mock returns a path
  await page.getByText("Select Project Folder").click();
  // scan_project mock returns detection results, auto-advances to step 2
  await page.waitForTimeout(1000);

  // Step 2: Analysis Results — click Next to go to step 3
  const nextBtn = page.getByRole("button", { name: "Next" });
  await expect(nextBtn).toBeVisible({ timeout: 5000 });
  await nextBtn.click();
  await page.waitForTimeout(500);

  // Verify we're on step 3 (Goals)
  await expect(page.getByText("What will you use Claude Code for?")).toBeVisible({ timeout: 5000 });
}

test.describe("Onboarding Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: false, noProjects: true });
    await page.goto("/");
    await page.waitForSelector("text=Welcome to Project Jumpstart", { timeout: 10000 });
  });

  test("shows onboarding wizard when no projects exist", async ({ page }) => {
    await expect(page.getByText("Welcome to Project Jumpstart")).toBeVisible();
    await expect(page.getByText("Select Project Folder")).toBeVisible();
  });

  test("shows step indicator with 4 steps", async ({ page }) => {
    await expect(page.getByText("Select Project", { exact: true })).toBeVisible();
    await expect(page.getByText("Analysis")).toBeVisible();
    await expect(page.getByText("Goals")).toBeVisible();
    await expect(page.getByText("Review")).toBeVisible();
  });

  test("folder selection advances to analysis step", async ({ page }) => {
    await page.getByText("Select Project Folder").click();
    await page.waitForTimeout(1000);

    // Should be on step 2 now with detected project info
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Onboarding - Enforcement Option", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: false, noProjects: true });
    await page.goto("/");
    await page.waitForSelector("text=Welcome to Project Jumpstart", { timeout: 10000 });
    await navigateToGoalsStep(page);
  });

  test("enforcement checkbox defaults to unchecked", async ({ page }) => {
    const enforcementLabel = page.locator("label").filter({ hasText: /pre-commit hook/i });
    await expect(enforcementLabel).toBeVisible({ timeout: 5000 });

    const checkbox = enforcementLabel.locator("input[type='checkbox']");
    await expect(checkbox).not.toBeChecked();
  });

  test("enforcement option describes the hook functionality", async ({ page }) => {
    // Should mention the pre-commit hook
    await expect(page.getByText(/pre-commit hook/i).first()).toBeVisible({ timeout: 5000 });
    // Should mention Anthropic API for auto-generation
    await expect(page.getByText(/Anthropic API/i).first()).toBeVisible();
    // Should mention self-healing
    await expect(page.getByText(/self-healing/i).first()).toBeVisible();
    // Should mention it can be configured later
    await expect(page.getByText(/Enforcement section/i).first()).toBeVisible();
  });

  test("module docs checkbox defaults to checked", async ({ page }) => {
    const moduleDocsLabel = page.locator("label").filter({ hasText: /Generate module documentation/i });
    await expect(moduleDocsLabel).toBeVisible({ timeout: 5000 });

    const checkbox = moduleDocsLabel.locator("input[type='checkbox']");
    await expect(checkbox).toBeChecked();
  });

  test("enforcement checkbox can be toggled on", async ({ page }) => {
    const enforcementLabel = page.locator("label").filter({ hasText: /pre-commit hook/i });
    const checkbox = enforcementLabel.locator("input[type='checkbox']");

    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test("review step shows enforcement when enabled", async ({ page }) => {
    // Enable enforcement
    const enforcementLabel = page.locator("label").filter({ hasText: /pre-commit hook/i });
    await enforcementLabel.locator("input[type='checkbox']").click();

    // Navigate to step 4 (Review)
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(500);

    // Should show enforcement in "What We'll Create" section
    await expect(page.getByText(/Pre-commit hook with AI-powered doc enforcement/i)).toBeVisible({ timeout: 5000 });
  });

  test("review step does not show enforcement when disabled", async ({ page }) => {
    // Enforcement is already unchecked by default, go directly to Review
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(500);

    // Should NOT show enforcement line
    await expect(page.getByText(/Pre-commit hook with AI-powered doc enforcement/i)).not.toBeVisible();
  });
});
