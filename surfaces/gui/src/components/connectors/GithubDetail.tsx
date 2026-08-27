import { useEffect, useState } from "react";
import {
  disallowUser,
  disconnectGithubInstallation,
  getGithubStatus,
  getSubscriptions,
  resolveUnauthorized,
  unsubscribeChannel,
  type Connector,
  type GithubInstallation,
  type GithubStatus,
  type ParkedMessage,
  type Subscription,
} from "../../api";
import { ConnectorBadge } from "../../connectors/ConnectorIcon";
import { AddConnectionModal } from "./AddConnectionModal";
import type { DetailProps } from "./ConnectorsSection";
import { ToolsDisclosure } from "./ToolsDisclosure";
import { FOOT, GRP, GRP_H, PILL_ACCENT, PILL_LINE, ROW, TAG_WARN, XBTN } from "./ui";
import { useT, currentLang } from "../../i18n/I18nProvider";
import zh from "../../i18n/zh.json";
import en from "../../i18n/en.json";

// The GitHub detail page (github-relay-spec §8), the Slack page's shape: one
// group per App INSTALLATION (the allow-list scope) — People (sender logins
// allowed to trigger work) · Waiting (parked mentions) · per-installation
// disconnect — plus a page-level Listening group (a subscription names a repo
// thread, which the GUI can't map back to an installation). Adding an
// installation goes through the ONE entry point: header button → modal.

const LABEL = "text-[13px] text-muted w-24 shrink-0";

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
const EN: Dict = en as Dict;
function tt(key: string, params?: Record<string, string | number>): string {
  const d = DICTS[currentLang()] ?? DICTS.zh;
  let raw = d[key] ?? EN[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) raw = raw.replace(`{${k}}`, String(v));
  return raw;
}

/** The relay status line, one honest layer at a time (the Slack rule). */
function relayHealth(gh: GithubStatus | null): { dot: string; text: string } {
  if (!gh) return { dot: "bg-ok", text: tt("gh.live_relay") };
  if (!gh.signed_in)
    return { dot: "bg-warnInk", text: tt("gh.signin_needed_relay") };
  if (gh.relay.state === "offline")
    return { dot: "bg-faint/60", text: tt("gh.offline_relay") };
  if (gh.relay.state === "reconnecting")
    return { dot: "bg-warnInk", text: tt("gh.reconnecting_relay") };
  return { dot: "bg-ok", text: tt("gh.live_relay") };
}

export function GithubDetail({ c, cloud, onChanged }: DetailProps) {
  const [adding, setAdding] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const { t } = useT();
  const load = () => {
    getSubscriptions().then(setSubs).catch(() => setSubs([]));
    getGithubStatus().then(setStatus).catch(() => setStatus(null));
  };
  useEffect(() => {
    load();
  }, [c.name]);

  const relay = c.mode === "relay";
  const installations = c.installations ?? [];
  const changed = () => {
    onChanged();
    load();
  };
  const listening = subs.filter((s) => s.channel.startsWith("github:"));

  return (
    <div data-testid="github-installations">
      <div className="flex items-center gap-3.5 mb-5">
        <ConnectorBadge connector={c} size={44} title={t("gh.title")} />
        <div className="min-w-0 flex-1">
<h2 className="text-[20px] font-semibold tracking-tight leading-tight">{t("gh.title")}</h2>
          <div className="text-[13px] text-muted flex items-center gap-1.5">
            {c.connected ? (
              <>
                <span
                  className={
                    "w-2 h-2 rounded-full " + (relay ? relayHealth(status).dot : "bg-ok")
                  }
                />
                <span data-testid="github-mode-badge">
                  {relay
                    ? relayHealth(status).text
                    : t("gh.connected_pat")}
                </span>
              </>
            ) : (
              <span>{t("gh.not_connected")}</span>
            )}
          </div>
        </div>
        {(relay || !c.connected) && (
          <button
            className={PILL_ACCENT}
            data-testid="add-installation-btn"
            onClick={() => setAdding(true)}
          >
            {t("gh.add_installation")}
          </button>
        )}
      </div>

      {!c.connected && (
        <div className={GRP}>
<div className={ROW + " text-[13px] text-muted"}>
            {t("gh.sub")}
            {cloud?.signed_in ? "" : t("gh.oneclick_cloud")}
        </div>
      )}

      {relay &&
        installations.map((inst) => (
          <InstallationGroup
            key={inst.installation_id}
            c={c}
            inst={inst}
            tokenOk={status?.installs?.[inst.installation_id]?.token_ok !== false}
            onChanged={changed}
          />
        ))}

      {/* Manual PAT: request/response tools only — no inbound triggers. */}
      {c.connected && !relay && (
        <div className={GRP} data-testid="github-manual-card">
<div className={ROW + " text-[13px] text-muted"}>
            {t("gh.manual_card")}
        </div>
      )}

      {relay && listening.length > 0 && (
        <>
          <div className={GRP_H}>{t("gh.listening")}</div>
          <div className={GRP}>
            <ListeningRows subs={listening} onChanged={changed} />
          </div>
        </>
      )}

      <ToolsDisclosure c={c} onChanged={onChanged} />
      {c.connected && relay && (
        <div className={FOOT + " mt-2"}>
          {t("gh.foot")}
        </div>
      )}

      {adding && (
        <AddConnectionModal
          c={c}
          cloud={cloud}
          title={t("gh.add_installation_title")}
          onClose={() => setAdding(false)}
          onChanged={changed}
        />
      )}
    </div>
  );
}

