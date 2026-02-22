/**
 * @module e2e/performance.spec
 * @description E2E tests for the Performance Engineering section
 *
 * TESTS:
 * - Navigation to Performance section
 * - Overview tab: empty state, run analysis, score display, component breakdown
 * - Issues tab: issue display, severity badges, filtering, file paths, suggestions
 * - Architecture tab: findings display, status badges, recommendations
 * - Tab switching between Overview, Issues, Architecture
 * - Analyzing state (button disabled, loading text)
 */

import { test, expect } from "@playwright/test";
import { setupTauriMocks } from "./tauri-mocks";

test.describe("Performance Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Performance section
    await page.locator("nav >> text=Performance").click();

    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test("displays Performance section with tab navigation", async ({ page }) => {
    const main = page.locator("main");

    // All three tabs should be visible
    await expect(main.getByText("Overview")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText(/Issues/)).toBeVisible();
    await expect(main.getByText("Architecture")).toBeVisible();
  });

  test("shows Overview tab by default with empty state", async ({ page }) => {
    const main = page.locator("main");

    // Should show Performance Score heading
    await expect(main.getByText("Performance Score")).toBeVisible({ timeout: 5000 });

    // Should show Run Analysis button
    await expect(main.getByRole("button", { name: "Run Analysis" })).toBeVisible();

    // Should show empty state placeholder
    await expect(main.getByText(/Click.*Run Analysis/i)).toBeVisible();
  });

  test("shows Issues tab with empty state before analysis", async ({ page }) => {
    const main = page.locator("main");

    // Switch to Issues tab
    await main.getByText(/Issues/).click();

    // Should show empty state
    await expect(
      main.getByText("No issues found. Run an analysis to check for performance problems.")
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows Architecture tab with empty state before analysis", async ({ page }) => {
    const main = page.locator("main");

    // Switch to Architecture tab
    await main.getByText("Architecture").click();

    // Should show empty state
    await expect(
      main.getByText("No architecture findings yet. Run an analysis to check your project structure.")
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Performance Analysis", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Performance
    await page.locator("nav >> text=Performance").click();

    // Dismiss help popover if visible
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    // Run analysis
    const main = page.locator("main");
    await expect(main.getByRole("button", { name: "Run Analysis" })).toBeVisible({ timeout: 5000 });
    await main.getByRole("button", { name: "Run Analysis" }).click();

    // Wait for analysis to complete (mock has 500ms delay)
    await page.waitForTimeout(1000);
  });

  test("displays overall score after analysis", async ({ page }) => {
    const main = page.locator("main");

    // Score of 72 from mock data
    await expect(main.getByText("72")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("/ 100")).toBeVisible();
  });

  test("displays component breakdown after analysis", async ({ page }) => {
    const main = page.locator("main");

    // Breakdown section should appear
    await expect(main.getByText("Breakdown")).toBeVisible({ timeout: 5000 });

    // All 6 component labels
    await expect(main.getByText("Query Patterns")).toBeVisible();
    await expect(main.getByText("Rendering")).toBeVisible();
    await expect(main.getByText("Memory")).toBeVisible();
    await expect(main.getByText("Bundle Size")).toBeVisible();
    await expect(main.getByText("Caching")).toBeVisible();
    await expect(main.getByText("API Design")).toBeVisible();
  });

  test("displays component scores with max values", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("Breakdown")).toBeVisible({ timeout: 5000 });

    // Check component score values from mock: queryPatterns=16/20, rendering=14/20, etc.
    await expect(main.getByText("16 / 20")).toBeVisible(); // queryPatterns
    await expect(main.getByText("14 / 20")).toBeVisible(); // rendering
    await expect(main.getByText("12 / 15")).toBeVisible(); // memory
  });

  test("uses green color for high score (72)", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("72")).toBeVisible({ timeout: 5000 });

    // Score >= 70 should use green styling
    const scoreElement = main.locator(".text-green-500").first();
    await expect(scoreElement).toBeVisible();
  });

  test("updates Issues tab count after analysis", async ({ page }) => {
    const main = page.locator("main");

    // Issues tab should show count of 4 (from mock data)
    await expect(main.getByText("Issues (4)")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Performance Issues Tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Performance and run analysis
    await page.locator("nav >> text=Performance").click();
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const main = page.locator("main");
    await expect(main.getByRole("button", { name: "Run Analysis" })).toBeVisible({ timeout: 5000 });
    await main.getByRole("button", { name: "Run Analysis" }).click();
    await page.waitForTimeout(1000);

    // Switch to Issues tab
    await main.getByText("Issues (4)").click();
    await page.waitForTimeout(300);
  });

  test("displays all issues from analysis", async ({ page }) => {
    const main = page.locator("main");

    // All mock issues should be visible (use .first() since titles appear in both RemediationPanel and IssuesList)
    await expect(main.getByText("N+1 query detected in user loader").first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("Inline object in JSX prop").first()).toBeVisible();
    await expect(main.getByText("Event listener without cleanup").first()).toBeVisible();
    await expect(main.getByText("Heavy dependency detected: moment.js").first()).toBeVisible();
  });

  test("displays severity summary counts", async ({ page }) => {
    const main = page.locator("main");

    // Severity counts from mock: 1 critical, 2 warnings, 1 info
    await expect(main.getByText("1 critical")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("2 warnings")).toBeVisible();
    await expect(main.getByText("1 info")).toBeVisible();
  });

  test("displays severity badges on issues", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Severity badges should be displayed
    await expect(main.getByText("critical").first()).toBeVisible();
    await expect(main.getByText("warning").first()).toBeVisible();
    await expect(main.getByText("info").first()).toBeVisible();
  });

  test("displays file paths with line numbers", async ({ page }) => {
    const main = page.locator("main");

    // File paths from mock data
    await expect(main.getByText("src/services/userService.ts:42")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("src/components/Card.tsx:15")).toBeVisible();
    await expect(main.getByText("src/hooks/useResize.ts:8")).toBeVisible();
  });

  test("displays suggestions for issues", async ({ page }) => {
    const main = page.locator("main");

    // Suggestion labels should be visible
    const suggestions = main.getByText("Suggestion:");
    const count = await suggestions.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Specific suggestion content
    await expect(main.getByText(/batch query/i)).toBeVisible({ timeout: 5000 });
  });

  test("displays category labels on issues", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Category labels from mock data (use exact to avoid matching filter dropdown options)
    await expect(main.getByText("query-patterns", { exact: true })).toBeVisible();
    await expect(main.getByText("rendering", { exact: true }).first()).toBeVisible();
  });

  test("filters issues by category", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Select "Memory" category filter
    const categorySelect = main.locator("select").first();
    await categorySelect.selectOption("memory");

    // Should only show memory issues (use heading to target IssuesList cards, not RemediationPanel)
    await expect(main.getByRole("heading", { name: "Event listener without cleanup" })).toBeVisible();

    // Other issues should be hidden from the issues list (RemediationPanel still shows them)
    await expect(main.getByRole("heading", { name: "N+1 query detected in user loader" })).not.toBeVisible();
    await expect(main.getByRole("heading", { name: "Inline object in JSX prop" })).not.toBeVisible();
    await expect(main.getByRole("heading", { name: "Heavy dependency detected: moment.js" })).not.toBeVisible();
  });

  test("filters issues by severity", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Select "Critical" severity filter
    const severitySelect = main.locator("select").nth(1);
    await severitySelect.selectOption("critical");

    // Should only show critical issues (use heading to target IssuesList cards)
    await expect(main.getByRole("heading", { name: "N+1 query detected in user loader" })).toBeVisible();

    // Warning and info issues should be hidden from the issues list
    await expect(main.getByRole("heading", { name: "Inline object in JSX prop" })).not.toBeVisible();
    await expect(main.getByRole("heading", { name: "Heavy dependency detected: moment.js" })).not.toBeVisible();
  });

  test("shows no-match message when filters exclude all issues", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Select a category that has no critical issues
    const categorySelect = main.locator("select").first();
    await categorySelect.selectOption("caching");

    // Should show no-match message
    await expect(main.getByText("No issues match the current filters.")).toBeVisible();
  });

  test("resets filters to show all issues", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Filter to memory only (use heading to target IssuesList cards)
    const categorySelect = main.locator("select").first();
    await categorySelect.selectOption("memory");
    await expect(main.getByRole("heading", { name: "N+1 query detected in user loader" })).not.toBeVisible();

    // Reset to all
    await categorySelect.selectOption("all");

    // All issues should be visible again
    await expect(main.getByRole("heading", { name: "N+1 query detected in user loader" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Event listener without cleanup" })).toBeVisible();
  });
});

