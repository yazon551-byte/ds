"use client";

import Link from "next/link";
import { useApp } from "./providers";

export function SiteHeader() {
  const { t, theme, toggleTheme } = useApp();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-[#060914]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-500 dark:text-indigo-400"
            aria-hidden
          >
            <circle cx="12" cy="5" r="2.2" />
            <circle cx="5" cy="19" r="2.2" />
            <circle cx="19" cy="19" r="2.2" />
            <line x1="12" y1="7.2" x2="6" y2="17" />
            <line x1="12" y1="7.2" x2="18" y2="17" />
            <line x1="7.2" y1="19" x2="16.8" y2="19" />
          </svg>
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {t.brand}
          </span>
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
      </div>
    </header>
  );
}
