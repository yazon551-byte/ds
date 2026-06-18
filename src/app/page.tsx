"use client";

import { useApp } from "@/components/providers";
import { ModuleCard } from "@/components/module-card";
import { categories, modules, modulesByCategory } from "@/lib/modules";

export default function Home() {
  const { t, lang } = useApp();

  const total = modules.length;
  const ready = modules.filter((m) => m.status === "ready").length;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/70 dark:border-white/10">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div
          className="absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/30 to-cyan-400/30 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-1.5 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="animate-float-slow">⚡</span>
              {t.hero_kicker}
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
              {t.hero_title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              {t.hero_subtitle}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#modules"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-[1.03]"
              >
                {t.hero_cta_primary}
              </a>
              <a
                href="#about"
                className="rounded-xl border border-slate-200 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {t.hero_cta_secondary}
              </a>
            </div>

            <dl className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4">
              {[
                { value: total, label: t.hero_stat_modules },
                { value: ready, label: t.hero_stat_ready },
                { value: categories.length, label: t.hero_stat_topics },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <dt className="text-3xl font-bold text-slate-900 dark:text-white">
                    {s.value}
                  </dt>
                  <dd className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.modules_heading}
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            {t.modules_sub}
          </p>
        </div>

        <div className="flex flex-col gap-12">
          {categories.map((cat) => {
            const items = modulesByCategory(cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span className="text-lg">{cat.icon}</span>
                  {cat.name[lang]}
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((m) => (
                    <ModuleCard key={m.slug} module={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── About ────────────────────────────────────────────── */}
      <section id="about" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white/60 p-8 sm:p-10 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.about_heading}
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">
            {t.about_body}
          </p>
        </div>
      </section>
    </div>
  );
}
