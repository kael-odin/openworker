# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inbox.spec.ts >> routing: Configure tab binds the mirror channel; Pending's status line follows
- Location: e2e\inbox.spec.ts:50:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('inbox-chip')

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // The Inbox (owner testing pass, 2026-07-03; §28 two-tab split 2026-07-12): Pending holds the
  4  | // kind chips (All/Approvals/Questions), persona filter chips (only with >1 persona holding
  5  | // items), and resolve-removes-card. Routing moved to the Configure tab (the former Connectors ▸
  6  | // Messaging routing page) — Pending's status line is read-only and links there; the old inline
  7  | // editor (the mirror setting's SECOND editor) is gone.
  8  | 
  9  | async function openInbox(page: import("@playwright/test").Page) {
  10 |   await page.goto("/");
  11 |   // §26: the fixtures seed pending items, so the account row's inbox chip is unlocked and
  12 |   // pending — clicking it goes STRAIGHT to Inbox (the menu is the row's target, not the chip's).
> 13 |   await page.getByTestId("inbox-chip").click();
     |                                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  14 |   await expect(page.getByText("Approve: run_shell")).toBeVisible();
  15 | }
  16 | 
  17 | test("kind + persona filters narrow the pending list", async ({ page }) => {
  18 |   await openInbox(page);
  19 |   const question = "Which environment should I restart?";
  20 |   await expect(page.getByText(question)).toBeVisible();
  21 | 
  22 |   const filters = page.getByTestId("inbox-filters");
  23 |   await filters.getByRole("button", { name: "Approvals" }).click();
  24 |   await expect(page.getByText(question)).not.toBeVisible();
  25 |   await expect(page.getByText("Approve: run_shell")).toBeVisible();
  26 | 
  27 |   await filters.getByRole("button", { name: "Questions" }).click();
  28 |   await expect(page.getByText("Approve: run_shell")).not.toBeVisible();
  29 |   await expect(page.getByText(question)).toBeVisible();
  30 | 
  31 |   // Persona chips render because two personas hold items; filtering to Ops hides the cowork item.
  32 |   await filters.getByRole("button", { name: "All", exact: true }).click();
  33 |   await filters.getByRole("button", { name: "Ops", exact: true }).click();
  34 |   await expect(page.getByText("Approve: run_shell")).not.toBeVisible();
  35 |   await expect(page.getByText(question)).toBeVisible();
  36 | });
  37 | 
  38 | test("resolving an approval removes its card; question options resolve on click", async ({ page }) => {
  39 |   await openInbox(page);
  40 | 
  41 |   await page.getByRole("button", { name: "Approve", exact: true }).click();
  42 |   await expect(page.getByText("Approve: run_shell")).not.toBeVisible();
  43 | 
  44 |   // Single-select question: clicking an option resolves immediately.
  45 |   await page.getByRole("button", { name: "staging", exact: true }).click();
  46 |   await expect(page.getByText("Which environment should I restart?")).not.toBeVisible();
  47 |   await expect(page.getByText("Nothing pending.")).toBeVisible();
  48 | });
  49 | 
  50 | test("routing: Configure tab binds the mirror channel; Pending's status line follows", async ({
  51 |   page,
  52 | }) => {
  53 |   await openInbox(page);
  54 |   const line = page.getByTestId("inbox-routing");
  55 |   await expect(line).toContainText("Delivered here only");
  56 | 
  57 |   // The status line is read-only — its Configure › link lands on the Configure tab, which
  58 |   // holds the ONE editor (the old inline editor was a duplicate of this card).
  59 |   await page.getByTestId("inbox-route-configure").click();
  60 |   const mirror = page.getByTestId("inbox-mirror-card");
  61 |   await expect(mirror).toContainText("in-app Inbox only");
  62 |   await mirror.getByPlaceholder("slack:C0123 or channel link").fill("slack:T1DL/C0777");
  63 |   await mirror.getByRole("button", { name: "Set", exact: true }).click();
  64 |   await expect(mirror).toContainText("slack:T1DL/C0777");
  65 | 
  66 |   // Back on Pending, the line reflects the new target immediately.
  67 |   await page.getByTestId("inbox-tab-pending").click();
  68 |   await expect(line).toContainText("slack:T1DL/C0777");
  69 |   await expect(line).toContainText("replies there resolve items here");
  70 | 
  71 |   // Clearing (also on Configure) returns Pending to local-only delivery.
  72 |   await page.getByTestId("inbox-tab-configure").click();
  73 |   await mirror.getByRole("button", { name: "clear" }).click();
  74 |   await expect(mirror).toContainText("in-app Inbox only");
  75 |   await page.getByTestId("inbox-tab-pending").click();
  76 |   await expect(line).toContainText("Delivered here only");
  77 | });
  78 | 
```