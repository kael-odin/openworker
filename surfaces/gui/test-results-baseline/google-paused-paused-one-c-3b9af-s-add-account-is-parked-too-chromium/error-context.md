# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: google-paused.spec.ts >> paused one-click: connected page's add-account is parked too
- Location: e2e\google-paused.spec.ts:62:1

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
  1  | // Google one-click paused pending CASA verification (owner ask 2026-07-22): the managed
  2  | // button parks with a "Coming soon" badge — pre-connect modal AND the connected page's
  3  | // add-account — while the manual token path stays fully live. The shared fixture keeps
  4  | // gmail unpaused (the cloud-machinery specs use it as their one-click subject), so this
  5  | // spec overrides the connectors payload per test, like automations-quickstart does.
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | const GMAIL_BASE = {
  10 |   name: "gmail",
  11 |   title: "Gmail",
  12 |   icon: "✉",
  13 |   blurb: "Search, summarize, draft, and send email.",
  14 |   about: "Search, summarize, and send over your Gmail.",
  15 |   access: ["Reads and searches your mail."],
  16 |   auth: "oauth",
  17 |   two_way: false,
  18 |   channels: false,
  19 |   available: true,
  20 |   brand_color: "#ea4335",
  21 |   logo: "gmail",
  22 |   fields: [
  23 |     { key: "access_token", label: "OAuth access token", secret: true, required: true, help: "", placeholder: "" },
  24 |   ],
  25 |   instructions: [],
  26 |   account: null,
  27 |   allowed_users: [],
  28 |   tools: [],
  29 |   managed: true,
  30 |   managed_paused: true,
  31 |   managed_profile: false,
  32 | };
  33 | 
  34 | async function serveGmail(page, extra: Record<string, unknown>) {
  35 |   await page.route("**/v1/connectors", (route) =>
  36 |     route.fulfill({ json: { connectors: [{ ...GMAIL_BASE, connected: false, enabled: false, ...extra }] } }),
  37 |   );
  38 | }
  39 | 
  40 | async function openConnectors(page) {
  41 |   await page.goto("/");
> 42 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  43 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  44 | }
  45 | 
  46 | test("paused one-click: Coming soon badge in the connect modal, manual path alive", async ({
  47 |   page,
  48 | }) => {
  49 |   await serveGmail(page, {});
  50 |   await openConnectors(page);
  51 |   await page.getByTestId("connector-gmail").getByRole("button", { name: "Connect", exact: true }).click();
  52 | 
  53 |   const soon = page.getByTestId("managed-coming-soon");
  54 |   await expect(soon).toBeVisible();
  55 |   await expect(soon).toBeDisabled();
  56 |   await expect(soon).toContainText("Coming soon");
  57 |   await expect(page.getByText("connect manually below for now")).toBeVisible();
  58 |   // The manual token field is still right there.
  59 |   await expect(page.getByText("OAuth access token")).toBeVisible();
  60 | });
  61 | 
  62 | test("paused one-click: connected page's add-account is parked too", async ({ page }) => {
  63 |   await serveGmail(page, {
  64 |     connected: true,
  65 |     enabled: true,
  66 |     account: "rohit@gmail.com",
  67 |     accounts: [
  68 |       { email: "rohit@gmail.com", default: true, managed: true, scopes: "gmail", needs_reauth: false },
  69 |     ],
  70 |     filters: { senders: [], labels: [] },
  71 |   });
  72 |   await openConnectors(page);
  73 |   await page.getByTestId("connector-gmail").click();
  74 |   await expect(page.getByTestId("gmail-detail")).toBeVisible();
  75 | 
  76 |   const add = page.getByTestId("add-account-btn");
  77 |   await expect(add).toBeDisabled();
  78 |   await expect(add).toContainText("Coming soon");
  79 |   // Existing accounts keep working and stay manageable.
  80 |   await expect(page.getByTestId("gmail-account-rohit@gmail.com")).toContainText("Default");
  81 | });
  82 | 
```