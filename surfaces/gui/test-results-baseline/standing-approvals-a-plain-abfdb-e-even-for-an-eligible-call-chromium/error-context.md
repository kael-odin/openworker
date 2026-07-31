# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: standing-approvals.spec.ts >> a plain session never offers Allow every time, even for an eligible call
- Location: e2e\standing-approvals.spec.ts:63:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder(/Ask the coworker/)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder(/Ask the coworker/)

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // Standing scoped approvals (UX-DECISIONS §25): the creation consent card renders the agent's
  4  | // proposed permission set (reads = disclosure, writes = grants); a recurring run's approval card
  5  | // offers the task-persistent "Allow every time" (in-app, run context only); and the automation's
  6  | // detail page lists granted rules with per-rule Revoke.
  7  | 
  8  | async function openTaskDetail(page: import("@playwright/test").Page) {
  9  |   await page.goto("/");
  10 |   await page.getByTestId("account-row").click();
  11 |   await page.getByTestId("account-menu").getByRole("button", { name: "Automations", exact: true }).click();
  12 |   await page.getByText("Daily AI News").first().click();
  13 |   await expect(page.getByRole("button", { name: /Run now/ })).toBeVisible();
  14 | }
  15 | 
  16 | test("creation consent card renders writes as grants and reads as disclosure", async ({ page }) => {
  17 |   await page.goto("/");
  18 |   const box = page.getByPlaceholder(/Ask the coworker/);
  19 |   await expect(box).toBeVisible();
  20 | 
  21 |   await box.fill("please create an automation for the weekly digest");
  22 |   await page.getByRole("button", { name: "Send" }).click();
  23 | 
  24 |   // The approve-at-creation card carries the proposal instead of dumping raw JSON args.
  25 |   const grants = page.getByTestId("approval-grants");
  26 |   await expect(grants).toBeVisible();
  27 |   await expect(grants).toContainText("slack:T1/C1");
  28 |   await expect(grants).toContainText("always allowed once you approve");
  29 |   await expect(grants).toContainText("rohit/agent-platform");
  30 |   await expect(grants).toContainText("read-only");
  31 |   // Creation is minting surface #1 — there is no "Allow every time" here.
  32 |   await expect(page.getByRole("button", { name: "Allow every time" })).toHaveCount(0);
  33 | 
  34 |   await page.getByRole("button", { name: "Allow once" }).last().click();
  35 |   await expect(page.getByText("Done via create_scheduled_task [decision=once]")).toBeVisible();
  36 | });
  37 | 
  38 | test("a run session's approval card offers Allow every time and sends always_task", async ({
  39 |   page,
  40 | }) => {
  41 |   await openTaskDetail(page);
  42 |   await page.getByRole("button", { name: /Run now/ }).click();
  43 |   await expect(page.getByTestId("run-banner")).toBeVisible();
  44 |   // The manual run auto-sends the task prompt; wait for that turn to finish (the composer
  45 |   // re-arms) before driving the approval flow.
  46 |   await expect(page.getByText(/Echo: .*Fetch the latest AI news/)).toBeVisible();
  47 | 
  48 |   // An eligible gated write inside the run (the event carries the pinnable target).
  49 |   const box = page.getByPlaceholder(/Ask the coworker/);
  50 |   await box.fill("post the digest");
  51 |   await page.getByRole("button", { name: "Send" }).click();
  52 | 
  53 |   const allowEvery = page.getByRole("button", { name: "Allow every time" });
  54 |   await expect(allowEvery).toBeVisible();
  55 |   // The task-persistent grant replaces the session-scoped Always-allow in run context.
  56 |   await expect(page.getByRole("button", { name: "Always allow", exact: true })).toHaveCount(0);
  57 | 
  58 |   await allowEvery.click();
  59 |   // The decision that rode the socket is the task-persistent one.
  60 |   await expect(page.getByText("Done via send_message [decision=always_task]")).toBeVisible();
  61 | });
  62 | 
  63 | test("a plain session never offers Allow every time, even for an eligible call", async ({
  64 |   page,
  65 | }) => {
  66 |   await page.goto("/");
  67 |   const box = page.getByPlaceholder(/Ask the coworker/);
> 68 |   await expect(box).toBeVisible();
     |                     ^ Error: expect(locator).toBeVisible() failed
  69 | 
  70 |   await box.fill("post the digest");
  71 |   await page.getByRole("button", { name: "Send" }).click();
  72 | 
  73 |   // Same tool, same target — but without a run context the standing grant isn't offered;
  74 |   // the session-scoped Always-allow remains.
  75 |   await expect(page.getByRole("button", { name: "Allow once" }).last()).toBeVisible();
  76 |   await expect(page.getByRole("button", { name: "Allow every time" })).toHaveCount(0);
  77 |   await expect(page.getByRole("button", { name: "Always allow", exact: true }).last()).toBeVisible();
  78 | });
  79 | 
  80 | test("task detail lists standing rules under 'Allowed without asking'; Revoke removes one", async ({
  81 |   page,
  82 | }) => {
  83 |   await openTaskDetail(page);
  84 | 
  85 |   const grants = page.getByTestId("task-grants");
  86 |   await expect(page.getByText("Allowed without asking")).toBeVisible();
  87 |   await expect(grants).toContainText("send_message");
  88 |   await expect(grants).toContainText("slack:T1/C1");
  89 | 
  90 |   await grants.getByRole("button", { name: "Revoke" }).click();
  91 |   // The last rule is gone → the whole section disappears (nothing is allowed anymore).
  92 |   await expect(page.getByTestId("task-grants")).toHaveCount(0);
  93 |   await expect(page.getByText("Allowed without asking")).toHaveCount(0);
  94 | });
  95 | 
```