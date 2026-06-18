"use client";

import Link from "next/link";
import { useApp } from "./providers";
import type { ModuleMeta } from "@/lib/types";

const difficultyColor: Record<string, string> = {
  Beginner:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  Intermediate:
    "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20",
  Advanced:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  Expert:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20",
};

export function ModuleCard({ module }: { module: ModuleMeta }) {
  const { lang, t } = useApp();
  const ready = module.status === "ready";

  const inner = (
    <div
      className={[
        "group relative flex h-full flex-col gap-4 rounded-2xl border p-5 transition-all duration-200",
        ready
          ? "border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40"
          : "border-dashed border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.015]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={[
            "grid h-12 w-12 place-items-center rounded-xl text-2xl",
            ready
              ? "bg-gradient-to-br from-indigo-500/15 to-cyan-400/15"
              : "bg-slate-200/60 grayscale dark:bg-white/5",
          ].join(" ")}
        >
          {module.icon}
        </span>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            ready
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
              : "bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400",
          ].join(" ")}
        >
          {ready ? t.badge_ready : t.badge_soon}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {module.title[lang]}
        </h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {module.tagline[lang]}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span
          className={[
            "rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
            difficultyColor[module.difficulty],
          ].join(" ")}
        >
          {t.difficulty[module.difficulty]}
        </span>
      </div>

      {ready && (
        <span className="text-sm font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
          {t.open_module} →
        </span>
      )}
    </div>
  );

  if (!ready) return inner;

  return (
    <Link href={`/labs/${module.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
