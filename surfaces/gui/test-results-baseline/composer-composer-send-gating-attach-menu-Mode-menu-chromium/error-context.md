# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: composer.spec.ts >> composer: send-gating, + attach menu, Mode menu
- Location: e2e\composer.spec.ts:5:1

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
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // Guards the three-control composer row (§22): send-gating (accent only with content), the "+"
  4  | // attach menu, and the Mode menu (permission options + the folded-in Send-to-Inbox toggle).
  5  | test("composer: send-gating, + attach menu, Mode menu", async ({ page }) => {
  6  |   await page.goto("/");
> 7  |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  8  | 
  9  |   const box = page.getByPlaceholder(/Ask the coworker/);
  10 |   const send = page.getByRole("button", { name: "Send" });
  11 | 
  12 |   // Send is subtle grey when empty, accent once there's content, grey again when cleared.
  13 |   await expect(send).not.toHaveClass(/bg-accent/);
  14 |   await box.fill("hello there");
  15 |   await expect(send).toHaveClass(/bg-accent/);
  16 |   await box.fill("");
  17 |   await expect(send).not.toHaveClass(/bg-accent/);
  18 | 
  19 |   // "+" attach menu offers the three typed shortcuts.
  20 |   await page.getByRole("button", { name: "Attach" }).click();
  21 |   await expect(page.getByRole("button", { name: "Photo or image" })).toBeVisible();
  22 |   await expect(page.getByRole("button", { name: "PDF", exact: true })).toBeVisible();
  23 |   await expect(page.getByRole("button", { name: "Other files" })).toBeVisible();
  24 |   // Clicking the backdrop closes it.
  25 |   await page.locator(".fixed.inset-0.z-30").click();
  26 |   await expect(page.getByRole("button", { name: "Photo or image" })).toHaveCount(0);
  27 | 
  28 |   // Mode menu: the three shipped permission options with the current one marked, plus the
  29 |   // Unattended/send-to-Inbox toggle (§22). Plan + Custom hidden for this release (2026-07-22).
  30 |   await page.getByRole("button", { name: "Mode", exact: true }).click();
  31 |   const menu = page.getByTestId("mode-menu");
  32 |   await expect(menu.getByText("Discuss")).toBeVisible();
  33 |   await expect(menu.getByText("Plan", { exact: true })).toHaveCount(0);
  34 |   await expect(menu.getByText("Custom", { exact: true })).toHaveCount(0);
  35 |   // The current mode is marked with a ✓.
  36 |   await expect(menu.locator("button").filter({ hasText: "Ask for approval" })).toContainText("✓");
  37 |   await expect(menu.getByRole("switch", { name: "Send approvals to the Inbox" })).toBeVisible();
  38 |   // Picking an option closes the menu (and would flip the live engine's mode).
  39 |   await menu.getByText("Full access").click();
  40 |   await expect(page.getByTestId("mode-menu")).toHaveCount(0);
  41 | });
  42 | 
  43 | // PDFs read as data URLs and show a named chip (DMG #29 walkthrough catch: PDFs silently
  44 | // no-op'd because readFile only handled images and text).
  45 | test("composer: picking a PDF shows an attachment chip and arms send", async ({ page }) => {
  46 |   await page.goto("/");
  47 |   await page.getByText("Draft the launch note").first().click();
  48 | 
  49 |   const send = page.getByRole("button", { name: "Send" });
  50 |   await expect(send).not.toHaveClass(/bg-accent/);
  51 | 
  52 |   await page.locator('input[type="file"]').setInputFiles({
  53 |     name: "report.pdf",
  54 |     mimeType: "application/pdf",
  55 |     buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"),
  56 |   });
  57 | 
  58 |   const chip = page.locator(".attach-chip");
  59 |   await expect(chip).toContainText("report.pdf");
  60 |   await expect(send).toHaveClass(/bg-accent/); // attachment alone arms send
  61 | 
  62 |   // Removing the chip disarms send again.
  63 |   await chip.locator(".attach-x").click();
  64 |   await expect(page.locator(".attach-chip")).toHaveCount(0);
  65 |   await expect(send).not.toHaveClass(/bg-accent/);
  66 | });
  67 | 
  68 | // Token-savings threshold (owner ask, 2026-07-17): a PDF over the user's page limit is
  69 | // REJECTED with a visible notice — no chip, send stays disarmed. Fixture limit: 2 pages;
  70 | // the mock inspect endpoint reads the page count from a "%%pages=N" marker in the body.
  71 | test("composer: PDF over the page threshold is rejected with a notice", async ({ page }) => {
  72 |   await page.goto("/");
  73 |   await page.getByText("Draft the launch note").first().click();
  74 | 
  75 |   await page.locator('input[type="file"]').setInputFiles({
  76 |     name: "big-report.pdf",
  77 |     mimeType: "application/pdf",
  78 |     buffer: Buffer.from("%PDF-1.4\n%%pages=34\ntrailer\n<<>>\n%%EOF"),
  79 |   });
  80 | 
  81 |   const notice = page.getByTestId("attach-notice");
  82 |   await expect(notice).toContainText("big-report.pdf skipped");
  83 |   await expect(notice).toContainText("34 pages is over your 2-page limit");
  84 |   await expect(page.locator(".attach-chip")).toHaveCount(0);
  85 |   await expect(page.getByRole("button", { name: "Send" })).not.toHaveClass(/bg-accent/);
  86 | 
  87 |   // The ✕ dismisses the notice.
  88 |   await notice.getByRole("button").click();
  89 |   await expect(page.getByTestId("attach-notice")).toHaveCount(0);
  90 | 
  91 |   // A small PDF (1 page per the mock) still attaches fine after a rejection.
  92 |   await page.locator('input[type="file"]').setInputFiles({
  93 |     name: "small.pdf",
  94 |     mimeType: "application/pdf",
  95 |     buffer: Buffer.from("%PDF-1.4\n%%pages=1\ntrailer\n<<>>\n%%EOF"),
  96 |   });
  97 |   await expect(page.locator(".attach-chip")).toContainText("small.pdf");
  98 | });
  99 | 
```