# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cloud-status-pending.spec.ts >> signing in from the rail prompt flips the pane to one-click
- Location: e2e\cloud-status-pending.spec.ts:40:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Draft the launch note').first()

```

# Test source

```ts
  1  | // FB-013: a signed-in user opened the rail's connect pane and was told to sign in —
  2  | // the rail's single cloud-status fetch rendered PENDING (and any failure) as signed-out,
  3  | // with nothing that could ever flip it back. Contract now: unknown status shows a neutral
  4  | // "checking" line, never the sign-in ask; the pane polls while open; and completing
  5  | // sign-in from the inline prompt flips the pane itself (no other section's poll needed).
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | const openGmailPane = async (page: import("@playwright/test").Page) => {
  10 |   await page.goto("/");
> 11 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.getByTestId("access-toggle").click();
  13 |   await page.getByTestId("access-add-source").click();
  14 |   await page.getByTestId("access-add-gmail").click();
  15 | };
  16 | 
  17 | test("pending status shows 'checking', never the sign-in ask; resolves to one-click", async ({
  18 |   page,
  19 | }) => {
  20 |   // Hold every /v1/cloud/status response (test routes outrank the fixture's) — the user
  21 |   // IS signed in, the app just doesn't know yet.
  22 |   let release!: () => void;
  23 |   const gate = new Promise<void>((r) => (release = r));
  24 |   await page.route("**/v1/cloud/status", async (route) => {
  25 |     await gate;
  26 |     await route.fulfill({
  27 |       json: { signed_in: true, account: "her@example.com", user_id: "u1", telemetry_enabled: true },
  28 |     });
  29 |   });
  30 | 
  31 |   await openGmailPane(page);
  32 |   await expect(page.getByTestId("cloud-status-pending")).toBeVisible();
  33 |   await expect(page.getByTestId("inline-cloud-sign-in")).toHaveCount(0);
  34 | 
  35 |   release();
  36 |   await expect(page.getByRole("button", { name: "Connect Gmail with one click" })).toBeVisible();
  37 |   await expect(page.getByTestId("cloud-status-pending")).toHaveCount(0);
  38 | });
  39 | 
  40 | test("signing in from the rail prompt flips the pane to one-click", async ({ page }) => {
  41 |   // Fixture default: signed out — the resolved signed-out state legitimately asks.
  42 |   await openGmailPane(page);
  43 |   const ask = page.getByTestId("inline-cloud-sign-in");
  44 |   await expect(ask).toBeVisible();
  45 |   await expect(page.getByTestId("cloud-status-pending")).toHaveCount(0);
  46 | 
  47 |   // The mock login flips CLOUD_STATE instantly; the inline button's own post-login poll
  48 |   // plus the CLOUD_CHANGED broadcast must flip THIS pane without any other page open.
  49 |   await ask.click();
  50 |   await expect(page.getByRole("button", { name: "Connect Gmail with one click" })).toBeVisible({
  51 |     timeout: 5_000,
  52 |   });
  53 | });
  54 | 
```