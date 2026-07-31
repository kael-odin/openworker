# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-gate.spec.ts >> knowledge persona: new session starts instantly, no folder gate
- Location: e2e\family-gate.spec.ts:16:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder(/Ask the coworker/)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder(/Ask the coworker/)

```

# Test source

```ts
  1  | import { test, expect } from "./fixtures";
  2  | 
  3  | // §16 workspace collapse: the persona FAMILY alone decides the workspace behavior.
  4  | //   code      → an explicit project folder, enforced by the FolderGate (no chat-behind-it escape)
  5  | //   knowledge → starts orphan on a transparent scratch dir — never gated
  6  | // (The mock's Ops persona is knowledge-family with zero sessions, so picking it exercises the
  7  | // brand-new-session path, not a resume.)
  8  | 
  9  | const personaMenu = (page: import("@playwright/test").Page) => page.locator(".newsplit-menu");
  10 | 
  11 | async function startAs(page: import("@playwright/test").Page, persona: RegExp) {
  12 |   await page.getByLabel("Choose a persona").click();
  13 |   await personaMenu(page).getByRole("button", { name: persona }).click();
  14 | }
  15 | 
  16 | test("knowledge persona: new session starts instantly, no folder gate", async ({ page }) => {
  17 |   await page.goto("/");
> 18 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  19 | 
  20 |   await startAs(page, /Ops/);
  21 |   await expect(page.locator(".gate-overlay")).toHaveCount(0);
  22 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toBeVisible();
  23 | });
  24 | 
  25 | test("code persona: the folder gate blocks until a project is chosen", async ({ page }) => {
  26 |   await page.goto("/");
  27 |   await expect(page.getByPlaceholder(/Ask the coworker/)).toBeVisible();
  28 | 
  29 |   await startAs(page, /Code/);
  30 | 
  31 |   const gate = page.locator(".gate-overlay");
  32 |   await expect(gate).toBeVisible();
  33 |   await expect(gate.getByText("Choose a project folder")).toBeVisible();
  34 |   // No escape hatch: the gate offers pick-a-folder only (no "switch to Chat" — owner call, §16).
  35 |   await expect(gate.getByText(/chat/i)).toHaveCount(0);
  36 | 
  37 |   await gate.getByPlaceholder("/path/to/your/project").fill("/tmp/e2e-project");
  38 |   await gate.getByRole("button", { name: "Open", exact: true }).click();
  39 | 
  40 |   // Gate clears, the session is rooted in the chosen folder, and the code composer is live.
  41 |   await expect(page.locator(".gate-overlay")).toHaveCount(0);
  42 |   await expect(page.getByPlaceholder(/Ask the coder/)).toBeVisible();
  43 | });
  44 | 
```