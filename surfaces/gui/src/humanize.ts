// UX-015 (§33): tool calls render as one-liners. The model does NOT emit a purpose
// per call — the stream is name+args+result — so the sentence is synthesized here from
// per-tool templates. `run_shell` is the exception: its optional `description` argument is
// model-written intent and is preferred when present. Fallback: "Used <tool> — <short args>".
//
// i18n: this module is a pure function (no React), so it reads the current lang via
// currentLang() and pulls strings from the shared dictionaries. Output is localized;
// missing keys fall back to English then to the key (see I18nProvider).

import { shortArgs } from "./components/ApprovalCard";
import { currentLang } from "./i18n/I18nProvider";
import zh from "./i18n/zh.json";
import en from "./i18n/en.json";

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
function t(key: string): string {
  const lang = currentLang();
  const d = DICTS[lang] ?? DICTS.zh;
  return d[key] ?? DICTS.en[key] ?? key;
}

// A one-line sentence in three segments so the UI can emphasize the object:
// "Read " + <b>runbook.md</b> + " from the shared folder".
export interface HumanLine {
  pre: string;
  obj?: string;
  post?: string;
}

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const baseName = (p: string) => p.replace(/\/+$/, "").split("/").pop() || p;

// send_message targets are "platform:chat" or "platform:chat:thread" — show the platform
// by name and the last human-ish segment of the chat id.
function messageTarget(target: string): { platform: string; tail: string } {
  const [platform, ...rest] = String(target).split(":");
  const chat = rest[0] || "";
  const tail = chat.includes("/") ? chat.split("/").pop() || chat : chat;
  // Platform brand names are keys; the dict maps slack→"Slack", telegram→"Telegram"
  // (same in both locales — brand names aren't translated).
  const platformKey = `humanize.platform.${platform}`;
  const platformLabel = t(platformKey);
  return { platform: platformLabel !== platformKey ? platformLabel : platform, tail };
}

export function humanizeTool(name: string, args: any): HumanLine {
  const a = args && typeof args === "object" ? args : {};
  switch (name) {
    case "run_shell": {
      const cmd = trunc(String(a.command ?? ""), 60);
      const desc = typeof a.description === "string" && a.description.trim() ? a.description.trim() : "";
      const pre = a.run_in_background ? t("humanize.run_bg") : t("humanize.ran");
      return {
        pre,
        obj: cmd,
        ...(desc ? { post: ` — ${desc.charAt(0).toLowerCase()}${desc.slice(1)}` } : {}),
      };
    }
    case "shell_task_output":
      return { pre: t("humanize.checked_bg_cmd") };
    case "shell_task_kill":
      return { pre: t("humanize.stopped_bg_cmd") };
    case "read_file":
      return { pre: t("humanize.read"), obj: baseName(String(a.path ?? t("humanize.a_file"))) };
    case "write_file":
      return { pre: t("humanize.wrote"), obj: baseName(String(a.path ?? t("humanize.a_file"))) };
    case "replace_in_file":
    case "apply_patch":
    case "apply_unified_diff":
      return { pre: t("humanize.edited"), obj: a.path ? baseName(String(a.path)) : t("humanize.files") };
    case "grep":
      return { pre: t("humanize.searched_code"), obj: `“${trunc(String(a.pattern ?? ""), 40)}”` };
    case "git_log":
      return { pre: t("humanize.git_history") };
    case "todo_write": {
      // `todos` is current; `items` renders histories from before the rename (the old
      // key breaks Together's GLM-5.2 chat template — see coworker/tools/todo.py).
      const items = Array.isArray(a.todos) ? a.todos : Array.isArray(a.items) ? a.items : [];
      if (items.length === 1) {
        const it = items[0] || {};
        const status = String(it.status || "").replace(/_/g, " ");
        return {
          pre: t("humanize.updated_plan"),
          obj: `“${trunc(String(it.content ?? ""), 70)}”`,
          ...(status ? { post: ` → ${status}` } : {}),
        };
      }
      return { pre: t("humanize.updated_plan_n").replace("{n}", String(items.length)) };
    }
    case "send_message": {
      const { platform, tail } = messageTarget(String(a.target ?? ""));
      if (!tail) return { pre: t("humanize.sent_message") };
      return { pre: t("humanize.sent_platform_message").replace("{platform}", platform) + " ", obj: tail };
    }
    case "web_search":
      return { pre: t("humanize.searched_web"), obj: `“${trunc(String(a.query ?? ""), 60)}”` };
    case "web_fetch": {
      let host = String(a.url ?? "");
      try {
        host = new URL(host).host || host;
      } catch {
        /* keep raw */
      }
      return { pre: t("humanize.read_web_page"), obj: trunc(host, 50) };
    }
    case "explore":
      return { pre: t("humanize.sent_subagent"), obj: `“${trunc(String(a.task ?? a.prompt ?? ""), 60)}”` };
    case "ask_user":
      return { pre: t("humanize.asked_question") };
    case "propose_plan":
      return { pre: t("humanize.proposed_plan") };
    case "request_directory":
      return { pre: t("humanize.asked_folder"), obj: String(a.path ?? "") };
    default: {
      const rest = trunc(shortArgs(a), 80);
      return { pre: t("humanize.used_tool").replace("{name}", name), ...(rest ? { post: ` — ${rest}` } : {}) };
    }
  }
}

