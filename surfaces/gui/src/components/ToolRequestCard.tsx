import type { Item } from "../types";
import { Icon } from "./Icon";
import { useT } from "../i18n/I18nProvider";

type ToolReqItem = Extract<Item, { kind: "toolreq" }>;

// The agent asked (via request_tool) for a CLI it couldn't find — a scanner, usually.
// Declining is a normal outcome, not a failure: the agent falls back and says which checks
// were degraded, so the copy here shouldn't push the user toward Install.
export function ToolRequestCard({
  item,
  onRespond,
}: {
  item: ToolReqItem;
  onRespond: (approved: boolean) => void;
}) {
  const { t } = useT();
  return (
    <div className="dirreq-card">
      <div className="dirreq-head">
        <Icon name="wrench" size={16} className="ico" />
        <span>
          {t("toolreq.needs_pre")}<code>{item.tool}</code>
        </span>
      </div>
      {item.reason && (
        <div className="dirreq-reason">
          <span className="toolreq-label">{t("toolreq.reason")}</span> “{item.reason}”
        </div>
      )}
      {/* The fact strip is the PRODUCT speaking (registry metadata), styled apart from the
          coworker's quoted ask above — mixing the two voices is what made the card confusing. */}
      {item.installable ? (
        <div className="toolreq-facts">
          <div className="toolreq-factrow">
            <code>
              {item.tool}
              {item.version ? ` ${item.version}` : ""}
            </code>
            {item.summary && <span className="toolreq-fact">{item.summary}</span>}
          </div>
          <div className="toolreq-explain">
            {t("toolreq.install_note", { source: item.source ? ` ${t("toolreq.from")} ${item.source}` : "" })}
          </div>
        </div>
      ) : (
        <div className="toolreq-facts">
          <div className="toolreq-explain">
            {t("toolreq.no_build")}
          </div>
        </div>
      )}
      <div className="dirreq-actions">
        <span className="spacer" />
        <button className="btn" data-testid="toolreq-skip" onClick={() => onRespond(false)}>
          {t("toolreq.skip")}
        </button>
        <button
          className="btn primary"
          data-testid="toolreq-install"
          disabled={!item.installable}
          onClick={() => onRespond(true)}
        >
          {t("toolreq.install")}
        </button>
      </div>
    </div>
  );
}
