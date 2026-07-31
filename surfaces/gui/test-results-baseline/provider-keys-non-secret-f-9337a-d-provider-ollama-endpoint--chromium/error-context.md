# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: provider-keys.spec.ts >> non-secret fields blur-save on a configured provider (ollama endpoint)
- Location: e2e\provider-keys.spec.ts:56:1

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
  1  | // Settings ▸ Models key flows on the shared provider gallery (§39 components, UX-021 page):
  2  | // bad key fails in place, a passing Test auto-saves and slides home to the gallery where the
  3  | // card wears its ✓. Providers are seeded in three states (OpenAI configured+used, Anthropic
  4  | // configured-unused, Z AI unconfigured w/ a prefilled endpoint behind the disclosure). The
  5  | // mock's /verify fails on a key containing "bad"; POST /v1/providers flips `configured`.
  6  | import { expect } from "@playwright/test";
  7  | import { test } from "./fixtures";
  8  | 
  9  | async function openModels(page) {
  10 |   await page.goto("/");
> 11 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  13 |   await page.getByRole("button", { name: "Models", exact: true }).click();
  14 |   await expect(page.getByTestId("set-provider-openai")).toBeVisible();
  15 | }
  16 | 
  17 | test("Test with a bad key fails in place; a good key saves and returns to the gallery", async ({
  18 |   page,
  19 | }) => {
  20 |   await openModels(page);
  21 |   await page.getByTestId("set-provider-zai").click();
  22 | 
  23 |   await page.getByTestId("set-field-api_key").fill("sk-bad-key");
  24 |   await page.getByTestId("set-test").click();
  25 |   await expect(page.getByText("Invalid API key.")).toBeVisible();
  26 | 
  27 |   // A good key: Test verifies AND saves (§39) — the in-field pill confirms, then the form
  28 |   // slides home and the card wears its ✓.
  29 |   await page.getByTestId("set-field-api_key").fill("sk-glm-realkey");
  30 |   await page.getByTestId("set-test").click();
  31 |   await expect(page.getByTestId("set-saved-pill")).toContainText("Tested & saved");
  32 |   await expect(page.getByTestId("set-provider-zai")).toContainText("✓ Connected", {
  33 |     timeout: 5_000,
  34 |   });
  35 | 
  36 |   // State-restore regression (owner catch 2026-07-19): revisiting the just-saved provider
  37 |   // must show the masked placeholder + saved pill — never the typed key restored as a draft
  38 |   // (the auto-return used to stash the saved key and replay it on the next open).
  39 |   await page.getByTestId("set-provider-zai").click();
  40 |   await expect(page.getByTestId("set-field-api_key")).toHaveValue("");
  41 |   await expect(page.getByTestId("set-field-api_key")).toHaveAttribute("placeholder", "••••••••");
  42 |   await expect(page.getByTestId("set-saved-pill")).toContainText("Tested & saved");
  43 | });
  44 | 
  45 | test("a configured provider's form opens with the saved state, no plaintext key", async ({
  46 |   page,
  47 | }) => {
  48 |   await openModels(page);
  49 |   await page.getByTestId("set-provider-openai").click();
  50 |   // Stored credentials show as the in-field saved pill + masked placeholder — never the key.
  51 |   await expect(page.getByTestId("set-saved-pill")).toContainText("Tested & saved");
  52 |   await expect(page.getByTestId("set-field-api_key")).toHaveValue("");
  53 |   await expect(page.getByTestId("set-field-api_key")).toHaveAttribute("placeholder", "••••••••");
  54 | });
  55 | 
  56 | test("non-secret fields blur-save on a configured provider (ollama endpoint)", async ({
  57 |   page,
  58 | }) => {
  59 |   // Owner-hit 2026-07-23 (as the thinking-budget field, since folded into a default):
  60 |   // the Test button was the form's only save path — typing into a non-secret field and
  61 |   // leaving Settings silently discarded it. Blur now saves.
  62 |   await openModels(page);
  63 |   await page.getByTestId("set-provider-ollama").click();
  64 |   const endpoint = page.getByTestId("set-field-base_url");
  65 |   await endpoint.fill("http://127.0.0.1:9999");
  66 |   await endpoint.blur();
  67 |   await expect(page.getByTestId("set-field-saved-base_url")).toBeVisible();
  68 | 
  69 |   // Leave and come back: the value survived (served from the provider's stored values).
  70 |   await page.getByTestId("set-back").click();
  71 |   await page.getByTestId("set-provider-ollama").click();
  72 |   await expect(page.getByTestId("set-field-base_url")).toHaveValue("http://127.0.0.1:9999");
  73 | });
  74 | 
```