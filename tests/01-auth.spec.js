/**
 * MODULE: Authentication
 * Tests the login page UI, form validation, tab switching, and
 * password recovery flow without requiring a live Supabase backend.
 *
 * Test IDs: TC-AUTH-001 → TC-AUTH-012
 */

import { test, expect } from "@playwright/test";

// These tests run against the login page only — no auth state needed.
// Override the project storageState by using a fresh context.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("OptiMeal");
});

// ── TC-AUTH-001 ──────────────────────────────────────────────────────────────
test("TC-AUTH-001: Login page renders Sign In and Create Account tabs", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
});

// ── TC-AUTH-002 ──────────────────────────────────────────────────────────────
test("TC-AUTH-002: Sign In tab is active by default", async ({ page }) => {
  const signInTab = page.getByRole("button", { name: "Sign In" });
  await expect(signInTab).toHaveClass(/bg-white/);
});

// ── TC-AUTH-003 ──────────────────────────────────────────────────────────────
test("TC-AUTH-003: Switching to Create Account tab shows registration fields", async ({ page }) => {
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByPlaceholder("Omosebi Marvellous")).toBeVisible(); // Full name
  await expect(page.getByPlaceholder(/bowen\.edu\.ng/)).toBeVisible();     // Email
});

// ── TC-AUTH-004 ──────────────────────────────────────────────────────────────
test("TC-AUTH-004: Sign-up validates password minimum length", async ({ page }) => {
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.getByPlaceholder("Omosebi Marvellous").fill("Test User");
  await page.getByPlaceholder(/BU2/).fill("22CSC1001");
  await page.getByPlaceholder(/bowen\.edu\.ng/).fill("test@bowen.edu.ng");
  await page.locator('input[placeholder="At least 6 characters"]').fill("abc");
  await page.getByRole("button", { name: "Create Account" }).last().click();
  await expect(page.locator("text=at least 6 characters")).toBeVisible();
});

// ── TC-AUTH-005 ──────────────────────────────────────────────────────────────
test("TC-AUTH-005: Sign In with empty fields shows Supabase-not-configured error", async ({ page }) => {
  // When Supabase is not set up, clicking Sign In with any input shows an error
  await page.locator('input[placeholder*="BU2"]').fill("22CSC9999");
  await page.locator('input[type="password"]').fill("wrongpassword");
  await page.getByRole("button", { name: /Sign In/ }).last().click();
  // Expect an error message to appear (either "not configured" or "not registered")
  await expect(page.locator('[class*="red"]').first()).toBeVisible({ timeout: 5_000 });
});

// ── TC-AUTH-006 ──────────────────────────────────────────────────────────────
test("TC-AUTH-006: Password visibility toggle works on Sign In form", async ({ page }) => {
  const pwInput = page.locator('input[placeholder="••••••••"]');
  await expect(pwInput).toHaveAttribute("type", "password");
  await page.locator('button[type="button"]').first().click(); // eye toggle
  await expect(pwInput).toHaveAttribute("type", "text");
  await page.locator('button[type="button"]').first().click();
  await expect(pwInput).toHaveAttribute("type", "password");
});

// ── TC-AUTH-007 ──────────────────────────────────────────────────────────────
test("TC-AUTH-007: Forgot password link shows password recovery form", async ({ page }) => {
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByText("Forgot your password?")).toBeVisible();
  await expect(page.getByPlaceholder(/bowen\.edu\.ng/)).toBeVisible();
});

// ── TC-AUTH-008 ──────────────────────────────────────────────────────────────
test("TC-AUTH-008: Back to Sign In link on recovery page returns to login", async ({ page }) => {
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByRole("button", { name: /Back to Sign In/ }).click();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
});

// ── TC-AUTH-009 ──────────────────────────────────────────────────────────────
test("TC-AUTH-009: Send Reset Link button is disabled when email field is empty", async ({ page }) => {
  await page.getByRole("button", { name: "Forgot password?" }).click();
  const sendBtn = page.getByRole("button", { name: /Send Reset Link/ });
  await expect(sendBtn).toBeDisabled();
});

// ── TC-AUTH-010 ──────────────────────────────────────────────────────────────
test("TC-AUTH-010: Send Reset Link button becomes enabled when email is entered", async ({ page }) => {
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByPlaceholder(/bowen\.edu\.ng/).fill("test@bowen.edu.ng");
  const sendBtn = page.getByRole("button", { name: /Send Reset Link/ });
  await expect(sendBtn).toBeEnabled();
});

// ── TC-AUTH-011 ──────────────────────────────────────────────────────────────
test("TC-AUTH-011: Create Account tab shows Bowen-email-only notice", async ({ page }) => {
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText(/Bowen University students and staff only/)).toBeVisible();
});

// ── TC-AUTH-012 ──────────────────────────────────────────────────────────────
test("TC-AUTH-012: Password confirmation mismatch shows inline error", async ({ page }) => {
  await page.getByRole("button", { name: "Create Account" }).click();
  // Fill minimum required fields
  await page.getByPlaceholder("Omosebi Marvellous").fill("Test User");
  await page.getByPlaceholder(/BU2/).fill("22CSC1001");
  await page.getByPlaceholder(/bowen\.edu\.ng/).fill("test@bowen.edu.ng");
  await page.locator('input[placeholder="At least 6 characters"]').fill("password123");
  await page.locator('input[placeholder="Repeat password"]').fill("differentpass");
  await expect(page.getByText("Passwords do not match")).toBeVisible();
});