// The approval card's headline (§35): the ask, phrased as the action being decided.
// run_shell leads with the model's own description ("Run a command — fetch stock data").
export function humanizeApprovalTitle(name: string, args: any): HumanLine {
  const a = args && typeof args === "object" ? args : {};
  switch (name) {
    case "write_file":
      return { pre: t("humanize.write"), obj: baseName(String(a.path ?? t("humanize.a_file"))) };
    case "replace_in_file":
    case "apply_patch":
    case "apply_unified_diff":
      return { pre: t("humanize.edit"), obj: a.path ? baseName(String(a.path)) : t("humanize.files") };
    case "run_shell": {
      const desc = typeof a.description === "string" && a.description.trim() ? a.description.trim() : "";
      return {
        pre: t("humanize.run_command"),
        ...(desc ? { post: ` — ${desc.charAt(0).toLowerCase()}${desc.slice(1)}` } : {}),
      };
    }
    case "send_message": {
      const { tail } = messageTarget(String(a.target ?? ""));
      return tail ? { pre: t("humanize.send_message_to") + " ", obj: tail } : { pre: t("humanize.send_message") };
    }
    case "send_file": {
      const { tail } = messageTarget(String(a.target ?? ""));
      return tail ? { pre: t("humanize.send_file_to") + " ", obj: tail } : { pre: t("humanize.send_file") };
    }
    case "create_scheduled_task":
      return a.title
        ? { pre: t("humanize.create_automation") + " ", obj: `“${trunc(String(a.title), 60)}”` }
        : { pre: t("humanize.create_automation_short") };
    default:
      return { pre: t("humanize.use_tool").replace("{name}", name) };
  }
}

// Approvals with no executed tool call (typically declined): the ask, phrased as intent.
export function humanizeAsk(name: string, args: any): HumanLine {
  const a = args && typeof args === "object" ? args : {};
  switch (name) {
    case "run_shell":
      return { pre: t("humanize.wanted_run"), obj: trunc(String(a.command ?? ""), 60) };
    case "write_file":
      return { pre: t("humanize.wanted_write"), obj: baseName(String(a.path ?? t("humanize.a_file"))) };
    case "replace_in_file":
    case "apply_patch":
    case "apply_unified_diff":
      return { pre: t("humanize.wanted_edit"), obj: a.path ? baseName(String(a.path)) : t("humanize.files") };
    case "send_message": {
      const { platform, tail } = messageTarget(String(a.target ?? ""));
      if (!tail) return { pre: t("humanize.wanted_send_message") };
      return { pre: t("humanize.wanted_message") + " ", obj: tail, post: ` ${t("humanize.on")} ${platform}` };
    }
    default:
      return { pre: t("humanize.wanted_use_tool").replace("{name}", name) };
  }
}