test.describe("Performance Architecture Tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Performance and run analysis
    await page.locator("nav >> text=Performance").click();
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const main = page.locator("main");
    await expect(main.getByRole("button", { name: "Run Analysis" })).toBeVisible({ timeout: 5000 });
    await main.getByRole("button", { name: "Run Analysis" }).click();
    await page.waitForTimeout(1000);

    // Switch to Architecture tab
    await main.getByText("Architecture").click();
    await page.waitForTimeout(300);
  });

  test("displays Architecture Review heading", async ({ page }) => {
    const main = page.locator("main");

    await expect(main.getByText("Architecture Review")).toBeVisible({ timeout: 5000 });
  });

  test("displays all architecture findings", async ({ page }) => {
    const main = page.locator("main");

    // All mock findings should be visible
    await expect(main.getByText("React Query configured for data fetching")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("No API rate limiting detected")).toBeVisible();
    await expect(main.getByText("No database connection pooling")).toBeVisible();
    await expect(main.getByText("Tree-shaking enabled via ESM imports")).toBeVisible();
  });

  test("displays status summary counts", async ({ page }) => {
    const main = page.locator("main");

    // Status counts from mock: 2 good, 1 warning, 1 missing
    await expect(main.getByText(/2.*good/i)).toBeVisible({ timeout: 5000 });
    await expect(main.getByText(/1.*warning/i)).toBeVisible();
    await expect(main.getByText(/1.*missing/i)).toBeVisible();
  });

  test("displays status badges on findings", async ({ page }) => {
    const main = page.locator("main");

    await expect(main.getByText("Good").first()).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("Warning").first()).toBeVisible();
    await expect(main.getByText("Missing").first()).toBeVisible();
  });

  test("displays recommendations for warning and missing findings", async ({ page }) => {
    const main = page.locator("main");

    // Warning finding should have recommendation
    await expect(main.getByText(/rate limiting middleware/i)).toBeVisible({ timeout: 5000 });

    // Missing finding should have recommendation (use .first() since title also contains this text)
    await expect(main.getByText(/Configure connection pooling/i).first()).toBeVisible();
  });

  test("does not display recommendations for good findings", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("React Query configured")).toBeVisible({ timeout: 5000 });

    // Recommendation labels should appear only for non-good items
    const recommendationLabels = main.getByText("Recommendation:");
    const count = await recommendationLabels.count();

    // Should have exactly 2 recommendations (warning + missing), not 4
    expect(count).toBe(2);
  });

  test("displays finding descriptions", async ({ page }) => {
    const main = page.locator("main");

    // Descriptions from mock data
    await expect(
      main.getByText("The project uses React Query with appropriate stale time and cache settings.")
    ).toBeVisible({ timeout: 5000 });
    await expect(
      main.getByText("API endpoints do not appear to implement rate limiting.")
    ).toBeVisible();
  });
});

