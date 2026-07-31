# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interrupt-partial.spec.ts >> interrupted partial stream survives the next turn
- Location: e2e\interrupt-partial.spec.ts:8:1

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
  1  | // Owner-hit 2026-07-22: Stop mid-stream kept the partial visible — until the NEXT message's
  2  | // turn_start wiped it, because the partial only ever lived in the ephemeral streaming buffer
  3  | // (assistant_message is what promotes text into the transcript, and an interrupted turn never
  4  | // emits one). The fix flushes the buffer into a durable assistant item on interrupted/error.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | test("interrupted partial stream survives the next turn", async ({ page }) => {
  9  |   await page.goto("/");
> 10 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |   const box = page.getByPlaceholder(/Ask the coworker/);
  12 |   await box.fill("stream the epic");
  13 |   await box.press("Enter");
  14 | 
  15 |   // Let a few deltas land, then stop the turn.
  16 |   await expect(page.getByText("The epic scrolls ever onward").first()).toBeVisible({
  17 |     timeout: 10_000,
  18 |   });
  19 |   await page.getByRole("button", { name: /Stop/ }).click();
  20 |   await expect(page.getByText("Interrupted.").first()).toBeVisible({ timeout: 5_000 });
  21 | 
  22 |   // The partial is still on screen after the stop…
  23 |   await expect(page.getByText("The epic scrolls ever onward").first()).toBeVisible();
  24 | 
  25 |   // …and — the regression — still there after the next turn starts and completes.
  26 |   await box.fill("continue please");
  27 |   await box.press("Enter");
  28 |   await expect(page.getByText("Echo: continue please", { exact: false }).first()).toBeVisible({
  29 |     timeout: 10_000,
  30 |   });
  31 |   await expect(page.getByText("The epic scrolls ever onward").first()).toBeVisible();
  32 | });
  33 | 
```