# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session-intro.spec.ts >> three rows, no Set-me-up; gated rows show Configure › and expand the rail's Access section
- Location: e2e\session-intro.spec.ts:8:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('What should we produce?')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('What should we produce?')

```

# Test source

```ts
  1  | // Start-screen template tasks (§27): three concrete rows, no icon tiles, no "Set me up" list.
  2  | // Sub-lines are outcome-voiced; connection state lives in the dots + the trailing action.
  3  | // Gated row (source not live for this session) → "Configure ›" expands the rail's Access
  4  | // section (§32); ready row → click prefills the composer with the template stem.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | test("three rows, no Set-me-up; gated rows show Configure › and expand the rail's Access section", async ({
  9  |   page,
  10 | }) => {
  11 |   await page.goto("/");
> 12 |   await expect(page.getByText("What should we produce?")).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  13 | 
  14 |   // Exactly the three template tasks; the old setup list is gone.
  15 |   await expect(page.locator(".task-card")).toHaveCount(3);
  16 |   await expect(page.getByText("Set me up (optional)")).toHaveCount(0);
  17 |   await expect(page.getByText("Give me access to a folder")).toHaveCount(0);
  18 | 
  19 |   // Fixture session state: slack + github live, hubspot not → the HubSpot row is gated,
  20 |   // with the Configure affordance visible AT REST (no hover needed — it IS the row's action);
  21 |   // the github+slack automation row has everything it needs.
  22 |   const hs = page.getByTestId("intro-task-hubspot");
  23 |   await expect(hs).toContainText("Configure ›");
  24 |   await expect(hs.locator(".task-card-act")).toHaveCSS("opacity", "1");
  25 |   await expect(page.getByTestId("intro-task-github-slack")).toContainText("Start →");
  26 | 
  27 |   // Sub-lines describe the task's outcome, never connection state.
  28 |   await expect(hs).toContainText("Sources, stages, and who needs follow-up");
  29 |   await expect(hs).not.toContainText(/connect/i);
  30 | 
  31 |   // Configure → the rail's Access section expands (§32), not a bespoke setup surface.
  32 |   await hs.click();
  33 |   await expect(page.getByRole("region", { name: "Session access" })).toBeVisible();
  34 |   // No composer prefill happened on the gated click.
  35 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toHaveValue("");
  36 | });
  37 | 
  38 | test("ready rows reveal Start → on hover and prefill the composer", async ({ page }) => {
  39 |   // Make every source live for this session (registered after the fixture's routes → wins).
  40 |   await page.route("**/v1/sessions/*/connections*", (route) =>
  41 |     route.fulfill({
  42 |       contentType: "application/json",
  43 |       body: JSON.stringify({
  44 |         connected: [
  45 |           { connector: "hubspot", enabled: true, detail: "" },
  46 |           { connector: "github", enabled: true, detail: "" },
  47 |           { connector: "slack", enabled: true, detail: "" },
  48 |         ],
  49 |         recommended: [],
  50 |         attention: 0,
  51 |       }),
  52 |     }),
  53 |   );
  54 |   await page.goto("/");
  55 | 
  56 |   const hs = page.getByTestId("intro-task-hubspot");
  57 |   await expect(hs).toContainText("Start →");
  58 |   // The action is hover-revealed on ready rows (hidden at rest).
  59 |   await expect(hs.locator(".task-card-act")).toHaveCSS("opacity", "0");
  60 |   await hs.hover();
  61 |   await expect(hs.locator(".task-card-act")).toHaveCSS("opacity", "1");
  62 | 
  63 |   await hs.click();
  64 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toHaveValue(/HubSpot leads/);
  65 | 
  66 |   // Both sources live → the automation row is ready too; its prefill is the recipe stem.
  67 |   const gh = page.getByTestId("intro-task-github-slack");
  68 |   await expect(gh).toContainText("Start →");
  69 |   await gh.click();
  70 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toHaveValue(/weekly progress report/);
  71 | });
  72 | 
  73 | test("folder task opens the inline add-folder form; adding a folder prefills the composer", async ({
  74 |   page,
  75 | }) => {
  76 |   await page.goto("/");
  77 | 
  78 |   // No shared folder yet (the fixture root is the primary scratch) → the row expands the form.
  79 |   await page.getByTestId("intro-task-folder").click();
  80 |   const path = page.getByPlaceholder("Choose or paste a folder path…");
  81 |   await expect(path).toBeVisible();
  82 |   await path.fill("/Users/me/Reports");
  83 |   await page.getByRole("button", { name: "Add", exact: true }).click();
  84 | 
  85 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toHaveValue(
  86 |     /Analyze the files in this folder/,
  87 |   );
  88 | });
  89 | 
```