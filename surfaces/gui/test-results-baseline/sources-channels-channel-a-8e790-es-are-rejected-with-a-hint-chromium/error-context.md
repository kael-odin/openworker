# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sources-channels.spec.ts >> channel add: link URLs resolve, bare #names are rejected with a hint
- Location: e2e\sources-channels.spec.ts:78:1

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
  1   | import { test, expect } from "./fixtures";
  2   | 
  3   | // Guards the per-session Slack channels drill-down (§14, hosted in the rail's Access section
  4   | // since §32): the "Channels" affordance is gated to two-way connectors, opens an inline child
  5   | // view, and add/remove round-trip through the subscribe APIs.
  6   | test("Slack channels drill-down: gating, add (auto-prefixed), remove", async ({ page }) => {
  7   |   await page.goto("/");
  8   | 
  9   |   // Open the pinned cowork session, then expand the rail's Access section.
  10  |   await page.getByText("Draft the launch note").first().click();
  11  |   await page.getByTestId("access-toggle").click();
  12  | 
  13  |   const body = page.getByRole("region", { name: "Session access" });
  14  |   await expect(body.getByText("Slack", { exact: true })).toBeVisible();
  15  | 
  16  |   // Gating: only the two-way connector (Slack) gets a Channels affordance — not Browser.
  17  |   await expect(page.getByRole("button", { name: /Channels ·/ })).toHaveCount(1);
  18  |   await expect(page.getByRole("button", { name: /Channels · 0/ })).toBeVisible();
  19  | 
  20  |   // Drill in.
  21  |   await page.getByRole("button", { name: /Channels · 0/ }).click();
  22  |   await expect(page.getByText("Slack channels")).toBeVisible();
  23  |   await expect(page.getByText(/Not listening to any Slack channel yet/)).toBeVisible();
  24  | 
  25  |   // Add a bare channel id — the panel scopes it to the connector (→ "slack:C0123").
  26  |   await page.getByPlaceholder("slack:C0123 or channel link").fill("C0123");
  27  |   await page.getByRole("button", { name: "Add", exact: true }).click();
  28  |   await expect(page.getByText("slack:C0123", { exact: true })).toBeVisible();
  29  |   await expect(page.getByText(/Subscribed channels · 1/)).toBeVisible();
  30  | 
  31  |   // Remove it → back to the empty state.
  32  |   await page.getByTitle("Stop listening").click();
  33  |   await expect(page.getByText(/Not listening to any Slack channel yet/)).toBeVisible();
  34  | 
  35  |   // Back returns to the Sources list.
  36  |   await page.getByRole("button", { name: "Back to sources" }).click();
  37  |   await expect(body.getByText("Slack", { exact: true })).toBeVisible();
  38  | });
  39  | 
  40  | // The recent-channels dropdown is a hand-rolled popover (NOT a <datalist> — WKWebView renders
  41  | // none), fed by /v1/channels/recent: focus opens it, typing filters, picking fills the input.
  42  | test("recent channels popover: opens on focus, filters, picks", async ({ page }) => {
  43  |   await page.goto("/");
  44  |   await page.getByText("Draft the launch note").first().click();
  45  |   await page.getByTestId("access-toggle").click();
  46  |   await page.getByRole("button", { name: /Channels · 0/ }).click();
  47  | 
  48  |   const input = page.getByPlaceholder("slack:C0123 or channel link");
  49  |   await input.click();
  50  |   const pop = page.getByTestId("channel-suggestions");
  51  |   // Named channels show "#name" with the address as a sub-label; unnamed fall back to the address.
  52  |   await expect(pop.getByText("#ocw-test")).toBeVisible();
  53  |   await expect(pop.getByText("slack:C0AAA111")).toBeVisible();
  54  |   await expect(pop.getByText("bob: deploy failed")).toBeVisible();
  55  | 
  56  |   // Typing part of the channel NAME filters too…
  57  |   await input.fill("ocw");
  58  |   await expect(pop.getByText("#ocw-test")).toBeVisible();
  59  |   await expect(pop.getByText("slack:C0BBB222")).toHaveCount(0);
  60  |   await input.fill("");
  61  | 
  62  |   // Typing filters (matches address or message text)…
  63  |   await input.fill("deploy");
  64  |   await expect(pop.getByText("slack:C0AAA111")).toHaveCount(0);
  65  |   await expect(pop.getByText("slack:C0BBB222")).toBeVisible();
  66  | 
  67  |   // …and picking fills the input and closes the popover.
  68  |   await pop.getByText("slack:C0BBB222").click();
  69  |   await expect(input).toHaveValue("slack:C0BBB222");
  70  |   await expect(page.getByTestId("channel-suggestions")).toHaveCount(0);
  71  | 
  72  |   await page.getByRole("button", { name: "Add", exact: true }).click();
  73  |   await expect(page.getByText(/Subscribed channels · 1/)).toBeVisible();
  74  | });
  75  | 
  76  | // Address-form fixes: a pasted Copy-link URL resolves to the id; a bare #name is rejected
  77  | // with the paste-the-ID hint instead of storing a dead subscription.
  78  | test("channel add: link URLs resolve, bare #names are rejected with a hint", async ({
  79  |   page,
  80  | }) => {
  81  |   await page.goto("/");
> 82  |   await page.getByText("Draft the launch note").first().click();
      |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  83  |   await page.getByTestId("access-toggle").click();
  84  |   await page.getByRole("button", { name: /Channels · 0/ }).click();
  85  | 
  86  |   const input = page.getByPlaceholder("slack:C0123 or channel link");
  87  |   await input.fill("#general");
  88  |   await page.getByRole("button", { name: "Add", exact: true }).click();
  89  |   await expect(page.getByTestId("channel-add-error")).toContainText(
  90  |     "paste the channel ID",
  91  |   );
  92  |   await expect(page.getByText(/Subscribed channels · 1/)).toHaveCount(0);
  93  | 
  94  |   await input.fill("https://acme.slack.com/archives/C0123ABC");
  95  |   // Typing again clears the rejection.
  96  |   await expect(page.getByTestId("channel-add-error")).toHaveCount(0);
  97  |   await page.getByRole("button", { name: "Add", exact: true }).click();
  98  |   await expect(page.getByText("slack:C0123ABC")).toBeVisible();
  99  |   await expect(page.getByText(/Subscribed channels · 1/)).toBeVisible();
  100 | });
  101 | 
```