# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: slack-howitworks.spec.ts >> collapse hides the carousel, keeps the status line, and survives a reload
- Location: e2e\slack-howitworks.spec.ts:50:1

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
  1  | // UX-027: the Slack post-connect orientation card — installer pre-added to the
  2  | // allow-list ("you" chip), status line, 3-tab animated how-it-works carousel
  3  | // (no "Listen to a channel" — deferred by owner call), collapse persisted locally.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openSlackPage(page) {
  8  |   await page.goto("/");
> 9  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  11 |   await page.getByTestId("connector-slack").click();
  12 | }
  13 | 
  14 | test("post-connect card: personalized status line + the installer's 'you' chip", async ({
  15 |   page,
  16 | }) => {
  17 |   await openSlackPage(page);
  18 |   const card = page.getByTestId("slack-howitworks");
  19 |   await expect(card).toContainText("Getting started with Slack & OpenWorker");
  20 |   await expect(card).toContainText("deeplearning.ai connected");
  21 |   await expect(card).toContainText("you're on the People list");
  22 |   // The pre-added installer renders as a named chip marked "you" in ITS workspace.
  23 |   const chip = page.getByTestId("slack-workspace-T1DL").getByTestId("people-chip-you");
  24 |   await expect(chip).toContainText("Rohit Prasad");
  25 |   await expect(chip).toContainText("· you");
  26 | });
  27 | 
  28 | test("carousel has exactly the 3 shipped scenes and tabs switch the caption", async ({
  29 |   page,
  30 | }) => {
  31 |   await openSlackPage(page);
  32 |   const card = page.getByTestId("slack-howitworks");
  33 |   await expect(card.getByTestId("hiw-tab-0")).toContainText("Mention → session");
  34 |   await expect(card.getByTestId("hiw-tab-1")).toContainText("Threads stay connected");
  35 |   await expect(card.getByTestId("hiw-tab-2")).toContainText("Allow teammates");
  36 |   await expect(card).not.toContainText("Listen to a channel"); // deferred (rev 4)
  37 | 
  38 |   await expect(card.getByTestId("hiw-caption")).toContainText("a session opens here");
  39 |   // rev 7: the post-it layer restates the concept in place
  40 |   await expect(card.getByTestId("hiw-scene")).toContainText("a @mention starts a NEW session");
  41 |   await card.getByTestId("hiw-tab-1").click();
  42 |   await expect(card.getByTestId("hiw-caption")).toContainText("same session");
  43 |   await expect(card.getByTestId("hiw-scene")).toContainText("2 replies");
  44 |   await expect(card.getByTestId("hiw-scene")).toContainText("continues the SAME conversation");
  45 |   await card.getByTestId("hiw-tab-2").click();
  46 |   await expect(card.getByTestId("hiw-caption")).toContainText("waits for your OK");
  47 |   await expect(card.getByTestId("hiw-scene")).toContainText("Allow & deliver");
  48 | });
  49 | 
  50 | test("collapse hides the carousel, keeps the status line, and survives a reload", async ({
  51 |   page,
  52 | }) => {
  53 |   await openSlackPage(page);
  54 |   const card = page.getByTestId("slack-howitworks");
  55 |   await expect(card.getByTestId("hiw-tab-0")).toBeVisible();
  56 | 
  57 |   await card.getByTestId("hiw-collapse").click();
  58 |   await expect(card.getByTestId("hiw-tab-0")).toHaveCount(0);
  59 |   await expect(card).toContainText("you're on the People list"); // status line stays
  60 | 
  61 |   await openSlackPage(page); // full re-navigation — the seen-state is local
  62 |   await expect(page.getByTestId("slack-howitworks")).toBeVisible();
  63 |   await expect(page.getByTestId("hiw-tab-0")).toHaveCount(0);
  64 |   await page.getByTestId("hiw-collapse").click(); // reopen works
  65 |   await expect(page.getByTestId("hiw-tab-0")).toBeVisible();
  66 | });
  67 | 
```