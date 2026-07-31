# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mcp-oauth.spec.ts >> granola: quick-add card → sign-in flow → connected → sign out
- Location: e2e\mcp-oauth.spec.ts:14:1

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
  1  | // MCP OAuth quick-add (first server: Granola): the MCP tab offers a curated Connect
  2  | // card; connecting adds the server, kicks off the browser sign-in ("signing in…"),
  3  | // and the tab's poll flips the row to connected. Sign out returns it to needs_auth.
  4  | import { expect } from "@playwright/test";
  5  | import { test } from "./fixtures";
  6  | 
  7  | async function openMcpTab(page) {
  8  |   await page.goto("/");
> 9  |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  10 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  11 |   await page.getByRole("button", { name: "MCP servers", exact: true }).click();
  12 | }
  13 | 
  14 | test("granola: quick-add card → sign-in flow → connected → sign out", async ({ page }) => {
  15 |   await openMcpTab(page);
  16 | 
  17 |   // Curated card renders while granola isn't configured.
  18 |   const preset = page.getByTestId("mcp-preset-granola");
  19 |   await expect(preset).toContainText("Granola");
  20 |   await expect(preset).toContainText("Meeting notes");
  21 | 
  22 |   // Connect: adds the server with OAuth pending and starts the browser flow.
  23 |   await preset.getByRole("button", { name: "Connect" }).click();
  24 |   await expect(page.getByTestId("mcp-preset-granola")).toHaveCount(0);
  25 |   const row = page.locator(".space-y-2 > div").filter({ hasText: "granola" }).first();
  26 |   await expect(row).toContainText("signing in…");
  27 | 
  28 |   // The 2s status poll flips the mock to connected with its 6 tools.
  29 |   await expect(row).toContainText("connected", { timeout: 10_000 });
  30 |   await expect(row).toContainText("6 tools");
  31 |   await expect(row).toContainText("oauth");
  32 | 
  33 |   // Sign out forgets tokens; the row needs auth again and offers Sign in.
  34 |   await row.getByTestId("mcp-signout-granola").click();
  35 |   await expect(row).toContainText("needs auth");
  36 |   await expect(row.getByTestId("mcp-signin-granola")).toBeVisible();
  37 | });
  38 | 
```