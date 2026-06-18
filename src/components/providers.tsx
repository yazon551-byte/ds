"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ui, type Dict } from "@/lib/dict";
import type { Locale } from "@/lib/types";

type Theme = "dark" | "light";

interface AppContextValue {
  lang: Locale;
  dir: "rtl" | "ltr";
  theme: Theme;
  t: Dict;
  toggleLang: () => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const LANG_KEY = "dsl-lang";
const THEME_KEY = "dsl-theme";

function readInitialLang(): Locale {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang === "ar" ? "ar" : "en";
}

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function Providers({ children }: { children: React.ReactNode }) {
  // The inline script in the root layout has already set <html lang/dir/class>
  // before hydration, so reading from the DOM keeps client state in sync.
  const [lang, setLang] = useState<Locale>(readInitialLang);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
  }, [lang]);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleLang = useCallback(
    () => setLang((l) => (l === "ar" ? "en" : "ar")),
    [],
  );
  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      theme,
      t: ui[lang],
      toggleLang,
      toggleTheme,
    }),
    [lang, theme, toggleLang, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <Providers>");
  return ctx;
}
