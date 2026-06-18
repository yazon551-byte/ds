"use client";

import Link from "next/link";
import { useApp } from "./providers";

export function SiteHeader() {
  const { t, theme, toggleTheme } = useApp();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-[#060914]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-sm" />
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {t.brand}
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/#modules"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:block dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {t.nav_modules}
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-base transition-colors hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            aria-label={theme === "dark" ? t.theme_toLight : t.theme_toDark}
            title={theme === "dark" ? t.theme_toLight : t.theme_toDark}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </nav>
      </div>
    </header>
  );
}
