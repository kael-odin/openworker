# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> app loads with the persona nav and composer
- Location: e2e\smoke.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('OpenWorker').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('OpenWorker').first()

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | test("app loads with the persona nav and composer", async ({ page }) => {
  4  |   await page.goto("/");
> 5  |   await expect(page.getByText("OpenWorker").first()).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  6  |   // New session + Search are the fixed top nav.
  7  |   await expect(page.getByRole("button", { name: /New session/i })).toBeVisible();
  8  |   // The persona groups render from /v1/personas.
  9  |   await expect(page.getByText("Ops", { exact: true })).toBeVisible();
  10 | });
  11 | 
```