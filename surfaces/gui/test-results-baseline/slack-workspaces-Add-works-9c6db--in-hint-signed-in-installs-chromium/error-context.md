# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: slack-workspaces.spec.ts >> Add workspace opens the modal; signed out shows the sign-in hint, signed in installs
- Location: e2e\slack-workspaces.spec.ts:27:1

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
  1   | // The Slack detail page (M3.6, UX-DECISIONS §21): one group per workspace with
  2   | // People / Waiting / Listening rows, add-workspace via the header-button MODAL
  3   | // (One click | Manual), per-workspace disconnect (stop-relaying-only), and the
  4   | // manual Socket-Mode card so neither connect path regresses.
  5   | import { expect } from "@playwright/test";
  6   | import { test } from "./fixtures";
  7   | 
  8   | async function openSlackPage(page) {
  9   |   await page.goto("/");
> 10  |   await page.getByTestId("account-row").click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11  |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  12  |   await page.getByTestId("connector-slack").click();
  13  | }
  14  | 
  15  | test("lists every connected workspace as its own group", async ({ page }) => {
  16  |   await openSlackPage(page);
  17  |   await expect(page.getByTestId("slack-workspace-T1DL")).toContainText("deeplearning.ai");
  18  |   await expect(page.getByTestId("slack-workspace-T2AC")).toContainText("acme-partners");
  19  |   // The workspace domain is the visible differentiator (ids demote to hover).
  20  |   await expect(page.getByTestId("slack-workspace-T1DL")).toContainText("· dlaiteam");
  21  |   await expect(page.getByTestId("slack-workspace-T2AC")).toContainText("· acmehq");
  22  |   // the workspace with people/parked shows the People row; the quiet one shows the hint
  23  |   await expect(page.getByTestId("slack-workspace-T1DL")).toContainText("People");
  24  |   await expect(page.getByTestId("slack-workspace-T2AC")).toContainText("No one allowed yet");
  25  | });
  26  | 
  27  | test("Add workspace opens the modal; signed out shows the sign-in hint, signed in installs", async ({
  28  |   page,
  29  | }) => {
  30  |   await openSlackPage(page);
  31  |   await page.getByTestId("add-workspace-btn").click();
  32  |   const modal = page.getByTestId("add-connection-modal");
  33  |   await expect(modal).toContainText("Sign in to OpenWorker Cloud"); // signed out
  34  |   // Manual pane is right there too — both modes, one entry point
  35  |   await modal.getByTestId("modal-pane-manual").click();
  36  |   await expect(modal.getByPlaceholder("Bot token · xoxb-…")).toBeVisible();
  37  |   await page.keyboard.press("Escape");
  38  | 
  39  |   // sign in from the list's cloud strip, then install one-click
  40  |   await page.getByTestId("connectors-breadcrumb").click();
  41  |   await page.getByTestId("account-row").click();
  42  |   await page.getByTestId("account-sign-in").click();
  43  |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  44  |   await page.getByTestId("connector-slack").click();
  45  |   await page.getByTestId("add-workspace-btn").click();
  46  |   await page.getByTestId("modal-add-to-slack").click();
  47  |   // the mock completes the browser install instantly; the page's poll shows it
  48  |   await expect(page.getByTestId("slack-workspace-T3NEW")).toContainText("new-workspace", {
  49  |     timeout: 10_000,
  50  |   });
  51  |   await expect(page.getByTestId("slack-workspace-T1DL")).toBeVisible(); // existing ones stay
  52  | });
  53  | 
  54  | test("disconnect removes one workspace and keeps the rest relaying", async ({ page }) => {
  55  |   await openSlackPage(page);
  56  |   await page.getByTestId("disconnect-workspace-T2AC").click();
  57  |   await expect(page.getByTestId("slack-workspace-T2AC")).toHaveCount(0);
  58  |   await expect(page.getByTestId("slack-workspace-T1DL")).toBeVisible();
  59  | });
  60  | 
  61  | test("manual Socket Mode: one card with the flat allow-list (no regression)", async ({
  62  |   page,
  63  | }) => {
  64  |   let owners: string[] = [];
  65  |   // Override the connectors payload AFTER mockApi so this test sees a manual-mode Slack
  66  |   // (routes registered later match first).
  67  |   await page.route("**/v1/connectors", (route) =>
  68  |     route.fulfill({
  69  |       status: 200,
  70  |       contentType: "application/json",
  71  |       body: JSON.stringify({
  72  |         connectors: [
  73  |           {
  74  |             name: "slack", title: "Slack", icon: "#", blurb: "Two-way Slack messaging.",
  75  |             auth: "bot_token", two_way: true, available: true, brand_color: "#611f69",
  76  |             logo: "slack", fields: [], instructions: [], connected: true, account: "acme",
  77  |             enabled: true, allowed_users: ["U0OK"], allowed_user_names: { U0OK: "Rohit" },
  78  |             approval_owner_ids: [...owners],
  79  |             approval_owner_names: Object.fromEntries(owners.map((u) => [u, u === "U9MAYA" ? "Maya Chen" : u])),
  80  |             tools: [], managed: true, managed_profile: false, mode: "", workspaces: [],
  81  |             unauthorized: [],
  82  |           },
  83  |         ],
  84  |       }),
  85  |     }),
  86  |   );
  87  |   await page.route("**/v1/connectors/slack/approval-owners/add", async (route) => {
  88  |     const body = route.request().postDataJSON();
  89  |     owners = [...new Set([...owners, body.user_id])];
  90  |     await route.fulfill({
  91  |       status: 200,
  92  |       contentType: "application/json",
  93  |       body: JSON.stringify({ ok: true, approval_owner_ids: owners }),
  94  |     });
  95  |   });
  96  |   await openSlackPage(page);
  97  |   await expect(page.getByTestId("slack-mode-badge")).toContainText("Socket Mode");
  98  |   const card = page.getByTestId("slack-manual-card");
  99  |   await expect(card).toContainText("acme");
  100 |   await expect(card).toContainText("Rohit"); // flat allow-list chip, named
  101 |   await expect(card).toContainText("Choose at least one owner");
  102 |   await page.getByTestId("add-approval-owner").click();
  103 |   await page.getByTestId("pick-person-U9MAYA").click();
  104 |   await expect(page.getByTestId("approval-owner-U9MAYA")).toContainText("Maya Chen");
  105 | });
  106 | 
```