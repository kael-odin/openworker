# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: composer-model-loading.spec.ts >> picker shows a disabled Loading-models chip until the list arrives
- Location: e2e\composer-model-loading.spec.ts:7:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('models-loading')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('models-loading')

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // The composer must never advertise models the backend didn't confirm: before the
  4  | // /v1/settings list arrives (cold app boot races the sidecar), the picker is a
  5  | // disabled "Loading models…" chip — NOT a hardcoded fallback list, which went stale
  6  | // and offered phantom ids (caught by owner, 2026-07-21).
  7  | test("picker shows a disabled Loading-models chip until the list arrives", async ({ page }) => {
  8  |   await page.route("**/v1/settings", (r) =>
  9  |     r.fulfill({
  10 |       json: { model: "gpt-5.5", models: [], model_labels: {}, has_key: true, model_ready: true, onboarded: true, nav_layout: "flat" },
  11 |     }),
  12 |   );
  13 |   await page.goto("/");
  14 |   const chip = page.getByTestId("models-loading");
> 15 |   await expect(chip).toBeVisible();
     |                      ^ Error: expect(locator).toBeVisible() failed
  16 |   await expect(chip).toBeDisabled();
  17 |   await expect(chip).toContainText("Loading models…");
  18 | });
  19 | 
```