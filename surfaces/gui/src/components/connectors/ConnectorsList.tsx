import { useState } from "react";
import { type CloudStatus, type Connector, type McpServer, type SlackStatus } from "../../api";
import { ConnectorBadge } from "../../connectors/ConnectorIcon";
import { AddConnectionModal } from "./AddConnectionModal";
import { AddMcpModal, CustomMcpGroup } from "./CustomMcp";
import { CHIP_OK, CHIP_OFF, CHIP_WARN, GRP, GRP_H, FOOT, PILL_QUIET, ROW } from "./ui";
import { useT, currentLang } from "../../i18n/I18nProvider";
import zh from "../../i18n/zh.json";
import en from "../../i18n/en.json";

// The Connectors LIST (UX-DECISIONS §21): connected first in their own inset group —
// rows navigate to the connector's detail subpage; problems surface as a chip in the
// list, never one click deep. Available connectors below with a Connect pill.
// Custom MCP servers (UX-034) render as their own group after Connected; the "Add
// custom server" affordance sits at the top of the page (owner ruling: top).

const AVAILABLE_FOLD = 8; // rows shown before "show all"

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
const EN: Dict = en as Dict;
function tt(key: string, params?: Record<string, string | number>): string {
  const d = DICTS[currentLang()] ?? DICTS.zh;
  let raw = d[key] ?? EN[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) raw = raw.replace(`{${k}}`, String(v));
  return raw;
}

export function ConnectorsList({
  connectors,
  mcpServers,
  cloud,
  slack,
  onOpen,
  onChanged,
}: {
  connectors: Connector[];
  mcpServers: McpServer[];
  cloud: CloudStatus | null;
  slack: SlackStatus | null;
  onOpen: (name: string) => void;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { t } = useT();
  const [addingMcp, setAddingMcp] = useState(false);

  const q = filter.trim().toLowerCase();
  const match = (c: Connector) => !q || c.title.toLowerCase().includes(q) || c.name.includes(q);
  const connected = connectors.filter((c) => c.connected && match(c));
  const available = connectors.filter((c) => !c.connected && c.available && match(c));
  const customMcp = mcpServers.filter((s) => !q || s.name.toLowerCase().includes(q));
  const shown = showAll || q ? available : available.slice(0, AVAILABLE_FOLD);
  const connectingC = connecting ? connectors.find((c) => c.name === connecting) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          className={PILL_QUIET}
          onClick={() => setAddingMcp(true)}
          data-testid="add-custom-server"
        >
          + Add custom server
        </button>
        <input
          placeholder={t("conn.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-44 px-3.5 py-1.5 rounded-full border border-line bg-panel text-[13px] outline-none focus:border-accent"
        />
      </div>

      {/* No cloud strip here anymore (§26): the sidebar's account row is the permanent
          sign-in home, and the connect modals keep their inline sign-in panes. */}
      {connected.length > 0 && (
        <>
          <div className={GRP_H + " !mt-0"}>{t("conn.connected_n", { n: connected.length })}</div>
          <div className={GRP}>
            {connected.map((c) => (
              <button
                key={c.name}
                data-testid={`connector-${c.name}`}
                className={ROW + " w-full text-left hover:bg-paper/60"}
                onClick={() => onOpen(c.name)}
              >
                <ConnectorBadge connector={c} size={34} title={c.title} />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-[13.5px]">{c.title}</span>
                  <span className="block text-[12px] text-muted">{statusLine(c)}</span>
                </span>
                {healthChip(c, slack)}
                <span className="text-faint text-[15px] shrink-0">›</span>
              </button>
            ))}
          </div>
        </>
      )}

      <CustomMcpGroup
        servers={customMcp}
        onOpen={(name) => onOpen("mcp:" + name)}
        onChanged={onChanged}
      />

      <div className={GRP_H}>{t("conn.available")}</div>
      <div className={GRP}>
        {shown.map((c) => (
          /* The row navigates to the pre-connect detail page (§38); the pill
             stays the fast path straight into the modal. */
          <button
            key={c.name}
            data-testid={`connector-${c.name}`}
            className={ROW + " w-full text-left hover:bg-paper/60"}
            onClick={() => onOpen(c.name)}
          >
            <ConnectorBadge connector={c} size={34} title={c.title} />
            <span className="min-w-0 flex-1">
              <span className="font-medium text-[13.5px]">{c.title}</span>
              <span className="block text-[12px] text-muted truncate">{c.blurb}</span>
            </span>
            <span
              className={PILL_QUIET + " cursor-pointer"}
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setConnecting(c.name);
              }}
            >
              {t("conn.connect")}
            </span>
          </button>
        ))}
        {shown.length === 0 && (
          <div className={ROW + " text-[12.5px] text-muted"}>{t("conn.nothing_matches")}</div>
        )}
      </div>
      {!showAll && !q && available.length > AVAILABLE_FOLD && (
        <div className={FOOT}>
          {t("conn.more_showall", { n: available.length - AVAILABLE_FOLD })}
          <button className="text-muted hover:text-ink" onClick={() => setShowAll(true)}>
            {t("conn.show_all")}
          </button>
        </div>
      )}

      {connectingC && (
        <AddConnectionModal
          c={connectingC}
          cloud={cloud}
          onClose={() => setConnecting(null)}
          onChanged={onChanged}
        />
      )}
      {addingMcp && <AddMcpModal onClose={() => setAddingMcp(false)} onChanged={onChanged} />}
    </div>
  );
}

function statusLine(c: Connector): string {
  if (c.name === "slack" && c.mode === "relay") {
    const n = c.workspaces?.length ?? 0;
    return tt(n === 1 ? "conn.workspace_n_one" : "conn.workspace_n", { n });
  }
  if ((c.accounts?.length ?? 0) > 1) return tt("conn.accounts_n", { n: c.accounts!.length });
  if ((c.portals?.length ?? 0) > 1) return tt("conn.portals_n", { n: c.portals!.length });
  if (c.auth === "none") return tt("conn.built_in");
  return c.account || tt("conn.connected");
}

function healthChip(c: Connector, slack: SlackStatus | null) {
  // Slack relay gets a LIVE chip from /v1/connectors/slack/status — problems
  // surface in the list, never one click deep. Named honestly per layer; we
  // never claim "Slack↔cloud down" (the desktop can't see that leg).
  if (c.name === "slack" && c.mode === "relay" && slack) {
    if (!slack.signed_in) return <span className={CHIP_WARN}>{tt("conn.signin_needed")}</span>;
    if (slack.relay.state === "offline") return <span className={CHIP_OFF}>{tt("conn.offline")}</span>;
    if (slack.relay.state === "reconnecting")
      return <span className={CHIP_WARN}>{tt("conn.reconnecting")}</span>;
    if (Object.values(slack.teams).some((tm) => !tm.token_ok))
      return <span className={CHIP_WARN}>{tt("conn.token")}</span>;
    return <span className={CHIP_OK}>{tt("conn.live")}</span>;
  }
  if (c.two_way && c.connected) return <span className={CHIP_OK}>{tt("conn.live")}</span>;
  return <span className={CHIP_OK}>{tt("conn.ready")}</span>;
}

