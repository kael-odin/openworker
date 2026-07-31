# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sidebar-rows.spec.ts >> recent session rows render the title only — no persona subtitle
- Location: e2e\sidebar-rows.spec.ts:6:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.sidebar .group').filter({ hasText: 'Draft the launch note' }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.sidebar .group').filter({ hasText: 'Draft the launch note' }).first()

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // Session rows are SINGLE-LINE (UX-DECISIONS §7, 2026-07-21): title only — the
  4  | // persona/workspace subtitle is gone (personas are launch-flagged off; when they return
  5  | // the persona surfaces on hover, not as a second line).
  6  | test("recent session rows render the title only — no persona subtitle", async ({ page }) => {
  7  |   await page.goto("/");
  8  |   const row = page
  9  |     .locator(".sidebar .group")
  10 |     .filter({ hasText: "Draft the launch note" })
  11 |     .first();
> 12 |   await expect(row).toBeVisible();
     |                     ^ Error: expect(locator).toBeVisible() failed
  13 |   const text = (await row.innerText()).trim();
  14 |   expect(text).toBe("Draft the launch note");
  15 | });
  16 | 
```