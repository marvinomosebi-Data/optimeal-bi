/**
 * MODULE: Price Trends (BI Dashboard)
 * Tests NBS chart rendering, range filter buttons, volatility table,
 * and KPI cards. All data is bundled locally — no Supabase needed.
 *
 * Test IDs: TC-TRN-001 → TC-TRN-008
 */

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/app/trends");
  // Wait for charts to mount
  await expect(page.getByText("NBS Food Price Index")).toBeVisible();
});

// ── TC-TRN-001 ──────────────────────────────────────────────────────────────
test("TC-TRN-001: Trends page loads three KPI cards", async ({ page }) => {
  await expect(page.getByText("Average Meal Cost (NBS-based)")).toBeVisible();
  await expect(page.getByText("Highest Inflation Item")).toBeVisible();
  await expect(page.getByText("₦1,500 Buys Today (portions)")).toBeVisible();
});

// ── TC-TRN-002 ──────────────────────────────────────────────────────────────
test("TC-TRN-002: NBS Food Price Index chart container is rendered", async ({ page }) => {
  await expect(page.getByText("NBS Food Price Index — Osun State")).toBeVisible();
  // Recharts renders an SVG inside a ResponsiveContainer
  await expect(page.locator("svg").first()).toBeVisible();
});

// ── TC-TRN-003 ──────────────────────────────────────────────────────────────
test("TC-TRN-003: Range filter buttons are rendered (3M, 6M, 12M, All)", async ({ page }) => {
  await expect(page.getByRole("button", { name: "3M" })).toBeVisible();
  await expect(page.getByRole("button", { name: "6M" })).toBeVisible();
  await expect(page.getByRole("button", { name: "12M" })).toBeVisible();
  await expect(page.getByRole("button", { name: "All" })).toBeVisible();
});

// ── TC-TRN-004 ──────────────────────────────────────────────────────────────
test("TC-TRN-004: Clicking range filter highlights selected button", async ({ page }) => {
  const btn3M = page.getByRole("button", { name: "3M" });
  await btn3M.click();
  await expect(btn3M).toHaveClass(/bg-navy/);
});

// ── TC-TRN-005 ──────────────────────────────────────────────────────────────
test("TC-TRN-005: Cafeteria Average Meal Cost bar chart is rendered", async ({ page }) => {
  await expect(page.getByText("Cafeteria Average Meal Cost")).toBeVisible();
  // At least 2 SVG elements (blended index + cafeteria bar)
  const svgs = page.locator("svg");
  expect(await svgs.count()).toBeGreaterThanOrEqual(2);
});

// ── TC-TRN-006 ──────────────────────────────────────────────────────────────
test("TC-TRN-006: Item-by-Item Price Comparison line chart is rendered", async ({ page }) => {
  await expect(page.getByText("Item-by-Item Price Comparison")).toBeVisible();
});

// ── TC-TRN-007 ──────────────────────────────────────────────────────────────
test("TC-TRN-007: NBS Price Volatility Table renders tracked items", async ({ page }) => {
  await expect(page.getByText("NBS Price Volatility Table")).toBeVisible();
  await expect(page.getByText("items tracked")).toBeVisible();
  // Table should have header columns
  await expect(page.getByText("Item (NBS)")).toBeVisible();
  await expect(page.getByText("Latest Price")).toBeVisible();
  await expect(page.getByText("Month-on-Month")).toBeVisible();
  await expect(page.getByText("12-Month Volatility")).toBeVisible();
});

// ── TC-TRN-008 ──────────────────────────────────────────────────────────────
test("TC-TRN-008: Subsidy removal reference line annotation is shown", async ({ page }) => {
  // The chart has a label "Subsidy removed" annotation
  await expect(page.getByText("Subsidy removed")).toBeVisible();
});
