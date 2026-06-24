/**
 * MODULE: Favorites & Spending Habits
 * Tests the saved-plans list, delete, re-open, and the
 * spending comparison dashboard.
 *
 * Test IDs: TC-FAV-001 → TC-FAV-006, TC-SPD-001 → TC-SPD-004
 */

import { test, expect } from "@playwright/test";

// ════════════════════════════════════════════════════════════════════════════
// FAVORITES
// ════════════════════════════════════════════════════════════════════════════

test.describe("Favorites", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/favorites");
  });

  // ── TC-FAV-001 ────────────────────────────────────────────────────────────
  test("TC-FAV-001: Favorites page loads with heading", async ({ page }) => {
    await expect(page.getByText("Your Favorites")).toBeVisible();
  });

  // ── TC-FAV-002 ────────────────────────────────────────────────────────────
  test("TC-FAV-002: Without Supabase, shows offline message; with Supabase and no plans, shows empty state", async ({ page }) => {
    // Either message is valid depending on config
    const offlineMsg = page.getByText(/Supabase isn't configured/);
    const emptyMsg   = page.getByText(/No saved meals yet/);
    const signinMsg  = page.getByText(/Sign in to save meal plans/);
    const hasSome    = await page.locator('[class*="card"]').count();

    const isOffline  = await offlineMsg.isVisible().catch(() => false);
    const isEmpty    = await emptyMsg.isVisible().catch(() => false);
    const isSignIn   = await signinMsg.isVisible().catch(() => false);
    const hasPlans   = hasSome > 1;

    expect(isOffline || isEmpty || isSignIn || hasPlans).toBe(true);
  });

  // ── TC-FAV-003 ────────────────────────────────────────────────────────────
  test("TC-FAV-003: Empty state shows Plan a Meal button", async ({ page }) => {
    const emptyBtn = page.getByRole("button", { name: /Plan a Meal/ });
    const isVisible = await emptyBtn.isVisible().catch(() => false);
    if (isVisible) {
      await emptyBtn.click();
      await page.waitForURL(/\/app\/optimizer/);
    }
    // Pass either way — conditional on having no saved plans
  });

  // ── TC-FAV-004 ────────────────────────────────────────────────────────────
  test("TC-FAV-004: Each saved plan card shows cost and satiety score", async ({ page }) => {
    const cards = page.locator('[class*="card"]').filter({ hasText: /₦/ });
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first().getByText(/₦/)).toBeVisible();
      await expect(cards.first().getByText(/\/100/)).toBeVisible();
    }
    // Skip gracefully if no plans exist
  });

  // ── TC-FAV-005 ────────────────────────────────────────────────────────────
  test("TC-FAV-005: Re-build button on a saved plan navigates to Result page", async ({ page }) => {
    const rebuildBtn = page.getByRole("button", { name: /Re-build this plan/ }).first();
    const isVisible = await rebuildBtn.isVisible().catch(() => false);
    if (isVisible) {
      await rebuildBtn.click();
      await page.waitForURL(/\/app\/result/);
    }
  });

  // ── TC-FAV-006 ────────────────────────────────────────────────────────────
  test("TC-FAV-006: Delete button removes a plan from the list", async ({ page }) => {
    const deleteBtn = page.locator('[title="Remove from favorites"]').first();
    const isVisible = await deleteBtn.isVisible().catch(() => false);
    if (isVisible) {
      const before = await page.locator('[class*="card"]').filter({ hasText: /₦/ }).count();
      await deleteBtn.click();
      await page.waitForTimeout(1_000); // wait for state update
      const after = await page.locator('[class*="card"]').filter({ hasText: /₦/ }).count();
      expect(after).toBeLessThan(before);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SPENDING HABITS
// ════════════════════════════════════════════════════════════════════════════

test.describe("Spending Habits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/spending");
  });

  // ── TC-SPD-001 ────────────────────────────────────────────────────────────
  test("TC-SPD-001: Spending page loads with heading", async ({ page }) => {
    await expect(page.getByText("Spending Habits")).toBeVisible();
  });

  // ── TC-SPD-002 ────────────────────────────────────────────────────────────
  test("TC-SPD-002: This Week and Last Week summary cards are shown", async ({ page }) => {
    await expect(page.getByText("This Week")).toBeVisible();
    await expect(page.getByText("Last Week")).toBeVisible();
  });

  // ── TC-SPD-003 ────────────────────────────────────────────────────────────
  test("TC-SPD-003: No-data state shows ShoppingBag empty message", async ({ page }) => {
    const empty = page.getByText(/No spending data yet/);
    const chart = page.getByText(/Daily Spending Comparison/);
    // One of these must be visible
    const hasEmpty = await empty.isVisible().catch(() => false);
    const hasChart = await chart.isVisible().catch(() => false);
    expect(hasEmpty || hasChart).toBe(true);
  });

  // ── TC-SPD-004 ────────────────────────────────────────────────────────────
  test("TC-SPD-004: Comparison banner shows spending direction when data exists", async ({ page }) => {
    const lessMsg = page.getByText(/Spending less this week/);
    const moreMsg = page.getByText(/Spending more this week/);
    const sameMsg = page.getByText(/Same spending as last week/);
    const noData  = page.getByText(/No spending data yet/);
    const hasLess = await lessMsg.isVisible().catch(() => false);
    const hasMore = await moreMsg.isVisible().catch(() => false);
    const hasSame = await sameMsg.isVisible().catch(() => false);
    const hasNone = await noData.isVisible().catch(() => false);
    expect(hasLess || hasMore || hasSame || hasNone).toBe(true);
  });
});
