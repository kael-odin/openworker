# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gcal-page.spec.ts >> Make default moves the badge; disconnecting the default repoints it
- Location: e2e\gcal-page.spec.ts:47:1

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
  1  | // The Google Calendar detail page: gmail-parity multi-account (Default badge,
  2  | // Make default, per-account disconnect, direct one-click add — no modal).
  3  | import { expect } from "@playwright/test";
  4  | import { test } from "./fixtures";
  5  | 
  6  | async function openConnectors(page) {
  7  |   await page.goto("/");
> 8  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  9  |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  10 | }
  11 | 
  12 | async function signInAndConnectFirstAccount(page) {
  13 |   await openConnectors(page);
  14 |   await page.getByTestId("account-row").click();
  15 |   await page.getByTestId("account-sign-in").click();
  16 |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  17 |   // starts disconnected → Available row → one click (mock connects instantly)
  18 |   await page
  19 |     .getByTestId("connector-google_calendar")
  20 |     .getByRole("button", { name: "Connect", exact: true })
  21 |     .click();
  22 |   await page.getByRole("button", { name: /Connect Google Calendar with one click/i }).click();
  23 |   await page.keyboard.press("Escape");
  24 |   await expect(page.getByTestId("connector-google_calendar")).toContainText("rohit@gmail.com", {
  25 |     timeout: 10_000,
  26 |   });
  27 | }
  28 | 
  29 | test("connect, then add a second account from the page; first stays default", async ({
  30 |   page,
  31 | }) => {
  32 |   await signInAndConnectFirstAccount(page);
  33 |   await page.getByTestId("connector-google_calendar").click();
  34 |   await expect(page.getByTestId("gcal-detail")).toBeVisible();
  35 | 
  36 |   await page.getByTestId("add-account-btn").click();
  37 |   const rohit = page.getByTestId("gcal-account-rohit@gmail.com");
  38 |   const work = page.getByTestId("gcal-account-work@dlai.com");
  39 |   await expect(work).toBeVisible({ timeout: 10_000 });
  40 |   await expect(rohit).toContainText("Default");
  41 |   await expect(work).not.toContainText("Default");
  42 |   // list row summarizes the multi-account state
  43 |   await page.getByTestId("connectors-breadcrumb").click();
  44 |   await expect(page.getByTestId("connector-google_calendar")).toContainText("2 accounts");
  45 | });
  46 | 
  47 | test("Make default moves the badge; disconnecting the default repoints it", async ({
  48 |   page,
  49 | }) => {
  50 |   await signInAndConnectFirstAccount(page);
  51 |   await page.getByTestId("connector-google_calendar").click();
  52 |   await page.getByTestId("add-account-btn").click();
  53 |   await expect(page.getByTestId("gcal-account-work@dlai.com")).toBeVisible({ timeout: 10_000 });
  54 | 
  55 |   await page.getByTestId("gcal-make-default-work@dlai.com").click();
  56 |   await expect(page.getByTestId("gcal-account-work@dlai.com")).toContainText("Default");
  57 |   await expect(page.getByTestId("gcal-account-rohit@gmail.com")).not.toContainText("Default");
  58 | 
  59 |   await page.getByTestId("gcal-disconnect-work@dlai.com").click();
  60 |   await expect(page.getByTestId("gcal-account-work@dlai.com")).toHaveCount(0);
  61 |   await expect(page.getByTestId("gcal-account-rohit@gmail.com")).toContainText("Default");
  62 | });
  63 | 
```