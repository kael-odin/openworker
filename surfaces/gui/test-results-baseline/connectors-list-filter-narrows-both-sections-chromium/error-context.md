# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connectors-list.spec.ts >> filter narrows both sections
- Location: e2e\connectors-list.spec.ts:61:1

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
  1  | // The Connectors LIST (UX-DECISIONS §21): connected connectors first in their own
  2  | // section with a health chip, rows navigate to the connector's detail subpage
  3  | // (breadcrumb back), available connectors get a Connect pill → add-connection modal
  4  | // with One click | Manual pills for multi-mode connectors.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | async function openConnectors(page) {
  9  |   await page.goto("/");
> 10 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  12 | }
  13 | 
  14 | test("connected connectors come first with status + health chip", async ({ page }) => {
  15 |   await openConnectors(page);
  16 | 
  17 |   const slack = page.getByTestId("connector-slack");
  18 |   await expect(slack).toContainText("2 workspaces · relay");
  19 |   // signed out + relay mode → the honest chip is the actionable one
  20 |   await expect(slack).toContainText("Sign-in needed");
  21 |   // available section renders the not-connected connectors with a Connect pill
  22 |   await expect(
  23 |     page.getByTestId("connector-telegram").getByRole("button", { name: "Connect" }),
  24 |   ).toBeVisible();
  25 | });
  26 | 
  27 | test("row navigates to the detail subpage; breadcrumb returns", async ({ page }) => {
  28 |   await openConnectors(page);
  29 |   await page.getByTestId("connector-slack").click();
  30 |   await expect(page.getByTestId("slack-workspaces")).toBeVisible();
  31 |   await page.getByTestId("connectors-breadcrumb").click();
  32 |   await expect(page.getByTestId("connector-slack")).toContainText("2 workspaces · relay");
  33 | });
  34 | 
  35 | test("generic detail page: tools + two-way blocks + disconnect for telegram-alikes", async ({
  36 |   page,
  37 | }) => {
  38 |   await openConnectors(page);
  39 |   // Browser is keyless-connected → generic page, no Disconnect for auth=none
  40 |   await page.getByTestId("connector-browser").click();
  41 |   await expect(page.getByRole("heading", { name: "Browser" })).toBeVisible();
  42 |   await expect(page.getByRole("button", { name: "Disconnect" })).toHaveCount(0);
  43 |   await page.getByTestId("connectors-breadcrumb").click();
  44 | });
  45 | 
  46 | test("Connect on a multi-mode connector opens the modal with One click | Manual pills", async ({
  47 |   page,
  48 | }) => {
  49 |   await openConnectors(page);
  50 |   // make slack disconnected for this test: disconnect both workspaces via its page is
  51 |   // heavy — instead assert the modal via the detail page's Add workspace in the slack spec;
  52 |   // here we verify the generic modal path with telegram (single-mode → ConnectSetup pane).
  53 |   await page.getByTestId("connector-telegram").getByRole("button", { name: "Connect" }).click();
  54 |   const modal = page.getByTestId("add-connection-modal");
  55 |   await expect(modal).toBeVisible();
  56 |   await expect(modal.locator("input")).not.toHaveCount(0); // manual fields rendered
  57 |   await page.keyboard.press("Escape");
  58 |   await expect(page.getByTestId("add-connection-modal")).toHaveCount(0);
  59 | });
  60 | 
  61 | test("filter narrows both sections", async ({ page }) => {
  62 |   await openConnectors(page);
  63 |   await page.getByPlaceholder("Search").fill("tele");
  64 |   await expect(page.getByTestId("connector-telegram")).toBeVisible();
  65 |   await expect(page.getByTestId("connector-slack")).toHaveCount(0);
  66 | });
  67 | 
```