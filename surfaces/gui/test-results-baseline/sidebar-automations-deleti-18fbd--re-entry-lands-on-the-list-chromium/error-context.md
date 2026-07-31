# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sidebar-automations.spec.ts >> deleting an automation clears the band at once; nav re-entry lands on the list
- Location: e2e\sidebar-automations.spec.ts:54:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('scheduled-task-2')

```

# Test source

```ts
  1  | // UX-023: automations get sidebar presence — an "Automations" nav row under Search
  2  | // (aggregate unseen badge) and a "Scheduled" band with ONE entry per automation
  3  | // (name + cadence + unseen-runs badge). Opening an automation's detail marks it
  4  | // seen: the badge clears immediately via the AUTOMATIONS_CHANGED broadcast, and
  5  | // runs newer than the pre-open mark wear a "new" pill inside the detail.
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | test("nav row + Scheduled band render with unseen badges; runs stay out of Recent", async ({
  10 |   page,
  11 | }) => {
  12 |   await page.goto("/");
  13 | 
  14 |   // Nav row sits right under Search — no badge of its own (owner call: the
  15 |   // Scheduled entry alone carries the count).
  16 |   const nav = page.getByTestId("nav-automations");
  17 |   await expect(nav).toBeVisible();
  18 |   await expect(nav).toContainText("Automations");
  19 |   await expect(nav).not.toContainText("2");
  20 | 
  21 |   // Scheduled band: one entry PER AUTOMATION — never per run. The noisy task wears
  22 |   // its badge; the quiet one shows none.
  23 |   const band = page.getByTestId("scheduled-band");
  24 |   await expect(band.getByTestId("scheduled-task-1")).toContainText("Daily AI News");
  25 |   await expect(band.getByTestId("scheduled-task-1")).toContainText("2");
  26 |   await expect(band.getByTestId("scheduled-task-2")).toContainText("Weekly CRM digest");
  27 |   await expect(band.getByTestId("scheduled-task-2")).not.toContainText("2");
  28 | 
  29 |   // Runs never appear as session rows (their sessions are __run__-prefixed and the
  30 |   // server hides them) — the band's entries are the only automation presence.
  31 |   await expect(page.getByTitle("__run__r1")).toHaveCount(0);
  32 | });
  33 | 
  34 | test("opening a Scheduled entry lands on the detail, marks seen, clears the badge", async ({
  35 |   page,
  36 | }) => {
  37 |   await page.goto("/");
  38 |   await page.getByTestId("scheduled-task-1").click();
  39 | 
  40 |   // The Automations surface opens ON that automation's detail…
  41 |   await expect(page.getByRole("heading", { name: "Daily AI News" })).toBeVisible();
  42 |   // …runs newer than the pre-open seen mark wear the "new" pill…
  43 |   await expect(page.getByTestId("run-new").first()).toBeVisible();
  44 |   // …and the entry's badge clears without waiting for any poll (mark-seen broadcast).
  45 |   await expect(page.getByTestId("scheduled-task-1")).not.toContainText("2");
  46 | });
  47 | 
  48 | test("the nav row opens the Automations overview", async ({ page }) => {
  49 |   await page.goto("/");
  50 |   await page.getByTestId("nav-automations").click();
  51 |   await expect(page.getByRole("heading", { name: "Automations" })).toBeVisible();
  52 | });
  53 | 
  54 | test("deleting an automation clears the band at once; nav re-entry lands on the list", async ({
  55 |   page,
  56 | }) => {
  57 |   await page.goto("/");
  58 |   // Open the automation from the band, delete it from the detail.
> 59 |   await page.getByTestId("scheduled-task-2").click();
     |                                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  60 |   await expect(page.getByRole("heading", { name: "Weekly CRM digest" })).toBeVisible();
  61 |   await page.getByRole("button", { name: /Delete/ }).click();
  62 | 
  63 |   // The Scheduled band drops the entry immediately (broadcast, not the 15s poll)…
  64 |   await expect(page.getByTestId("scheduled-task-2")).toHaveCount(0);
  65 | 
  66 |   // …and after visiting a session, the nav row must land on the OVERVIEW — the
  67 |   // remembered detail target for a deleted automation once left "Loading…" forever.
  68 |   await page.getByTitle("Weekly plan 1").click();
  69 |   await page.getByTestId("nav-automations").click();
  70 |   await expect(page.getByRole("heading", { name: "Automations" })).toBeVisible();
  71 |   await expect(page.getByText("Loading…")).toHaveCount(0);
  72 | });
  73 | 
```