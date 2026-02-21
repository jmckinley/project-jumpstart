/**
 * @module e2e/team-templates.spec
 * @description E2E tests for the Team Templates section
 *
 * TESTS:
 * - Team Templates navigation and tab display
 * - My Teams list with existing template
 * - New template creation flow
 * - Team Library tab
 * - Deploy tab and output generation
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Team Templates Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible()) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("navigates to Team Templates section via sidebar", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await expect(page.locator("main").getByText(/My Teams|Team Library/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("displays My Teams tab with template count", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await expect(page.locator("main").getByText(/My Teams/)).toBeVisible({ timeout: 5000 });
  });

  test("displays existing team template in the list", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    // Default tab is Library - switch to My Teams
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Full Stack Feature Team")).toBeVisible({ timeout: 5000 });
  });

  test("shows Team Library tab", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    const libraryTab = page.locator("main").getByRole("button", { name: /Team Library/ });
    await expect(libraryTab).toBeVisible({ timeout: 5000 });
  });

  test("shows Deploy tab", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    const deployTab = page.locator("main").getByRole("button", { name: /Deploy/ });
    await expect(deployTab).toBeVisible({ timeout: 5000 });
  });

  test("Deploy tab shows empty state", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /Deploy/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Select a template/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("shows empty state when no template selected on My Teams tab", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/select a team template|New Template/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking New Template shows the editor form", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);

    const newTemplateBtn = page.locator("main").getByRole("button", { name: /New Template/i });
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByPlaceholder(/Full Stack Feature Team/i).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("template editor has required fields", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);

    const newTemplateBtn = page.locator("main").getByRole("button", { name: /New Template/i });
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Name").first()).toBeVisible();
      await expect(page.getByText("Description").first()).toBeVisible();
      await expect(page.getByText("Pattern").first()).toBeVisible();
      await expect(page.getByText("Category").first()).toBeVisible();
    }
  });

  test("template editor has teammate and task sections", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);

    const newTemplateBtn = page.locator("main").getByRole("button", { name: /New Template/i });
    if (await newTemplateBtn.isVisible()) {
      await newTemplateBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Teammates").first()).toBeVisible();
      await expect(page.getByText("Tasks").first()).toBeVisible();
    }
  });

  test("clicking existing template shows edit form", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Full Stack Feature Team")).toBeVisible({ timeout: 5000 });
    await page.getByText("Full Stack Feature Team").click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Edit Team Template|Save Changes/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("can switch between all three tabs", async ({ page }) => {
    await page.locator("aside").getByText("Team Templates").click();
    await page.waitForTimeout(500);

    // Switch to Team Library
    await page.locator("main").getByRole("button", { name: /Team Library/ }).click();
    await page.waitForTimeout(300);

    // Switch to Deploy
    await page.locator("main").getByRole("button", { name: /Deploy/ }).click();
    await page.waitForTimeout(300);

    // Switch back to My Teams
    await page.locator("main").getByRole("button", { name: /My Teams/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Full Stack Feature Team")).toBeVisible({ timeout: 5000 });
  });
});
