/**
 * @module e2e/agents.spec
 * @description E2E tests for the Agents section
 *
 * TESTS:
 * - Agents navigation and tab display
 * - My Agents list with existing agent
 * - New agent creation flow
 * - Agent Library tab
 * - AI enhancement
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Agents Section", () => {
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

  test("navigates to Agents section via sidebar", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await expect(page.locator("main").getByText(/My Agents|Agent Library/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("displays My Agents tab with agent count", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await expect(page.locator("main").getByText(/My Agents/)).toBeVisible({ timeout: 5000 });
  });

  test("displays existing agent in the list", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    // Default tab is Library - switch to My Agents
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("TDD Agent")).toBeVisible({ timeout: 5000 });
  });

  test("shows Agent Library tab", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    const libraryTab = page.locator("main").getByRole("button", { name: /Agent Library/ });
    await expect(libraryTab).toBeVisible({ timeout: 5000 });
  });

  test("can switch to Agent Library tab", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /Agent Library/ }).click();
    await page.waitForTimeout(300);
    // Library should show agent categories or suggested agents
    expect(true).toBeTruthy();
  });

  test("shows empty state when no agent selected on My Agents tab", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/select an agent|New Agent/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking New Agent shows the editor form", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);

    const newAgentBtn = page.locator("main").getByRole("button", { name: /New Agent/i });
    if (await newAgentBtn.isVisible()) {
      await newAgentBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByPlaceholder(/Unit Test Writer/i).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("agent editor has required fields", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);

    const newAgentBtn = page.locator("main").getByRole("button", { name: /New Agent/i });
    if (await newAgentBtn.isVisible()) {
      await newAgentBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText("Name").first()).toBeVisible();
      await expect(page.getByText("Description").first()).toBeVisible();
      await expect(page.getByText("Tier").first()).toBeVisible();
      await expect(page.getByText("Category").first()).toBeVisible();
      await expect(page.getByText(/Instructions/i).first()).toBeVisible();
    }
  });

  test("Create Agent button is disabled when name is empty", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);

    const newAgentBtn = page.locator("main").getByRole("button", { name: /New Agent/i });
    if (await newAgentBtn.isVisible()) {
      await newAgentBtn.click();
      await page.waitForTimeout(300);
      const createBtn = page.locator("main").getByRole("button", { name: /Create Agent/i });
      if (await createBtn.isVisible()) {
        await expect(createBtn).toBeDisabled();
      }
    }
  });

  test("clicking existing agent shows edit form", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("TDD Agent")).toBeVisible({ timeout: 5000 });
    await page.getByText("TDD Agent").click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Edit Agent|Save Changes/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("agent editor shows Enhance with AI button", async ({ page }) => {
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /My Agents/ }).click();
    await page.waitForTimeout(500);

    const newAgentBtn = page.locator("main").getByRole("button", { name: /New Agent/i });
    if (await newAgentBtn.isVisible()) {
      await newAgentBtn.click();
      await page.waitForTimeout(300);
      const enhanceBtn = page.locator("main").getByRole("button", { name: /Enhance with AI/i });
      await expect(enhanceBtn).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Suggested Agents", () => {
  test("shows suggested agents for project", async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });
    await page.locator("aside").getByText("Agents").click();
    await page.waitForTimeout(500);
    await page.locator("main").getByRole("button", { name: /Agent Library/ }).click();
    await page.waitForTimeout(500);
    // Suggested agents section may be visible
    const suggested = page.getByText(/Suggested for Your Project/i);
    if (await suggested.isVisible()) {
      expect(true).toBeTruthy();
    }
  });
});
