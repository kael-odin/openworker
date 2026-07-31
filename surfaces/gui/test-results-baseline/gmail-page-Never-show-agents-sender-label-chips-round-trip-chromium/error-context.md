# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gmail-page.spec.ts >> Never show agents: sender + label chips round-trip
- Location: e2e\gmail-page.spec.ts:62:1

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
  1  | // The Gmail detail page (M3.6 Step 3, UX-DECISIONS §21): multi-account with a
  2  | // Default badge, per-account disconnect, direct one-click add (no modal — Gmail
  3  | // has one connect mode), and the "Never show agents" filter lists.
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
  13 | async function signInAndConnectFirstAccount(page) {
  14 |   await openConnectors(page);
  15 |   await page.getByTestId("account-row").click();
  16 |   await page.getByTestId("account-sign-in").click();
  17 |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  18 |   // gmail starts disconnected → Available row → modal → one click (mock connects instantly)
  19 |   await page.getByTestId("connector-gmail").getByRole("button", { name: "Connect", exact: true }).click();
  20 |   await page.getByRole("button", { name: /Connect Gmail with one click/i }).click();
  21 |   await page.keyboard.press("Escape");
  22 |   await expect(page.getByTestId("connector-gmail")).toContainText("rohit@gmail.com", {
  23 |     timeout: 10_000,
  24 |   });
  25 | }
  26 | 
  27 | test("connect, then add a second account from the page; first stays default", async ({
  28 |   page,
  29 | }) => {
  30 |   await signInAndConnectFirstAccount(page);
  31 |   await page.getByTestId("connector-gmail").click();
  32 |   await expect(page.getByTestId("gmail-detail")).toBeVisible();
  33 | 
  34 |   await page.getByTestId("add-account-btn").click();
  35 |   const rohit = page.getByTestId("gmail-account-rohit@gmail.com");
  36 |   const work = page.getByTestId("gmail-account-work@dlai.com");
  37 |   await expect(work).toBeVisible({ timeout: 10_000 });
  38 |   await expect(rohit).toContainText("Default");
  39 |   await expect(work).not.toContainText("Default");
  40 |   // list row summarizes the multi-account state
  41 |   await page.getByTestId("connectors-breadcrumb").click();
  42 |   await expect(page.getByTestId("connector-gmail")).toContainText("2 accounts");
  43 | });
  44 | 
  45 | test("Make default moves the badge; disconnecting the default repoints it", async ({
  46 |   page,
  47 | }) => {
  48 |   await signInAndConnectFirstAccount(page);
  49 |   await page.getByTestId("connector-gmail").click();
  50 |   await page.getByTestId("add-account-btn").click();
  51 |   await expect(page.getByTestId("gmail-account-work@dlai.com")).toBeVisible({ timeout: 10_000 });
  52 | 
  53 |   await page.getByTestId("gmail-make-default-work@dlai.com").click();
  54 |   await expect(page.getByTestId("gmail-account-work@dlai.com")).toContainText("Default");
  55 |   await expect(page.getByTestId("gmail-account-rohit@gmail.com")).not.toContainText("Default");
  56 | 
  57 |   await page.getByTestId("gmail-disconnect-work@dlai.com").click();
  58 |   await expect(page.getByTestId("gmail-account-work@dlai.com")).toHaveCount(0);
  59 |   await expect(page.getByTestId("gmail-account-rohit@gmail.com")).toContainText("Default");
  60 | });
  61 | 
  62 | test("Never show agents: sender + label chips round-trip", async ({ page }) => {
  63 |   await signInAndConnectFirstAccount(page);
  64 |   await page.getByTestId("connector-gmail").click();
  65 | 
  66 |   const senders = page.getByTestId("gmail-filter-senders");
  67 |   await senders.getByRole("textbox").fill("ceo@corp.com");
  68 |   await senders.getByRole("textbox").press("Enter");
  69 |   await expect(senders).toContainText("ceo@corp.com");
  70 | 
  71 |   const labels = page.getByTestId("gmail-filter-labels");
  72 |   await labels.getByRole("textbox").fill("Personal");
  73 |   await labels.getByRole("textbox").press("Enter");
  74 |   await expect(labels).toContainText("Personal");
  75 | 
  76 |   // chips survive a reload (persisted through the PATCH route, re-read on load)
  77 |   await page.reload();
  78 |   await openConnectors(page);
  79 |   await page.getByTestId("connector-gmail").click();
  80 |   await expect(page.getByTestId("gmail-filter-senders")).toContainText("ceo@corp.com");
  81 |   // remove round-trips too
  82 |   await page.getByTestId("gmail-filter-senders").getByTitle("remove").click();
  83 |   await expect(page.getByTestId("gmail-filter-senders")).not.toContainText("ceo@corp.com");
  84 | });
  85 | 
```