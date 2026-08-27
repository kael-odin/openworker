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

// Per-tool button copy (§7): a skill proposal is an "add", not an "allow". Shared with the
// parked Inbox card so both dialects match.
export function approvalActionLabels(name?: string): { allow: string; deny: string } {
  return name === "save_skill"
    ? { allow: tt("approval.add_to_skills"), deny: tt("approval.not_now") }
    : { allow: tt("approval.allow_once_label"), deny: tt("approval.deny_label") };
}

// save_skill's review surface (SKILLS-SPEC §5.2): description, the full instructions
// (clamped, expandable, scrollable), every bundled file, and the guaranteed footer that
// answers "added WHERE, available WHEN". Shared verbatim with the parked Inbox card —
// one decision, one dialect.
export function SaveSkillPreview({ args }: { args: any }) {
  return (
    <>
      {args?.description && <div className="approval-with">{String(args.description)}</div>}
      {args?.instructions && <PreviewBlock text={String(args.instructions)} mono={false} />}
      {Array.isArray(args?.files) && args.files.length > 0 && (
        <div data-testid="skill-bundle-files">
          {args.files.map((f: unknown, i: number) => (
            <span className="approval-filechip" key={i}>
              <span className="ico">
                <Icon name="file" size={13} />
              </span>
              {String(f).split(/[\\/]/).pop() || String(f)}
            </span>
          ))}
        </div>
      )}
      <div className="approval-with">
        {tt("approval.save_skill_footer")}
      </div>
    </>
  );
}

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

// The host a fetch-card domain grant would cover (§1.9): lowercased, `www.` stripped —
// pure spelling only, mirroring the server's minting in `allow_domain_for_session`. The
// button must name exactly what the grant covers. "" when the URL doesn't parse.
export function grantHost(url: any): string {
  try {
    const h = new URL(String(url ?? "")).hostname.toLowerCase();
    return h.startsWith("www.") ? h.slice(4) : h;
  } catch {
    return "";
  }
}

// Plain-words scope note (replaces the "local action" badge): where does this act?
// Shared with the parked-approval card (InboxItemCard) so both dialects match (§35).
export function scopeNote(
  name: string,
  args: any,
  category?: string,
): { text: string; external: boolean } {
  // save_skill's corner answers WHERE (SKILLS-SPEC §5.2): the exact place to find, edit,
  // or turn off the skill afterwards.
  if (name === "save_skill") return { text: tt("approval.scope_save_skill"), external: false };
  if (category === "connector") return { text: tt("approval.scope_connector"), external: true };
  // Egress (§1.9): the request itself reaches the network — never "stays on this computer".
  if (name === "web_fetch")
    return { text: tt("approval.scope_web_fetch", { host: grantHost(args?.url) || tt("approval.the_web") }), external: true };
  if (name === "web_search")
    return { text: tt("approval.scope_web_search"), external: true };
  if (EXTERNAL.has(name)) {
    const platform = String(args?.target ?? "").split(":")[0];
    const names: Record<string, string> = { slack: "Slack", telegram: "Telegram" };
    const target = names[platform] || platform || tt("approval.scope_chat_fallback");
    return { text: tt("approval.scope_leaves_mac", { target }), external: true };
  }
  const overwrite = name === "write_file" && args?.overwrite;
  return { text: tt("approval.scope_stays_mac") + (overwrite ? tt("approval.scope_overwrites") : ""), external: false };
}
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
  denyLabel = tt("approval.deny_label"),
  autoApprove = false,
}: {
  item: ApprovalItem;
  onApprove: (decision: ApprovalDecision) => void;
  runTask?: { id: string; title: string } | null;
  primaryLabel: string;
  denyLabel?: string;
  // Session is in Auto-Approve mode: session grants don't skip the reviewer there (§1.5),
  // so no session-scoped "always" button is shown at all — a button that lies is worse
  // than none. Allow once / Deny only.
  autoApprove?: boolean;
}) {
  const connector = item.category === "connector";
  const offerStanding = !!(runTask && item.standingTarget);
  const { t } = useT();
  // §1.9: egress grants are destination-shaped. web_fetch offers the DOMAIN — tool-wide
  // would cover every future destination, so it's withheld (and server-refused). web_search
  // has a fixed destination (the configured provider), so tool-wide IS provider-wide and
  // the button is labelled by what it actually grants: searches.
  const fetchHost = item.name === "web_fetch" ? grantHost(item.args?.url) : "";
  const noSessionGrant =
    autoApprove ||
    offerStanding ||
    connector ||
    item.name === "run_shell" ||
    item.name === "save_skill" ||
    item.name === "web_fetch" ||
    item.name === "web_search";
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
      {/* save_skill: no session-wide "always" — every skill proposal gets its own review
          (SKILLS-SPEC §5: one gate, always). */}
      {!noSessionGrant && (
        <button
          className="btn"
          title={t("approval.always_tool_title", { verb: toolVerb(item.name).toLowerCase() })}
          onClick={() => onApprove("always_tool")}
        >
          {t("approval.always_allow")}
        </button>
      )}
      {!autoApprove && !offerStanding && item.name === "web_fetch" && fetchHost && (
        <button
          className="btn"
          title={t("approval.always_allow_domain_title", { host: fetchHost })}
          onClick={() => onApprove("always_domain")}
        >
          {t("approval.always_allow_domain", { host: fetchHost })}
        </button>
      )}
      {!autoApprove && !offerStanding && item.name === "web_search" && (
        <button
          className="btn"
          title={t("approval.always_allow_searches_title")}
          onClick={() => onApprove("always_tool")}
        >
          {t("approval.always_allow_searches")}
        </button>
      )}
      {!autoApprove && item.name === "run_shell" && (
        <button className="btn" onClick={() => onApprove("always_command")}>
          {t("approval.always_allow_command")}
        </button>
      )}
      {/* Session-wide read-only grant (owner ask 2026-08-11): offered only when the
          server's conservative classifier accepted THIS command — one click, then every
          local-read command in the session runs without a card. Network, writes, and
          anything doubtful keep asking. */}
      {item.name === "run_shell" && item.readonlyOk && !item.resolved && (
        <button
          className="btn"
          data-testid="allow-readonly-session"
          title={t("approval.readonly_tip")}
          onClick={() => onApprove("readonly_session")}
        >
          {t("approval.allow_readonly_cmds")}
        </button>
      )}
      <span className="spacer" />
      <button className="btn quiet-deny" onClick={() => onApprove("deny")}>
        {denyLabel}
      </button>
    </div>
  );
}

