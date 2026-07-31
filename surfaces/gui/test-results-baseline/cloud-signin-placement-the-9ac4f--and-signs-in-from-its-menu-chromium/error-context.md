# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cloud-signin-placement.spec.ts >> the account row is always visible and signs in from its menu
- Location: e2e\cloud-signin-placement.spec.ts:14:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('account-row')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('account-row')

```

# Test source

```ts
  1  | // Regression guard (shipped once, 2026-07-09; reshaped by §26): cloud sign-in must be
  2  | // reachable by a FRESH user. The sidebar account row is the permanent sign-in home —
  3  | // always visible, never below any fold — and every signed-out one-click pane carries a
  4  | // real Sign-in button, not a hint pointing at another page.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | async function openConnectors(page) {
  9  |   await page.goto("/");
  10 |   await page.getByTestId("account-row").click();
  11 |   await page.getByTestId("account-menu").getByRole("button", { name: "Connectors", exact: true }).click();
  12 | }
  13 | 
  14 | test("the account row is always visible and signs in from its menu", async ({ page }) => {
  15 |   await page.goto("/");
  16 |   const row = page.getByTestId("account-row");
> 17 |   await expect(row).toBeVisible();
     |                     ^ Error: expect(locator).toBeVisible() failed
  18 |   await expect(row).toContainText("Not signed in");
  19 | 
  20 |   await row.click();
  21 |   await page.getByTestId("account-sign-in").click();
  22 |   await expect(row).toContainText("Rohit", { timeout: 10_000 });
  23 | 
  24 |   // Sign out is right there in the same menu once signed in.
  25 |   await row.click();
  26 |   await expect(
  27 |     page.getByTestId("account-menu").getByRole("button", { name: "Sign out" }),
  28 |   ).toBeVisible();
  29 | });
  30 | 
  31 | test("signed-out one-click pane signs in inline, then connects", async ({ page }) => {
  32 |   await openConnectors(page);
  33 |   // Fresh user path: Available → Connect → the pane must offer sign-in itself.
  34 |   await page
  35 |     .getByTestId("connector-gmail")
  36 |     .getByRole("button", { name: "Connect", exact: true })
  37 |     .click();
  38 |   await page.getByTestId("inline-cloud-sign-in").click();
  39 |   // The mock signs in instantly; the section's poll re-renders the pane armed.
  40 |   await expect(
  41 |     page.getByRole("button", { name: /Connect Gmail with one click/i }),
  42 |   ).toBeVisible({ timeout: 10_000 });
  43 | });
  44 | 
```