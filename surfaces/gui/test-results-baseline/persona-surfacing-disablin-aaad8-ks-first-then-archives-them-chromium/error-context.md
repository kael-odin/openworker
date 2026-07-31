# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persona-surfacing.spec.ts >> disabling a persona with conversations asks first, then archives them
- Location: e2e\persona-surfacing.spec.ts:46:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.sidebar').getByText('Ops', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.sidebar').getByText('Ops', { exact: true })

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // Personas is launch-flagged off by default — this suite covers the flagged-on flows.
  4  | test.beforeEach(async ({ page }) => {
  5  |   await page.addInitScript(() => localStorage.setItem("ocw.flag.personas", "1"));
  6  | });
  7  | 
  8  | // Regression for the invisible-after-install bug (2026-07-03): enabling a persona in
  9  | // Settings ▸ Personas must surface it EVERYWHERE without a reload — the New-Session picker and
  10 | // the grouped sidebar — via the PERSONAS_CHANGED event (and backend enable-implies-surface).
  11 | 
  12 | test("enabling an installed persona surfaces it in picker + sidebar without reload", async ({
  13 |   page,
  14 | }) => {
  15 |   await page.goto("/");
  16 |   const sidebar = page.locator(".sidebar");
  17 | 
  18 |   // Disabled install: absent from the persona picker and the grouped sidebar.
  19 |   await page.getByLabel("Choose a persona").click();
  20 |   const menu = page.locator(".newsplit-menu");
  21 |   await expect(menu).toBeVisible();
  22 |   await expect(menu.getByText("Acme Notes")).toHaveCount(0);
  23 |   await page.locator(".fixed.inset-0.z-20").click(); // close via backdrop
  24 |   await expect(sidebar.getByText("Acme Notes")).toHaveCount(0);
  25 | 
  26 |   // Enable it on the Personas page.
  27 |   await page.getByTestId("account-row").click();
  28 |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  29 |   await page.getByRole("button", { name: "Personas", exact: true }).click();
  30 |   const row = page.locator(".divide-y > div").filter({ hasText: "Acme Notes" });
  31 |   // Controlled checkbox: the DOM state flips only after the POST round-trip, so click + expect
  32 |   // (a plain .check() asserts the state synchronously and fails).
  33 |   const enabled = row.getByRole("checkbox", { name: "Enabled" });
  34 |   await enabled.click();
  35 |   await expect(enabled).toBeChecked();
  36 | 
  37 |   // No reload: the sidebar group and the picker both pick it up via PERSONAS_CHANGED.
  38 |   await expect(sidebar.getByText("Acme Notes")).toBeVisible();
  39 |   await page.getByLabel("Choose a persona").click();
  40 |   await expect(page.locator(".newsplit-menu").getByText("Acme Notes")).toBeVisible();
  41 | });
  42 | 
  43 | // Disable-archives (§18): disabling a persona archives its conversations, so the confirm must
  44 | // interpose when there's something to archive — and only then. The sidebar section disappears
  45 | // with the persona (its sessions are archived, so the never-orphan rule no longer holds it).
  46 | test("disabling a persona with conversations asks first, then archives them", async ({
  47 |   page,
  48 | }) => {
  49 |   await page.goto("/");
  50 |   const sidebar = page.locator(".sidebar");
> 51 |   await expect(sidebar.getByText("Ops", { exact: true })).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  52 | 
  53 |   await page.getByTestId("account-row").click();
  54 |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  55 |   await page.getByRole("button", { name: "Personas", exact: true }).click();
  56 |   const row = page.locator(".divide-y > div").filter({ hasText: "Ops Coworker" });
  57 |   const enabled = row.getByRole("checkbox", { name: "Enabled" });
  58 | 
  59 |   // Unchecking only ARMS the confirm — the flag must not flip yet.
  60 |   await enabled.click();
  61 |   const warning = page.getByTestId("persona-disable-warning-ops");
  62 |   await expect(warning).toContainText("archives its 1 conversation");
  63 |   await expect(enabled).toBeChecked();
  64 | 
  65 |   // Backing out leaves everything as it was.
  66 |   await page.getByRole("button", { name: "Keep enabled" }).click();
  67 |   await expect(warning).toHaveCount(0);
  68 |   await expect(enabled).toBeChecked();
  69 | 
  70 |   // Arm again and confirm: persona disables, its section leaves the sidebar without a reload.
  71 |   await enabled.click();
  72 |   await page.getByTestId("persona-disable-confirm-ops").click();
  73 |   await expect(enabled).not.toBeChecked();
  74 |   await expect(sidebar.getByText("Ops", { exact: true })).toHaveCount(0);
  75 | });
  76 | 
  77 | test("disabling a persona with no conversations skips the confirm", async ({ page }) => {
  78 |   await page.goto("/");
  79 |   await page.getByTestId("account-row").click();
  80 |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  81 |   await page.getByRole("button", { name: "Personas", exact: true }).click();
  82 |   const row = page.locator(".divide-y > div").filter({ hasText: "Code" });
  83 |   const enabled = row.getByRole("checkbox", { name: "Enabled" });
  84 |   await enabled.click();
  85 |   await expect(page.getByTestId("persona-disable-warning-code")).toHaveCount(0);
  86 |   await expect(enabled).not.toBeChecked();
  87 | });
  88 | 
```