function InstallationGroup({
  c,
  inst,
  tokenOk,
  onChanged,
}: {
  c: Connector;
  inst: GithubInstallation;
  tokenOk: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  const parked = (c.unauthorized ?? []).filter((m) => m.team_id === inst.installation_id);
  const empty = inst.allowed_users.length === 0 && parked.length === 0;

  const disconnect = async () => {
    setBusy(true);
    await disconnectGithubInstallation(inst.installation_id);
    setBusy(false);
    onChanged();
  };

  return (
    <div data-testid={`github-install-${inst.installation_id}`}>
      <div className={GRP_H + " flex items-center gap-2"}>
        <span>
          {inst.account_login}{" "}
          <span className="font-normal text-faint" title={`installation ${inst.installation_id}`}>
            · {inst.repo_selection === "all" ? t("gh.all_repos") : t("gh.selected_repos")}
          </span>
        </span>
        {!tokenOk && (
          <span className={TAG_WARN} data-testid={`token-warn-${inst.installation_id}`}>
            {t("gh.install_revoked")}
          </span>
        )}
      </div>
      <div className={GRP}>
        {empty ? (
          <div className={ROW}>
<span className="min-w-0 flex-1 text-[13px] text-muted">
              {t("gh.empty")}
            <DisconnectBtn id={inst.installation_id} busy={busy} onClick={disconnect} />
          </div>
        ) : (
          <>
            <PeopleRow
              allowed={inst.allowed_users}
              installationId={inst.installation_id}
              onChanged={onChanged}
            />
            {parked.map((m) => (
              <WaitingRow key={m.id} m={m} onChanged={onChanged} />
            ))}
            <div className={ROW}>
              <span className="flex-1" />
              <DisconnectBtn id={inst.installation_id} busy={busy} onClick={disconnect} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DisconnectBtn({ id, busy, onClick }: { id: string; busy: boolean; onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      className="text-[13px] text-danger/80 hover:text-danger shrink-0"
      data-testid={`disconnect-install-${id}`}
      title={t("gh.disconnect_title")}
      onClick={onClick}
      disabled={busy}
    >
      {busy ? t("gh.disconnecting") : t("gh.disconnect_installation")}
    </button>
  );
}

function PeopleRow({
  allowed,
  installationId,
  onChanged,
}: {
  allowed: string[];
  installationId: string;
  onChanged: () => void;
}) {
  const { t } = useT();
  return (
    <div className={ROW}>
      <span className={LABEL}>{t("gh.people")}</span>
      <span className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
        {allowed.length === 0 && (
          <span className="text-[12px] text-faint">{t("gh.nobody_yet")}</span>
        )}
        {allowed.map((login) => (
          <span
            key={login}
            className="inline-flex items-center gap-1.5 pl-2 pr-2 py-0.5 rounded-full bg-paper border border-line text-[13px]"
          >
            {/* GitHub logins ARE the readable identity — no resolution needed. */}
            @{login}
            <button
              className={XBTN}
              title={t("conn.remove")}
              onClick={() => disallowUser("github", login, installationId).then(onChanged)}
            >
              ×
            </button>
          </span>
        ))}
      </span>
    </div>
  );
}

function WaitingRow({ m, onChanged }: { m: ParkedMessage; onChanged: () => void }) {
  const { t } = useT();
  const act = async (action: "dismiss" | "allow" | "allow_deliver") => {
    await resolveUnauthorized("github", m.id, action);
    onChanged();
  };
  return (
    <div className={ROW + " bg-warnSoft/25"} data-testid={`waiting-${m.id}`}>
      <span className={LABEL}>{t("gh.waiting")}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium text-[13px]">@{m.user_name || m.user_id}</span>{" "}
<span className="text-[13px] text-muted">{t("gh.in", { chat: m.chat_name || m.chat_id })}</span>
        <span className="block text-[13px] text-muted truncate">“{m.text}”</span>
      </span>
      <button
        className={PILL_ACCENT + " !py-1"}
        data-testid={`parked-allow-deliver-${m.id}`}
        title={t("gh.allow_deliver_title")}
        onClick={() => act("allow_deliver")}
      >
        {t("gh.allow_deliver")}
      </button>
      <button
        className={PILL_LINE + " !py-1"}
        data-testid={`parked-allow-${m.id}`}
        title={t("gh.allow_title")}
        onClick={() => act("allow")}
      >
        {t("gh.allow")}
      </button>
      <button className={XBTN + " px-1"} data-testid={`parked-dismiss-${m.id}`} title={t("gh.dismiss")} onClick={() => act("dismiss")}>
        ×
      </button>
    </div>
  );
}

function ListeningRows({ subs, onChanged }: { subs: Subscription[]; onChanged: () => void }) {
  const { t } = useT();
  return (
    <div className={ROW} data-testid="listening-github">
      <span className={LABEL}>{t("gh.listening")}</span>
      <span className="min-w-0 flex-1 space-y-1">
        {subs.map((s) => (
          <span key={s.session_id + s.channel} className="flex items-center gap-2 text-[13px]">
            <span className="font-medium truncate" title={s.session_id}>
              {s.session_title || s.session_id}
            </span>
            <span className="text-faint">←</span>
            <span className="text-muted truncate" title={s.channel}>
              {s.channel.replace(/^github:/, "")}
            </span>
            <button
              className={XBTN + " ml-auto"}
              title={t("gh.unsubscribe_title")}
              onClick={async () => {
                await unsubscribeChannel(s.session_id, s.channel);
                onChanged();
              }}
            >
              ×
            </button>
          </span>
        ))}
      </span>
    </div>
  );
}
