/**
 * MODULE: Navigation, Route Guards & Error Pages
 * Tests unauthenticated redirect, 404 page, admin-only route,
 * sidebar navigation links, and footer.
 *
 * Test IDs: TC-NAV-001 → TC-NAV-010
 */

import { test, expect } from "@playwright/test";

// ── TC-NAV-001 ──────────────────────────────────────────────────────────────
test("TC-NAV-001: Accessing /app/plan without auth redirects to login page", async ({ page }) => {
  // Use a fresh context with no session
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/app/plan");
  // Should redirect to / (login page)
  await expect(page).toHaveURL("/", { timeout: 5_000 });
  await expect(page.locator("h1")).toContainText("OptiMeal");
});

// ── TC-NAV-002 ──────────────────────────────────────────────────────────────
test("TC-NAV-002: Accessing /app/result without auth redirects to login page", async ({ page }) => {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/app/result?budget=1500&cafe=1&appetite=Normal&crave=&avoid=");
  await expect(page).toHaveURL("/", { timeout: 5_000 });
});

// ── TC-NAV-003 ──────────────────────────────────────────────────────────────
test("TC-NAV-003: Visiting an unknown route shows the 404 page", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByText(/doesn't exist/)).toBeVisible();
});

// ── TC-NAV-004 ──────────────────────────────────────────────────────────────
test("TC-NAV-004: 404 page Go Back Home button navigates to /app/plan", async ({ page }) => {
  await page.goto("/totally-unknown-path");
  await page.getByRole("button", { name: /Go Back Home/ }).click();
  await page.waitForURL(/\/app\/plan/);
});

// ── TC-NAV-005 ──────────────────────────────────────────────────────────────
test("TC-NAV-005: Sidebar / Topbar navigation links work (authenticated)", async ({ page }) => {
  await page.goto("/app/plan");
  // Click Trends link
  const trendsLink = page.getByRole("link", { name: /Trends/i })
    .or(page.locator("a[href*='trends']"))
    .first();
  if (await trendsLink.isVisible()) {
    await trendsLink.click();
    await page.waitForURL(/\/app\/trends/);
  }
});

// ── TC-NAV-006 ──────────────────────────────────────────────────────────────
test("TC-NAV-006: /app root redirects to /app/plan", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL(/\/app\/plan/, { timeout: 5_000 });
});

// ── TC-NAV-007 ──────────────────────────────────────────────────────────────
test("TC-NAV-007: Admin route redirects a non-admin student to /app/plan", async ({ page }) => {
  // Authenticated as a student (storageState has student role)
  await page.goto("/app/admin");
  // A student should be redirected away from admin
  await expect(page).not.toHaveURL(/\/app\/admin/, { timeout: 5_000 });
});

// ── TC-NAV-008 ──────────────────────────────────────────────────────────────
test("TC-NAV-008: Login page title is OptiMeal BI", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/OptiMeal BI/);
});

// ── TC-NAV-009 ──────────────────────────────────────────────────────────────
test("TC-NAV-009: Footer displays developer credit on Optimizer/Result pages", async ({ page }) => {
  await page.goto("/app/optimizer?budget=1500&cafe=1&meal=lunch");
  await expect(page.getByText(/Omosebi Marvellous Joshua/)).toBeVisible();
  await expect(page.getByText(/Bowen University/)).toBeVisible();
});

// ── TC-NAV-010 ──────────────────────────────────────────────────────────────
test("TC-NAV-010: Navigating browser Back from Result returns to Optimizer", async ({ page }) => {
  await page.goto("/app/optimizer?budget=1500&cafe=1&meal=lunch");
  await page.getByRole("button", { name: /Optimize My Meal/ }).click();
  await page.waitForURL(/\/app\/result/);
  await page.goBack();
  await expect(page).toHaveURL(/\/app\/optimizer/);
});
