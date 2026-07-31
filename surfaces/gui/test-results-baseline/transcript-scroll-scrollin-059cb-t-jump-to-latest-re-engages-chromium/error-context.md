# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transcript-scroll.spec.ts >> scrolling up mid-stream pins the viewport; jump-to-latest re-engages
- Location: e2e\transcript-scroll.spec.ts:16:1

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
  1  | // FB-004/FB-005: the transcript follows a streaming turn only while the reader is at the
  2  | // bottom — scrolling up PINS the viewport (reading must never be yanked away) and surfaces
  3  | // a jump-to-latest pill; bubbles grow hover affordances (copy + timestamp) that reveal
  4  | // without shifting layout. Driven against the fixtures' slow "stream the epic" turn.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | // The copy test asserts real clipboard writes — grant instead of relying on defaults.
  9  | test.use({ permissions: ["clipboard-write"] });
  10 | 
  11 | const scrollerState = `(() => {
  12 |   const el = document.querySelector(".main-scroll");
  13 |   return el ? { top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight } : null;
  14 | })()`;
  15 | 
  16 | test("scrolling up mid-stream pins the viewport; jump-to-latest re-engages", async ({ page }) => {
  17 |   await page.goto("/");
> 18 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  19 |   const box = page.getByPlaceholder(/Ask the coworker/);
  20 |   await box.fill("stream the epic");
  21 |   await box.press("Enter");
  22 | 
  23 |   // Let the stream outgrow the viewport, then read something "above".
  24 |   await page.waitForFunction(
  25 |     () => {
  26 |       const el = document.querySelector(".main-scroll");
  27 |       return !!el && el.scrollHeight > el.clientHeight + 400;
  28 |     },
  29 |     { timeout: 10_000 },
  30 |   );
  31 |   await page.locator(".main-scroll").evaluate((el) => (el.scrollTop = 0));
  32 | 
  33 |   // The stream keeps growing below…
  34 |   const h1 = (await page.evaluate(scrollerState))!.height;
  35 |   await page.waitForFunction(
  36 |     (prev) => {
  37 |       const el = document.querySelector(".main-scroll");
  38 |       return !!el && el.scrollHeight > prev;
  39 |     },
  40 |     h1,
  41 |     { timeout: 5_000 },
  42 |   );
  43 |   // …but the viewport stays where the reader put it (the old behavior yanked to bottom
  44 |   // on every delta), and the pill offers the way back.
  45 |   const pinned = (await page.evaluate(scrollerState))!;
  46 |   expect(pinned.top).toBeLessThan(50);
  47 |   await expect(page.getByTestId("jump-to-latest")).toBeVisible();
  48 | 
  49 |   await page.getByTestId("jump-to-latest").click();
  50 |   await page.waitForFunction(
  51 |     () => {
  52 |       const el = document.querySelector(".main-scroll");
  53 |       return !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  54 |     },
  55 |     { timeout: 5_000 },
  56 |   );
  57 |   await expect(page.getByTestId("jump-to-latest")).toHaveCount(0);
  58 | 
  59 |   // Re-engaged: the follow survives the rest of the stream to the turn's end.
  60 |   await expect(page.getByText("The epic concludes.").first()).toBeVisible({ timeout: 10_000 });
  61 |   const done = (await page.evaluate(scrollerState))!;
  62 |   expect(done.height - done.top - done.client).toBeLessThan(80);
  63 | });
  64 | 
  65 | test("bubbles carry hover copy + timestamp without layout shift", async ({ page }) => {
  66 |   await page.goto("/");
  67 |   await page.getByText("Draft the launch note").first().click();
  68 |   const box = page.getByPlaceholder(/Ask the coworker/);
  69 |   await box.fill("hello meta");
  70 |   await box.press("Enter");
  71 |   await expect(page.getByText("Echo: hello meta", { exact: false }).first()).toBeVisible();
  72 | 
  73 |   // Live items are stamped client-side, so both bubbles expose the affordance strip.
  74 |   const userBubble = page.locator(".bubble-user").last();
  75 |   await userBubble.hover();
  76 |   const meta = page.getByTestId("bubble-copy");
  77 |   await expect(meta.first()).toBeVisible();
  78 |   await expect(page.getByTestId("bubble-ts").first()).toBeVisible();
  79 | 
  80 |   // Copy actually copies (the fixture page runs with clipboard permission in Chromium).
  81 |   await meta.first().click();
  82 |   await expect(page.getByText("Copied").first()).toBeVisible();
  83 | });
  84 | 
```