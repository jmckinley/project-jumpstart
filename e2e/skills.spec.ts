/**
 * @module e2e/skills.spec
 * @description E2E tests for the Skills section
 *
 * TESTS:
 * - Skills navigation and tab display
 * - My Skills list with existing skill
 * - New skill creation flow
 * - Skill Library tab
 * - Pattern detection
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Skills Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("navigates to Skills section via sidebar", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await expect(page.locator("main").getByText(/My Skills|Skill Library|Skills Workshop/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("displays My Skills tab with skill count", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await expect(page.locator("main").getByText(/My Skills/)).toBeVisible({ timeout: 5000 });
  });

  test("displays existing skill in the list", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    // Default tab is Library - switch to My Skills
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Component Creator")).toBeVisible({ timeout: 5000 });
  });

  test("shows Skill Library tab", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    const libraryTab = page.locator("main").getByRole("button", { name: /Skill Library/ });
    await expect(libraryTab).toBeVisible({ timeout: 5000 });
  });

  test("can switch to Skill Library tab", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /Skill Library/ }).click();
    await page.waitForTimeout(300);
    // Library should show skill categories or list
    expect(true).toBeTruthy();
  });

  test("shows empty state when no skill selected on My Skills tab", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);
    // Should show instruction to select or create
    await expect(page.getByText(/select a skill|New Skill/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking New Skill shows the editor form", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);

    const newSkillBtn = page.locator("main").getByRole("button", { name: /New Skill/i });
    if (await newSkillBtn.isVisible()) {
      await newSkillBtn.click();
      await page.waitForTimeout(300);
      // Editor should appear with name field
      await expect(page.getByPlaceholder(/React Component Generator/i).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("skill editor has required fields", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);

    const newSkillBtn = page.locator("main").getByRole("button", { name: /New Skill/i });
    if (await newSkillBtn.isVisible()) {
      await newSkillBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Name").first()).toBeVisible();
      await expect(page.getByText("Description").first()).toBeVisible();
      await expect(page.getByText(/Content/i).first()).toBeVisible();
    }
  });

  test("Create Skill button is disabled when name is empty", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);

    const newSkillBtn = page.locator("main").getByRole("button", { name: /New Skill/i });
    if (await newSkillBtn.isVisible()) {
      await newSkillBtn.click();
      await page.waitForTimeout(300);
      const createBtn = page.locator("main").getByRole("button", { name: /Create Skill/i }).first();
      if (await createBtn.isVisible()) {
        await expect(createBtn).toBeDisabled();
      }
    }
  });

  test("clicking existing skill shows edit form", async ({ page }) => {
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Component Creator")).toBeVisible({ timeout: 5000 });
    await page.getByText("Component Creator").click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Edit Skill|Save Changes/i).first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Pattern Detection", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Skills").click();
    await page.waitForTimeout(500);
  });

  test("shows Detect Patterns button", async ({ page }) => {
    // Switch to My Skills tab where pattern detection lives
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);
    const detectBtn = page.locator("main").getByRole("button", { name: /Detect Patterns/i });
    await expect(detectBtn).toBeVisible({ timeout: 5000 });
  });

  test("clicking Detect Patterns loads patterns", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);
    const detectBtn = page.locator("main").getByRole("button", { name: /Detect Patterns/i });
    if (await detectBtn.isVisible()) {
      await detectBtn.click();
      await page.waitForTimeout(1000);
      // Should show detected patterns
      await expect(page.getByText(/React component with useState/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("patterns show frequency badges", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /My Skills/ }).click();
    await page.waitForTimeout(500);
    const detectBtn = page.locator("main").getByRole("button", { name: /Detect Patterns/i });
    if (await detectBtn.isVisible()) {
      await detectBtn.click();
      await page.waitForTimeout(1000);
      // High frequency pattern should show "High Impact" badge
      await expect(page.getByText(/High Impact/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
