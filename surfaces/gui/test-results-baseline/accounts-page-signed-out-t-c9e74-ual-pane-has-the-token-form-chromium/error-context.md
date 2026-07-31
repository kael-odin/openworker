# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accounts-page.spec.ts >> signed out: the modal's one-click pane offers inline cloud sign-in; manual pane has the token form
- Location: e2e\accounts-page.spec.ts:67:1

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
  1  | // The generic multi-account detail page (AccountsDetail) + the modal's generic
  2  | // one-click pane, exercised via Notion — the pattern all batch-2 connectors
  3  | // share (accounts.py layer: AccountRow shape, Default badge, per-account ×).
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openConnectors(page) {
  8  |   await page.goto("/");
> 9  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  11 | }
  12 | 
  13 | async function signInAndConnectFirstWorkspace(page) {
  14 |   await openConnectors(page);
  15 |   await page.getByTestId("account-row").click();
  16 |   await page.getByTestId("account-sign-in").click();
  17 |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  18 |   // Available row → modal with One click | Manual pills → generic one-click
  19 |   await page
  20 |     .getByTestId("connector-notion")
  21 |     .getByRole("button", { name: "Connect", exact: true })
  22 |     .click();
  23 |   await expect(page.getByTestId("modal-pane-manual")).toBeVisible();
  24 |   await page.getByTestId("modal-generic-one-click").click();
  25 |   await page.keyboard.press("Escape");
  26 |   await expect(page.getByTestId("connector-notion")).toContainText("Rohit's Workspace", {
  27 |     timeout: 10_000,
  28 |   });
  29 | }
  30 | 
  31 | test("one-click connect, add a second workspace from the page; first stays default", async ({
  32 |   page,
  33 | }) => {
  34 |   await signInAndConnectFirstWorkspace(page);
  35 |   await page.getByTestId("connector-notion").click();
  36 |   await expect(page.getByTestId("accounts-detail")).toBeVisible();
  37 | 
  38 |   await page.getByTestId("add-account-btn").click();
  39 |   const first = page.getByTestId("account-ws-1");
  40 |   const second = page.getByTestId("account-ws-2");
  41 |   await expect(second).toBeVisible({ timeout: 10_000 });
  42 |   await expect(first).toContainText("Rohit's Workspace");
  43 |   await expect(first).toContainText("Default");
  44 |   await expect(second).not.toContainText("Default");
  45 |   // list row summarizes the multi-account state
  46 |   await page.getByTestId("connectors-breadcrumb").click();
  47 |   await expect(page.getByTestId("connector-notion")).toContainText("2 accounts");
  48 | });
  49 | 
  50 | test("Make default moves the badge; disconnecting the default repoints it", async ({
  51 |   page,
  52 | }) => {
  53 |   await signInAndConnectFirstWorkspace(page);
  54 |   await page.getByTestId("connector-notion").click();
  55 |   await page.getByTestId("add-account-btn").click();
  56 |   await expect(page.getByTestId("account-ws-2")).toBeVisible({ timeout: 10_000 });
  57 | 
  58 |   await page.getByTestId("account-make-default-ws-2").click();
  59 |   await expect(page.getByTestId("account-ws-2")).toContainText("Default");
  60 |   await expect(page.getByTestId("account-ws-1")).not.toContainText("Default");
  61 | 
  62 |   await page.getByTestId("account-disconnect-ws-2").click();
  63 |   await expect(page.getByTestId("account-ws-2")).toHaveCount(0);
  64 |   await expect(page.getByTestId("account-ws-1")).toContainText("Default");
  65 | });
  66 | 
  67 | test("signed out: the modal's one-click pane offers inline cloud sign-in; manual pane has the token form", async ({
  68 |   page,
  69 | }) => {
  70 |   await openConnectors(page);
  71 |   await page
  72 |     .getByTestId("connector-notion")
  73 |     .getByRole("button", { name: "Connect", exact: true })
  74 |     .click();
  75 |   await expect(page.getByTestId("inline-cloud-sign-in")).toBeVisible();
  76 |   await page.getByTestId("modal-pane-manual").click();
  77 |   await expect(page.getByPlaceholder("ntn_…")).toBeVisible();
  78 | });
  79 | 
```