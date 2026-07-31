# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sidebar-sessions.spec.ts >> mention-spawned sessions list in Recent with the platform icon — no From Slack band (§31 rev)
- Location: e2e\sidebar-sessions.spec.ts:46:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTitle('Weekly plan 1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTitle('Weekly plan 1')

```

# Test source

```ts
  1   | import { test, expect } from "./fixtures";
  2   | 
  3   | // Sidebar session lifecycle (owner testing pass, 2026-07-03): the peek cap (sessions_peek=5 →
  4   | // "Show more (2)" with 7 sessions), reversible archive with the Archived disclosure, and the
  5   | // two-step delete (Delete arms → "Delete?" confirms). All row actions sit behind the per-row
  6   | // ⋮ kebab (FB-011), so each flow goes hover → kebab → menu item.
  7   | 
  8   | test("session list caps at the peek count with Show more", async ({ page }) => {
  9   |   await page.goto("/");
  10  |   // Boot resumes a cowork session, so the Coworker accordion body is expanded. The body holds
  11  |   // 8 sessions (7 weekly plans + the Slack-origin one, §31 rev) against sessions_peek=5.
  12  |   await expect(page.getByTitle("Weekly plan 1")).toBeVisible();
  13  |   await expect(page.getByTitle("Weekly plan 5")).toBeVisible();
  14  |   await expect(page.getByTitle("Weekly plan 6")).toHaveCount(0);
  15  | 
  16  |   await page.getByRole("button", { name: "Show more (3)" }).click();
  17  |   await expect(page.getByTitle("Weekly plan 6")).toBeVisible();
  18  |   await expect(page.getByTitle("Weekly plan 7")).toBeVisible();
  19  | });
  20  | 
  21  | test("archive via the row menu is reversible via the Archived disclosure", async ({ page }) => {
  22  |   await page.goto("/");
  23  |   const row = page.getByTitle("Weekly plan 2");
  24  |   await expect(row).toBeVisible();
  25  | 
  26  |   await row.hover();
  27  |   await row.getByTestId("row-menu").click();
  28  |   await row.getByTestId("row-menu-archive").click();
  29  | 
  30  |   // Gone from the main list; parked under the Archived disclosure.
  31  |   await expect(page.getByTitle("Weekly plan 2")).toHaveCount(0);
  32  |   await page.getByRole("button", { name: /Archived \(1\)/ }).click();
  33  |   const archivedRow = page.getByTitle("Weekly plan 2");
  34  |   await expect(archivedRow).toBeVisible();
  35  | 
  36  |   // Unarchive (same menu slot on an archived row) brings it straight back; the disclosure
  37  |   // disappears with its last item.
  38  |   await archivedRow.hover();
  39  |   await archivedRow.getByTestId("row-menu").click();
  40  |   await expect(archivedRow.getByTestId("row-menu-archive")).toHaveText("Unarchive");
  41  |   await archivedRow.getByTestId("row-menu-archive").click();
  42  |   await expect(page.getByRole("button", { name: /Archived/ })).toHaveCount(0);
  43  |   await expect(page.getByTitle("Weekly plan 2")).toBeVisible();
  44  | });
  45  | 
  46  | test("mention-spawned sessions list in Recent with the platform icon — no From Slack band (§31 rev)", async ({
  47  |   page,
  48  | }) => {
  49  |   // Flat chronological layout — the launch default (personas off).
  50  |   await page.route("**/v1/settings", (r) => r.fulfill({ json: { nav_layout: "flat" } }));
  51  |   await page.goto("/");
> 52  |   await expect(page.getByTitle("Weekly plan 1")).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  53  | 
  54  |   // No collapsed band; the session sits directly in Recent, exactly once (its fixture
  55  |   // timestamp sorts it past the peek cap, so expand first)…
  56  |   await expect(page.getByTestId("from-slack-toggle")).toHaveCount(0);
  57  |   await page.getByText(/Show \d+ more/).click();
  58  |   const row = page.getByTitle("#general — check the deploy?");
  59  |   await expect(row).toBeVisible();
  60  |   await expect(page.getByTitle("#general — check the deploy?")).toHaveCount(1);
  61  |   // …wearing the Slack logo (hover-hidden cluster, so assert attachment not visibility).
  62  |   await expect(row.locator('[data-logo="slack"]')).toHaveCount(1);
  63  | });
  64  | 
  65  | test("pin via the row menu moves the session to the Pinned band and back", async ({ page }) => {
  66  |   await page.goto("/");
  67  |   const row = page.getByTitle("Weekly plan 4");
  68  |   await expect(row).toBeVisible();
  69  | 
  70  |   await row.hover();
  71  |   await row.getByTestId("row-menu").click();
  72  |   await expect(row.getByTestId("row-menu-pin")).toHaveText("Pin");
  73  |   await row.getByTestId("row-menu-pin").click();
  74  | 
  75  |   // Pinned rows live ONLY in the cross-persona Pinned band — no duplicate in the body.
  76  |   const pinnedBand = page.getByText("Pinned", { exact: true }).locator("..");
  77  |   await expect(pinnedBand.getByTitle("Weekly plan 4")).toBeVisible();
  78  |   await expect(page.getByTitle("Weekly plan 4")).toHaveCount(1);
  79  | 
  80  |   const pinnedRow = pinnedBand.getByTitle("Weekly plan 4");
  81  |   await pinnedRow.hover();
  82  |   await pinnedRow.getByTestId("row-menu").click();
  83  |   await expect(pinnedRow.getByTestId("row-menu-pin")).toHaveText("Unpin");
  84  |   await pinnedRow.getByTestId("row-menu-pin").click();
  85  |   await expect(pinnedBand.getByTitle("Weekly plan 4")).toHaveCount(0);
  86  |   await expect(page.getByTitle("Weekly plan 4")).toHaveCount(1);
  87  | });
  88  | 
  89  | test("delete is two-step: the menu's Delete arms, Delete? confirms", async ({ page }) => {
  90  |   await page.goto("/");
  91  |   const row = page.getByTitle("Weekly plan 3");
  92  |   await expect(row).toBeVisible();
  93  | 
  94  |   await row.hover();
  95  |   await row.getByTestId("row-menu").click();
  96  |   await row.getByTestId("row-menu-delete").click();
  97  |   // First click only ARMS — the menu stays open showing the confirm affordance, the row remains.
  98  |   await expect(row.getByTestId("row-menu-delete")).toHaveText("Delete?");
  99  |   await expect(page.getByTitle("Weekly plan 3")).toHaveCount(1);
  100 | 
  101 |   await row.getByTestId("row-menu-delete").click();
  102 |   await expect(page.getByTitle("Weekly plan 3")).toHaveCount(0);
  103 | });
  104 | 
```