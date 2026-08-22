// BoardWakeCard — a board wake in the lead's transcript, collapsed to ONE line by
// default (owner ruling 2026-08-16): most of the time the user just wants the
// feel that something is happening. Click to expand into per-event rows; long
// hand-off comments hide behind a per-row "show hand-off". NOT the connector
// card: a connector message is a foreign message, a board wake is a report —
// different shape, different affordances (they only share the visual family).
import { useState } from "react";
import type { BoardWakeRow, MessageSource } from "../api";
import { Icon } from "./Icon";
import { useT, currentLang } from "../i18n/I18nProvider";
import zh from "../i18n/zh.json";
import en from "../i18n/en.json";

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
// Module-scope helper for the summarize/rowText helpers (non-component paths).
function tt(key: string, params?: Record<string, string | number>): string {
  const d = DICTS[currentLang()] ?? DICTS.zh;
  let raw = d[key] ?? DICTS.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) raw = raw.replace(`{${k}}`, String(v));
  return raw;
}

function summarize(rows: BoardWakeRow[]): { text: string; attention: boolean } {
  const counts: Record<string, number> = {};
  const bump = (key: string) => (counts[key] = (counts[key] || 0) + 1);
  for (const row of rows) {
    if (row.kind === "moved" && row.to === "review") bump("review");
    else if (row.kind === "moved" && row.to === "blocked") bump("blocked");
    else if (row.kind === "moved" && row.to === "canceled") bump("canceled");
    else if (row.kind === "moved") bump("move");
    else if (row.kind === "filed") bump("filing");
    else if (row.kind === "claimed") bump("claim");
    else if (row.kind === "assigned") bump("assignment");
    else if (row.kind === "comment") bump("comment");
    else if (row.kind === "chat") bump("chat message");
  }
  const keyFor: Record<string, string> = {
    review: "boardwake.n_review",
    blocked: "boardwake.n_blocked",
    canceled: "boardwake.n_canceled",
    move: "boardwake.n_move",
    filing: "boardwake.n_filing",
    claim: "boardwake.n_claim",
    assignment: "boardwake.n_assignment",
    comment: "boardwake.n_comment",
    ["chat message"]: "boardwake.n_chat",
  };
  const parts = Object.entries(counts).map(([label, n]) =>
    tt(keyFor[label] || label, { n })
  );
  // reviews/blocked demand a decision — those tint the collapsed line amber
  const attention = (counts.review || 0) + (counts.blocked || 0) > 0;
  return { text: parts.join("，") || tt("boardwake.update"), attention };
}

function rowText(row: BoardWakeRow): string {
  const item = row.item != null ? `#${row.item}` : "";
  const title = row.title ? ` ${row.title}` : "";
  switch (row.kind) {
    case "moved":
      return tt("boardwake.moved", { item, title, to: row.to || "", actor: row.actor || "" });
    case "filed":
      return tt("boardwake.filed", { actor: row.actor || "", item, title });
    case "claimed":
      return tt("boardwake.claimed", { actor: row.actor || "", item, title });
    case "assigned":
      return tt("boardwake.assigned", { item, title });
    case "comment":
      return tt("boardwake.commented", { actor: row.actor || "", item, title });
    case "chat":
      return tt("boardwake.chat", { actor: row.actor || "" });
    default:
      return `${item}${title}`;
  }
}

function stateDot(row: BoardWakeRow): string {
  if (row.kind === "moved" && row.to === "review") return "board-dot review";
  if (row.kind === "moved" && row.to === "blocked") return "board-dot blocked";
  if (row.kind === "moved" && row.to === "done") return "board-dot done";
  if (row.kind === "claimed" || row.kind === "assigned") return "board-dot work";
  return "board-dot idle";
}

export function BoardWakeCard({ source }: { source: MessageSource }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({});
  const rows = source.board?.rows || [];
  const { text, attention } = summarize(rows);
  return (
    <div
      className={"boardwake" + (attention ? " attention" : "")}
      data-testid="boardwake-card"
    >
      <button
        className="boardwake-head"
        data-testid="boardwake-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon name="table" size={14} />
        <span className="boardwake-title">{t("boardwake.title")}</span>
        <span className="boardwake-summary">{text}</span>
        <span className="spacer" />
        <span className={"boardwake-chevron" + (open ? " open" : "")}>
          <Icon name="chevronDown" size={13} />
        </span>
      </button>
      {open && (
        <div className="boardwake-body" data-testid="boardwake-body">
          {rows.map((row, i) => (
            <div className="boardwake-row" key={i}>
              <span className={stateDot(row)} />
              <span className="boardwake-row-main">
                <span className="boardwake-row-text">{rowText(row)}</span>
                {row.note &&
                  (openNotes[i] ? (
                    <span className="boardwake-note">{row.note}</span>
                  ) : (
                    <button
                      className="boardwake-note-toggle"
                      onClick={() => setOpenNotes((s) => ({ ...s, [i]: true }))}
                    >
                      {row.kind === "chat" || row.kind === "comment"
                        ? t("boardwake.show_message")
                        : t("boardwake.show_handoff")}
                    </button>
                  ))}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="boardwake-note">{source.text}</div>
          )}
        </div>
      )}
    </div>
  );
}
