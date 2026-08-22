// # team chat (agent teams, OPE-99): a minimal Slack-shaped exception channel over
// the session area — author-grouped messages, @mention highlighting, composer that
// posts as [User] (which wakes every member; agent posts wake mentions only).
// No derived board-event clusters (owner call, eighth pass): status lives on the
// board rail one click away — this surface is pure messages.
import { useEffect, useRef, useState } from "react";
import { getTeamChat, postTeamChat, type TeamChat } from "../api";
import { Icon } from "./Icon";
import { useT } from "../i18n/I18nProvider";

function mentionify(text: string, members: Set<string>) {
  // Split on @word tokens; wrap known handles in a highlight span.
  const parts = text.split(/(@[\w.-]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") && members.has(part.slice(1)) ? (
      <span className="chat-mention" key={i}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function clock(ts: string): string {
  const d = new Date(ts);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TeamChatView({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const { t } = useT();
  const [chat, setChat] = useState<TeamChat | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);

  const load = () => getTeamChat(teamId).then(setChat).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [teamId]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await postTeamChat(teamId, text);
      setDraft("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handles = new Set((chat?.members || []).map((m) => m.name));
  const messages = chat?.messages || [];

  return (
    // Replaces the session view IN PLACE (absolute inside .main, not a modal):
    // the sidebar stays interactive; back or Esc returns to the session.
    <div className="chat-view" data-testid="teamchat-view">
      <div className="chat-view-head">
        <button className="artifact-icon-btn" onClick={onClose} aria-label={t("teamchat.back_aria")} title={t("rightrail.back")}>
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="board-overlay-title">
          <span className="chat-hash">#</span>
          <span>{t("teamchat.title")}</span>
          <span className="board-overlay-space">{t("teamchat.sub")}</span>
        </div>
      </div>
      <div className="chat-view-body">
        <div className="chat-scroll">
          {messages.length === 0 && (
            <div className="chat-empty">
              {t("teamchat.empty")}
            </div>
          )}
          {messages.map((m, i) => {
            const grouped = i > 0 && messages[i - 1].author === m.author;
            const label = m.author_role === "user" ? t("teamchat.you") : m.author;
            return (
              <div className={"chat-msg" + (grouped ? " grouped" : "")} key={m.seq}>
                {!grouped && (
                  <div className="chat-who">
                    <span className={"chat-avatar " + m.author_role}>
                      {label.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="chat-name">{label}</span>
                    <span className="chat-role">
                      {m.author_role === "user"
                        ? ""
                        : m.author_role === "lead"
                          ? t("teamchat.role_lead")
                          : m.author_role === "worker"
                            ? t("teamchat.role_worker")
                            : m.author_role}
                    </span>
                    <span className="chat-ts">{clock(m.ts)}</span>
                  </div>
                )}
                <div className="chat-text">{mentionify(m.text, handles)}</div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <div className="chat-composer">
          <input
            className="chat-input"
            data-testid="chat-input"
            placeholder={t("teamchat.input_ph")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="btn primary" data-testid="chat-send" disabled={busy || !draft.trim()} onClick={send}>
            {t("teamchat.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
// Note: artifact links in chat (agents referencing reports, click → artifact
// viewer) are planned — see the Linear follow-up on chat evolution.
