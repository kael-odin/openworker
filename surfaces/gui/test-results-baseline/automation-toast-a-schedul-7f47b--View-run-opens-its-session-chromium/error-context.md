# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: automation-toast.spec.ts >> a schedule-fired run pops the toast; View run opens its session
- Location: e2e\automation-toast.spec.ts:20:1

# Error details

```
Error: the app never opened /ws/events
```

# Test source

```ts
  1   | import { test as base, expect, type Page } from "@playwright/test";
  2   | 
  3   | // The app-wide /ws/events socket each page opened (UX-026 toast et al.) — specs
  4   | // push server events through it via sendAppEvent below.
  5   | const eventSockets = new WeakMap<Page, { send: (data: string) => void }>();
  6   | 
  7   | /** Push an app-wide event exactly as the server would over /ws/events. Waits for
  8   |  * the GUI to have connected its socket first. */
  9   | export async function sendAppEvent(page: Page, obj: unknown): Promise<void> {
  10  |   for (let i = 0; i < 50 && !eventSockets.get(page); i++) await page.waitForTimeout(100);
  11  |   const ws = eventSockets.get(page);
> 12  |   if (!ws) throw new Error("the app never opened /ws/events");
      |                  ^ Error: the app never opened /ws/events
  13  |   ws.send(JSON.stringify(obj));
  14  | }
  15  | 
  16  | // Hermetic API mock. Every /v1 request the GUI makes is fulfilled from the fixtures below (shapes
  17  | // mirrored from the real backend), and the event WebSocket is a SCRIPTED FAKE AGENT (ready on
  18  | // connect; user_message → turn_start/deltas/assistant_message/turn_done; "run a tool" triggers the
  19  | // approval flow), so specs run with no Python server and never touch real state. Mutations
  20  | // (sessions, personas, inbox, routing, channel subscriptions) are held in per-test in-memory state
  21  | // so add/remove/toggle reflect through the real UI on re-fetch.
  22  | 
  23  | const HEALTH = { status: "ok", default_workspace: null, model: "anthropic:claude-opus-4-8" };
  24  | 
  25  | const SETTINGS = {
  26  |   provider: "openai",
  27  |   model: "anthropic:claude-opus-4-8",
  28  |   models: ["anthropic:claude-opus-4-8", "gpt-5.5", "gpt-4o", "gpt-4o-mini", "o3-mini"],
  29  |   has_key: true,
  30  |   model_ready: true,
  31  |   source: "store",
  32  |   onboarded: true,
  33  |   experimental_connectors: false,
  34  |   surfaces: { cowork: true, chat: false, code: true },
  35  |   nav_layout: "grouped",
  36  |   scratch_base: "~/OpenWorker",
  37  |   secrets_path: "/Users/test/.config/coworker/secrets.json",
  38  |   sessions_peek: 5,
  39  |   // Token savings (PDF attachments): 2-page limit keeps the composer threshold test's
  40  |   // fixture PDF small; the real default is 20.
  41  |   pdf_fallback: "text",
  42  |   pdf_max_pages: 2,
  43  |   pdf_max_mb: 10,
  44  |   // Curated-matrix display names (subset — mirrors /v1/settings.model_labels).
  45  |   model_labels: {
  46  |     "anthropic:claude-opus-4-8": "Claude Opus 4.8 · Anthropic",
  47  |     "zai:glm-5.2": "GLM-5.2 · Z AI",
  48  |   },
  49  |   // Context windows (subset — mirrors /v1/settings.model_context_windows); drives the
  50  |   // composer usage chip's context-fill meter.
  51  |   model_context_windows: {
  52  |     "anthropic:claude-opus-4-8": 200_000,
  53  |   },
  54  | };
  55  | 
  56  | const PERSONAS = {
  57  |   personas: [
  58  |     { id: "cowork", name: "OpenWorker", icon: "cowork", tagline: "Produce a deliverable — research, analysis, scripts", needs_workspace: true, builtin: true, family: "knowledge", workspace: "deliverable", tools: ["files", "search"], enabled: true, surfaced: true, default: true },
  59  |     { id: "code", name: "Code", icon: "code", tagline: "Work in a codebase — files, git, shell", needs_workspace: true, builtin: true, family: "code", workspace: "git", tools: ["code_files", "git"], enabled: true, surfaced: true, default: false },
  60  |     { id: "chat", name: "Chat", icon: "chat", tagline: "Quick questions — no workspace", needs_workspace: false, builtin: true, family: "knowledge", workspace: "none", tools: [], enabled: true, surfaced: false, default: false },
  61  |     { id: "ops", name: "Ops Coworker", icon: "wrench", tagline: "Operate and investigate — runbooks, logs, infrastructure", needs_workspace: true, builtin: true, family: "knowledge", workspace: "deliverable", tools: ["files", "shell"], enabled: true, surfaced: true, default: false },
  62  |     // A non-builtin install (disabled pending consent — invisible to picker specs) so the
  63  |     // Personas page's delete/enable affordances have a target.
  64  |     { id: "acme-notes", name: "Acme Notes", icon: "pencil", tagline: "Acme's note-taking coworker", needs_workspace: true, builtin: false, family: "knowledge", workspace: "deliverable", tools: ["files"], enabled: false, surfaced: false, default: false },
  65  |   ],
  66  | };
  67  | 
  68  | // The boot-resume target (most recent updated_at) — existing specs open it by title.
  69  | const PINNED_SESSION = {
  70  |   session_id: "pinned-cowork-1",
  71  |   title: "Draft the launch note",
  72  |   workspace: "/Users/test/OpenWorker/launch-note",
  73  |   agent: "cowork",
  74  |   model: "anthropic:claude-opus-4-8",
  75  |   mode: "interactive",
  76  |   updated_at: "2026-07-01 09:00:00",
  77  |   messages: 2,
  78  |   pinned: true,
  79  |   archived: false,
  80  |   attention: 0,
  81  |   liveness: "idle",
  82  |   subscriptions: [],
  83  | };
  84  | 
  85  | // Seven unpinned Coworker sessions: enough to exercise the sidebar peek cap (5) + "Show more (2)".
  86  | // wp-3 carries the pending Inbox approval below (attention badge parity). All OLDER than the
  87  | // pinned session so boot-resume stays deterministic.
  88  | const EXTRA_SESSIONS = Array.from({ length: 7 }, (_, i) => ({
  89  |   session_id: `wp-${i + 1}`,
  90  |   title: `Weekly plan ${i + 1}`,
  91  |   workspace: "",
  92  |   agent: "cowork",
  93  |   model: "anthropic:claude-opus-4-8",
  94  |   mode: "interactive",
  95  |   updated_at: `2026-06-2${8 - Math.min(i, 7)} 10:00:00`,
  96  |   messages: 3,
  97  |   pinned: false,
  98  |   archived: false,
  99  |   attention: i + 1 === 3 ? 1 : 0,
  100 |   liveness: "idle",
  101 |   subscriptions: [],
  102 | }));
  103 | 
  104 | // One Ops session (older than everything above so boot-resume stays deterministic) — the
  105 | // target for the disable-archives-conversations confirm flow on the Personas page.
  106 | const OPS_SESSION = {
  107 |   session_id: "ops-1",
  108 |   title: "Ops triage",
  109 |   workspace: "/Users/test/OpenWorker/ops-triage",
  110 |   agent: "ops",
  111 |   model: "anthropic:claude-opus-4-8",
  112 |   mode: "interactive",
```