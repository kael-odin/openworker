// Language preference: 中文 / English. Mirrors theme.ts — the pref lives in
// localStorage only (per-device, like macOS appearance), applies before the
// sidecar is reachable, and stays in sync across components via a CustomEvent.
// Default is "zh" (中文优先 — this fork's default). Set to "en" to fall back
// to the original English UI.
import { useEffect, useState } from "react";

export type Lang = "zh" | "en";

const KEY = "openwork-lang";
const LANG_EVENT = "openwork:lang-pref";
const DEFAULT: Lang = "zh";

export function getLangPref(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === "en" ? "en" : v === "zh" ? "zh" : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setLangPref(lang: Lang) {
  try {
    if (lang === DEFAULT) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, lang);
  } catch {
    /* private mode etc. — still applies for this session */
  }
  // Force a re-render of every useT() consumer by toggling the event.
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
}

/** Call once at startup: nothing to apply pre-paint (unlike theme), but kept for
 *  symmetry with theme.ts and future pre-paint needs. */
export function initLang() {
  // No DOM attribute to set pre-paint; the I18nProvider reads getLangPref() on
  // first render. This stub exists so main.tsx has a symmetric init call and a
  // future hook point (e.g. <html lang="zh">) has a home.
  const lang = getLangPref();
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

/** Hook for settings controls — stays in sync if the pref changes elsewhere. */
export function useLangPref(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(getLangPref);
  useEffect(() => {
    const sync = (e: Event) => setLang((e as CustomEvent).detail ?? getLangPref());
    window.addEventListener(LANG_EVENT, sync);
    return () => window.removeEventListener(LANG_EVENT, sync);
  }, []);
  return [lang, setLangPref];
}
