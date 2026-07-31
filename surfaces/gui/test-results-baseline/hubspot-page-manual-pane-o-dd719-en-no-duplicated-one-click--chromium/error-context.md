# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hubspot-page.spec.ts >> manual pane offers the private-app token (no duplicated one-click)
- Location: e2e\hubspot-page.spec.ts:44:1

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
  1  | // The HubSpot detail page (M3.6 Step 4, UX-DECISIONS §21): multi-portal with
  2  | // Default/Sandbox/access tags, the add-modal with One click (read | write
  3  | // consent radios) | Manual private-app pills, and the hidden-fields denylist.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openConnectors(page) {
  8  |   await page.goto("/");
> 9  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  11 | }
  12 | 
  13 | async function signIn(page) {
  14 |   await page.getByTestId("account-row").click();
  15 |   await page.getByTestId("account-sign-in").click();
  16 |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  17 | }
  18 | 
  19 | test("connect via modal: access radios pick the consent tier; tags reflect it", async ({
  20 |   page,
  21 | }) => {
  22 |   await openConnectors(page);
  23 |   await signIn(page);
  24 | 
  25 |   // Available row → Connect → the two-pill modal with the access radios
  26 |   await page.getByTestId("connector-hubspot").getByRole("button", { name: "Connect" }).click();
  27 |   const modal = page.getByTestId("add-connection-modal");
  28 |   await expect(modal.getByTestId("hubspot-access-read")).toBeChecked(); // read-only default
  29 |   await expect(modal).toContainText("never delete");
  30 |   await modal.getByTestId("hubspot-access-write").check();
  31 |   await modal.getByTestId("modal-connect-hubspot").click();
  32 |   await page.keyboard.press("Escape");
  33 | 
  34 |   // the mock connects instantly; the row moves to Connected and navigates
  35 |   await expect(page.getByTestId("connector-hubspot")).toContainText("Acme Inc", {
  36 |     timeout: 10_000,
  37 |   });
  38 |   await page.getByTestId("connector-hubspot").click();
  39 |   const row = page.getByTestId("hubspot-portal-111");
  40 |   await expect(row).toContainText("Default");
  41 |   await expect(page.getByTestId("hubspot-access-tag-111")).toContainText("read & write");
  42 | });
  43 | 
  44 | test("manual pane offers the private-app token (no duplicated one-click)", async ({
  45 |   page,
  46 | }) => {
  47 |   await openConnectors(page);
  48 |   await page.getByTestId("connector-hubspot").getByRole("button", { name: "Connect" }).click();
  49 |   const modal = page.getByTestId("add-connection-modal");
  50 |   await modal.getByTestId("modal-pane-manual").click();
  51 |   await expect(modal.getByPlaceholder("pat-…")).toBeVisible();
  52 |   await expect(modal.getByTestId("managed-connect")).toHaveCount(0); // one-click lives on the other pill
  53 | });
  54 | 
  55 | test("second portal: sandbox tag, make-default, disconnect repoints", async ({ page }) => {
  56 |   await openConnectors(page);
  57 |   await signIn(page);
  58 |   await page.getByTestId("connector-hubspot").getByRole("button", { name: "Connect" }).click();
  59 |   await page.getByTestId("modal-connect-hubspot").click();
  60 |   await page.keyboard.press("Escape");
  61 |   await expect(page.getByTestId("connector-hubspot")).toContainText("Acme Inc", { timeout: 10_000 });
  62 |   await page.getByTestId("connector-hubspot").click();
  63 | 
  64 |   // add the sandbox portal from the page's header button
  65 |   await page.getByTestId("add-portal-btn").click();
  66 |   await page.getByTestId("modal-connect-hubspot").click();
  67 |   await page.keyboard.press("Escape");
  68 |   const sandbox = page.getByTestId("hubspot-portal-222");
  69 |   await expect(sandbox).toContainText("Sandbox", { timeout: 10_000 });
  70 | 
  71 |   await page.getByTestId("hubspot-make-default-222").click();
  72 |   await expect(sandbox).toContainText("Default");
  73 |   await page.getByTestId("hubspot-disconnect-222").click();
  74 |   await expect(page.getByTestId("hubspot-portal-222")).toHaveCount(0);
  75 |   await expect(page.getByTestId("hubspot-portal-111")).toContainText("Default");
  76 | });
  77 | 
  78 | test("hidden fields round-trip and read back normalized", async ({ page }) => {
  79 |   await openConnectors(page);
  80 |   await signIn(page);
  81 |   await page.getByTestId("connector-hubspot").getByRole("button", { name: "Connect" }).click();
  82 |   await page.getByTestId("modal-connect-hubspot").click();
  83 |   await page.keyboard.press("Escape");
  84 |   await expect(page.getByTestId("connector-hubspot")).toContainText("Acme Inc", { timeout: 10_000 });
  85 |   await page.getByTestId("connector-hubspot").click();
  86 | 
  87 |   const row = page.getByTestId("hubspot-hidden-fields");
  88 |   await row.getByRole("textbox").fill("Salary");
  89 |   await row.getByRole("textbox").press("Enter");
  90 |   await expect(row).toContainText("salary"); // normalized lowercase from the PATCH echo
  91 |   await row.getByTitle("remove").click();
  92 |   await expect(row).not.toContainText("salary");
  93 | });
  94 | 
```