test.describe("Performance Tab Switching", () => {
  test.beforeEach(async ({ page }) => {
    await setupTauriMocks(page, { hasApiKey: true, hasClaudeMd: true });
    await page.goto("/");
    await page.waitForSelector("text=Project Overview", { timeout: 10000 });

    // Navigate to Performance and run analysis
    await page.locator("nav >> text=Performance").click();
    const gotItBtn = page.getByRole("button", { name: "Got it" });
    if (await gotItBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotItBtn.click();
      await page.waitForTimeout(300);
    }

    const main = page.locator("main");
    await expect(main.getByRole("button", { name: "Run Analysis" })).toBeVisible({ timeout: 5000 });
    await main.getByRole("button", { name: "Run Analysis" }).click();
    await page.waitForTimeout(1000);
  });

  test("switches from Overview to Issues and back", async ({ page }) => {
    const main = page.locator("main");

    // Verify Overview is active
    await expect(main.getByText("Performance Score")).toBeVisible({ timeout: 5000 });

    // Switch to Issues
    await main.getByText("Issues (4)").click();
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Performance Score should not be visible (Overview content hidden)
    await expect(main.getByText("Performance Score")).not.toBeVisible();

    // Switch back to Overview
    await main.getByText("Overview").click();
    await expect(main.getByText("Performance Score")).toBeVisible({ timeout: 5000 });
  });

  test("switches from Overview to Architecture and back", async ({ page }) => {
    const main = page.locator("main");

    // Verify Overview is active
    await expect(main.getByText("Performance Score")).toBeVisible({ timeout: 5000 });

    // Switch to Architecture
    await main.getByText("Architecture").click();
    await expect(main.getByText("Architecture Review")).toBeVisible({ timeout: 5000 });

    // Switch back to Overview
    await main.getByText("Overview").click();
    await expect(main.getByText("Performance Score")).toBeVisible({ timeout: 5000 });
  });

  test("switches from Issues to Architecture", async ({ page }) => {
    const main = page.locator("main");

    // Go to Issues
    await main.getByText("Issues (4)").click();
    await expect(main.getByText("N+1 query detected").first()).toBeVisible({ timeout: 5000 });

    // Go to Architecture
    await main.getByText("Architecture").click();
    await expect(main.getByText("Architecture Review")).toBeVisible({ timeout: 5000 });

    // Issues content should be hidden
    await expect(main.getByRole("heading", { name: "N+1 query detected in user loader" })).not.toBeVisible();
  });
});
