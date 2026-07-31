# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: error-retry.spec.ts >> provider error shows a retriable notice; Retry re-runs without a new user message
- Location: e2e\error-retry.spec.ts:7:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Draft the launch note').first()

```

# Test source

```ts
  1  | // Model-layer roadmap item 1 (2026-07-22): a turn that dies on a provider error leaves a
  2  | // visible, persistent marker with a Retry affordance. Retry re-runs the failed turn with NO
  3  | // new user bubble; once the turn recovers, the button disappears (the notice is history).
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | test("provider error shows a retriable notice; Retry re-runs without a new user message", async ({
  8  |   page,
  9  | }) => {
  10 |   await page.goto("/");
> 11 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   const box = page.getByPlaceholder(/Ask the coworker/);
  13 |   await box.fill("please fail the turn");
  14 |   await box.press("Enter");
  15 | 
  16 |   await expect(page.getByText("Error: model unreachable").first()).toBeVisible({ timeout: 10_000 });
  17 |   const retry = page.getByTestId("notice-retry");
  18 |   await expect(retry).toBeVisible();
  19 | 
  20 |   await retry.click();
  21 |   await expect(page.getByText("Recovered after retry.").first()).toBeVisible({ timeout: 10_000 });
  22 | 
  23 |   // No fake user bubble from the retry turn, exactly one real one…
  24 |   await expect(page.locator(".bubble-user")).toHaveCount(1);
  25 |   // …and the button is gone now that the error notice is no longer the transcript tail.
  26 |   await expect(page.getByTestId("notice-retry")).toHaveCount(0);
  27 | });
  28 | 
  29 | test("Retry survives a model switch — the intended recovery path", async ({ page }) => {
  30 |   await page.goto("/");
  31 |   await page.getByText("Draft the launch note").first().click();
  32 |   const box = page.getByPlaceholder(/Ask the coworker/);
  33 |   await box.fill("please fail the turn");
  34 |   await box.press("Enter");
  35 |   await expect(page.getByTestId("notice-retry")).toBeVisible({ timeout: 10_000 });
  36 | 
  37 |   // Switch models: the info marker lands AFTER the error — Retry must stay offered
  38 |   // (owner-hit 2026-07-23: the switch notices consumed it).
  39 |   const picker = page.locator(".dd").filter({ hasText: "Claude Opus 4.8" });
  40 |   await picker.locator(".pill").click();
  41 |   await page.locator(".dd-item").filter({ hasText: "GPT-5.5" }).click();
  42 |   await expect(page.getByText(/Model switched to gpt-5.5/).first()).toBeVisible();
  43 |   const retry = page.getByTestId("notice-retry");
  44 |   await expect(retry).toBeVisible();
  45 | 
  46 |   await retry.click();
  47 |   await expect(page.getByText("Recovered after retry.").first()).toBeVisible({ timeout: 10_000 });
  48 |   await expect(page.getByTestId("notice-retry")).toHaveCount(0);
  49 | });
  50 | 
```