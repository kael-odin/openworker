# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: approval-card.spec.ts >> routine write → compact row: humanized title, inline preview, Allow resolves
- Location: e2e\approval-card.spec.ts:9:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder(/Ask the coworker/)

```

# Test source

```ts
  1  | // §35 (UX-018): approval cards speak the transcript's language. Routine workspace writes
  2  | // are a compact ROW (humanized title, inline args-preview, short "Always allow" with the
  3  | // full rule on hover); everything else is a full card — shell titles with the model's
  4  | // description, external actions wear the leaves-this-Mac note. No "PERMISSION REQUIRED"
  5  | // kicker, no raw args dump, no solid-fill buttons.
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | test("routine write → compact row: humanized title, inline preview, Allow resolves", async ({
  10 |   page,
  11 | }) => {
  12 |   await page.goto("/");
  13 |   const box = page.getByPlaceholder(/Ask the coworker/);
> 14 |   await box.fill("please write a file");
     |             ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  15 |   await page.getByRole("button", { name: "Send" }).click();
  16 | 
  17 |   const row = page.getByTestId("approval-row");
  18 |   await expect(row).toContainText("Write fetch_data.py");
  19 |   await expect(row).not.toContainText(/permission required/i);
  20 |   await expect(row.getByRole("button", { name: "Always allow", exact: true })).toHaveAttribute(
  21 |     "title",
  22 |     /for this session/,
  23 |   );
  24 | 
  25 |   // Preview expands INLINE from the tool args — the file doesn't exist yet.
  26 |   await row.getByText("preview ▾").click();
  27 |   await expect(row).toContainText("import json");
  28 |   await row.getByText("show all 6 lines").click();
  29 |   await expect(row).toContainText("done = True");
  30 | 
  31 |   await page.screenshot({ path: "test-results/ux018-compact-row.png", fullPage: false });
  32 | 
  33 |   await row.getByRole("button", { name: "Allow", exact: true }).click();
  34 |   await expect(page.getByText(/Done via write_file/)).toBeVisible();
  35 | });
  36 | 
  37 | test("run_shell → full card: description title, command preview, stays-on-this-Mac note", async ({
  38 |   page,
  39 | }) => {
  40 |   await page.goto("/");
  41 |   const box = page.getByPlaceholder(/Ask the coworker/);
  42 |   await box.fill("please run a tool");
  43 |   await page.getByRole("button", { name: "Send" }).click();
  44 | 
  45 |   // The mocked proposal has no description → plain "Run a command" title; the command is
  46 |   // the preview; the reason still renders; the scope note replaces the old badge.
  47 |   await expect(page.getByText("Run a command").last()).toBeVisible();
  48 |   await expect(page.getByText("stays on this Mac").last()).toBeVisible();
  49 |   await expect(page.getByText("The coworker wants to run a command.").first()).toBeVisible();
  50 |   await expect(page.getByRole("button", { name: "Always allow this command" }).last()).toBeVisible();
  51 |   await expect(page.getByText(/local action/)).toHaveCount(0);
  52 | 
  53 |   await page.screenshot({ path: "test-results/ux018-shell-card.png", fullPage: false });
  54 | 
  55 |   await page.getByRole("button", { name: "Allow once" }).last().click();
  56 |   await expect(page.getByText("The command ran; 1 file found.")).toBeVisible();
  57 | });
  58 | 
  59 | test("a one-paragraph digest send is clamped to a card, expandable in place", async ({
  60 |   page,
  61 | }) => {
  62 |   await page.goto("/");
  63 |   const box = page.getByPlaceholder(/Ask the coworker/);
  64 |   await box.fill("post the long digest");
  65 |   await page.getByRole("button", { name: "Send" }).click();
  66 | 
  67 |   // The message rides in a clamped preview box — not an unbounded quote wall.
  68 |   const prev = page.locator(".approval-prev");
  69 |   await expect(prev).toBeVisible();
  70 |   await expect(prev).toContainText("aisuite — last 24 hours");
  71 |   const clampedHeight = (await prev.boundingBox())!.height;
  72 |   expect(clampedHeight).toBeLessThan(200);
  73 | 
  74 |   await page.screenshot({ path: "test-results/send-digest-clamped.png", fullPage: false });
  75 | 
  76 |   // Expands in place, and can collapse back.
  77 |   await prev.getByText("show the full message").click();
  78 |   expect((await prev.boundingBox())!.height).toBeGreaterThan(clampedHeight);
  79 |   await expect(prev.getByText("show less")).toBeVisible();
  80 | });
  81 | 
```