# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automations-quickstart.spec.ts >> no-connection template: When is editable and create opens the detail
- Location: e2e\automations-quickstart.spec.ts:110:1

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
  1   | // The Automations quickstart (UX-DECISIONS §29): ONE template system — the former onboarding
  2   | // recipe (role templates, connect rows, lazy cloud sign-in, §25 consent) merged into the page's
  3   | // "Start from a template" grid. Cards carry §27's connector-dot vocabulary; picking one expands
  4   | // the configure card. The `ob-*` testids moved here with the machinery.
  5   | import { expect } from "@playwright/test";
  6   | import { test } from "./fixtures";
  7   | 
  8   | async function openAutomations(page) {
  9   |   await page.goto("/");
> 10  |   await page.getByTestId("account-row").click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11  |   await page.getByTestId("account-menu").getByRole("button", { name: "Automations", exact: true }).click();
  12  |   await expect(page.getByText("Recurring tasks OpenWorker runs on a schedule.")).toBeVisible();
  13  | }
  14  | 
  15  | // The fixtures seed one task, so the quickstart isn't on the bare list — surface it via the
  16  | // "+ New automation" toggle (empty state shows it without the toggle; covered indirectly by
  17  | // the delete test in automations-manage.spec.ts).
  18  | async function openQuickstart(page) {
  19  |   await openAutomations(page);
  20  |   await page.getByRole("button", { name: "+ New automation" }).click();
  21  |   await expect(page.getByText("Start from a template")).toBeVisible();
  22  | }
  23  | 
  24  | test("role recipe: connect rows, lazy single sign-in, channel by name, consent mints the grant", async ({
  25  |   page,
  26  | }) => {
  27  |   await openQuickstart(page);
  28  | 
  29  |   // Pipeline digest: Slack is connected in fixtures, HubSpot isn't. No recipe form yet.
  30  |   await page.getByTestId("qs-template-pipeline").click();
  31  |   const cfg = page.getByTestId("qs-configure");
  32  |   // §30: the card names its template — "SET UP · Pipeline digest" — instead of starting
  33  |   // abruptly after the grid.
  34  |   await expect(cfg).toContainText("Set up");
  35  |   await expect(cfg).toContainText("Pipeline digest");
  36  |   await expect(cfg.getByText("✓ Connected").first()).toBeVisible();
  37  |   await expect(page.getByTestId("ob-recipe")).toHaveCount(0);
  38  |   await expect(page.getByTestId("ob-create")).toBeDisabled();
  39  |   await expect(page.getByTestId("ob-create-hint")).toContainText("Connect HubSpot");
  40  | 
  41  |   // Connect HubSpot while signed out → the ONE cloud pane appears; signing in finishes the
  42  |   // pending connect without another click.
  43  |   await page.getByTestId("ob-connect-hubspot").click();
  44  |   await expect(page.getByTestId("ob-cloudpane")).toBeVisible();
  45  |   await page.getByTestId("ob-cloud-signin").click();
  46  |   await expect(page.getByTestId("ob-recipe")).toBeVisible({ timeout: 15_000 });
  47  | 
  48  |   // Connected but no channel → the gate names the missing piece (tester catch 2026-07-12).
  49  |   await expect(page.getByTestId("ob-create-hint")).toContainText("Pick a channel");
  50  | 
  51  |   // Channel picked BY NAME; §25 consent pre-checked; create lands on the task's detail with
  52  |   // the standing grant listed.
  53  |   const chan = page.locator('[data-testid="ob-channel"] input');
  54  |   await chan.click();
  55  |   await page.getByTestId("channel-suggestions").getByText("#ocw-test").click();
  56  |   await expect(chan).toHaveValue("#ocw-test");
  57  |   await expect(page.getByTestId("ob-consent")).toBeChecked();
  58  |   await page.getByTestId("ob-create").click();
  59  | 
  60  |   await expect(page.getByRole("button", { name: /Run now/ })).toBeVisible();
  61  |   await expect(page.getByText("Pipeline digest").first()).toBeVisible();
  62  |   await expect(page.getByTestId("task-grants")).toContainText("send_message");
  63  | });
  64  | 
  65  | test("connect narrates itself: Opening browser → waiting strip → Cancel restores the button", async ({
  66  |   page,
  67  | }) => {
  68  |   await openQuickstart(page);
  69  |   // Sign in out-of-band so Connect goes straight to the broker flow (no cloud pane).
  70  |   await page.evaluate(() => fetch("/v1/cloud/login", { method: "POST" }));
  71  | 
  72  |   // Hold the connect POST open (§30's 4–5 s of dead air) and never flip the fixture's
  73  |   // connected state — the waiting strip owns the gap until the user acts.
  74  |   let release: (() => void) | undefined;
  75  |   const held = new Promise<void>((r) => (release = r));
  76  |   await page.route(/\/v1\/connectors\/hubspot\/connect-managed$/, async (route) => {
  77  |     await held;
  78  |     await route.fulfill({ json: { ok: true } });
  79  |   });
  80  | 
  81  |   await page.getByTestId("qs-template-pipeline").click();
  82  |   // The mount refresh must land the signed-in status before Connect is clicked, or the
  83  |   // click would open the sign-in pane instead of the broker flow.
  84  |   await page.waitForResponse(/\/v1\/cloud\/status/);
  85  |   await page.getByTestId("ob-connect-hubspot").click();
  86  |   await expect(page.getByText("Opening browser…")).toBeVisible();
  87  | 
  88  |   release!();
  89  |   await expect(page.getByText("Waiting for HubSpot…")).toBeVisible();
  90  |   await expect(page.getByTestId("ob-connect-wait")).toContainText(
  91  |     "Finish connecting HubSpot in your browser",
  92  |   );
  93  | 
  94  |   // Cancel clears only the LOCAL waiting state — the Connect button returns.
  95  |   await page.getByTestId("ob-connect-cancel").click();
  96  |   await expect(page.getByTestId("ob-connect-wait")).toHaveCount(0);
  97  |   await expect(page.getByTestId("ob-connect-hubspot")).toBeVisible();
  98  | });
  99  | 
  100 | test("read-only recipe (Morning brief) carries disclosure, not a grant", async ({ page }) => {
  101 |   await openQuickstart(page);
  102 |   await page.getByTestId("qs-template-brief").click();
  103 | 
  104 |   // Calendar + Gmail rows; no consent checkbox anywhere — reads never gate.
  105 |   await expect(page.getByText("Today's meetings and gaps")).toBeVisible();
  106 |   await expect(page.getByText("What arrived overnight")).toBeVisible();
  107 |   await expect(page.getByTestId("ob-consent")).toHaveCount(0);
  108 | });
  109 | 
  110 | test("no-connection template: When is editable and create opens the detail", async ({ page }) => {
```