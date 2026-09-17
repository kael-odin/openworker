// Vitest global setup: initialize i18n synchronously so t() resolves inside
// components under test. Uses the English resources so existing English
// assertions keep working; without this, t("key") renders the key literal.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// Node ≥22.5 ships a global `localStorage` stub whose methods are undefined
// unless launched with --localstorage-file; inside the jsdom environment it
// shadows jsdom's own implementation and any component reading it throws
// "localStorage.getItem is not a function". Install an in-memory stand-in when
// the global is unusable.
const ls = globalThis.localStorage as Storage | undefined;
if (!ls || typeof ls.getItem !== "function") {
  const store = new Map<string, string>();
  const polyfill: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: polyfill,
    configurable: true,
    writable: true,
  });
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});
