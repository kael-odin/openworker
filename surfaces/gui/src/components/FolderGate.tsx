import { useEffect, useState } from "react";
import { getRecentWorkspaces, openWorkspace, type RecentWorkspace } from "../api";
import { chooseFolder } from "../tauri";
import { useT } from "../i18n/I18nProvider";

// The mandatory workspace picker for project-scoped personas. Deliberately no
// "switch persona" escape hatch: if a persona needs a folder, the choice here is
// pick one or cancel — offering Chat as an exit undermined the persona the user
// just chose (owner call, 2026-07-03).
interface Props {
  onChoose: (path: string, branch?: string | null) => void;
  onCancel?: () => void; // present when changing folder mid-session
  create?: boolean; // "New project" mode: create the folder if missing
}

export function FolderGate({ onChoose, onCancel, create }: Props) {
  const [recents, setRecents] = useState<RecentWorkspace[]>([]);
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const { t } = useT();

  useEffect(() => {
    getRecentWorkspaces().then(setRecents).catch(() => {});
  }, []);

  const open = async (p: string, doCreate = false) => {
    setError("");
    const res = await openWorkspace(p.trim(), doCreate);
    if (res.ok) onChoose(res.path, res.git_branch);
    else setError(res.error || t("foldergate.err_open"));
  };

  const browse = async () => {
    const picked = await chooseFolder();
    if (picked) {
      setPath(picked);
      open(picked, create); // a picked folder already exists; create flag is harmless
    }
  };

  return (
    <div className="gate-overlay">
      <div className="gate">
        <div className="gate-mark">✦</div>
        <h2>{create ? t("foldergate.new_project") : t("foldergate.choose_folder")}</h2>
        <p className="gate-sub">
          {create ? t("foldergate.new_sub") : t("foldergate.choose_sub")}
        </p>

        <div className="gate-input">
          <input
            placeholder={t("foldergate.placeholder")}
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && open(path, create)}
            autoFocus
          />
          <button className="btn" onClick={browse} title={t("foldergate.browse_title")}>
            {t("foldergate.browse")}
          </button>
          <button className="btn primary" onClick={() => open(path, create)} disabled={!path.trim()}>
            {create ? t("foldergate.create") : t("foldergate.open")}
          </button>
        </div>
        {error && <div className="gate-error">{error}</div>}

        {recents.length > 0 && (
          <>
            <div className="gate-label">{t("foldergate.recent")}</div>
            <div className="gate-recents">
              {recents.map((w) => (
                <div className="gate-recent" key={w.path} onClick={() => open(w.path)} title={w.path}>
                  <span className="folder">📁 {w.name}</span>
                  <span className="dim">{w.path}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {onCancel && (
          <div className="gate-foot">
            <button className="btn gate-cancel" onClick={onCancel}>
              {t("foldergate.cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
