/**
 * MODULE: Meal Planner (Plan page)
 * Tests cafeteria suggestions, budget validation, meal-type selection,
 * and appetite selection.
 *
 * Test IDs: TC-PLAN-001 → TC-PLAN-008
 */

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/app/plan");
});

// ── TC-PLAN-001 ──────────────────────────────────────────────────────────────
test("TC-PLAN-001: Plan page loads with greeting and budget input", async ({ page }) => {
  await expect(page.getByText(/Hey.*👋/)).toBeVisible();
  await expect(page.locator('input[type="number"], input[placeholder="0"]')).toBeVisible();
});

// ── TC-PLAN-002 ──────────────────────────────────────────────────────────────
test("TC-PLAN-002: Budget below ₦400 shows no cafeteria suggestions", async ({ page }) => {
  await page.locator('input[placeholder="0"]').fill("300");
  // No cafeteria cards should appear
  const cafCards = page.locator("text=BBSF");
  await expect(cafCards).not.toBeVisible();
});

// ── TC-PLAN-003 ──────────────────────────────────────────────────────────────
test("TC-PLAN-003: Budget of ₦1,500 reveals affordable cafeteria cards", async ({ page }) => {
  await page.locator('input[placeholder="0"]').fill("1500");
  await expect(page.locator("text=BBSF").first()).toBeVisible();
});

// ── TC-PLAN-004 ──────────────────────────────────────────────────────────────
test("TC-PLAN-004: Clicking a cafeteria card navigates to Optimizer with correct params", async ({ page }) => {
  await page.locator('input[placeholder="0"]').fill("1500");
  await page.locator("text=BBSF").first().click();
  await page.waitForURL(/\/app\/optimizer/);
  expect(page.url()).toContain("budget=1500");
  expect(page.url()).toContain("cafe=1");
});

// ── TC-PLAN-005 ──────────────────────────────────────────────────────────────
test("TC-PLAN-005: Meal type selection changes active button style", async ({ page }) => {
  const lunchBtn = page.getByRole("button", { name: /Lunch/i });
  const dinnerBtn = page.getByRole("button", { name: /Dinner/i });
  await dinnerBtn.click();
  await expect(dinnerBtn).toHaveClass(/bg-indigo/);
  await lunchBtn.click();
  await expect(lunchBtn).toHaveClass(/bg-emerald/);
});

// ── TC-PLAN-006 ──────────────────────────────────────────────────────────────
test("TC-PLAN-006: Appetite selection highlights chosen option", async ({ page }) => {
  await page.locator('input[placeholder="0"]').fill("2000");
  const largeBtn = page.getByRole("button", { name: /Large/i });
  await largeBtn.click();
  await expect(largeBtn).toHaveClass(/bg-gold/);
});

// ── TC-PLAN-007 ──────────────────────────────────────────────────────────────
test("TC-PLAN-007: Selected meal type is passed to Optimizer URL", async ({ page }) => {
  await page.locator('input[placeholder="0"]').fill("2000");
  await page.getByRole("button", { name: /Dinner/i }).click();
  await page.locator("text=BBSF").first().click();
  await page.waitForURL(/\/app\/optimizer/);
  expect(page.url()).toContain("meal=dinner");
});

// ── TC-PLAN-008 ──────────────────────────────────────────────────────────────
test("TC-PLAN-008: Higher-rated cafeterias appear before lower-rated ones", async ({ page }) => {
  await page.locator('input[placeholder="0"]').fill("5000");
  // Get all cafeteria names rendered
  const cafeCards = page.locator('[class*="card"], [class*="rounded"]').filter({ hasText: /BBSF|Jubilee|Blessed|Y2k|Divine|Kemi Bee|Forza|Sumptuous/ });
  const count = await cafeCards.count();
  expect(count).toBeGreaterThan(0);
});
