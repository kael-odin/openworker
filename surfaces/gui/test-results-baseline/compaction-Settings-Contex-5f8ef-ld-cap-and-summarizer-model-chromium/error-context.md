# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: compaction.spec.ts >> Settings: Context compaction card edits threshold, cap, and summarizer model
- Location: e2e\compaction.spec.ts:7:1

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
  1  | // OPE-27 — auto-compaction GUI: the Settings card's two overrides + summarizer-model
  2  | // pin POST through, and the "context compacted" divider renders inline mid-session
  3  | // (driven by the fixtures' scripted `compacted` event) without touching the transcript.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | test("Settings: Context compaction card edits threshold, cap, and summarizer model", async ({
  8  |   page,
  9  | }) => {
  10 |   await page.goto("/");
> 11 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  13 |   await page.getByRole("button", { name: "Models", exact: true }).click();
  14 | 
  15 |   const card = page.getByTestId("compaction-card");
  16 |   await expect(card).toBeVisible();
  17 |   await expect(card.getByText("Context compaction")).toBeVisible();
  18 | 
  19 |   // Defaults render when the backend doesn't send the fields (older-backend robustness).
  20 |   await expect(card.getByTestId("compaction-threshold")).toHaveValue("80");
  21 |   await expect(card.getByTestId("compaction-cap")).toHaveValue("250000");
  22 |   await expect(card.getByTestId("compaction-model")).toHaveValue("");
  23 | 
  24 |   // Threshold edits POST as a fraction, clamped to 10–95%.
  25 |   const [req] = await Promise.all([
  26 |     page.waitForRequest(
  27 |       (r) => r.url().endsWith("/v1/settings/compaction") && r.method() === "POST",
  28 |     ),
  29 |     card.getByTestId("compaction-threshold").fill("70"),
  30 |   ]);
  31 |   expect(req.postDataJSON()).toEqual({ compaction_threshold_pct: 0.7 });
  32 | 
  33 |   const [req2] = await Promise.all([
  34 |     page.waitForRequest(
  35 |       (r) => r.url().endsWith("/v1/settings/compaction") && r.method() === "POST",
  36 |     ),
  37 |     card.getByTestId("compaction-cap").fill("100000"),
  38 |   ]);
  39 |   expect(req2.postDataJSON()).toEqual({ compaction_cap_tokens: 100000 });
  40 | 
  41 |   // Summarizer pin: the picker offers the session-default plus the configured models.
  42 |   const [req3] = await Promise.all([
  43 |     page.waitForRequest(
  44 |       (r) => r.url().endsWith("/v1/settings/compaction") && r.method() === "POST",
  45 |     ),
  46 |     card.getByTestId("compaction-model").selectOption("gpt-4o-mini"),
  47 |   ]);
  48 |   expect(req3.postDataJSON()).toEqual({ compaction_model: "gpt-4o-mini" });
  49 | });
  50 | 
  51 | test("the compacted divider renders mid-session and the transcript stays intact", async ({
  52 |   page,
  53 | }) => {
  54 |   await page.goto("/");
  55 |   await page.getByText("Draft the launch note").first().click();
  56 |   const box = page.getByPlaceholder(/Ask the coworker/);
  57 | 
  58 |   // An earlier exchange that must survive the compaction marker (transcript intact).
  59 |   await box.fill("remember the launch date");
  60 |   await box.press("Enter");
  61 |   await expect(page.getByText("Echo: remember the launch date").first()).toBeVisible({
  62 |     timeout: 10_000,
  63 |   });
  64 | 
  65 |   await box.fill("compact the context");
  66 |   await box.press("Enter");
  67 |   await expect(
  68 |     page.getByText("Context compacted — earlier turns were summarized").first(),
  69 |   ).toBeVisible({ timeout: 10_000 });
  70 |   await expect(
  71 |     page.getByText("Still on it — continuing where I left off.").first(),
  72 |   ).toBeVisible();
  73 |   // Outbound-only: everything before the divider is still on screen.
  74 |   await expect(page.getByText("Echo: remember the launch date").first()).toBeVisible();
  75 | });
  76 | 
```