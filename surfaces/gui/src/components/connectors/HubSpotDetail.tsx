import { useState } from "react";
import {
  disconnectHubSpotPortal,
  setHubSpotDefaultPortal,
  setHubSpotHiddenFields,
  type HubSpotPortal,
} from "../../api";
import { ConnectorBadge } from "../../connectors/ConnectorIcon";
import { AddConnectionModal } from "./AddConnectionModal";
import type { DetailProps } from "./ConnectorsSection";
import { ToolsDisclosure } from "./ToolsDisclosure";
import { FOOT, GRP, GRP_H, PILL_ACCENT, ROW, TAG_ACCENT, TAG_QUIET, TAG_WARN, XBTN } from "./ui";
import { useT } from "../../i18n/I18nProvider";

// The HubSpot detail page (UX-DECISIONS §21): connected portals (multi-portal,
// Default/Sandbox tags, the consent tier granted at connect) + Access & privacy
// (hidden-fields denylist — hides data from the MODEL; HubSpot permission sets
// are the ACL against humans) + collapsed Tools. Adding a portal goes through
// the ONE entry point: header button → modal (One click w/ access radios | Manual).

const LABEL = "text-[13px] text-muted w-24 shrink-0";

export function HubSpotDetail({ c, cloud, slack: _slack, onChanged }: DetailProps) {
  const [adding, setAdding] = useState(false);
  const portals = c.portals ?? [];
  const { t } = useT();

  return (
    <div data-testid="hubspot-detail">
      <div className="flex items-center gap-3.5 mb-5">
        <ConnectorBadge connector={c} size={44} title={t("conn.hubspot_title")} />
        <div className="min-w-0 flex-1">
<h2 className="text-[20px] font-semibold tracking-tight leading-tight">{t("conn.hubspot_title")}</h2>
          <div className="text-[13px] text-muted flex items-center gap-1.5">
            {c.connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-ok" />
                <span data-testid="hubspot-status">
                  {t(portals.length === 1 ? "conn.portal_n_one" : "conn.portal_n", { n: portals.length })}
                </span>
              </>
            ) : (
              <span>{t("conn.not_connected")}</span>
            )}
          </div>
        </div>
        <button className={PILL_ACCENT} data-testid="add-portal-btn" onClick={() => setAdding(true)}>
          {t("conn.add_portal")}
        </button>
      </div>

      {!c.connected && (
        <div className={GRP}>
          <div className={ROW + " text-[13px] text-muted"}>
            {t("conn.hubspot_sub")}
          </div>
        </div>
      )}

      {portals.length > 0 && (
        <>
          <div className={GRP_H + " !mt-0"}>{t("conn.portals")}</div>
          <div className={GRP} data-testid="hubspot-portals">
            {portals.map((p) => (
              <PortalRow key={p.hub_id} p={p} onChanged={onChanged} />
            ))}
          </div>
        </>
      )}

      <PrivacyGroup c={c} onChanged={onChanged} />

      <ToolsDisclosure c={c} onChanged={onChanged} />
      <div className={FOOT + " mt-2"}>
        {t("conn.hubspot_foot")}
      </div>

      {adding && (
        <AddConnectionModal
          c={c}
          cloud={cloud}
          title={t("conn.add_a_portal")}
          onClose={() => setAdding(false)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function PortalRow({ p, onChanged }: { p: HubSpotPortal; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  return (
    <div className={ROW} data-testid={`hubspot-portal-${p.hub_id}`}>
      <span className="min-w-0 flex-1 flex items-center gap-2">
        <span className="text-[13px] font-medium truncate" title={`hub ${p.hub_id}`}>
          {p.name}
        </span>
        {p.default && <span className={TAG_ACCENT}>{t("conn.default")}</span>}
        {p.sandbox && <span className={TAG_WARN}>{t("conn.sandbox")}</span>}
        {p.access && (
          <span className={TAG_QUIET} data-testid={`hubspot-access-tag-${p.hub_id}`}>
            {p.access === "write" ? t("conn.read_write") : t("conn.read_only")}
          </span>
        )}
        {!p.managed && <span className={TAG_QUIET}>{t("conn.private_app")}</span>}
      </span>
      {!p.default && (
        <button
          className="text-[12px] text-muted hover:text-ink shrink-0"
          data-testid={`hubspot-make-default-${p.hub_id}`}
          onClick={async () => {
            await setHubSpotDefaultPortal(p.hub_id);
            onChanged();
          }}
        >
          {t("conn.make_default")}
        </button>
      )}
      <button
        className={XBTN}
        title={t("conn.disconnect_portal")}
        data-testid={`hubspot-disconnect-${p.hub_id}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await disconnectHubSpotPortal(p.hub_id);
          setBusy(false);
          onChanged();
        }}
      >
        ×
      </button>
    </div>
  );
}

function PrivacyGroup({ c, onChanged }: Pick<DetailProps, "c" | "onChanged">) {
  const fields = c.hidden_fields ?? [];
  const [draft, setDraft] = useState("");
  const { t } = useT();
  const save = async (next: string[]) => {
    await setHubSpotHiddenFields(next);
    onChanged();
  };
  const add = async () => {
    const v = draft.trim();
    if (!v) return;
    setDraft("");
    await save([...fields, v]);
  };
  return (
    <>
      <div className={GRP_H}>{t("conn.access_privacy")}</div>
      <div className={GRP}>
        <div className={ROW} data-testid="hubspot-hidden-fields">
          <span className={LABEL}>{t("conn.hidden_fields")}</span>
          <span className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
            {fields.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-paper border border-line text-[13px] font-mono"
              >
                {f}
                <button className={XBTN} title={t("conn.remove")} onClick={() => save(fields.filter((x) => x !== f))}>
                  ×
                </button>
              </span>
            ))}
            <input
className="flex-1 min-w-[140px] bg-transparent text-[13px] outline-none placeholder:text-faint"
              placeholder={t("conn.hidden_fields_ph")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              onBlur={() => draft.trim() && add()}
            />
          </span>
        </div>
      </div>
      <div className={FOOT}>{t("conn.hidden_fields_foot")}</div>
    </>
  );
}
