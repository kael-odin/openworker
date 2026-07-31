# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sidebar-account.spec.ts >> Activity in the menu is the audit log; Unrouted lives under Inbox ▸ Configure
- Location: e2e\sidebar-account.spec.ts:40:1

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
  1  | // The sidebar bottom is exactly ONE row — the account anchor (UX-DECISIONS §26).
  2  | // Contract under test: no "Settings & more", no standalone Inbox/Connectors rows; the
  3  | // inbox chip is state-driven (accent + count when pending) and clicks STRAIGHT to Inbox
  4  | // while the rest of the row opens the account menu, which always lists Inbox + Connectors.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | test("the bottom is one account row — the old rows are gone", async ({ page }) => {
  9  |   await page.goto("/");
  10 |   await expect(page.getByTestId("account-row")).toBeVisible();
  11 |   await expect(page.getByRole("button", { name: /Settings & more/i })).toHaveCount(0);
  12 |   // No standalone sidebar Inbox row: outside the menu, "Inbox" exists only as the chip.
  13 |   await expect(page.locator(".sidebar").getByRole("button", { name: "Inbox", exact: true })).toHaveCount(0);
  14 | });
  15 | 
  16 | test("pending items: the chip carries the count and goes straight to Inbox — no menu", async ({
  17 |   page,
  18 | }) => {
  19 |   await page.goto("/");
  20 |   const chip = page.getByTestId("inbox-chip");
  21 |   await expect(chip).toContainText(/\d/); // fixtures seed pending attention → accent count
  22 |   await chip.click();
  23 |   await expect(page.getByTestId("account-menu")).toHaveCount(0); // the chip never opens the menu
  24 |   await expect(page.getByText("Approve: run_shell")).toBeVisible(); // Inbox opened directly
  25 | });
  26 | 
  27 | test("the account menu: Inbox + Connectors always listed; Settings carries the shortcut hint", async ({
  28 |   page,
  29 | }) => {
  30 |   await page.goto("/");
  31 |   await page.getByTestId("account-row").click();
  32 |   const menu = page.getByTestId("account-menu");
  33 |   await expect(menu.getByRole("button", { name: "Inbox" })).toBeVisible();
  34 |   await expect(menu.getByRole("button", { name: "Connectors", exact: true })).toBeVisible();
  35 |   await expect(menu.getByRole("button", { name: /Settings/ })).toContainText("⌘");
  36 |   await expect(menu.getByRole("button", { name: "Automations", exact: true })).toBeVisible();
  37 |   await expect(menu.getByRole("button", { name: "Activity", exact: true })).toBeVisible();
  38 | });
  39 | 
  40 | test("Activity in the menu is the audit log; Unrouted lives under Inbox ▸ Configure", async ({
  41 |   page,
  42 | }) => {
  43 |   await page.goto("/");
> 44 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  45 |   await page.getByTestId("account-menu").getByRole("button", { name: "Activity", exact: true }).click();
  46 |   await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  47 | 
  48 |   // §28: Messaging routing left the Connectors sub-nav entirely (Connectors · MCP only)…
  49 |   await page.getByTestId("account-row").click();
  50 |   await page.getByTestId("account-menu").getByRole("button", { name: "Connectors", exact: true }).click();
  51 |   await expect(page.getByRole("button", { name: "MCP servers" })).toBeVisible();
  52 |   await expect(page.getByRole("button", { name: /Messaging routing/ })).toHaveCount(0);
  53 |   // The old fourth sub-nav tab is gone — exactly one page is named Activity now.
  54 |   await expect(page.getByRole("button", { name: "Activity", exact: true })).toHaveCount(0);
  55 | 
  56 |   // …and Unrouted rides the Inbox's Configure tab.
  57 |   await page.getByTestId("account-row").click();
  58 |   await page.getByTestId("account-menu").getByRole("button", { name: "Inbox" }).click();
  59 |   await page.getByTestId("inbox-tab-configure").click();
  60 |   await expect(page.getByTestId("unrouted-section")).toBeVisible();
  61 | });
  62 | 
```