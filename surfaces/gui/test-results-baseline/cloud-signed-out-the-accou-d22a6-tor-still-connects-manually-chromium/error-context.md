# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cloud.spec.ts >> signed out: the account row is the sign-in home; managed connector still connects manually
- Location: e2e\cloud.spec.ts:20:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('account-row')
Expected substring: "Not signed in"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByTestId('account-row')

```

# Test source

```ts
  1  | // Cloud sign-in (§26: the sidebar account row is the sign-in home) + managed one-click
  2  | // connectors. Product invariant under test: manual token setup is always present; managed
  3  | // one-click is an ADDITION that appears only when signed in.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openConnectors(page) {
  8  |   await page.goto("/");
  9  |   await page.getByTestId("account-row").click();
  10 |   await page.getByTestId("account-menu").getByRole("button", { name: "Connectors", exact: true }).click();
  11 |   await expect(page.getByRole("heading", { name: "Connectors" })).toBeVisible();
  12 | }
  13 | 
  14 | async function signIn(page) {
  15 |   await page.getByTestId("account-row").click();
  16 |   await page.getByTestId("account-sign-in").click();
  17 |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  18 | }
  19 | 
  20 | test("signed out: the account row is the sign-in home; managed connector still connects manually", async ({
  21 |   page,
  22 | }) => {
  23 |   await page.goto("/");
  24 |   const row = page.getByTestId("account-row");
> 25 |   await expect(row).toContainText("Not signed in");
     |                     ^ Error: expect(locator).toContainText(expected) failed
  26 | 
  27 |   // The menu leads with the sign-in CTA and always lists Inbox + Connectors.
  28 |   await row.click();
  29 |   const menu = page.getByTestId("account-menu");
  30 |   await expect(menu).toContainText("one-click connections need OpenWorker Cloud");
  31 |   await expect(menu.getByTestId("account-sign-in")).toBeVisible();
  32 |   await expect(menu.getByRole("button", { name: "Inbox" })).toBeVisible();
  33 |   await menu.getByRole("button", { name: "Connectors", exact: true }).click();
  34 | 
  35 |   // The managed-capable connector's add-modal shows the hint + manual fields, no
  36 |   // one-click button while signed out.
  37 |   await page.getByTestId("connector-gmail").getByRole("button", { name: "Connect" }).click();
  38 |   const modal = page.getByTestId("add-connection-modal");
  39 |   await expect(modal.getByTestId("managed-connect")).toContainText("Sign in to OpenWorker Cloud");
  40 |   await expect(modal.locator("input[type=password]")).toBeVisible(); // manual field rendered
  41 |   await expect(modal.getByRole("button", { name: /one click/i })).toHaveCount(0);
  42 | });
  43 | 
  44 | test("signed in: account row shows the name; one-click appears; sign out from the menu", async ({
  45 |   page,
  46 | }) => {
  47 |   await openConnectors(page);
  48 |   await signIn(page);
  49 | 
  50 |   await page.getByTestId("connector-gmail").getByRole("button", { name: "Connect", exact: true }).click();
  51 |   const modal = page.getByTestId("add-connection-modal");
  52 |   await expect(modal.getByRole("button", { name: /Connect Gmail with one click/i })).toBeVisible();
  53 |   // the manual path must still be offered alongside
  54 |   await expect(modal.getByTestId("managed-connect")).toContainText("or connect manually");
  55 |   await page.keyboard.press("Escape");
  56 | 
  57 |   // The menu header carries the email; Sign out flips the row back.
  58 |   await page.getByTestId("account-row").click();
  59 |   const menu = page.getByTestId("account-menu");
  60 |   await expect(menu).toContainText("rohit@openworker.com");
  61 |   await menu.getByRole("button", { name: "Sign out" }).click();
  62 |   await page.getByTestId("account-row").click(); // reopen → status refetch
  63 |   await expect(page.getByTestId("account-row")).toContainText("Not signed in");
  64 | });
  65 | 
  66 | test("telemetry/Privacy card is gone from Settings (owner ask 2026-07-22), signed in or out", async ({
  67 |   page,
  68 | }) => {
  69 |   await page.goto("/");
  70 |   await page.getByTestId("account-row").click();
  71 |   await page.getByTestId("account-menu").getByRole("button", { name: "Settings" }).click();
  72 |   await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  73 |   await expect(page.getByTestId("telemetry-toggle")).toHaveCount(0);
  74 |   await expect(page.getByText("Privacy", { exact: true })).toHaveCount(0);
  75 | 
  76 |   await signIn(page);
  77 |   await page.getByTestId("account-row").click();
  78 |   await page.getByTestId("account-menu").getByRole("button", { name: "Settings" }).click();
  79 |   await expect(page.getByTestId("telemetry-toggle")).toHaveCount(0);
  80 |   await expect(page.getByText("Privacy", { exact: true })).toHaveCount(0);
  81 | });
  82 | 
```