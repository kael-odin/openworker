# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: slack-directory.spec.ts >> people picker: guests are tagged, allowed users drop out of the list
- Location: e2e\slack-directory.spec.ts:31:1

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
  1  | // The Slack rosters: pick people from the workspace directory (instead of the
  2  | // park→approve-only flow) and resolve channel NAMES to ids in the channel picker.
  3  | // Both are reads on scopes every install already granted — no consent bump.
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
  14 | test("people picker: type a name, pick it, chip lands with the display name", async ({
  15 |   page,
  16 | }) => {
  17 |   await openSlackPage(page);
  18 |   // T1DL starts empty → the hint row carries the picker.
  19 |   await page.getByTestId("add-person-T1DL").click();
  20 |   const picker = page.getByTestId("person-picker");
  21 |   await picker.getByPlaceholder("Type a name…").fill("ro");
  22 |   await page.getByTestId("pick-person-U8ROHIT").click();
  23 |   // The chip shows the display name immediately (no first message needed).
  24 |   const group = page.getByTestId("slack-workspace-T1DL");
  25 |   await expect(group).toContainText("Rohit Prasad");
  26 |   await expect(page.getByTestId("person-picker")).toHaveCount(0);
  27 |   // The other workspace is untouched.
  28 |   await expect(page.getByTestId("slack-workspace-T2AC")).toContainText("No one allowed yet");
  29 | });
  30 | 
  31 | test("people picker: guests are tagged, allowed users drop out of the list", async ({
  32 |   page,
  33 | }) => {
  34 |   await openSlackPage(page);
  35 |   await page.getByTestId("add-person-T1DL").click();
  36 |   const picker = page.getByTestId("person-picker");
  37 |   await expect(picker.getByTestId("pick-person-U7CAL")).toContainText("guest");
  38 |   await picker.getByPlaceholder("Type a name…").fill("maya");
  39 |   await picker.getByTestId("pick-person-U9MAYA").click();
  40 |   await expect(page.getByTestId("slack-workspace-T1DL")).toContainText("Maya Chen");
  41 |   // Reopen: Maya is allowed now, so she's no longer offered.
  42 |   await page.getByTestId("add-person-T1DL").click();
  43 |   await expect(page.getByTestId("person-picker")).toBeVisible();
  44 |   await expect(page.getByTestId("pick-person-U9MAYA")).toHaveCount(0);
  45 |   await expect(page.getByTestId("pick-person-U8ROHIT")).toBeVisible();
  46 | });
  47 | 
  48 | test("channel typeahead: a NAME resolves to the workspace's id-address", async ({
  49 |   page,
  50 | }) => {
  51 |   await page.goto("/");
  52 |   await page.getByText("Draft the launch note").first().click();
  53 |   await page.getByTestId("access-toggle").click();
  54 |   await page.getByRole("button", { name: /Channels · 0/ }).click();
  55 | 
  56 |   const input = page.getByPlaceholder("slack:C0123 or channel link");
  57 |   await input.fill("launch");
  58 |   // Two workspaces are connected → the hit is labeled with its workspace.
  59 |   const hit = page.getByTestId("roster-channel-slack:T1DL/C9LAUNCH");
  60 |   await expect(hit).toContainText("#launch-team");
  61 |   await expect(hit).toContainText("deeplearning.ai");
  62 |   await hit.click();
  63 |   // Display = the NAME after a pick (owner catch 2026-07-11: raw ids leaked into the box);
  64 |   // the raw address survives underneath — the tooltip carries it and Add subscribes by id.
  65 |   await expect(input).toHaveValue("#launch-team");
  66 |   await expect(input).toHaveAttribute("title", "slack:T1DL/C9LAUNCH");
  67 |   await page.getByRole("button", { name: "Add", exact: true }).click();
  68 |   await expect(page.getByText(/Subscribed channels · 1/)).toBeVisible();
  69 | });
  70 | 
  71 | test("channel typeahead: private and not-a-member states are honest", async ({ page }) => {
  72 |   await page.goto("/");
  73 |   await page.getByText("Draft the launch note").first().click();
  74 |   await page.getByTestId("access-toggle").click();
  75 |   await page.getByRole("button", { name: /Channels · 0/ }).click();
  76 | 
  77 |   await page.getByPlaceholder("slack:C0123 or channel link").fill("l");
  78 |   await expect(page.getByTestId("roster-channel-slack:T1DL/C8LEADS")).toContainText("🔒");
  79 |   await expect(page.getByTestId("roster-channel-slack:T1DL/C7LOBBY")).toContainText(
  80 |     "invite @ocw",
  81 |   );
  82 | });
  83 | 
```