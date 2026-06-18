"use client";

import Link from "next/link";
import { useApp } from "./providers";
import type { Difficulty, Localized } from "@/lib/types";

const difficultyColor: Record<Difficulty, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Intermediate: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Advanced: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Expert: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function LabShell({
  icon,
  title,
  intro,
  difficulty,
  children,
}: {
  icon: string;
  title: Localized;
  intro: Localized;
  difficulty: Difficulty;
  children: React.ReactNode;
}) {
  const { lang, t } = useApp();
  const backLabel = lang === "ar" ? "الوحدات" : "Modules";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/#modules"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <span className="rtl:rotate-180">←</span> {backLabel}
      </Link>

      <header className="mt-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-cyan-400/15 text-3xl">
            {icon}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {title[lang]}
            </h1>
            <div className="mt-1.5">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${difficultyColor[difficulty]}`}
              >
                {t.difficulty[difficulty]}
              </span>
            </div>
          </div>
        </div>
        <p className="max-w-3xl text-pretty leading-relaxed text-slate-600 dark:text-slate-400">
          {intro[lang]}
        </p>
      </header>

      <div className="mt-8">{children}</div>
    </div>
  );
}
