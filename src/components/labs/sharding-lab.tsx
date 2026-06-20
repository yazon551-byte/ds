"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import {
  KEY_SPACE,
  SHARD_COLORS,
  hashInt,
  keyAngle,
  mapShard,
  rangeBounds,
  ringNodes,
  sampleKeys,
  shardStrategies,
  shardStrategyInfo,
  statMovementPct,
  type ShardStrategy,
} from "@/lib/labs/sharding";
import type { Localized } from "@/lib/types";

const L = {
  strategy: { en: "Strategy", ar: "الاستراتيجية" },
  shards: { en: "Shards", ar: "الأقسام" },
  lookup: { en: "Trace a key", ar: "تتبّع مفتاحاً" },
  keyHint: { en: "Type a user ID (0–999)", ar: "اكتب معرّف مستخدم (0–999)" },
  lands: { en: "lands on", ar: "يذهب إلى" },
  shard: { en: "Shard", ar: "قسم" },
  distribution: { en: "Distribution", ar: "التوزيع" },
  keys: { en: "keys", ar: "مفاتيح" },
  rebalancing: { en: "Rebalancing cost", ar: "كلفة إعادة التوزيع" },
  addShard: { en: "Add a shard", ar: "إضافة قسم" },
  removeShard: { en: "Remove a shard", ar: "حذف قسم" },
  moves: { en: "of keys move", ar: "من المفاتيح تتحرّك" },
  youChoose: { en: "Lookup table — placement is explicit, not computed from the key.", ar: "جدول بحث — التوزيع صريح، مش محسوب من المفتاح." },
  compare: { en: "Hash vs Consistent — keys moved when adding 1 shard:", ar: "تجزئة مقابل ثابتة — المفاتيح المتحرّكة عند إضافة قسم:" },
  how: { en: "How it works", ar: "كيف يعمل" },
  pro: { en: "Strength", ar: "القوة" },
  con: { en: "Trade-off", ar: "المقايضة" },
  ring: { en: "The hash ring", ar: "حلقة التجزئة" },
  ringHint: { en: "Squares = shard positions (incl. virtual nodes) · dots = keys. Each key belongs to the next shard clockwise.", ar: "المربّعات = مواضع الأقسام (مع العُقَد الافتراضية) · النقاط = المفاتيح. كل مفتاح يتبع أقرب قسم باتجاه عقارب الساعة." },
} satisfies Record<string, Localized>;

function leastLoaded(counts: number[]): number {
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] < counts[best]) best = i;
  return best;
}

function polar(angle: number, r: number, cx = 110, cy = 110) {
  const t = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
}

