# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: access-section.spec.ts >> + Add a source: full catalog on focus, filter as you type → connect-in-context; connected sources never match
- Location: e2e\access-section.spec.ts:42:1

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
  1  | // The rail's Access section (§32 — absorbs the §23 Session-settings drawer; the topbar
  2  | // row/glance machinery is retired). Contract: the header carries a PERMANENT summary of what
  3  | // the session can touch; expanding edits inline at rail width (no overlay, no dialog).
  4  | // Fixture state: browser + slack + github connected/enabled (github is two_way WITHOUT
  5  | // channels — relay mentions, no subscriptions), gmail recommended-not-connected, one
  6  | // primary root → summary "Browser, Slack +1 · 1 folder".
  7  | import { expect } from "@playwright/test";
  8  | import { test } from "./fixtures";
  9  | 
  10 | test("no topbar opener; the Access header IS the ambient glance; expanding edits inline", async ({
  11 |   page,
  12 | }) => {
  13 |   await page.goto("/");
  14 |   await page.getByText("Draft the launch note").first().click();
  15 | 
  16 |   // §32: the settings row/icon is gone from the topbar — the panel toggle is the one entry.
  17 |   await expect(page.getByRole("button", { name: "Open session settings" })).toHaveCount(0);
  18 |   await expect(page.getByTestId("session-settings-row")).toHaveCount(0);
  19 | 
  20 |   // The trust surface is ambient: the collapsed header always shows the summary — and no
  21 |   // nudge text ever renders at rest (§23's rule carried over).
  22 |   const section = page.getByTestId("access-section");
  23 |   await expect(section.getByTestId("access-summary")).toHaveText("Browser, Slack +1 · 1 folder");
  24 |   await expect(section.getByText(/recommended/i)).toHaveCount(0);
  25 | 
  26 |   // Expand → Sources (per-session toggles), Recommended (with its reason), Folders — all
  27 |   // inline in the rail; no dialog appears anywhere.
  28 |   await section.getByTestId("access-toggle").click();
  29 |   const body = page.getByRole("region", { name: "Session access" });
  30 |   await expect(body.getByText("Sources")).toBeVisible();
  31 |   await expect(body.getByText("Slack", { exact: true })).toBeVisible();
  32 |   await expect(body.getByText("email context for morning summaries")).toBeVisible();
  33 |   await expect(body.getByTestId("drawer-directories").getByText("Temporary space")).toBeVisible();
  34 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  35 | 
  36 |   // Channels is a chat capability, not a two_way one: Slack gets the drill-down, GitHub
  37 |   // (two_way via the relay, no channel semantics) must NOT (owner report 2026-07-13).
  38 |   await expect(body.getByRole("button", { name: /Channels ·/ })).toHaveCount(1);
  39 |   await expect(body.getByText("GitHub", { exact: true })).toBeVisible();
  40 | });
  41 | 
  42 | test("+ Add a source: full catalog on focus, filter as you type → connect-in-context; connected sources never match", async ({
  43 |   page,
  44 | }) => {
  45 |   await page.goto("/");
> 46 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  47 |   await page.getByTestId("access-toggle").click();
  48 | 
  49 |   // Focusing the empty input shows the FULL catalog (FB-012) — every available connector
  50 |   // minus the already-connected three, before any typing.
  51 |   await page.getByTestId("access-add-source").click();
  52 |   const search = page.getByTestId("access-add-search");
  53 |   await expect(search).toBeFocused();
  54 |   const rows = page.locator('[data-testid^="access-add-"]:not([data-testid="access-add-search"])');
  55 |   await expect(rows).toHaveCount(9); // 12 in the catalog − browser/slack/github (connected)
  56 |   await expect(page.getByTestId("access-add-notion")).toBeVisible();
  57 | 
  58 |   // Already-connected sources don't match (Slack and GitHub are connected in fixtures)…
  59 |   await search.fill("slack");
  60 |   await expect(page.getByText("No match — see all on the Connectors page below.")).toBeVisible();
  61 |   await search.fill("github");
  62 |   await expect(page.getByText("No match — see all on the Connectors page below.")).toBeVisible();
  63 | 
  64 |   // …and clearing the query restores the full list ("filter as you type", not search-only).
  65 |   await search.fill("");
  66 |   await expect(rows).toHaveCount(9);
  67 | 
  68 |   // Capability aliases match too: "calendar" surfaces Outlook (title alone never would).
  69 |   await search.fill("calendar");
  70 |   await expect(page.getByTestId("access-add-outlook")).toBeVisible();
  71 | 
  72 |   // …the long tail does: Notion is in the catalog but neither connected nor recommended.
  73 |   await search.fill("notion");
  74 |   await page.getByTestId("access-add-notion").click();
  75 | 
  76 |   // Lands in the SAME connect-in-context child view the Recommended flow uses, with the
  77 |   // scope-semantics line; back returns to the Sources list.
  78 |   const body = page.getByRole("region", { name: "Session access" });
  79 |   await expect(body.getByText("Connecting makes Notion available to all your coworkers", { exact: false })).toBeVisible();
  80 |   await expect(body.getByPlaceholder("ntn_…")).toBeVisible();
  81 |   await body.getByRole("button", { name: "Back to sources" }).click();
  82 |   await expect(body.getByText("Slack", { exact: true })).toBeVisible();
  83 | });
  84 | 
  85 | test("per-session mute round-trips; the summary follows", async ({ page }) => {
  86 |   await page.goto("/");
  87 |   await page.getByText("Draft the launch note").first().click();
  88 | 
  89 |   const section = page.getByTestId("access-section");
  90 |   await section.getByTestId("access-toggle").click();
  91 |   const body = page.getByRole("region", { name: "Session access" });
  92 |   // Muting Slack for this session drops it from the live summary (the fixture flips
  93 |   // enabled on POST and the section reloads).
  94 |   await body.getByTitle("Enabled for this session — tap to mute here").nth(1).click();
  95 |   await expect(section.getByTestId("access-summary")).toHaveText("Browser, GitHub · 1 folder");
  96 | });
  97 | 
```