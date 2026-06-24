/**
 * Global auth setup — runs once before all tests.
 * Logs in with TEST_USER_ID + TEST_USER_PW env vars and saves the browser
 * storage state to tests/.auth/session.json so every test reuses it.
 *
 * Usage:
 *   TEST_USER_ID=22CSC1080 TEST_USER_PW=yourpassword npx playwright test
 *
 * If the env vars are not set, a fake session is injected via localStorage
 * so the routing works; Supabase-backed features (save, favorites) will still
 * fail gracefully — those tests document expected error messages instead.
 */

import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = "tests/.auth/session.json";

setup("authenticate", async ({ page }) => {
  const testId = process.env.TEST_USER_ID;
  const testPw = process.env.TEST_USER_PW;

  if (testId && testPw) {
    // ── Real Supabase login ──────────────────────────────────────────────
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("OptiMeal");

    // Sign-in tab should already be active
    await page.fill('input[placeholder*="BU2"]', testId);
    await page.fill('input[type="password"]', testPw);
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Wait for redirect to /app/plan or /app/admin
    await page.waitForURL(/\/app\/(plan|admin)/, { timeout: 15_000 });
  } else {
    // ── Offline / local-data mode ────────────────────────────────────────
    // Inject a minimal fake Supabase session into localStorage so RequireAuth
    // lets us through. Data is served from the bundled dataset — no real
    // Supabase calls succeed, but the UI renders correctly for black-box testing.
    await page.goto("/");

    await page.addInitScript(() => {
      const fakeSession = {
        access_token: "fake-token",
        refresh_token: "fake-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "test-user-id",
          email: "testuser@bowen.edu.ng",
          user_metadata: {
            full_name: "Test Student",
            id_number: "22CSC1080",
            role: "student",
          },
        },
      };
      // Supabase reads from this localStorage key
      const projectRef = "local";
      localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify({ currentSession: fakeSession, expiresAt: fakeSession.expires_at }),
      );
    });

    await page.goto("/app/plan");
  }

  // Ensure .auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
