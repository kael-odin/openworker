# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mcp-connectors.spec.ts >> monday detail page shows the pinned tool subset with approval badges
- Location: e2e\mcp-connectors.spec.ts:62:1

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
  1  | // MCP-backed connectors (UX-DECISIONS §42): monday/asana/jira connect through the
  2  | // vendor's hosted MCP server via a fully LOCAL OAuth flow — one-click without any
  3  | // cloud sign-in — and agents get only the PINNED tool subset, surfaced on the
  4  | // connector detail page like any other curated tool set.
  5  | import { expect } from "@playwright/test";
  6  | import { test } from "./fixtures";
  7  | 
  8  | async function openConnectors(page) {
  9  |   await page.goto("/");
> 10 |   await page.getByTestId("account-row").click();
     |                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 |   await page.getByRole("button", { name: "Connectors", exact: true }).click();
  12 | }
  13 | 
  14 | test("monday: one-click MCP connect without cloud sign-in; card flips connected", async ({
  15 |   page,
  16 | }) => {
  17 |   await openConnectors(page);
  18 | 
  19 |   // Signed OUT (fixtures default) — the MCP one-click needs no OpenWorker account.
  20 |   await page
  21 |     .getByTestId("connector-monday")
  22 |     .getByRole("button", { name: "Connect" })
  23 |     .click();
  24 |   const modal = page.getByTestId("add-connection-modal");
  25 |   await expect(modal).toBeVisible();
  26 |   // Single-mode: no One click | Manual pills, no cloud sign-in gate — just the button.
  27 |   await expect(modal.getByTestId("modal-pane-manual")).toHaveCount(0);
  28 |   await expect(modal.getByTestId("inline-cloud-sign-in")).toHaveCount(0);
  29 |   await expect(modal.getByText("sign-in runs entirely on this computer")).toBeVisible();
  30 | 
  31 |   await modal.getByTestId("modal-mcp-one-click").click();
  32 |   await expect(modal.getByText("Check your browser…")).toBeVisible();
  33 |   // The mock flow completes instantly; the modal's poll closes it and the card flips.
  34 |   await expect(page.getByTestId("add-connection-modal")).toHaveCount(0, {
  35 |     timeout: 10_000,
  36 |   });
  37 |   await expect(page.getByTestId("connector-monday")).toContainText("Connected");
  38 | });
  39 | 
  40 | test("jira: two modes — MCP one-click pane plus the manual token form", async ({
  41 |   page,
  42 | }) => {
  43 |   await openConnectors(page);
  44 |   // jira sits past the available-list fold.
  45 |   await page.getByRole("button", { name: "show all" }).click();
  46 |   await page
  47 |     .getByTestId("connector-jira")
  48 |     .getByRole("button", { name: "Connect" })
  49 |     .click();
  50 |   const modal = page.getByTestId("add-connection-modal");
  51 | 
  52 |   // One click pane is the MCP flow (no cloud sign-in gate).
  53 |   await expect(modal.getByTestId("modal-pane-one")).toBeVisible();
  54 |   await expect(modal.getByTestId("modal-mcp-one-click")).toBeVisible();
  55 | 
  56 |   // Manual keeps the existing Atlassian token fields.
  57 |   await modal.getByTestId("modal-pane-manual").click();
  58 |   await expect(modal.getByText("Atlassian site URL")).toBeVisible();
  59 |   await expect(modal.getByText("API token")).toBeVisible();
  60 | });
  61 | 
  62 | test("monday detail page shows the pinned tool subset with approval badges", async ({
  63 |   page,
  64 | }) => {
  65 |   await openConnectors(page);
  66 |   await page.getByTestId("connector-monday").click();
  67 |   await expect(page.getByText("2 tools this connector adds")).toBeVisible();
  68 |   await page.getByText("View", { exact: true }).click();
  69 |   await expect(page.getByText("Read board", { exact: true })).toBeVisible();
  70 |   await expect(page.getByText("Create item", { exact: true })).toBeVisible();
  71 | });
  72 | 
```