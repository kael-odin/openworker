// The first React Context in this codebase. Provides t(key, params?) over the
// zh/en dictionaries, plus a useT() hook that re-renders on language change.
// Interpolation: {name} placeholders in the string are replaced from params.
//
// Usage in a component:
//   const { t } = useT();
//   <button>{t("app.new_session")}</button>
//   t("rightrail.artifacts_count", { n: artifacts.length })  // "成果 (3)"
//
// Missing key falls back to en, then to the key itself (and logs a warning in
// dev) — so a partially-translated tree never crashes, just shows English or
// the raw key.
import { createContext, useCallback, useContext, useMemo } from "react";
import type { Lang } from "./index";
import { getLangPref, useLangPref } from "./index";
import zh from "./zh.json";
import en from "./en.json";

type Dict = Record<string, string>;
const DICTS: Record<Lang, Dict> = { zh: zh as Dict, en: en as Dict };

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

interface I18nCtx {
  lang: Lang;
  t: TFunc;
}

const Ctx = createContext<I18nCtx | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang] = useLangPref();
  const t = useCallback<TFunc>(
    (key, params) => {
      const dict = DICTS[lang] ?? DICTS.zh;
      const enDict = DICTS.en;
      const raw = dict[key] ?? enDict[key] ?? key;
      // Dev-only: surface missing keys so gaps get noticed during the rollout.
      if (import.meta.env.DEV && !(key in dict) && !(key in enDict)) {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing key: ${key}`);
      }
      return interpolate(raw, params);
    },
    [lang],
  );
  const value = useMemo<I18nCtx>(() => ({ lang, t }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT must be used within <I18nProvider>");
  return v;
}

/** Read current lang outside React (rare use, e.g. non-component modules). */
export function currentLang(): Lang {
  return getLangPref();
}
