# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roots.spec.ts >> working directories: add folders with the read-only / read-write gate
- Location: e2e\roots.spec.ts:8:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Draft the launch note').first()

```

# Test source

```ts
  1  | // Guards the per-session directory RO/RW gate (§ roots), which since §32 lives in the rail's
  2  | // Access section under "Folders" (folder access is standing session config, not per-message
  3  | // attachment — the composer's folder popover is gone). The section lists the primary writable
  4  | // workspace, and adding a folder is gated read-only by default with an explicit "Allow writes"
  5  | // opt-in.
  6  | import { test, expect } from "./fixtures";
  7  | 
  8  | test("working directories: add folders with the read-only / read-write gate", async ({ page }) => {
  9  |   await page.goto("/");
> 10 |   await page.getByText("Draft the launch note").first().click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  11 | 
  12 |   // Expand the rail's Access section.
  13 |   await page.getByTestId("access-toggle").click();
  14 |   const dirs = page.getByTestId("drawer-directories");
  15 |   await expect(dirs.getByText("Folders")).toBeVisible();
  16 | 
  17 |   // The primary is the writable scratch workspace (Cowork shows it as "Temporary space").
  18 |   await expect(dirs.getByText("Temporary space")).toBeVisible();
  19 | 
  20 |   // Add a folder — the gate defaults to read-only (Allow writes OFF). The Browse button works
  21 |   // in the BROWSER too (sidecar-opened native picker; owner report 2026-07-04).
  22 |   await dirs.getByRole("button", { name: "Give access to a folder" }).click();
  23 |   await dirs.getByRole("button", { name: "Choose location" }).click();
  24 |   await expect(dirs.getByPlaceholder(/Choose or paste a folder path/)).toHaveValue(
  25 |     "/tmp/picked-folder",
  26 |   );
  27 |   const allowWrites = dirs.locator(".addfolder-write input[type=checkbox]");
  28 |   await expect(allowWrites).not.toBeChecked();
  29 |   await dirs.getByPlaceholder(/Choose or paste a folder path/).fill("/tmp/ro-data");
  30 |   await dirs.getByRole("button", { name: "Add", exact: true }).click();
  31 | 
  32 |   const roRow = dirs.locator(".root-row").filter({ hasText: "/tmp/ro-data" });
  33 |   await expect(roRow.getByRole("button", { name: "Read-only" })).toBeVisible();
  34 | 
  35 |   // Add another, this time opting into writes → it lands read-write.
  36 |   await dirs.getByRole("button", { name: "Give access to a folder" }).click();
  37 |   await dirs.getByPlaceholder(/Choose or paste a folder path/).fill("/tmp/rw-data");
  38 |   await dirs.locator(".addfolder-write input[type=checkbox]").check();
  39 |   await dirs.getByRole("button", { name: "Add", exact: true }).click();
  40 | 
  41 |   const rwRow = dirs.locator(".root-row").filter({ hasText: "/tmp/rw-data" });
  42 |   await expect(rwRow.getByRole("button", { name: "Read-write" })).toBeVisible();
  43 | 
  44 |   // Flip the read-only one to read-write via its access button (upsert re-add).
  45 |   await roRow.getByRole("button", { name: "Read-only" }).click();
  46 |   await expect(roRow.getByRole("button", { name: "Read-write" })).toBeVisible();
  47 | 
  48 |   // Remove a non-primary folder — the primary can't be removed.
  49 |   await rwRow.getByTitle("Remove").click();
  50 |   await expect(dirs.locator(".root-row").filter({ hasText: "/tmp/rw-data" })).toHaveCount(0);
  51 | });
  52 | 
```