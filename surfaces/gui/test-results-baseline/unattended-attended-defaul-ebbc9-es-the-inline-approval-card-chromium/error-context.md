# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: unattended.spec.ts >> attended (default): a tool request surfaces the inline approval card
- Location: e2e\unattended.spec.ts:16:1

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
  1   | // Unattended mode (item 8) — the "Send approvals to Inbox" toggle and its effect on approvals.
  2   | // Since §22 the toggle lives at the BOTTOM of the composer's Mode menu (who approves, and when —
  3   | // one mental model; the standalone InboxControl left the row). When a session is unattended, an
  4   | // approval PARKS to the Inbox instead of surfacing an inline card (the app suppresses the live
  5   | // card; the Inbox list itself is covered by inbox.spec.ts). The mocked /v1/sessions/:id/unattended
  6   | // is stateful so the toggle persists across a reload.
  7   | import { expect } from "@playwright/test";
  8   | import { test } from "./fixtures";
  9   | 
  10  | // The toggle sits inside the composer's Mode menu (§22).
  11  | async function openModeMenu(page) {
  12  |   await page.getByRole("button", { name: "Mode", exact: true }).click();
  13  |   await expect(page.getByTestId("mode-menu")).toBeVisible();
  14  | }
  15  | 
  16  | test("attended (default): a tool request surfaces the inline approval card", async ({ page }) => {
  17  |   await page.goto("/");
  18  |   const box = page.getByPlaceholder(/Ask the coworker/);
> 19  |   await box.fill("please run a tool");
      |             ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  20  |   await page.getByRole("button", { name: "Send" }).click();
  21  |   await expect(page.getByText("The coworker wants to run a command.").first()).toBeVisible();
  22  | });
  23  | 
  24  | test("Send-to-Inbox toggle (in the Mode menu) flips and persists across a reload", async ({
  25  |   page,
  26  | }) => {
  27  |   await page.goto("/");
  28  |   await openModeMenu(page);
  29  |   const sw = page.getByRole("switch", { name: "Send approvals to the Inbox" });
  30  |   await expect(sw).toHaveAttribute("aria-checked", "false");
  31  |   await sw.click();
  32  |   await expect(sw).toHaveAttribute("aria-checked", "true");
  33  | 
  34  |   // Reload: the stateful endpoint returns the saved flag, so the toggle reads back on.
  35  |   await page.reload();
  36  |   await openModeMenu(page);
  37  |   await expect(page.getByRole("switch", { name: "Send approvals to the Inbox" })).toHaveAttribute(
  38  |     "aria-checked",
  39  |     "true",
  40  |   );
  41  | });
  42  | 
  43  | test("unattended: a tool request parks (no inline approval card)", async ({ page }) => {
  44  |   await page.goto("/");
  45  |   await openModeMenu(page);
  46  |   await page.getByRole("switch", { name: "Send approvals to the Inbox" }).click();
  47  |   // The menu's full-screen overlay closes it on any outside click.
  48  |   await page.mouse.click(5, 5);
  49  | 
  50  |   const box = page.getByPlaceholder(/Ask the coworker/);
  51  |   await box.fill("please run a tool");
  52  |   await page.getByRole("button", { name: "Send", exact: true }).click();
  53  | 
  54  |   // The turn still starts, but the live approval card is suppressed — the prompt is parked to the
  55  |   // Inbox instead. Give the (suppressed) card a beat to NOT appear.
  56  |   await expect(page.getByText("Echo:").first()).toBeVisible().catch(() => {});
  57  |   await expect(page.getByText("The coworker wants to run a command.")).toHaveCount(0);
  58  | });
  59  | 
  60  | test("answering the live approval never re-flashes its parked Inbox mirror", async ({ page }) => {
  61  |   // Every live approval is ALSO parked as a per-session Inbox item (reconnect/remote resolution).
  62  |   // Tester catch 2026-07-12: after "Allow once", the polled sessionInbox copy was still pending
  63  |   // for up to a poll cycle, so the docked answer-in-context card flashed the SAME request again.
  64  |   // Simulate the mirror: any per-session inbox fetch for the live session returns one pending
  65  |   // approval until the decision lands (the fixtures' fixed items belong to other sessions).
  66  |   // The real server resolves the mirror synchronously with the decision — only the CLIENT's
  67  |   // polled copy is stale, which is exactly what this test pins.
  68  |   let mirrorResolved = false;
  69  |   await page.route(/\/v1\/inbox\?/, async (route) => {
  70  |     const q = new URL(route.request().url()).searchParams;
  71  |     const sid = q.get("session_id");
  72  |     if (!sid || sid === "wp-3" || sid === "ops-1") return route.fallback();
  73  |     return route.fulfill({
  74  |       contentType: "application/json",
  75  |       body: JSON.stringify({
  76  |         items: mirrorResolved
  77  |           ? []
  78  |           : [
  79  |               {
  80  |                 id: "mirror-1",
  81  |                 session_id: sid,
  82  |                 kind: "approval",
  83  |                 title: "Run `run_shell`?",
  84  |                 body: "requires approval",
  85  |                 state: "pending",
  86  |                 resolution: null,
  87  |                 inbox: "default",
  88  |                 created_at: "2026-07-12 10:00:00",
  89  |                 resolved_at: null,
  90  |               },
  91  |             ],
  92  |       }),
  93  |     });
  94  |   });
  95  | 
  96  |   await page.goto("/");
  97  |   const box = page.getByPlaceholder(/Ask the coworker/);
  98  |   await box.fill("please run a tool");
  99  |   await page.getByRole("button", { name: "Send", exact: true }).click();
  100 |   await expect(page.getByText("The coworker wants to run a command.").first()).toBeVisible();
  101 | 
  102 |   mirrorResolved = true; // server side resolves with the decision; the stale client copy is the bug
  103 |   await page.getByRole("button", { name: "Allow once" }).last().click();
  104 |   // "Never appears" semantics: pre-fix the stale mirror rendered within a frame of the click and
  105 |   // self-cleared a poll later — so a plain toHaveCount(0) would blink green. Watch the window.
  106 |   const flashed = await page
  107 |     .getByText("Run `run_shell`?")
  108 |     .waitFor({ state: "visible", timeout: 700 })
  109 |     .then(() => true)
  110 |     .catch(() => false);
  111 |   expect(flashed).toBe(false);
  112 |   await expect(page.getByText("The command ran; 1 file found.")).toBeVisible();
  113 | });
  114 | 
```