export function ShardingLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [strategy, setStrategy] = useState<ShardStrategy>("hash");
  const [n, setN] = useState(4);
  const [inputKey, setInputKey] = useState("");

  // ── gamification: explore the three core sharding ideas ─────────────
  const [missions, setMissions] = useState({ traced: false, switched: false, resized: false });
  const allDone = missions.traced && missions.switched && missions.resized;

  // directory mapping: an explicit, precomputed lookup table (here a balanced
  // round-robin assignment) — any key can map to any shard, independent of its value.
  const directory = useMemo(() => {
    const d: Record<number, number> = {};
    sampleKeys.forEach((k, i) => (d[k] = i % n));
    return d;
  }, [n]);

  const assignment = useMemo(() => {
    if (strategy === "directory") return sampleKeys.map((k) => directory[k] ?? 0);
    return sampleKeys.map((k) => mapShard(strategy, k, n));
  }, [strategy, n, directory]);

  const counts = useMemo(() => {
    const c = Array(n).fill(0);
    assignment.forEach((s) => { if (s < n) c[s]++; });
    return c;
  }, [assignment, n]);

  const bounds = useMemo(() => rangeBounds(n), [n]);
  const ring = useMemo(() => (strategy === "consistent" ? ringNodes(n) : []), [strategy, n]);

  // ── key lookup ──────────────────────────────────────────────────────
  const parsedKey = inputKey.trim() === "" ? null : Math.max(0, Math.min(KEY_SPACE - 1, parseInt(inputKey, 10)));
  const validKey = parsedKey !== null && !Number.isNaN(parsedKey);

  let targetShard: number | null = null;
  let steps = "";
  if (validKey) {
    const k = parsedKey;
    if (strategy === "directory") {
      const inTable = directory[k] !== undefined;
      targetShard = inTable ? directory[k] : leastLoaded(counts);
      steps = inTable
        ? `directory[${k}] = ${tr(L.shard)} ${targetShard}`
        : `${k} ${lang === "ar" ? "غير مُدرج → الأقل تحميلاً" : "not in table → least-loaded"} → ${tr(L.shard)} ${targetShard}`;
    } else if (strategy === "range") {
      targetShard = mapShard("range", k, n);
      const b = bounds[targetShard];
      steps = `${k} ∈ [${b.lo}–${b.hi}] → ${tr(L.shard)} ${targetShard}`;
    } else if (strategy === "hash") {
      targetShard = mapShard("hash", k, n);
      steps = `hash(${k}) % ${n} = ${hashInt(k)} % ${n} = ${targetShard}`;
    } else {
      targetShard = mapShard("consistent", k, n);
      steps = `${k} @ ${keyAngle(k)}° → ${tr(L.shard)} ${targetShard} (${lang === "ar" ? "أقرب قسم بالساعة" : "next clockwise"})`;
    }
  }

  // ── rebalancing insight ─────────────────────────────────────────────
  const addMove = strategy === "directory" ? null : statMovementPct(strategy, n, n + 1);
  const removeMove = strategy === "directory" || n <= 1 ? null : statMovementPct(strategy, n, n - 1);
  const hashMove = Math.round(statMovementPct("hash", n, n + 1));
  const consistentMove = Math.round(statMovementPct("consistent", n, n + 1));

  const info = shardStrategyInfo(strategy);

  return (
    <LabShell
      icon="🧩"
      title={{ en: "Sharding Visualizer", ar: "مُصوِّر التقسيم" }}
      difficulty="Advanced"
      intro={{
        en: "The problem: your data no longer fits on one machine — so you split it across several (shards). But which row goes where, and what happens when you add a machine later? Trace where keys land under each strategy, then resize the cluster to uncover the killer difference: plain hashing reshuffles almost everything, while consistent hashing barely moves a thing. Work through the three experiments below.",
        ar: "المشكلة: بياناتك ما عادت تكفي على جهاز واحد — فبنقسّمها على كذا جهاز (shards). بس أي صفّ بيروح وين؟ وشو بيصير لمّا تضيف جهاز بعدين؟ تتبّع وين بتقع المفاتيح بكل استراتيجية، وبعدين غيّر حجم الكلاستر لتكتشف الفرق الحاسم: التجزئة العادية بتعيد خلط كل شي تقريباً، بينما الثابتة بالكاد بتحرّك شي. جرّب التجارب الثلاث تحت.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Trace a key", done: missions.traced },
          { label: "Switch strategy", done: missions.switched },
          { label: "Resize the cluster", done: missions.resized },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.strategy)}</span>
          <div className="flex flex-wrap gap-1.5">
            {shardStrategies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStrategy(s.id);
                  if (s.id !== "hash") setMissions((m) => (m.switched ? m : { ...m, switched: true }));
                }}
                className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", strategy === s.id ? "bg-indigo-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")}
              >
                {tr(s.name)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.shards)}: <b className="text-slate-700 dark:text-slate-200">{n}</b></span>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Remove shard" onClick={() => { setN((v) => Math.max(2, v - 1)); setMissions((m) => (m.resized ? m : { ...m, resized: true })); }} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">−</button>
            <span className="w-6 text-center text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{n}</span>
            <button type="button" aria-label="Add shard" onClick={() => { setN((v) => Math.min(6, v + 1)); setMissions((m) => (m.resized ? m : { ...m, resized: true })); }} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">+</button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.lookup)}</span>
          <input
            type="number"
            min={0}
            max={999}
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              if (!Number.isNaN(parseInt(e.target.value, 10)))
                setMissions((m) => (m.traced ? m : { ...m, traced: true }));
            }}
            placeholder={tr(L.keyHint)}
            className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-[#0d1322] dark:text-slate-100"
          />
        </div>
      </div>

      <TryIt
        items={[
          <>Type a user ID (e.g. <b>42</b>) in <b>{tr(L.lookup)}</b> and read the formula that places it.</>,
          <>Switch <b>{tr(L.strategy)}</b> to <b>Consistent</b> and watch the hash ring appear.</>,
          <>Press <b>+</b> or <b>−</b> to resize, then compare the Hash vs Consistent move % below.</>,
        ]}
      />

      {/* ── Lookup result ───────────────────────────────────── */}
      {validKey && targetShard !== null && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-300/40 bg-indigo-500/5 p-4">
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {lang === "ar" ? "المفتاح" : "Key"} <b>{parsedKey}</b> {tr(L.lands)}
          </span>
          <span className="rounded-lg px-3 py-1 text-sm font-bold text-white" style={{ background: SHARD_COLORS[targetShard % SHARD_COLORS.length] }}>
            {tr(L.shard)} {targetShard}
          </span>
          <code className="rounded bg-slate-900/5 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{steps}</code>
        </div>
      )}

      <Aha show={missions.traced}>
        That little formula is the whole point: any server can compute where a key lives
        without asking a central index (except the Directory strategy, which keeps an
        explicit lookup table). Hash and consistent both turn the key into a number; range
        just checks which interval it falls in.
      </Aha>

      {/* ── Shard columns ───────────────────────────────────── */}
      <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(n, 3)}, minmax(0,1fr))` }}>
        {Array.from({ length: n }, (_, s) => {
          const color = SHARD_COLORS[s % SHARD_COLORS.length];
          const keysHere = sampleKeys.filter((_, i) => assignment[i] === s);
          return (
            <div key={s} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <span className="h-3 w-3 rounded" style={{ background: color }} />
                  {tr(L.shard)} {s}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{counts[s]} {tr(L.keys)}</span>
              </div>
              {strategy === "range" && (
                <span className="font-mono text-[11px] text-slate-400">[{bounds[s].lo}–{bounds[s].hi}]</span>
              )}
              <div className="flex flex-wrap gap-1">
                {keysHere.map((k) => (
                  <span key={k} className="rounded px-1.5 py-0.5 font-mono text-[11px] font-medium" style={{ background: `${color}22`, color }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Consistent hashing ring ─────────────────────────── */}
      {strategy === "consistent" && (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-start">
          <svg viewBox="0 0 220 220" className="h-56 w-56 shrink-0">
            <circle cx="110" cy="110" r="80" fill="none" stroke="currentColor" className="text-slate-200 dark:text-white/10" strokeWidth="2" />
            {ring.map((node, i) => {
              const p = polar(node.angle, 80);
              const c = SHARD_COLORS[node.shard % SHARD_COLORS.length];
              return <rect key={i} x={p.x - 5} y={p.y - 5} width="10" height="10" rx="2" fill={c} />;
            })}
            {sampleKeys.map((k, i) => {
              const p = polar(keyAngle(k), 62);
              const c = SHARD_COLORS[assignment[i] % SHARD_COLORS.length];
              return <circle key={k} cx={p.x} cy={p.y} r="3.5" fill={c} opacity={0.85} />;
            })}
            {validKey && targetShard !== null && (() => {
              const p = polar(keyAngle(parsedKey), 62);
              return <circle cx={p.x} cy={p.y} r="6" fill="none" stroke="currentColor" className="text-slate-900 dark:text-white" strokeWidth="2" />;
            })()}
          </svg>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{tr(L.ringHint)}</p>
        </div>
      )}

      {/* ── Distribution + Rebalancing ──────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.distribution)}</h3>
          <div className="flex flex-col gap-3">
            {counts.map((c, s) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">{tr(L.shard)} {s}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(c / sampleKeys.length) * 100}%`, background: SHARD_COLORS[s % SHARD_COLORS.length] }} />
                </div>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.rebalancing)}</h3>
          {strategy === "directory" ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">{tr(L.youChoose)}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">{tr(L.addShard)}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{Math.round(addMove ?? 0)}% {tr(L.moves)}</span>
              </div>
              {removeMove !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{tr(L.removeShard)}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{Math.round(removeMove)}% {tr(L.moves)}</span>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-slate-900/5 p-3 dark:bg-white/5">
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr(L.compare)}</p>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-rose-600 dark:text-rose-400">Hash: <b>{hashMove}%</b></span>
              <span className="text-emerald-600 dark:text-emerald-400">Consistent: <b>{consistentMove}%</b></span>
            </div>
          </div>
        </div>
      </div>

      <Aha show={missions.resized}>
        Look at the Hash vs Consistent numbers. Plain <code>hash(key) % N</code> depends on
        N, so changing the shard count rewrites <i>almost every</i> key&apos;s home — a massive,
        slow data migration. Consistent hashing places shards on a ring, so adding or
        removing one only moves the keys in that one arc (~1/N of them). That&apos;s exactly why
        elastic systems (Cassandra, DynamoDB, memcached) use it.
      </Aha>

      {/* ── Strategy explainer ──────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{tr(info.name)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tr(info.how)}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-emerald-500/5 p-3">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ {tr(L.pro)}</span>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{tr(info.pro)}</p>
          </div>
          <div className="rounded-lg bg-amber-500/5 p-3">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">⚠ {tr(L.con)}</span>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{tr(info.con)}</p>
          </div>
        </div>
      </div>

      {/* ── Closing: what to explore next ─────────────────────── */}
      <section
        className={[
          "mt-8 rounded-2xl border p-6 transition-colors",
          allDone
            ? "border-emerald-400/40 bg-emerald-500/5"
            : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]",
        ].join(" ")}
      >
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {allDone ? "🎉 You've seen how data splits — and what it costs to move it." : "Splitting data raises a new question"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Now each shard holds the only copy of its slice — so if one shard dies, that data
          is gone, and a popular shard becomes a bottleneck. The answer is to keep copies.
          These modules continue the story:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Replication",
              desc: "Keep multiple copies of each shard so it survives a failure and can serve more reads.",
              href: "/labs/replication",
            },
            {
              fix: "Load Balancer",
              desc: "Spread incoming requests across the machines that hold your shards and replicas.",
              href: "/labs/load-balancer",
            },
          ].map((s) => (
            <Link
              key={s.fix}
              href={s.href}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40"
            >
              <p className="font-semibold text-slate-900 dark:text-white">{s.fix} →</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </LabShell>
  );
}
