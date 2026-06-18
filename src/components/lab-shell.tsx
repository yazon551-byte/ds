"use client";

import Link from "next/link";
import { useApp } from "./providers";
import type { Difficulty, Localized } from "@/lib/types";

export function LabShell({
  title,
  intro,
  children,
}: {
  // icon & difficulty are accepted (callers still pass them) but no longer shown.
  icon?: string;
  title: Localized;
  intro: Localized;
  difficulty?: Difficulty;
  children: React.ReactNode;
}) {
  const { lang } = useApp();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/#modules"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        ← Modules
      </Link>

      <header className="mt-5 flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {title[lang]}
        </h1>
        <p className="max-w-3xl text-pretty leading-relaxed text-slate-600 dark:text-slate-400">
          {intro[lang]}
        </p>
      </header>

      <div className="mt-8">{children}</div>
    </div>
  );
}
