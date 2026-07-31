# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: available-detail.spec.ts >> detail Connect opens the modal; the list pill skips navigation
- Location: e2e\available-detail.spec.ts:35:1

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
  1  | // Pre-connect connector detail page (UX-DECISIONS §38): an AVAILABLE row
  2  | // navigates to a subpage with the About paragraph, honest Access bullets, and
  3  | // the tool list behind a collapsed disclosure; Connect opens the same modal as
  4  | // the list's pill (which itself must NOT navigate).
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | async function openConnectors(page) {
  9  |   await page.goto("/");
> 10 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  12 | }
  13 | 
  14 | test("available row opens the pre-connect detail page", async ({ page }) => {
  15 |   await openConnectors(page);
  16 |   await page.getByTestId("connector-gmail").click();
  17 | 
  18 |   const detail = page.getByTestId("available-detail");
  19 |   await expect(detail).toContainText("Search, summarize, and send over your Gmail.");
  20 |   await expect(page.getByTestId("available-access")).toContainText("Reads and searches your mail.");
  21 |   await expect(detail).toContainText("Keys and tokens are stored only on this computer");
  22 | 
  23 |   // Tools are a collapsed disclosure — advanced detail, closed by default.
  24 |   await expect(detail).toContainText("2 tools this connector adds");
  25 |   await expect(detail).not.toContainText("Send email");
  26 |   await page.getByTestId("available-tools-toggle").click();
  27 |   await expect(detail).toContainText("Send email");
  28 |   await expect(detail).toContainText("asks first"); // write tools carry the tag
  29 | 
  30 |   // Breadcrumb returns to the list.
  31 |   await page.getByTestId("connectors-breadcrumb").click();
  32 |   await expect(page.getByTestId("connector-gmail")).toBeVisible();
  33 | });
  34 | 
  35 | test("detail Connect opens the modal; the list pill skips navigation", async ({ page }) => {
  36 |   await openConnectors(page);
  37 |   await page.getByTestId("connector-gmail").click();
  38 |   await page.getByTestId("available-connect").click();
  39 |   await expect(page.getByTestId("add-connection-modal")).toBeVisible();
  40 |   await page.keyboard.press("Escape");
  41 |   await expect(page.getByTestId("add-connection-modal")).not.toBeVisible();
  42 | 
  43 |   // Back on the list, the pill goes straight to the modal — no detail page.
  44 |   await page.getByTestId("connectors-breadcrumb").click();
  45 |   await page.getByTestId("connector-gmail").getByRole("button", { name: "Connect" }).click();
  46 |   await expect(page.getByTestId("add-connection-modal")).toBeVisible();
  47 |   await expect(page.getByTestId("available-detail")).not.toBeVisible();
  48 | });
  49 | 
```