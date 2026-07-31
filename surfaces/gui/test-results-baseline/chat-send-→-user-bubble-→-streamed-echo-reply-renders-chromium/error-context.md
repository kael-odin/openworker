# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: chat.spec.ts >> send → user bubble → streamed echo reply renders
- Location: e2e\chat.spec.ts:7:1

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
  3  | // The core loop: boot-resume into the last session, send a message over the WebSocket, and render
  4  | // the streamed reply — plus the in-session approval round-trip (permission_required suspends the
  5  | // turn until Allow/Deny goes back over the socket). The fake agent lives in fixtures.ts.
  6  | 
  7  | test("send → user bubble → streamed echo reply renders", async ({ page }) => {
  8  |   await page.goto("/");
  9  | 
  10 |   // Boot resumes the most recent session ("Draft the launch note") and connects; the composer is
  11 |   // live once the fake agent's `ready` lands.
  12 |   const box = page.getByPlaceholder(/Ask the coworker/);
> 13 |   await expect(box).toBeVisible();
     |                     ^ Error: expect(locator).toBeVisible() failed
  14 | 
  15 |   await box.fill("hello agent");
  16 |   await page.getByRole("button", { name: "Send" }).click();
  17 | 
  18 |   // Local echo of the user message, then the agent's reply (delta-streamed, then finalized).
  19 |   await expect(page.getByText("hello agent", { exact: true }).first()).toBeVisible();
  20 |   await expect(page.getByText(/Echo: hello agent/)).toBeVisible();
  21 |   // The message carried the composer's visible model (model-per-message contract): what the
  22 |   // user sees at send time is exactly what serves the turn.
  23 |   await expect(page.getByText("[model=anthropic:claude-opus-4-8]")).toBeVisible();
  24 |   // …and the picker STAYS actionable after the first turn (§17 rev 2026-07-22 — mid-session
  25 |   // switching shipped); the fact also reads in the topbar's facts subtitle.
  26 |   await expect(page.locator(".dd").filter({ hasText: "Claude Opus" })).toBeVisible();
  27 |   await expect(page.getByTestId("session-subtitle")).toContainText("Claude Opus 4.8");
  28 |   // Composer cleared and re-armed for the next turn.
  29 |   await expect(box).toHaveValue("");
  30 | });
  31 | 
  32 | test("approval: tool request suspends the turn; Allow once resumes it", async ({ page }) => {
  33 |   await page.goto("/");
  34 |   const box = page.getByPlaceholder(/Ask the coworker/);
  35 |   await expect(box).toBeVisible();
  36 | 
  37 |   await box.fill("please run a tool");
  38 |   await page.getByRole("button", { name: "Send" }).click();
  39 | 
  40 |   // The approval card surfaces the tool + reason and blocks until a decision.
  41 |   await expect(page.getByText("The coworker wants to run a command.").first()).toBeVisible();
  42 |   await page.getByRole("button", { name: "Allow once" }).last().click();
  43 | 
  44 |   // Decision goes back over the socket; the agent finishes the tool and the turn.
  45 |   await expect(page.getByText("The command ran; 1 file found.")).toBeVisible();
  46 | });
  47 | 
  48 | test("approval: Deny skips the tool and the agent says so", async ({ page }) => {
  49 |   await page.goto("/");
  50 |   const box = page.getByPlaceholder(/Ask the coworker/);
  51 |   await expect(box).toBeVisible();
  52 | 
  53 |   await box.fill("please run a tool");
  54 |   await page.getByRole("button", { name: "Send" }).click();
  55 | 
  56 |   await expect(page.getByRole("button", { name: "Deny" }).last()).toBeVisible();
  57 |   await page.getByRole("button", { name: "Deny" }).last().click();
  58 |   await expect(page.getByText("Understood — skipped the command.")).toBeVisible();
  59 | });
  60 | 
```