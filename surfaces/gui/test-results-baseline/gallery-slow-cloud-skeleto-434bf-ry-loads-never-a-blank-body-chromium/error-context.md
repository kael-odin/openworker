# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gallery.spec.ts >> slow cloud: skeleton shows while the gallery loads, never a blank body
- Location: e2e\gallery.spec.ts:24:1

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
  1   | // Settings ▸ Personas ▸ Gallery: the catalog lives in a screen-sized modal opened
  2   | // from the Personas page (link → featured carousel + list → in-modal solo page →
  3   | // informed install → Done lands back on Personas). Plus the page-level delete
  4   | // affordance for non-builtin personas.
  5   | import { expect } from "@playwright/test";
  6   | import { test } from "./fixtures";
  7   | 
  8   | async function openPersonas(page) {
  9   |   // Personas is launch-flagged off by default — these suites cover the flagged-on flows.
  10  |   await page.addInitScript(() => localStorage.setItem("ocw.flag.personas", "1"));
  11  |   await page.goto("/");
> 12  |   await page.getByTestId("account-row").click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  13  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  14  |   await page.getByRole("button", { name: "Personas", exact: true }).click();
  15  |   await expect(page.getByTestId("gallery-link")).toBeVisible();
  16  | }
  17  | 
  18  | async function openGallery(page) {
  19  |   await openPersonas(page);
  20  |   await page.getByTestId("gallery-link").click();
  21  |   await expect(page.getByTestId("gallery-modal")).toBeVisible();
  22  | }
  23  | 
  24  | test("slow cloud: skeleton shows while the gallery loads, never a blank body", async ({
  25  |   page,
  26  | }) => {
  27  |   // The real gallery is a cloud round-trip (Lambda + Dynamo) that can take seconds;
  28  |   // delay the mocked endpoints to assert the skeleton bridges the gap.
  29  |   await page.route("**/v1/cloud/status", async (route) => {
  30  |     await new Promise((r) => setTimeout(r, 1200));
  31  |     await route.fulfill({ json: { ok: true, signed_in: false } });
  32  |   });
  33  |   await openGallery(page);
  34  |   await expect(page.getByTestId("gallery-loading")).toBeVisible();
  35  |   await expect(page.getByTestId("gallery-loading")).toContainText("Loading the gallery");
  36  |   // Resolves into the real body (signed-out prompt here) once the cloud answers.
  37  |   await expect(page.getByTestId("gallery-signin")).toBeVisible({ timeout: 10_000 });
  38  |   await expect(page.getByTestId("gallery-loading")).toHaveCount(0);
  39  | });
  40  | 
  41  | test("signed out: modal prompts for sign-in, manual install path unaffected", async ({ page }) => {
  42  |   await openGallery(page);
  43  |   const prompt = page.getByTestId("gallery-signin");
  44  |   await expect(prompt).toContainText("needs a (free) cloud sign-in");
  45  |   await expect(prompt).toContainText("always works without an account");
  46  |   await expect(prompt.getByRole("button", { name: "Sign in" })).toBeVisible();
  47  |   // Esc closes; the Personas page (with its dir/Git importer) is still there.
  48  |   await page.keyboard.press("Escape");
  49  |   await expect(page.getByTestId("gallery-modal")).not.toBeVisible();
  50  |   await expect(page.getByRole("button", { name: "Install", exact: true })).toBeVisible();
  51  | });
  52  | 
  53  | test("signed in: featured carousel + list; solo page installs informed; Done returns", async ({
  54  |   page,
  55  | }) => {
  56  |   await openGallery(page);
  57  |   await page.getByTestId("gallery-signin").getByRole("button", { name: "Sign in" }).click();
  58  | 
  59  |   // Featured carousel holds the flagged persona; the list holds both.
  60  |   const featured = page.getByTestId("gallery-featured");
  61  |   await expect(featured).toBeVisible({ timeout: 10_000 });
  62  |   await expect(featured).toContainText("Sales Coworker");
  63  |   await expect(featured).not.toContainText("Recruiter");
  64  |   await expect(page.getByTestId("gallery-recruiter")).toContainText("View & install");
  65  |   await expect(page.getByTestId("gallery-team-teaser")).toContainText("coming soon");
  66  | 
  67  |   // Search narrows the list.
  68  |   await page.getByPlaceholder("Search personas").fill("recruit");
  69  |   await expect(page.getByTestId("gallery-sales")).not.toBeVisible();
  70  |   await page.getByPlaceholder("Search personas").fill("");
  71  | 
  72  |   // Solo page: pitch + manifest-derived capabilities BEFORE install.
  73  |   await page.getByTestId("gallery-sales").click();
  74  |   const detail = page.getByTestId("gallery-detail");
  75  |   await expect(detail).toContainText("Walk into every call already knowing the account");
  76  |   const caps = page.getByTestId("gallery-capabilities");
  77  |   await expect(caps).toContainText("verified from its manifest");
  78  |   await expect(caps).toContainText("files, search, todo");
  79  |   await expect(caps).toContainText("hubspot · core");
  80  |   await expect(caps).toContainText("read deals and contacts");
  81  | 
  82  |   await detail.getByRole("button", { name: "Install" }).click();
  83  |   await expect(detail).toContainText("disabled until you approve and enable it");
  84  | 
  85  |   // Done closes the modal, landing back on the Personas page.
  86  |   await detail.getByRole("button", { name: "Done" }).click();
  87  |   await expect(page.getByTestId("gallery-modal")).not.toBeVisible();
  88  |   await expect(page.getByTestId("gallery-link")).toBeVisible();
  89  | });
  90  | 
  91  | test("back link returns from the solo page to the catalog", async ({ page }) => {
  92  |   await openGallery(page);
  93  |   await page.getByTestId("gallery-signin").getByRole("button", { name: "Sign in" }).click();
  94  |   await page.getByTestId("gallery-sales").click({ timeout: 10_000 });
  95  |   await expect(page.getByTestId("gallery-detail")).toBeVisible();
  96  |   await page.getByRole("button", { name: "← Gallery" }).click();
  97  |   await expect(page.getByTestId("gallery-cards")).toBeVisible();
  98  | });
  99  | 
  100 | test("delete: non-builtin personas removable after confirm; built-ins are not", async ({
  101 |   page,
  102 | }) => {
  103 |   await openPersonas(page);
  104 |   // Built-ins expose no delete affordance.
  105 |   await expect(page.getByTestId("persona-delete-cowork")).toHaveCount(0);
  106 |   // Non-builtin: trash → inline confirm → row gone (works signed out).
  107 |   await expect(page.getByText("Acme Notes")).toBeVisible();
  108 |   await page.getByTestId("persona-delete-acme-notes").click();
  109 |   await page.getByTestId("persona-delete-confirm-acme-notes").click();
  110 |   await expect(page.getByText("Acme Notes")).not.toBeVisible();
  111 | });
  112 | 
```