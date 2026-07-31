# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav-collapse.spec.ts >> RECENT header group/filter popover: switch grouping + see coworker filters
- Location: e2e\nav-collapse.spec.ts:32:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('recent-header')
Expected substring: "Recent"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByTestId('recent-header')

```

# Test source

```ts
  1  | // Left-nav polish (§20): collapse (⌘B / brand button → reveal button docks it back) and the
  2  | // RECENT-header group/filter popover (Group by Persona↔Chronological, Filter by coworker).
  3  | import { expect } from "@playwright/test";
  4  | import { test } from "./fixtures";
  5  | 
  6  | test("collapse hides the sidebar and reclaims the width; reveal button docks it back", async ({
  7  |   page,
  8  | }) => {
  9  |   await page.goto("/");
  10 |   const app = page.locator(".app");
  11 |   await expect(page.locator(".sidebar")).toBeVisible();
  12 | 
  13 |   // Collapse via the brand button.
  14 |   await page.getByRole("button", { name: "Collapse sidebar" }).click();
  15 |   await expect(app).toHaveClass(/nav-collapsed/);
  16 |   // The floating reveal affordance appears; clicking it docks the nav back.
  17 |   const reveal = page.getByRole("button", { name: "Show sidebar" });
  18 |   await expect(reveal).toBeVisible();
  19 |   await reveal.click();
  20 |   await expect(app).not.toHaveClass(/nav-collapsed/);
  21 | });
  22 | 
  23 | test("⌘B toggles the sidebar collapse", async ({ page }) => {
  24 |   await page.goto("/");
  25 |   const app = page.locator(".app");
  26 |   await page.keyboard.press("Meta+b");
  27 |   await expect(app).toHaveClass(/nav-collapsed/);
  28 |   await page.keyboard.press("Meta+b");
  29 |   await expect(app).not.toHaveClass(/nav-collapsed/);
  30 | });
  31 | 
  32 | test("RECENT header group/filter popover: switch grouping + see coworker filters", async ({
  33 |   page,
  34 | }) => {
  35 |   await page.goto("/");
  36 |   const header = page.getByTestId("recent-header");
> 37 |   await expect(header).toContainText("Recent");
     |                        ^ Error: expect(locator).toContainText(expected) failed
  38 | 
  39 |   await header.getByRole("button", { name: "Group and filter conversations" }).click();
  40 |   const menu = page.getByTestId("group-filter-menu");
  41 |   await expect(menu).toContainText("Group by");
  42 |   await expect(menu).toContainText("Filter by coworker");
  43 | 
  44 |   // Switch to Chronological → the persona accordion collapses into a flat list (the "OpenWorker"
  45 |   // persona group header is no longer a row; sessions list directly).
  46 |   await menu.getByText("Chronological").click();
  47 |   await expect(menu.getByText("Chronological").locator("xpath=..")).toContainText("✓");
  48 | 
  49 |   // Filter-by-coworker checkboxes are present (none checked by default → all shown).
  50 |   await expect(menu).toContainText("None checked shows all.");
  51 | });
  52 | 
```