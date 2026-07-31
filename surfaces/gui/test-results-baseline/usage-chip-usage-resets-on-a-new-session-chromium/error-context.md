# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: usage-chip.spec.ts >> usage resets on a new session
- Location: e2e\usage-chip.spec.ts:55:1

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
  1  | // Token-usage chip (OPE-42): after a turn reports usage, a quiet meter+count chip appears
  2  | // in the composer's bottom row; clicking it opens the per-model breakdown popover with the
  3  | // context-window fill. The fake agent attaches fixed usage to every echo turn
  4  | // (input 1k / output 200 / cache_read 8k / cache_write 800 — 10k per turn), and the
  5  | // settings fixture maps the default model to a 200k context window.
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | test("usage chip appears after a turn and opens the breakdown popover", async ({ page }) => {
  10 |   await page.goto("/");
  11 |   await page.getByText("Draft the launch note").first().click();
  12 | 
  13 |   // Fresh session: no usage yet — the chip is hidden entirely.
  14 |   await expect(page.getByTestId("usage-chip")).toHaveCount(0);
  15 | 
  16 |   const box = page.getByPlaceholder(/Ask the coworker/);
  17 |   await box.fill("hello");
  18 |   await box.press("Enter");
  19 |   await expect(page.getByText("Echo: hello", { exact: false }).first()).toBeVisible({
  20 |     timeout: 10_000,
  21 |   });
  22 | 
  23 |   // Chip shows the session total (1k + 200 + 8k + 800 = 10k).
  24 |   const chip = page.getByTestId("usage-chip");
  25 |   await expect(chip).toContainText("10k");
  26 | 
  27 |   // Popover: context fill (9.8k prompt-side of 200k = 5%) + per-model breakdown.
  28 |   await chip.click();
  29 |   const pop = page.getByTestId("usage-popover");
  30 |   await expect(pop).toBeVisible();
  31 |   await expect(pop).toContainText("Context window");
  32 |   await expect(pop).toContainText("9.8k of 200k · 5%");
  33 |   await expect(pop).toContainText("Session totals");
  34 |   await expect(pop).toContainText("Claude Opus 4.8 · Anthropic");
  35 |   // Cache split present → the input rows read as components of Total input.
  36 |   await expect(pop).toContainText("Uncached input");
  37 |   await expect(pop).toContainText("Cache reads");
  38 |   await expect(pop).toContainText("Cache writes");
  39 |   // Total input = fresh 1k + cache_read 8k + cache_write 800 (cumulative billed input).
  40 |   await expect(pop).toContainText("Total input");
  41 |   await expect(pop).toContainText("9.8k");
  42 |   await expect(pop).toContainText("10k tokens");
  43 | 
  44 |   // Second turn accumulates (totals double), and the scrim click closes the popover.
  45 |   await page.mouse.click(10, 10);
  46 |   await expect(pop).toHaveCount(0);
  47 |   await box.fill("again");
  48 |   await box.press("Enter");
  49 |   await expect(page.getByText("Echo: again", { exact: false }).first()).toBeVisible({
  50 |     timeout: 10_000,
  51 |   });
  52 |   await expect(chip).toContainText("20k");
  53 | });
  54 | 
  55 | test("usage resets on a new session", async ({ page }) => {
  56 |   await page.goto("/");
> 57 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  58 |   const box = page.getByPlaceholder(/Ask the coworker/);
  59 |   await box.fill("hello");
  60 |   await box.press("Enter");
  61 |   await expect(page.getByTestId("usage-chip")).toContainText("10k", { timeout: 10_000 });
  62 | 
  63 |   // "＋ New session" wipes the transcript — and the usage accumulation with it.
  64 |   await page.getByRole("button", { name: /New session/ }).first().click();
  65 |   await expect(page.getByTestId("usage-chip")).toHaveCount(0);
  66 | });
  67 | 
```