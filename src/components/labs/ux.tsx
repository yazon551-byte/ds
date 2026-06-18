"use client";

import type { ReactNode } from "react";

/**
 * Shared UX primitives for the labs — a guided "do this → see why" loop.
 *
 *  - <TryIt>          numbered "do this next" steps, so the user is never lost.
 *  - <Aha>            a reveal that explains what just happened, shown after the
 *                     user actually triggers the effect.
 *  - <MissionTracker> a sticky progress bar of small objectives, so exploring
 *                     the lab feels like completing a checklist.
 */

// ── "Try this" numbered steps ───────────────────────────────────────────
export function TryIt({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-1.5 rounded-xl border border-indigo-200/70 bg-indigo-50/60 p-3.5 text-sm dark:border-indigo-400/20 dark:bg-indigo-500/[0.06]">
      <span className="mb-0.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
        👉 Try this
      </span>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-indigo-500">{i + 1}.</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

// ── "What just happened" reveal ─────────────────────────────────────────
export function Aha({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <p className="mt-4 rounded-xl bg-emerald-500/10 p-3.5 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
      💡 <b>What just happened:</b> {children}
    </p>
  );
}

// ── Sticky mission / objectives tracker ─────────────────────────────────
export interface Mission {
  label: string;
  done: boolean;
}

export function MissionTracker({
  title,
  missions,
  countLabel = "done",
}: {
  title: string;
  missions: Mission[];
  countLabel?: string;
}) {
  const done = missions.filter((m) => m.done).length;
  const total = missions.length;
  return (
    <div className="sticky top-16 z-40 -mx-4 mb-6 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 dark:border-white/10 dark:bg-[#060914]/85">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          🧭 {title} —{" "}
          <span className="text-indigo-600 dark:text-indigo-400">
            {done}/{total} {countLabel}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {missions.map((m) => (
            <span
              key={m.label}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                m.done
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400",
              ].join(" ")}
            >
              {m.done ? "✓ " : "○ "}
              {m.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
