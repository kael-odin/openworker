# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: model-switch.spec.ts >> mid-session model switch shows the marker and later turns use the new model
- Location: e2e\model-switch.spec.ts:8:1

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
  1  | // Model-layer roadmap item 3 (2026-07-22): the model picker stays actionable for the
  2  | // session's whole life (supersedes the 2026-07-04 lock that hid it after the first turn).
  3  | // A mid-session switch drops a persisted info marker into the transcript, and later
  4  | // messages ride the new model.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | test("mid-session model switch shows the marker and later turns use the new model", async ({
  9  |   page,
  10 | }) => {
  11 |   await page.goto("/");
> 12 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  13 |   const box = page.getByPlaceholder(/Ask the coworker/);
  14 |   await box.fill("hello there");
  15 |   await box.press("Enter");
  16 |   await expect(page.getByText("Echo: hello there", { exact: false }).first()).toBeVisible();
  17 | 
  18 |   // The picker is still in the composer after the first turn (the old lock hid it).
  19 |   const picker = page.locator(".dd").filter({ hasText: "Claude Opus 4.8" });
  20 |   await expect(picker).toBeVisible();
  21 |   await picker.locator(".pill").click();
  22 |   await page.locator(".dd-item").filter({ hasText: "GPT-5.5" }).click();
  23 | 
  24 |   // The switch marker lands in the transcript…
  25 |   await expect(page.getByText(/Model switched to gpt-5.5/).first()).toBeVisible();
  26 | 
  27 |   // …and the next message carries the new model (the fixture echoes it back).
  28 |   await box.fill("after the switch");
  29 |   await box.press("Enter");
  30 |   await expect(
  31 |     page.getByText("Echo: after the switch [model=gpt-5.5]", { exact: false }).first(),
  32 |   ).toBeVisible();
  33 | });
  34 | 
```