import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type TKey } from "./en";
import { ar } from "./ar";

export type Lang = "en" | "ar";
const STORAGE_KEY = "jamhoor.lang";

function initialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  return navigator.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

interface I18nValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  formatDateTime: (iso: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let s: string = (lang === "ar" ? ar : en)[key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    [lang],
  );

  const formatDateTime = useCallback(
    (iso: string | Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) =>
      new Intl.DateTimeFormat(lang === "ar" ? "ar-AE" : "en-GB", opts).format(new Date(iso)),
    [lang],
  );

  const value = useMemo(() => ({ lang, dir, setLang, t, formatDateTime }), [lang, dir, setLang, t, formatDateTime]) as I18nValue;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
