# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: composer-platform.spec.ts >> macos platform keeps the overlay layout
- Location: e2e\composer-platform.spec.ts:16:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.app.tauri-overlay').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.app.tauri-overlay').first()

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // The macOS overlay layout (traffic-light insets) must never apply on Windows —
  4  | // Windows keeps its native title bar (alignment bug, 2026-07-21). The shell injects
  5  | // __OCW_PLATFORM__; this simulates each platform and checks the overlay class.
  6  | test("windows platform gets no tauri-overlay layout", async ({ page }) => {
  7  |   await page.addInitScript(() => {
  8  |     (window as any).__TAURI__ = {}; // simulate the desktop shell
  9  |     (window as any).__OCW_PLATFORM__ = "windows";
  10 |   });
  11 |   await page.goto("/");
  12 |   await expect(page.locator("html")).toHaveAttribute("data-platform", "windows");
  13 |   await expect(page.locator(".app.tauri-overlay")).toHaveCount(0);
  14 | });
  15 | 
  16 | test("macos platform keeps the overlay layout", async ({ page }) => {
  17 |   await page.addInitScript(() => {
  18 |     (window as any).__TAURI__ = {};
  19 |     (window as any).__OCW_PLATFORM__ = "macos";
  20 |   });
  21 |   await page.goto("/");
> 22 |   await expect(page.locator(".app.tauri-overlay").first()).toBeVisible();
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  23 | });
  24 | 
```