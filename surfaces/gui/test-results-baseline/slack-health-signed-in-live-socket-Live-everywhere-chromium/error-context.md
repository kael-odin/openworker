# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: slack-health.spec.ts >> signed in + live socket: Live everywhere
- Location: e2e\slack-health.spec.ts:45:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('account-row')

```

# Test source

```ts
  1  | // Slack connection health (M3.6 Step 2, UX-DECISIONS §21): the list chip and the
  2  | // detail status line surface three honest layers — cloud sign-in, the desktop↔relay
  3  | // socket, per-workspace bot tokens — and never a synthetic "Slack is down" claim.
  4  | // The fixture's /v1/connectors/slack/status reads live+signed-out by default; each
  5  | // state here is forced with a later page.route override (later routes match first).
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | async function openConnectors(page) {
  10 |   await page.goto("/");
> 11 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  13 | }
  14 | 
  15 | function statusPayload(overrides: any = {}) {
  16 |   return {
  17 |     ok: true,
  18 |     mode: "relay",
  19 |     relay: { state: "live", reconnects: 0, last_event_at: 1751970000, last_error: "" },
  20 |     signed_in: true,
  21 |     teams: { T1DL: { token_ok: true }, T2AC: { token_ok: true } },
  22 |     ...overrides,
  23 |   };
  24 | }
  25 | 
  26 | function forceStatus(page, overrides: any) {
  27 |   return page.route("**/v1/connectors/slack/status", (route) =>
  28 |     route.fulfill({
  29 |       status: 200,
  30 |       contentType: "application/json",
  31 |       body: JSON.stringify(statusPayload(overrides)),
  32 |     }),
  33 |   );
  34 | }
  35 | 
  36 | test("signed out: chip and status line say Sign-in needed", async ({ page }) => {
  37 |   await openConnectors(page);
  38 |   await expect(page.getByTestId("connector-slack")).toContainText("Sign-in needed");
  39 |   await page.getByTestId("connector-slack").click();
  40 |   await expect(page.getByTestId("slack-mode-badge")).toContainText(
  41 |     "Sign-in needed — relaying is paused",
  42 |   );
  43 | });
  44 | 
  45 | test("signed in + live socket: Live everywhere", async ({ page }) => {
  46 |   await forceStatus(page, {});
  47 |   await openConnectors(page);
  48 |   await expect(page.getByTestId("connector-slack")).toContainText("Live");
  49 |   await page.getByTestId("connector-slack").click();
  50 |   await expect(page.getByTestId("slack-mode-badge")).toContainText("Live · managed relay");
  51 | });
  52 | 
  53 | test("relay socket reconnecting: warn chip + status line", async ({ page }) => {
  54 |   await forceStatus(page, {
  55 |     relay: { state: "reconnecting", reconnects: 3, last_event_at: null, last_error: "boom" },
  56 |   });
  57 |   await openConnectors(page);
  58 |   await expect(page.getByTestId("connector-slack")).toContainText("Reconnecting");
  59 |   await page.getByTestId("connector-slack").click();
  60 |   await expect(page.getByTestId("slack-mode-badge")).toContainText("Reconnecting to the relay");
  61 | });
  62 | 
  63 | test("relay unreachable: Offline, not a Slack-outage claim", async ({ page }) => {
  64 |   await forceStatus(page, {
  65 |     relay: { state: "offline", reconnects: 0, last_event_at: null, last_error: "unreachable" },
  66 |   });
  67 |   await openConnectors(page);
  68 |   await expect(page.getByTestId("connector-slack")).toContainText("Offline");
  69 |   await page.getByTestId("connector-slack").click();
  70 |   await expect(page.getByTestId("slack-mode-badge")).toContainText("can't reach the relay");
  71 | });
  72 | 
  73 | test("one dead bot token: ⚠ chip + a warning on THAT workspace only", async ({ page }) => {
  74 |   await forceStatus(page, {
  75 |     teams: { T1DL: { token_ok: true }, T2AC: { token_ok: false } },
  76 |   });
  77 |   await openConnectors(page);
  78 |   await expect(page.getByTestId("connector-slack")).toContainText("Token");
  79 |   await page.getByTestId("connector-slack").click();
  80 |   await expect(page.getByTestId("token-warn-T2AC")).toContainText("Token revoked");
  81 |   await expect(page.getByTestId("token-warn-T1DL")).toHaveCount(0);
  82 | });
  83 | 
```