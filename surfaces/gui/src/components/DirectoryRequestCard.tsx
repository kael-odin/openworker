import { useState } from "react";
import type { Item } from "../types";
import { chooseFolder } from "../tauri";
import { Icon } from "./Icon";
import { useT } from "../i18n/I18nProvider";

type DirReqItem = Extract<Item, { kind: "dirreq" }>;

// The agent asked (via request_directory) for access to a folder. The user picks/confirms a path
// and access level, or declines — mirroring the approval card, shown in the composer head.
export function DirectoryRequestCard({
  item,
  onRespond,
}: {
  item: DirReqItem;
  onRespond: (granted: boolean, path?: string, writable?: boolean) => void;
}) {
  const [path, setPath] = useState(item.path || "");
  const [writable, setWritable] = useState(!!item.writable);
  const { t } = useT();

  const browse = async () => {
    const picked = await chooseFolder();
    if (picked) setPath(picked);
  };

  return (
    <div className="dirreq-card">
      <div className="dirreq-head">
        <Icon name="folderPlus" size={16} className="ico" />
        <span>{item.primary ? t("dirreq.head_primary") : t("dirreq.head")}</span>
      </div>
      {item.reason && <div className="dirreq-reason">“{item.reason}”</div>}
      {item.primary && (
        <div className="dirreq-reason">
          Granting makes this folder the session's primary working directory (read-write);
          the scratch directory stays available for temporary files and artifacts.
        </div>
      )}
      <div className="dirreq-pathrow">
        <input
          className="dirreq-path"
          placeholder={t("dirreq.placeholder")}
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button className="btn icon-only" onClick={browse} title={t("dirreq.choose")} aria-label={t("dirreq.choose")}>
          <Icon name="folder" size={15} />
        </button>
      </div>
      <div className="dirreq-actions">
        {!item.primary && (
          <label className="dirreq-access">
            <input type="checkbox" checked={writable} onChange={(e) => setWritable(e.target.checked)} />
            {t("dirreq.allow_write")}
          </label>
        )}
        <span className="spacer" />
        <button className="btn" onClick={() => onRespond(false)}>
          {t("dirreq.decline")}
        </button>
        <button
          className="btn primary"
          disabled={!path.trim()}
          onClick={() => onRespond(true, path.trim(), item.primary ? true : writable)}
        >
          {item.primary ? t("dirreq.make_workspace") : t("dirreq.grant")}
        </button>
      </div>
    </div>
  );
}
