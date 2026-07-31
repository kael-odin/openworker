# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reasoning.spec.ts >> thinking streams live, then persists as a collapsed disclosure on the answer
- Location: e2e\reasoning.spec.ts:7:1

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
  1  | // Model-layer roadmap item 4 (2026-07-22): reasoning traces. Live turn shows a quiet
  2  | // pulsing "Thinking…" disclosure that streams the trace; once the message finalizes the
  3  | // trace folds into a collapsed "Thought process" disclosure on the answer bubble.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | test("thinking streams live, then persists as a collapsed disclosure on the answer", async ({
  8  |   page,
  9  | }) => {
  10 |   await page.goto("/");
> 11 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   const box = page.getByPlaceholder(/Ask the coworker/);
  13 |   await box.fill("think hard about this");
  14 |   await box.press("Enter");
  15 | 
  16 |   // Live phase: the Thinking… block is up while deltas tick in; expanding shows the trace.
  17 |   await expect(page.getByText("Thinking…").first()).toBeVisible({ timeout: 10_000 });
  18 |   await page.getByTestId("thinking-toggle").click();
  19 |   await expect(page.getByTestId("thinking-body")).toContainText("Weighing options.");
  20 | 
  21 |   // Finalized: the answer bubble carries a collapsed "Thought process" disclosure.
  22 |   await expect(page.getByText("Decision made.").first()).toBeVisible({ timeout: 10_000 });
  23 |   await expect(page.getByText("Thinking…")).toHaveCount(0);
  24 |   const toggle = page.getByTestId("thinking-toggle");
  25 |   await expect(toggle).toHaveText(/Thought process/);
  26 |   await expect(page.getByTestId("thinking-body")).toHaveCount(0); // collapsed by default
  27 |   await toggle.click();
  28 |   await expect(page.getByTestId("thinking-body")).toContainText(
  29 |     "Weighing options. Comparing tradeoffs. Settling it.",
  30 |   );
  31 | });
  32 | 
```