export function ApprovalCard({
  item,
  onApprove,
  runTask,
  compact = false,
  autoApprove = false,
}: {
  item: ApprovalItem;
  onApprove: (decision: ApprovalDecision) => void;
  // Present when this approval was raised inside an automation run — unlocks the
  // task-persistent "Allow every time" (in-app only, §25).
  runTask?: { id: string; title: string } | null;
  compact?: boolean;
  // Session is in Auto-Approve mode — this card is a reviewer fall-through, and session
  // grants wouldn't skip the reviewer anyway (§1.5), so the "always" buttons are hidden.
  autoApprove?: boolean;
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
  // OPE-114 §1: the command text cannot tell you the agent wrote this file a moment ago.
  const provenance = item.provenance ? (
    <div className="approval-provenance">
      <Icon name="warning" size={13} />
      <span>{item.provenance}</span>
    </div>
  ) : null;
  // Quiet, not a warning: the reviewer hesitating is context, not danger.
  const reviewerUnsure = item.reviewerUnsure ? (
    <div className="text-[12px] text-muted mt-1" data-testid="approval-reviewer-unsure">
      reviewer wasn&rsquo;t sure: {item.reviewerUnsure}
    </div>
  ) : null;

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
          <Buttons
            item={item}
            onApprove={onApprove}
            runTask={runTask}
            primaryLabel={t("approval.allow")}
            autoApprove={autoApprove}
          />
        </div>
        {peek && content && <PreviewBlock text={content} />}
        {provenance}
        {reviewerUnsure}
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
      {/* save_skill (SKILLS-SPEC §5.2): the arguments ARE the review surface. */}
      {item.name === "save_skill" && <SaveSkillPreview args={item.args} />}
      {/* web_search (§1.9): name the LIVE destination — "currently", never "default",
          because the card must show the setting as it stands right now. */}
      {item.name === "web_search" && (
        <div className="approval-with">
          {item.searchProvider
            ? t("approval.web_search_provider", { provider: item.searchProvider })
            : t("approval.scope_web_search")}
        </div>
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
        !["run_shell", "send_message", "send_file", "save_skill"].includes(item.name) &&
        !grants.length &&
        shortArgs(item.args) && <div className="approval-rest">{shortArgs(item.args)}</div>}
      {provenance}
      {reviewerUnsure}
      {reason && <div className="approval-reason">{reason}</div>}

      {item.resolved ? (
        <div className="resolved">{t("approval.resolved", { state: item.resolved.replace(/_/g, " ") })}</div>
      ) : (
        <Buttons
          item={item}
          onApprove={onApprove}
          runTask={runTask}
          primaryLabel={approvalActionLabels(item.name).allow}
          denyLabel={approvalActionLabels(item.name).deny}
          autoApprove={autoApprove}
        />
      )}
    </div>
  );
}
