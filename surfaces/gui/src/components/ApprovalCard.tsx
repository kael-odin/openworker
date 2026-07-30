import { useState } from "react";
import type { ApprovalDecision, Item } from "../types";
import { humanizeApprovalTitle, type HumanLine } from "../humanize";
import { Icon } from "./Icon";
import { useT } from "../i18n/I18nProvider";
import { currentLang } from "../i18n/I18nProvider";
import zh from "../i18n/zh.json";
import en from "../i18n/en.json";

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
// Non-component helpers (shortArgs, scopeNote, toolVerb) read the lang at call time,
// mirroring humanize.ts — they're invoked from render of components that already
// re-render on lang change, so the value is fresh.
function tt(key: string, params?: Record<string, string | number>): string {
  const lang = currentLang();
  const d = DICTS[lang] ?? DICTS.zh;
  const raw = d[key] ?? DICTS.en[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

export function shortArgs(args: any): string {
  if (!args || typeof args !== "object") return "";
  return Object.entries(args)
    .map(([k, v]) => {
      let s = typeof v === "string" ? v : JSON.stringify(v);
      if (s.length > 96) s = s.slice(0, 95) + "...";
      return `${k}=${s.replace(/\n/g, " ")}`;
    })
    .join("  ");
}

// Human verbs for the §25 grant lines (the card title now comes from humanize.ts).
// Localized via approval.verb_* keys; falls back to the raw tool name.
const TOOL_VERB_KEYS: Record<string, string> = {
  write_file: "approval.verb_write_file",
  replace_in_file: "approval.verb_replace_in_file",
  apply_patch: "approval.verb_apply_patch",
  apply_unified_diff: "approval.verb_apply_patch",
  run_shell: "approval.verb_run_shell",
  send_message: "approval.verb_send_message",
  send_file: "approval.verb_send_file",
};
function toolVerb(name: string): string {
  const key = TOOL_VERB_KEYS[name];
  return key ? tt(key) : name;
}

// §35: routine workspace writes render as a compact ROW; everything else is a full card.
const FILE_WRITES = new Set(["write_file", "replace_in_file", "apply_patch", "apply_unified_diff"]);
// Actions that leave the Mac get the warm border + explicit destination note.
const EXTERNAL = new Set(["send_message", "send_file"]);

type ApprovalItem = Extract<Item, { kind: "approval" }>;

// A `permissions` proposal on the create_scheduled_task consent card (§25): reads are
// disclosure lines, writes are the standing grants the approval mints.
interface PermissionLine {
  tool: string;
  target: string;
  access: string;
}

function permissionLines(args: any): PermissionLine[] {
  const raw = args?.permissions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p === "object" && p.tool && p.target)
    .map((p) => ({ tool: String(p.tool), target: String(p.target), access: String(p.access || "read") }));
}

export function TitleText({ line }: { line: HumanLine }) {
  return (
    <span className="approval-title">
      {line.pre}
      {line.obj && <b>{line.obj}</b>}
      {line.post}
    </span>
  );
}

// Plain-words scope note (replaces the "local action" badge): where does this act?
// Shared with the parked-approval card (InboxItemCard) so both dialects match (§35).
export function scopeNote(
  name: string,
  args: any,
  category?: string,
): { text: string; external: boolean } {
  if (category === "connector") return { text: tt("approval.scope_connector"), external: true };
  if (EXTERNAL.has(name)) {
    const platform = String(args?.target ?? "").split(":")[0];
    const names: Record<string, string> = { slack: "Slack", telegram: "Telegram" };
    const target = names[platform] || platform || tt("approval.scope_chat_fallback");
    return { text: tt("approval.scope_leaves_mac", { target }), external: true };
  }
  const overwrite = name === "write_file" && args?.overwrite;
  return { text: tt("approval.scope_stays_mac") + (overwrite ? tt("approval.scope_overwrites") : ""), external: false };
}

// The proposed content/command, straight from the tool call's ARGS — the file/action
// doesn't exist yet, so no viewer could show it (§35; see UX-018 mock note).
// Clamps by CHARACTERS as well as lines: a one-paragraph Slack digest has no
// newlines at all and once ballooned the card to full-transcript height.
const PREVIEW_LINES = 5;
const PREVIEW_CHARS = 420;

export function PreviewBlock({ text, mono = true }: { text: string; mono?: boolean }) {
  const [all, setAll] = useState(false);
  const { t } = useT();
  const lines = text.split("\n");
  const clipped = lines.length > PREVIEW_LINES || text.length > PREVIEW_CHARS;
  let shown = text;
  if (!all && clipped) {
    shown = lines.slice(0, PREVIEW_LINES).join("\n");
    if (shown.length > PREVIEW_CHARS) shown = shown.slice(0, PREVIEW_CHARS).trimEnd() + "…";
  }
  return (
    <div className={"approval-prev" + (mono ? "" : " prose")}>
      {shown}
      {clipped && (
        <button className="approval-prev-more" onClick={() => setAll((v) => !v)}>
          {all
            ? t("approval.show_less")
            : lines.length > PREVIEW_LINES
              ? t("approval.show_all_lines", { n: lines.length })
              : t("approval.show_full_message")}
        </button>
      )}
    </div>
  );
}

// Outbound message text: short one-liners keep the cozy inline quote; anything
// long (or multi-line) gets the clamped preview so the card stays card-sized.
function MessagePreview({ text, label }: { text: string; label?: string }) {
  if (text.length <= 220 && !text.includes("\n")) {
    return (
      <div className="approval-with">
        {label ? `${label}: ` : ""}“{text}”
      </div>
    );
  }
  return <PreviewBlock text={text} mono={false} />;
}

function Buttons({
  item,
  onApprove,
  runTask,
  primaryLabel,
}: {
  item: ApprovalItem;
  onApprove: (decision: ApprovalDecision) => void;
  runTask?: { id: string; title: string } | null;
  primaryLabel: string;
}) {
  const connector = item.category === "connector";
  const offerStanding = !!(runTask && item.standingTarget);
  const { t } = useT();
  return (
    <div className="approval-btns">
      <button className="btn approval-primary" onClick={() => onApprove("once")}>
        {primaryLabel}
      </button>
      {offerStanding && (
        <button
          className="btn"
          title={t("approval.always_task_title", {
            tool: item.name,
            target: item.standingTarget || "",
            task: runTask?.title || t("approval.this_automation"),
          })}
          onClick={() => onApprove("always_task")}
        >
          {t("approval.allow_every_time")}
        </button>
      )}
      {/* In a run context the task-persistent grant replaces the session-scoped one —
          a run session is ephemeral, and two adjacent "always" buttons would blur
          exactly the scope distinction §25 exists to draw. Same rule for run_shell:
          the command-scoped button below is the specific (safer) grant, so the
          tool-wide one stays out of the card. */}
      {!connector && !offerStanding && item.name !== "run_shell" && (
        <button
          className="btn"
          title={t("approval.always_tool_title", { verb: toolVerb(item.name).toLowerCase() })}
          onClick={() => onApprove("always_tool")}
        >
          {t("approval.always_allow")}
        </button>
      )}
      {item.name === "run_shell" && (
        <button className="btn" onClick={() => onApprove("always_command")}>
          {t("approval.always_allow_command")}
        </button>
      )}
      <span className="spacer" />
      <button className="btn quiet-deny" onClick={() => onApprove("deny")}>
        {t("approval.deny")}
      </button>
    </div>
  );
}

export function ApprovalCard({
  item,
  onApprove,
  runTask,
  compact = false,
}: {
  item: ApprovalItem;
  onApprove: (decision: ApprovalDecision) => void;
  // Present when this approval was raised inside an automation run — unlocks the
  // task-persistent "Allow every time" (in-app only, §25).
  runTask?: { id: string; title: string } | null;
  compact?: boolean;
}) {
  const [peek, setPeek] = useState(false);
  const { t } = useT();
  const title = humanizeApprovalTitle(item.name, item.args);
  const scope = scopeNote(item.name, item.args, item.category);
  const grants = item.name === "create_scheduled_task" ? permissionLines(item.args) : [];
  // "需要审批" is the engine's default boilerplate — only surface a real reason.
  const reason = item.reason && item.reason !== "需要审批" ? item.reason : "";
  const offerStanding = !!(runTask && item.standingTarget);
  const dock = compact ? " approval-dock" : "";

  // §35 compact row: routine workspace writes — one line, preview expands inline from the
  // tool args. Standing/grant flows keep the full card (they carry §25 consent weight).
  const content = typeof item.args?.content === "string" ? item.args.content : "";
  if (FILE_WRITES.has(item.name) && !offerStanding && !grants.length && !item.resolved) {
    return (
      <div className={"approval approval-row" + dock} data-testid="approval-row">
        <div className="approval-row-line">
          <TitleText line={title} />
          {content && (
            <button className="approval-peek" onClick={() => setPeek((v) => !v)}>
              {t("approval.preview")} {peek ? "▴" : "▾"}
            </button>
          )}
          <span className="spacer" />
          <Buttons item={item} onApprove={onApprove} runTask={runTask} primaryLabel={t("approval.allow")} />
        </div>
        {peek && content && <PreviewBlock text={content} />}
        {reason && <div className="approval-reason">{reason}</div>}
      </div>
    );
  }

  return (
    <div className={"approval" + (scope.external ? " approval-external" : "") + dock}>
      <div className="approval-top">
        <div className="approval-heading">
          <span className="approval-ico" title={t("approval.tool_label", { name: item.name })}>
            <Icon name="shield" size={15} />
          </span>
          <TitleText line={title} />
        </div>
        <span className={"approval-scope" + (scope.external ? " out" : "")}>{scope.text}</span>
      </div>

      {/* Tool-shaped previews — the proposal, not an args dump. */}
      {item.name === "run_shell" && item.args?.command && (
        <PreviewBlock text={String(item.args.command)} />
      )}
      {FILE_WRITES.has(item.name) && content && <PreviewBlock text={content} />}
      {item.name === "send_file" && (
        <>
          <span className="approval-filechip">
            <span className="ico">
              <Icon name="file" size={13} />
            </span>
            {String(item.args?.path ?? "").split("/").pop() || t("approval.file")}
            {item.args?.as_screenshot ? t("approval.as_png") : ""}
          </span>
          {item.args?.comment && (
            <MessagePreview text={String(item.args.comment)} label={t("approval.with_message")} />
          )}
        </>
      )}
      {item.name === "send_message" && item.args?.text && (
        <MessagePreview text={String(item.args.text)} />
      )}

      {grants.length > 0 && (
        <div className="approval-grants" data-testid="approval-grants">
          {grants.map((g, i) => (
            <div className="approval-grant" key={i} data-access={g.access}>
              <span className={"grant-mark" + (g.access === "write" ? " write" : "")}>
                {g.access === "write" ? "✓" : "·"}
              </span>
              <span className="grant-line">
                {toolVerb(g.tool)} <code className="approval-tool">{g.target}</code>
                <span className="grant-note">
                  {g.access === "write" ? t("approval.grant_write_note") : t("approval.grant_read_note")}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      {/* Long-tail tools: no bespoke preview — fall back to the compact args line. */}
      {!FILE_WRITES.has(item.name) &&
        !["run_shell", "send_message", "send_file"].includes(item.name) &&
        !grants.length &&
        shortArgs(item.args) && <div className="approval-rest">{shortArgs(item.args)}</div>}
      {reason && <div className="approval-reason">{reason}</div>}

      {item.resolved ? (
        <div className="resolved">{t("approval.resolved", { state: item.resolved.replace(/_/g, " ") })}</div>
      ) : (
        <Buttons item={item} onApprove={onApprove} runTask={runTask} primaryLabel={t("approval.allow_once")} />
      )}
    </div>
  );
}
