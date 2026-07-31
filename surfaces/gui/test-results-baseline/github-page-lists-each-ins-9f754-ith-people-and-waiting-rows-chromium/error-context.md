# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: github-page.spec.ts >> lists each installation as its own group with people and waiting rows
- Location: e2e\github-page.spec.ts:15:1

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
  1   | // The GitHub detail page (github-relay-spec §8): one group per App INSTALLATION
  2   | // with People / Waiting rows and a per-installation disconnect, add-installation
  3   | // via the header MODAL (One click | Manual), and the park → allow & deliver flow
  4   | // that admits a new sender login into that installation's allow-list.
  5   | import { expect } from "@playwright/test";
  6   | import { test } from "./fixtures";
  7   | 
  8   | async function openGithubPage(page) {
  9   |   await page.goto("/");
> 10  |   await page.getByTestId("account-row").click();
      |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11  |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  12  |   await page.getByTestId("connector-github").click();
  13  | }
  14  | 
  15  | test("lists each installation as its own group with people and waiting rows", async ({
  16  |   page,
  17  | }) => {
  18  |   await openGithubPage(page);
  19  |   const group = page.getByTestId("github-install-101");
  20  |   await expect(group).toContainText("acme");
  21  |   await expect(group).toContainText("selected repos"); // repo consent is GitHub-native
  22  |   await expect(group).toContainText("@rohit-dev"); // logins ARE the readable identity
  23  |   // the parked mention files under ITS installation, quoting the trigger
  24  |   await expect(group).toContainText("@maya-dev");
  25  |   await expect(group).toContainText("please take a look");
  26  | });
  27  | 
  28  | test("allow & deliver admits the sender into that installation's list", async ({
  29  |   page,
  30  | }) => {
  31  |   await openGithubPage(page);
  32  |   await page.getByTestId("parked-allow-deliver-gh-pk1").click();
  33  |   const group = page.getByTestId("github-install-101");
  34  |   await expect(group).toContainText("@maya-dev"); // now a People chip
  35  |   await expect(page.getByTestId("waiting-gh-pk1")).toHaveCount(0);
  36  | });
  37  | 
  38  | test("add installation opens the modal; signed in installs a second org", async ({
  39  |   page,
  40  | }) => {
  41  |   await openGithubPage(page);
  42  |   await page.getByTestId("add-installation-btn").click();
  43  |   const modal = page.getByTestId("add-connection-modal");
  44  |   await expect(modal).toContainText("@ocw-agent App"); // one-click pane
  45  |   await expect(modal).toContainText("Sign in to OpenWorker Cloud"); // signed out
  46  |   // Manual PAT pane is right there too — both modes, one entry point
  47  |   await modal.getByTestId("modal-pane-manual").click();
  48  |   await expect(modal).toContainText("Personal access token");
  49  |   await page.keyboard.press("Escape");
  50  | 
  51  |   // sign in from the list's cloud strip, then install one-click
  52  |   await page.getByTestId("connectors-breadcrumb").click();
  53  |   await page.getByTestId("account-row").click();
  54  |   await page.getByTestId("account-sign-in").click();
  55  |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  56  |   await page.getByTestId("connector-github").click();
  57  |   await page.getByTestId("add-installation-btn").click();
  58  |   await page.getByTestId("modal-install-github-app").click();
  59  |   // the mock completes the browser install instantly; the page's poll shows it
  60  |   await expect(page.getByTestId("github-install-202")).toContainText("hooli", {
  61  |     timeout: 10_000,
  62  |   });
  63  |   await expect(page.getByTestId("github-install-202")).toContainText("all repos");
  64  |   await expect(page.getByTestId("github-install-101")).toBeVisible(); // existing stays
  65  | });
  66  | 
  67  | test("modal has ONE connect button and sends no flow — authorize-first lives in the broker", async ({
  68  |   page,
  69  | }) => {
  70  |   // The broker's default github flow user-authorizes first (links existing installations,
  71  |   // redirects to the install page only when there are none) — so the modal's old
  72  |   // "Already installed? Link it" secondary and its flow=authorize are gone.
  73  |   await openGithubPage(page);
  74  |   await page.getByTestId("connectors-breadcrumb").click();
  75  |   await page.getByTestId("account-row").click();
  76  |   await page.getByTestId("account-sign-in").click();
  77  |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  78  |   await page.getByTestId("connector-github").click();
  79  | 
  80  |   let flowSent: string | null = null;
  81  |   await page.route("**/v1/connectors/github/connect-managed", async (route) => {
  82  |     flowSent = (route.request().postDataJSON() || {}).flow ?? "";
  83  |     await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  84  |   });
  85  |   await page.getByTestId("add-installation-btn").click();
  86  |   await expect(page.getByTestId("modal-link-github-install")).toHaveCount(0);
  87  |   await page.getByTestId("modal-install-github-app").click();
  88  |   await expect.poll(() => flowSent).toBe("");
  89  | });
  90  | 
  91  | test("disconnect removes one installation and keeps the rest", async ({ page }) => {
  92  |   await openGithubPage(page);
  93  |   // add a second installation first (signed-in one-click)
  94  |   await page.getByTestId("connectors-breadcrumb").click();
  95  |   await page.getByTestId("account-row").click();
  96  |   await page.getByTestId("account-sign-in").click();
  97  |   await expect(page.getByTestId("account-row")).toContainText("Rohit", { timeout: 10_000 });
  98  |   await page.getByTestId("connector-github").click();
  99  |   await page.getByTestId("add-installation-btn").click();
  100 |   await page.getByTestId("modal-install-github-app").click();
  101 |   await expect(page.getByTestId("github-install-202")).toBeVisible({ timeout: 10_000 });
  102 |   await page.keyboard.press("Escape"); // the modal never auto-closes (by design)
  103 | 
  104 |   await page.getByTestId("disconnect-install-202").click();
  105 |   await expect(page.getByTestId("github-install-202")).toHaveCount(0);
  106 |   await expect(page.getByTestId("github-install-101")).toBeVisible();
  107 | });
  108 | 
```