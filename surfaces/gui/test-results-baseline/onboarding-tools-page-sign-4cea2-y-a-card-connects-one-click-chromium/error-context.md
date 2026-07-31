# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboarding.spec.ts >> tools page: sign-in morphs the page into the connector gallery; a card connects one-click
- Location: e2e\onboarding.spec.ts:101:1

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
  1   | // First-run onboarding (UX-DECISIONS §24 → §29 → §39): model → your tools → go.
  2   | // §39: step 1 is a provider GALLERY (cards wear their own state; a card opens its key
  3   | // form inside a fixed-height swap region; Test verifies, SAVES, and returns) and step 2
  4   | // is a two-state tools page (why-paragraph + sign-in → mini connector gallery with live
  5   | // one-click connects). Entered here via the REPLAY path (Settings ▸ Appearance ▸ "Run
  6   | // setup again") — which is itself under test.
  7   | import { expect } from "@playwright/test";
  8   | import { test } from "./fixtures";
  9   | 
  10  | async function openOnboarding(page) {
  11  |   await page.goto("/");
> 12  |   await page.getByTestId("account-row").click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  13  |   await page.getByTestId("account-menu").getByRole("button", { name: "Settings" }).click();
  14  |   await page.getByRole("button", { name: "Run setup again" }).click();
  15  |   await expect(page.getByTestId("ob-step-model")).toBeVisible();
  16  | }
  17  | 
  18  | test("provider gallery: cards wear their state; Next arms off stored credentials", async ({
  19  |   page,
  20  | }) => {
  21  |   await openOnboarding(page);
  22  | 
  23  |   // Every card carries its own status with zero clicks (the 2026-07-16 confusion —
  24  |   // "is OpenAI already connected?" — is answered by the gallery itself).
  25  |   await expect(page.getByTestId("ob-provider-openai")).toContainText("✓ Connected");
  26  |   await expect(page.getByTestId("ob-provider-anthropic")).toContainText("✓ Connected");
  27  |   await expect(page.getByTestId("ob-provider-zai")).toContainText("Not set up");
  28  |   await expect(page.getByTestId("ob-provider-ollama")).toContainText("No key needed");
  29  |   // Recognition-first order: anthropic before openai before the OpenAI-compat tail.
  30  |   const names = await page
  31  |     .getByTestId("ob-provider-gallery")
  32  |     .locator("[data-testid^=ob-provider-]")
  33  |     .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  34  |   expect(names.indexOf("ob-provider-anthropic")).toBeLessThan(names.indexOf("ob-provider-openai"));
  35  |   expect(names.indexOf("ob-provider-openai")).toBeLessThan(names.indexOf("ob-provider-zai"));
  36  | 
  37  |   // A configured provider already arms Next — no form visit required.
  38  |   await expect(page.getByTestId("ob-continue")).toBeEnabled();
  39  |   await page.getByTestId("ob-continue").click();
  40  |   await expect(page.getByTestId("ob-step-tools")).toBeVisible();
  41  | });
  42  | 
  43  | test("key form: Test verifies, saves, and returns to the gallery with the ✓", async ({
  44  |   page,
  45  | }) => {
  46  |   await openOnboarding(page);
  47  | 
  48  |   await page.getByTestId("ob-provider-zai").click();
  49  |   // The header stays put (§39 fixed frame): the welcome headline is still on screen.
  50  |   await expect(page.getByRole("heading", { name: "Welcome to OpenWorker" })).toBeVisible();
  51  |   // Optional endpoint is a quiet disclosure with no explainer copy (owner call 2026-07-18).
  52  |   await expect(page.getByTestId("ob-field-base_url")).toHaveCount(0);
  53  |   await page.getByTestId("ob-endpoint-link").click();
  54  |   await expect(page.getByTestId("ob-field-base_url")).toHaveValue(/api\.z\.ai/);
  55  | 
  56  |   // Bad key: the error is a line, not a navigation.
  57  |   await page.getByTestId("ob-field-api_key").fill("bad-key");
  58  |   await page.getByTestId("ob-test").click();
  59  |   await expect(page.getByText("Invalid API key.")).toBeVisible();
  60  | 
  61  |   // Good key: state lands IN the field ("✓ Tested & saved" pill), then the form
  62  |   // auto-returns to the gallery where the Z AI card now wears its ✓.
  63  |   await page.getByTestId("ob-field-api_key").fill("zk-good");
  64  |   await page.getByTestId("ob-test").click();
  65  |   await expect(page.getByTestId("ob-saved-pill")).toBeVisible();
  66  |   await expect(page.getByTestId("ob-provider-zai")).toContainText("✓ Connected", {
  67  |     timeout: 5_000,
  68  |   });
  69  |   await expect(page.getByTestId("ob-continue")).toBeEnabled();
  70  | });
  71  | 
  72  | test("key form: revisiting a connected provider shows the in-field saved state; drafts survive switching", async ({
  73  |   page,
  74  | }) => {
  75  |   await openOnboarding(page);
  76  | 
  77  |   // Revisit a configured provider: green in-field pill + masked placeholder — the old
  78  |   // empty-password-field-reads-as-not-set-up trap (owner complaint 2026-07-16) is gone.
  79  |   await page.getByTestId("ob-provider-openai").click();
  80  |   await expect(page.getByTestId("ob-saved-pill")).toBeVisible();
  81  |   await expect(page.getByTestId("ob-field-api_key")).toHaveAttribute("placeholder", "••••••••");
  82  | 
  83  |   // Typed-but-unsaved input survives a peek at another provider (drafts).
  84  |   await page.getByTestId("ob-back").click();
  85  |   await page.getByTestId("ob-provider-zai").click();
  86  |   await page.getByTestId("ob-field-api_key").fill("zk-draft");
  87  |   await page.getByTestId("ob-back").click();
  88  |   await page.getByTestId("ob-provider-openai").click();
  89  |   await expect(page.getByTestId("ob-saved-pill")).toBeVisible();
  90  |   await page.getByTestId("ob-back").click();
  91  |   await page.getByTestId("ob-provider-zai").click();
  92  |   await expect(page.getByTestId("ob-field-api_key")).toHaveValue("zk-draft");
  93  | 
  94  |   // Next from a dirty form auto-verifies and saves first (2026-07-12: no hidden
  95  |   // Test-then-Continue two-step), then advances.
  96  |   await page.getByTestId("ob-field-api_key").fill("zk-good");
  97  |   await page.getByTestId("ob-continue").click();
  98  |   await expect(page.getByTestId("ob-step-tools")).toBeVisible();
  99  | });
  100 | 
  101 | test("tools page: sign-in morphs the page into the connector gallery; a card connects one-click", async ({
  102 |   page,
  103 | }) => {
  104 |   await openOnboarding(page);
  105 |   await page.getByTestId("ob-continue").click();
  106 |   await expect(page.getByTestId("ob-step-tools")).toBeVisible();
  107 | 
  108 |   // Pre-sign-in (§41): the benefit rows are already there (no Connect buttons yet),
  109 |   // the combined Google row says Coming soon, the band asks for sign-in, and the one
  110 |   // footer button is the quiet "Continue without sign-in".
  111 |   await expect(page.getByText("Chat can only advise")).toBeVisible();
  112 |   await expect(page.getByTestId("ob-tool-outlook")).toContainText("Stay on top of email");
```