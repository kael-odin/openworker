# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automations-manage.spec.ts >> Run now triggers a manual run and opens its live session
- Location: e2e\automations-manage.spec.ts:22:1

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
  1  | // Automations management — the parts of Rohit's manual pass that automations.spec.ts (run-banner +
  2  | // Back) doesn't cover: the task list, triggering a manual run (POST .../run appends a run and opens
  3  | // its live session), pausing via the enable toggle, and deleting. Seeded with one task.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openAutomations(page) {
  8  |   await page.goto("/");
> 9  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10 |   await page.getByTestId("account-menu").getByRole("button", { name: "Automations", exact: true }).click();
  11 |   await expect(page.getByText("Recurring tasks OpenWorker runs on a schedule.")).toBeVisible();
  12 | }
  13 | 
  14 | test("lists a scheduled task with its schedule and run count", async ({ page }) => {
  15 |   await openAutomations(page);
  16 |   const card = page.locator(".sched-card", { hasText: "Daily AI News" });
  17 |   await expect(card).toBeVisible();
  18 |   await expect(card).toContainText("Every day at ~5:40 PM");
  19 |   await expect(card).toContainText("last running");
  20 | });
  21 | 
  22 | test("Run now triggers a manual run and opens its live session", async ({ page }) => {
  23 |   await openAutomations(page);
  24 |   await page.locator(".sched-card", { hasText: "Daily AI News" }).click();
  25 |   await page.getByRole("button", { name: /Run now/ }).click();
  26 |   // The manual run opens as a session with the automation-context banner.
  27 |   const banner = page.getByTestId("run-banner");
  28 |   await expect(banner).toBeVisible();
  29 |   await expect(banner).toContainText("Daily AI News");
  30 | });
  31 | 
  32 | test("enable toggle pauses the task", async ({ page }) => {
  33 |   await openAutomations(page);
  34 |   await page.locator(".sched-card", { hasText: "Daily AI News" }).click();
  35 |   await expect(page.getByText(/Active · next/)).toBeVisible();
  36 |   // The checkbox is visually hidden behind a styled slider — click the label wrapper.
  37 |   await page.locator("label.switch").click();
  38 |   await expect(page.getByText("Paused", { exact: false })).toBeVisible();
  39 | });
  40 | 
  41 | test("delete removes the task; deleting the last one shows the empty state", async ({ page }) => {
  42 |   await openAutomations(page);
  43 |   await page.locator(".sched-card", { hasText: "Daily AI News" }).click();
  44 |   await page.getByRole("button", { name: /Delete/ }).click();
  45 |   // Back on the list, the deleted task is gone; the other seeded task remains.
  46 |   await expect(page.locator(".sched-card", { hasText: "Daily AI News" })).toHaveCount(0);
  47 |   await expect(page.locator(".sched-card", { hasText: "Weekly CRM digest" })).toHaveCount(1);
  48 | 
  49 |   await page.locator(".sched-card", { hasText: "Weekly CRM digest" }).click();
  50 |   await page.getByRole("button", { name: /Delete/ }).click();
  51 |   await expect(page.getByText(/No scheduled tasks yet/)).toBeVisible();
  52 | });
  53 | 
```