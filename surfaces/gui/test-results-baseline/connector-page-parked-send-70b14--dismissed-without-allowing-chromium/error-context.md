# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connector-page.spec.ts >> parked sender can be dismissed without allowing
- Location: e2e\connector-page.spec.ts:46:1

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
  1  | // Slack config is a detail SUBPAGE under Connectors (UX-DECISIONS §21): the list row
  2  | // navigates to it, and the §19 flows — parked senders (Allow & deliver / Allow / ×)
  3  | // and "listening" sessions — are filed under the workspace they belong to.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openSlackPage(page) {
  8  |   await page.goto("/");
> 9  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  11 |   await page.getByTestId("connector-slack").click();
  12 | }
  13 | 
  14 | test("list row status + navigation to the Slack page", async ({ page }) => {
  15 |   await page.goto("/");
  16 |   await page.getByTestId("account-row").click();
  17 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  18 | 
  19 |   const row = page.getByTestId("connector-slack");
  20 |   await expect(row).toContainText("2 workspaces · relay");
  21 |   await row.click();
  22 |   await expect(page.getByTestId("slack-workspaces")).toBeVisible();
  23 |   // signed out (fixture default) → the status line leads with the actionable layer
  24 |   await expect(page.getByTestId("slack-mode-badge")).toContainText("Sign-in needed");
  25 | });
  26 | 
  27 | test("parked sender files under ITS workspace; Allow & deliver adds to that allow-list only", async ({
  28 |   page,
  29 | }) => {
  30 |   await openSlackPage(page);
  31 | 
  32 |   // pk1 belongs to T1DL — its Waiting row renders in that workspace's group only.
  33 |   const t1 = page.getByTestId("slack-workspace-T1DL");
  34 |   await expect(t1.getByTestId("waiting-pk1")).toContainText("Maya");
  35 |   await expect(t1.getByTestId("waiting-pk1")).toContainText("in #ocw-test");
  36 |   await expect(t1.getByTestId("waiting-pk1")).toContainText("hey ocw, can you summarize this thread?");
  37 |   await expect(page.getByTestId("slack-workspace-T2AC").getByTestId("waiting-pk1")).toHaveCount(0);
  38 | 
  39 |   await page.getByTestId("parked-allow-deliver-pk1").click();
  40 |   await expect(page.getByTestId("waiting-pk1")).toHaveCount(0);
  41 |   // The sender lands on the T1DL allow-list; the sibling workspace stays empty.
  42 |   await expect(t1).toContainText("U0NEW");
  43 |   await expect(page.getByTestId("slack-workspace-T2AC")).not.toContainText("U0NEW");
  44 | });
  45 | 
  46 | test("parked sender can be dismissed without allowing", async ({ page }) => {
  47 |   await openSlackPage(page);
  48 |   await page.getByTestId("parked-dismiss-pk1").click();
  49 |   await expect(page.getByTestId("waiting-pk1")).toHaveCount(0);
  50 |   await expect(page.getByTestId("slack-workspace-T1DL")).not.toContainText("U0NEW");
  51 | });
  52 | 
  53 | test("sessions listening in a workspace: listed with unsubscribe", async ({ page }) => {
  54 |   await openSlackPage(page);
  55 | 
  56 |   const t1 = page.getByTestId("slack-workspace-T1DL");
  57 |   await expect(t1.getByTestId("listening-slack")).toContainText("Weekly plan 1");
  58 |   await expect(t1.getByTestId("listening-slack")).toContainText("#ocw-test");
  59 | 
  60 |   await t1.getByTitle("Unsubscribe this session").click();
  61 |   await expect(t1.getByTestId("listening-slack")).toHaveCount(0); // row hides when empty
  62 | });
  63 | 
```