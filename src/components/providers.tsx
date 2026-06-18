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
  /** Kept as "en" so lab content (which stores {en, ar}) keeps rendering. */
  lang: Locale;
  dir: "ltr";
  theme: Theme;
  t: Dict;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = "dsl-theme";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo<AppContextValue>(
    () => ({ lang: "en", dir: "ltr", theme, t: ui.en, toggleTheme }),
    [theme, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <Providers>");
  return ctx;
}
