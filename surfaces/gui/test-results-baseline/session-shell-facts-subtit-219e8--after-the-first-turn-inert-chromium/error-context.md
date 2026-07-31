# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session-shell.spec.ts >> facts subtitle: absent on a fresh session, model-only after the first turn, inert
- Location: e2e\session-shell.spec.ts:36:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.dd').filter({ hasText: 'Claude Opus 4.8' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.dd').filter({ hasText: 'Claude Opus 4.8' })

```

# Test source

```ts
  1  | // Session-screen cleanup (§22): the contextual top-left cluster ([sidebar][+][search], rendered
  2  | // ONLY while the sidebar is collapsed), the centered facts subtitle (persona · model — fixed
  3  | // facts replacing the locked-model pill and the topbar About-persona button), and the model
  4  | // picker's fresh-session-only placement.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | test("top-left cluster renders only while the sidebar is collapsed", async ({ page }) => {
  9  |   await page.goto("/");
  10 | 
  11 |   // Expanded sidebar owns those actions — no duplicate cluster.
  12 |   await expect(page.locator(".sidebar")).toBeVisible();
  13 |   await expect(page.getByTestId("topbar-cluster")).toHaveCount(0);
  14 | 
  15 |   // Collapse → the cluster appears with all three actions; the floating reveal button does NOT
  16 |   // double up on the session surface (the cluster's sidebar button replaces it).
  17 |   await page.keyboard.press("Meta+b");
  18 |   const cluster = page.getByTestId("topbar-cluster");
  19 |   await expect(cluster).toBeVisible();
  20 |   await expect(cluster.getByRole("button", { name: "Show sidebar" })).toBeVisible();
  21 |   await expect(cluster.getByRole("button", { name: "New session" })).toBeVisible();
  22 |   await expect(cluster.getByRole("button", { name: "Search" })).toBeVisible();
  23 |   await expect(page.locator(".nav-reveal-btn")).toHaveCount(0);
  24 | 
  25 |   // The cluster's search opens the command-palette overlay.
  26 |   await cluster.getByRole("button", { name: "Search" }).click();
  27 |   await expect(page.getByPlaceholder("Search chats")).toBeVisible();
  28 |   await page.keyboard.press("Escape");
  29 | 
  30 |   // The cluster's sidebar button docks the nav back — and the cluster leaves with it.
  31 |   await cluster.getByRole("button", { name: "Show sidebar" }).click();
  32 |   await expect(page.locator(".app")).not.toHaveClass(/nav-collapsed/);
  33 |   await expect(page.getByTestId("topbar-cluster")).toHaveCount(0);
  34 | });
  35 | 
  36 | test("facts subtitle: absent on a fresh session, model-only after the first turn, inert", async ({
  37 |   page,
  38 | }) => {
  39 |   await page.goto("/");
  40 | 
  41 |   // Fresh-ish (boot-resumed, no rendered history): no subtitle, no old About-persona button —
  42 |   // and the model is a live PICKER in the composer (fresh sessions choose; nothing is locked yet).
  43 |   await expect(page.getByTestId("session-subtitle")).toHaveCount(0);
  44 |   await expect(page.getByRole("button", { name: "About this persona" })).toHaveCount(0);
> 45 |   await expect(page.locator(".dd").filter({ hasText: "Claude Opus 4.8" })).toBeVisible();
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  46 | 
  47 |   // First turn → the facts move up to the subtitle; the picker STAYS in the composer
  48 |   // (§17 rev 2026-07-22: mid-session model switching shipped, so it remains actionable).
  49 |   const box = page.getByPlaceholder(/Ask the coworker/);
  50 |   await box.fill("hello");
  51 |   await page.getByRole("button", { name: "Send" }).click();
  52 |   await expect(page.getByText(/Echo: hello/)).toBeVisible();
  53 | 
  54 |   // Model only — no persona name (owner ask 2026-07-22: personas are hidden this release),
  55 |   // and the subtitle is a plain fact line, not a button to the persona page.
  56 |   const sub = page.getByTestId("session-subtitle");
  57 |   await expect(sub).toHaveText("Claude Opus 4.8");
  58 |   await expect(page.locator(".dd").filter({ hasText: "Claude Opus 4.8" })).toBeVisible();
  59 |   await sub.click();
  60 |   await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(0);
  61 | });
  62 | 
  63 | test("composer is three controls (+ attach · Mode · send); folder and branch chips are gone", async ({
  64 |   page,
  65 | }) => {
  66 |   await page.goto("/");
  67 |   await page.getByText("Draft the launch note").first().click();
  68 | 
  69 |   await expect(page.getByRole("button", { name: "Attach" })).toBeVisible();
  70 |   await expect(page.getByRole("button", { name: "Mode", exact: true })).toBeVisible();
  71 |   await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
  72 |   // The folder/roots popover trigger and the standalone Inbox control left the composer (§22).
  73 |   await expect(page.getByTitle(/director(y|ies) the agent can use/)).toHaveCount(0);
  74 |   await expect(page.getByTitle("Inbox routing")).toHaveCount(0);
  75 |   await expect(page.locator(".wschip")).toHaveCount(0);
  76 |   await expect(page.locator(".wsbranch")).toHaveCount(0);
  77 | });
  78 | 
```