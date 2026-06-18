"use client";

import { useApp } from "./providers";

export function SiteFooter() {
  const { t } = useApp();
  return (
    <footer className="mt-24 border-t border-slate-200/70 py-10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:px-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t.brand}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          {t.footer_built} · {t.footer_tagline}
        </p>
      </div>
    </footer>
  );
}
