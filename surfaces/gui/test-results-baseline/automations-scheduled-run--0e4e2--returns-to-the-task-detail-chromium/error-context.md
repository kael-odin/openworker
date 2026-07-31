# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automations.spec.ts >> scheduled run session shows the run banner; Back returns to the task detail
- Location: e2e\automations.spec.ts:6:1

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
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // Automation runs open as live sessions — which used to look like any other chat with no way
  4  | // back (owner report, 2026-07-04). Guards: the run-session banner (task title + automation
  5  | // context) and "← Back to runs" returning to the task's detail page.
  6  | test("scheduled run session shows the run banner; Back returns to the task detail", async ({
  7  |   page,
  8  | }) => {
  9  |   await page.goto("/");
> 10 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |   await page.getByTestId("account-menu").getByRole("button", { name: "Automations", exact: true }).click();
  12 | 
  13 |   // Task list → detail (runs list).
  14 |   await page.getByText("Daily AI News").first().click();
  15 |   await expect(page.getByRole("button", { name: /Run now/ })).toBeVisible();
  16 |   await expect(page.getByText("Each run is a live conversation", { exact: false })).toBeVisible();
  17 | 
  18 |   // Open the running run: a normal session view, but with the automation-context banner.
  19 |   await page.getByTitle("Open this run's conversation").click();
  20 |   const banner = page.getByTestId("run-banner");
  21 |   await expect(banner).toBeVisible();
  22 |   await expect(banner).toContainText("Scheduled run");
  23 |   await expect(banner).toContainText("Daily AI News");
  24 | 
  25 |   // Back link lands on the SAME task's detail, not the bare list.
  26 |   await banner.getByRole("button", { name: "← Back to runs" }).click();
  27 |   await expect(page.getByRole("button", { name: /Run now/ })).toBeVisible();
  28 |   await expect(page.getByText("Daily AI News").first()).toBeVisible();
  29 | 
  30 |   // A plain (non-run) session never shows the banner.
  31 |   await page.getByText("Draft the launch note").first().click();
  32 |   await expect(page.getByTestId("run-banner")).toHaveCount(0);
  33 | });
  34 | 
```