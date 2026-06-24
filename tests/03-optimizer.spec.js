/**
 * MODULE: Optimizer
 * Tests budget input, cafeteria selection, appetite toggle,
 * crave/avoid preference chips, and the Optimize button.
 *
 * Test IDs: TC-OPT-001 → TC-OPT-010
 */

import { test, expect } from "@playwright/test";

const BASE = "/app/optimizer?budget=1500&cafe=1&meal=lunch";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE);
  // Wait for the menu to load (cafeteria card should be highlighted)
  await expect(page.getByText("BBSF")).toBeVisible();
});

// ── TC-OPT-001 ──────────────────────────────────────────────────────────────
test("TC-OPT-001: Optimizer page loads with budget pre-filled from URL", async ({ page }) => {
  const budgetInput = page.locator('input[type="number"]');
  await expect(budgetInput).toHaveValue("1500");
});

// ── TC-OPT-002 ──────────────────────────────────────────────────────────────
test("TC-OPT-002: Live satiety score preview updates when budget changes", async ({ page }) => {
  const budgetInput = page.locator('input[type="number"]');
  const satietyBar  = page.locator("text=Est. satiety score");

  const before = await page.locator("text=Est. satiety score").locator("..").innerText();
  await budgetInput.fill("3000");
  await expect(page.locator("text=Est. satiety score").locator("..")).not.toHaveText(before, { timeout: 3_000 });
});

// ── TC-OPT-003 ──────────────────────────────────────────────────────────────
test("TC-OPT-003: Quick-pick budget buttons fill the input correctly", async ({ page }) => {
  await page.getByRole("button", { name: "₦2,000" }).click();
  await expect(page.locator('input[type="number"]')).toHaveValue("2000");
});

// ── TC-OPT-004 ──────────────────────────────────────────────────────────────
test("TC-OPT-004: Selecting a different cafeteria updates the active card", async ({ page }) => {
  await page.getByText("Jubilee").click();
  // Jubilee card should become active (navy background)
  await expect(page.locator("button", { hasText: "Jubilee" }).first()).toHaveClass(/bg-navy/);
});

// ── TC-OPT-005 ──────────────────────────────────────────────────────────────
test("TC-OPT-005: Budget too low shows infeasibility warning", async ({ page }) => {
  await page.locator('input[type="number"]').fill("50");
  await expect(page.getByText(/Budget too low/)).toBeVisible({ timeout: 3_000 });
});

// ── TC-OPT-006 ──────────────────────────────────────────────────────────────
test("TC-OPT-006: Tapping a food item once marks it as Craved (gold chip)", async ({ page }) => {
  // Find the first preference chip (e.g., Rice, Beans, etc.)
  const firstChip = page.locator('button[class*="border-slate"]').filter({ hasNotText: "₦0" }).first();
  await firstChip.click();
  await expect(firstChip).toHaveClass(/border-gold/);
});

// ── TC-OPT-007 ──────────────────────────────────────────────────────────────
test("TC-OPT-007: Tapping a craved item again marks it as Avoided (red chip)", async ({ page }) => {
  const firstChip = page.locator('button[class*="border-slate"]').filter({ hasNotText: "₦0" }).first();
  await firstChip.click(); // → crave
  await firstChip.click(); // → avoid
  await expect(firstChip).toHaveClass(/border-red/);
});

// ── TC-OPT-008 ──────────────────────────────────────────────────────────────
test("TC-OPT-008: Tapping an avoided item a third time clears its preference", async ({ page }) => {
  const firstChip = page.locator('button[class*="border-slate"]').filter({ hasNotText: "₦0" }).first();
  await firstChip.click(); // crave
  await firstChip.click(); // avoid
  await firstChip.click(); // clear
  await expect(firstChip).not.toHaveClass(/border-red/);
  await expect(firstChip).not.toHaveClass(/border-gold/);
});

// ── TC-OPT-009 ──────────────────────────────────────────────────────────────
test("TC-OPT-009: Clear All button removes all crave/avoid preferences", async ({ page }) => {
  const chip = page.locator('button[class*="border-slate"]').filter({ hasNotText: "₦0" }).first();
  await chip.click(); // mark something
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(chip).not.toHaveClass(/border-gold/);
  await expect(chip).not.toHaveClass(/border-red/);
});

// ── TC-OPT-010 ──────────────────────────────────────────────────────────────
test("TC-OPT-010: Optimize My Meal button navigates to Result page", async ({ page }) => {
  await page.getByRole("button", { name: /Optimize My Meal/ }).click();
  await page.waitForURL(/\/app\/result/);
  await expect(page.getByText("Optimized Meal Plan")).toBeVisible();
});
