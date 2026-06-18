"use client";

import Link from "next/link";
import { useApp } from "./providers";
import type { ModuleMeta } from "@/lib/types";

export function ModuleCard({ module }: { module: ModuleMeta }) {
  const { lang } = useApp();
  const ready = module.status === "ready";

  const inner = (
    <div
      className={[
        "group flex h-full flex-col gap-2 rounded-2xl border p-5 transition-all duration-200",
        ready
          ? "border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40"
          : "border-dashed border-slate-200 bg-slate-50/60 opacity-70 dark:border-white/10 dark:bg-white/[0.015]",
      ].join(" ")}
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        {module.title[lang]}
      </h3>
      <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {module.tagline[lang]}
      </p>
      {ready && (
        <span className="text-sm font-semibold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
          Open →
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
