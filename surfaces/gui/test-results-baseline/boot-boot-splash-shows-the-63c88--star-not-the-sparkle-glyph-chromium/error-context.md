# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: boot.spec.ts >> boot splash shows the OpenWorker star, not the sparkle glyph
- Location: e2e\boot.spec.ts:8:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.boot-mark')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.boot-mark')

```

# Test source

```ts
  1  | // Cold-boot fixes (owner-hit 2026-07-23): the splash wears the real OpenWorker mark
  2  | // (6-point star SVG, not the ✦ text glyph that read as another product's logo), and the
  3  | // model picker recovers when the mount-time settings fetch loses the race against the
  4  | // sidecar boot — previously "Loading models…" stuck until the user visited Settings.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | test("boot splash shows the OpenWorker star, not the sparkle glyph", async ({ page }) => {
  9  |   // Hold health long enough to observe the splash.
  10 |   await page.route("**/v1/health", async (route) => {
  11 |     await new Promise((r) => setTimeout(r, 1500));
  12 |     await route.fallback();
  13 |   });
  14 |   await page.goto("/");
  15 |   const mark = page.locator(".boot-mark");
> 16 |   await expect(mark).toBeVisible();
     |                      ^ Error: expect(locator).toBeVisible() failed
  17 |   await expect(mark.locator("svg")).toBeVisible(); // the Icon logo, not a text glyph
  18 |   await expect(mark).not.toContainText("✦");
  19 |   await expect(page.getByText(/Starting OpenWorker|Restoring your session/)).toBeVisible();
  20 | });
  21 | 
  22 | test("model picker recovers when settings fetches die during sidecar boot", async ({ page }) => {
  23 |   // Real cold-start shape: EVERY request fails until the sidecar is up (health included),
  24 |   // then everything answers. The mount-time settings fetches all lose that race and are
  25 |   // swallowed — the post-health reload must populate the picker without a Settings visit.
  26 |   let sidecarUp = false;
  27 |   await page.route("**/v1/health", async (route) => {
  28 |     await new Promise((r) => setTimeout(r, 700));
  29 |     sidecarUp = true;
  30 |     await route.fallback();
  31 |   });
  32 |   await page.route("**/v1/settings", async (route) => {
  33 |     if (route.request().method() === "GET" && !sidecarUp) {
  34 |       await route.abort();
  35 |       return;
  36 |     }
  37 |     await route.fallback();
  38 |   });
  39 |   await page.goto("/");
  40 |   await expect(page.locator(".dd").filter({ hasText: "Claude Opus 4.8" })).toBeVisible({
  41 |     timeout: 10_000,
  42 |   });
  43 |   await expect(page.getByTestId("models-loading")).toHaveCount(0);
  44 | });
  45 | 
```