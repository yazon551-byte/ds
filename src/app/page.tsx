"use client";

import { useApp } from "@/components/providers";
import { ModuleCard } from "@/components/module-card";
import { categories, modulesByCategory } from "@/lib/modules";

export default function Home() {
  const { t, lang } = useApp();

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200/70 dark:border-white/10">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div
          className="absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/20 to-cyan-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              {t.hero_title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              {t.hero_subtitle}
            </p>
            <a
              href="#modules"
              className="mt-8 inline-block rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-[1.03]"
            >
              {t.hero_cta}
            </a>
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.modules_heading}
        </h2>

        <div className="flex flex-col gap-12">
          {categories.map((cat) => {
            const items = modulesByCategory(cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
    </div>
  );
}
