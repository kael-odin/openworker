# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Models: provider gallery states; vendor form previews models
- Location: e2e\settings.spec.ts:42:1

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
  1   | import { test, expect } from "./fixtures";
  2   | 
  3   | // Guards the Settings-as-page refactor (§13, IA per UX-021): the ⚙ menu opens a full-page
  4   | // surface with a left sub-nav — General · Models · Voice input — and each section renders.
  5   | // Files is a card inside General; Personas is launch-flagged off.
  6   | test("Settings opens as a full page and navigates sections", async ({ page }) => {
  7   |   await page.goto("/");
  8   | 
  9   |   await page.getByTestId("account-row").click();
  10  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  11  | 
  12  |   // Full-page: left sub-nav + the General section (no modal backdrop).
  13  |   await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  14  |   await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  15  |   for (const label of ["General", "Models", "Voice input"]) {
  16  |     await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  17  |   }
  18  |   // Folded/hidden tabs: Files is a General card now; Personas is launch-flagged off.
  19  |   await expect(page.getByRole("button", { name: "Files", exact: true })).toHaveCount(0);
  20  |   await expect(page.getByRole("button", { name: "Personas", exact: true })).toHaveCount(0);
  21  | 
  22  |   // The Files card lives inside General.
  23  |   await expect(page.getByText("Each conversation gets its own folder")).toBeVisible();
  24  | 
  25  |   await page.getByRole("button", { name: "Models", exact: true }).click();
  26  |   await expect(page.getByTestId("set-provider-openai")).toBeVisible();
  27  | });
  28  | 
  29  | // The launch flag brings the Personas tab back (the gallery/persona suites rely on it).
  30  | test("Settings: Personas tab returns behind the launch flag", async ({ page }) => {
  31  |   await page.addInitScript(() => localStorage.setItem("ocw.flag.personas", "1"));
  32  |   await page.goto("/");
  33  |   await page.getByTestId("account-row").click();
  34  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  35  |   await page.getByRole("button", { name: "Personas", exact: true }).click();
  36  |   await expect(page.getByText("Add personas")).toBeVisible();
  37  | });
  38  | 
  39  | // UX-021: Settings ▸ Models is the shared provider gallery (§39 components). Cards wear
  40  | // their own state (✓ Connected · used …); a vendor card opens the shared key form with the
  41  | // prefilled endpoint behind the disclosure; unconfigured providers preview their models.
  42  | test("Models: provider gallery states; vendor form previews models", async ({ page }) => {
  43  |   await page.goto("/");
> 44  |   await page.getByTestId("account-row").click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  45  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  46  |   await page.getByRole("button", { name: "Models", exact: true }).click();
  47  | 
  48  |   // Card states from the fixtures: openai configured+used, anthropic configured, zai not.
  49  |   await expect(page.getByTestId("set-provider-openai")).toContainText("✓ Connected · used 2h ago");
  50  |   await expect(page.getByTestId("set-provider-anthropic")).toContainText("✓ Connected");
  51  |   await expect(page.getByTestId("set-provider-zai")).toContainText("Not set up");
  52  |   await expect(page.getByTestId("set-provider-ollama")).toContainText("No key needed");
  53  | 
  54  |   // The composer-picker card lists the curated models with provider tags.
  55  |   const picker = page.getByTestId("composer-picker");
  56  |   await expect(picker).toContainText("In the composer's picker");
  57  | 
  58  |   // Vendor form: blurb renders; the prefilled endpoint hides behind the disclosure.
  59  |   await page.getByTestId("set-provider-zai").click();
  60  |   await expect(page.getByText(/Uses Z AI's OpenAI-compatible API/)).toBeVisible();
  61  |   await page.getByTestId("set-endpoint-link").click();
  62  |   await expect(page.getByTestId("set-field-base_url")).toHaveValue("https://api.z.ai/api/paas/v4");
  63  | 
  64  |   // Unconfigured providers still preview their curated models (read-only, matrix labels).
  65  |   const preview = page.getByTestId("model-preview");
  66  |   await expect(preview).toContainText("Included models");
  67  |   await expect(preview).toContainText("GLM-5.2 · Z AI");
  68  | 
  69  |   // Back to the gallery via the crumb.
  70  |   await page.getByTestId("set-back").click();
  71  |   await expect(page.getByTestId("set-provider-openai")).toBeVisible();
  72  | });
  73  | 
  74  | // UX-021: a configured provider's form shows the in-field saved state and the Remove key…
  75  | // affordance; removing reverts the card to "Not set up".
  76  | test("Models: Remove key reverts a configured provider", async ({ page }) => {
  77  |   await page.goto("/");
  78  |   page.on("dialog", (d) => d.accept());
  79  |   await page.getByTestId("account-row").click();
  80  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  81  |   await page.getByRole("button", { name: "Models", exact: true }).click();
  82  | 
  83  |   await page.getByTestId("set-provider-anthropic").click();
  84  |   await expect(page.getByTestId("set-saved-pill")).toContainText("Tested & saved");
  85  |   await page.getByTestId("set-remove-key").click();
  86  | 
  87  |   // Back on the gallery, the card has forgotten its key.
  88  |   await expect(page.getByTestId("set-provider-anthropic")).toContainText("Not set up");
  89  | });
  90  | 
  91  | // Token savings (owner ask 2026-07-17; moved under Models by UX-021): the card renders with
  92  | // the PDF fallback segmented control + attach thresholds, and edits POST through.
  93  | test("Settings: Token savings card edits PDF fallback and thresholds", async ({ page }) => {
  94  |   await page.goto("/");
  95  |   await page.getByTestId("account-row").click();
  96  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  97  |   await page.getByRole("button", { name: "Models", exact: true }).click();
  98  | 
  99  |   const card = page.getByTestId("token-savings-card");
  100 |   await expect(card).toBeVisible();
  101 |   await expect(card.getByText("Token savings")).toBeVisible();
  102 | 
  103 |   // Fallback mode: fixture says "text"; switching marks "Send page images" active.
  104 |   const seg = page.getByTestId("pdf-fallback");
  105 |   await expect(seg.getByRole("button", { name: "Extract text" })).toHaveClass(/active/);
  106 |   const [req] = await Promise.all([
  107 |     page.waitForRequest((r) => r.url().endsWith("/v1/settings/pdf") && r.method() === "POST"),
  108 |     seg.getByRole("button", { name: "Send page images" }).click(),
  109 |   ]);
  110 |   expect(req.postDataJSON()).toEqual({ pdf_fallback: "images" });
  111 |   await expect(seg.getByRole("button", { name: "Send page images" })).toHaveClass(/active/);
  112 | 
  113 |   // Thresholds: fixture starts at 2 pages / 10 MB; editing pages POSTs the clamped value.
  114 |   await expect(card.getByTestId("pdf-max-pages")).toHaveValue("2");
  115 |   await expect(card.getByTestId("pdf-max-mb")).toHaveValue("10");
  116 |   const [req2] = await Promise.all([
  117 |     page.waitForRequest((r) => r.url().endsWith("/v1/settings/pdf") && r.method() === "POST"),
  118 |     card.getByTestId("pdf-max-pages").fill("30"),
  119 |   ]);
  120 |   expect(req2.postDataJSON()).toEqual({ pdf_max_pages: 30 });
  121 | });
  122 | 
```