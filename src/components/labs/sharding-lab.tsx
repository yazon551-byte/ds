"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import {
  KEY_SPACE,
  SHARD_COLORS,
  hashInt,
  keyAngle,
  mapShard,
  movementPct,
  rangeBounds,
  ringNodes,
  sampleKeys,
  shardStrategies,
  shardStrategyInfo,
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
  youChoose: { en: "You choose what moves (manual).", ar: "أنت تختار ما يتحرّك (يدوي)." },
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

  // directory mapping: an explicit lookup table (here, a balanced round-robin
  // assignment) — the point is it's arbitrary and you control it.
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
      targetShard = directory[k] ?? leastLoaded(counts);
      steps = `directory[${k}] = ${tr(L.shard)} ${targetShard}`;
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
  const addMove = strategy === "directory" ? null : movementPct(strategy, sampleKeys, n, n + 1);
  const removeMove = strategy === "directory" || n <= 1 ? null : movementPct(strategy, sampleKeys, n, n - 1);
  const hashMove = Math.round(movementPct("hash", sampleKeys, n, n + 1));
  const consistentMove = Math.round(movementPct("consistent", sampleKeys, n, n + 1));

  const info = shardStrategyInfo(strategy);

  return (
    <LabShell
      icon="🧩"
      title={{ en: "Sharding Visualizer", ar: "مُصوِّر التقسيم" }}
      difficulty="Advanced"
      intro={{
        en: "Split data across shards and watch exactly where each key lands. Switch strategies, add or remove a shard, and see the killer difference: plain hashing reshuffles almost everything, while consistent hashing barely moves a thing.",
        ar: "وزّع البيانات على أقسام وشاهد بالضبط أين يذهب كل مفتاح. بدّل الاستراتيجيات، أضف أو احذف قسماً، وشاهد الفرق الحاسم: التجزئة العادية تعيد خلط كل شيء تقريباً، بينما الثابتة بالكاد تحرّك شيئاً.",
      }}
    >
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.strategy)}</span>
          <div className="flex flex-wrap gap-1.5">
            {shardStrategies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStrategy(s.id)}
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
            <button type="button" onClick={() => setN((v) => Math.max(2, v - 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">−</button>
            <span className="w-6 text-center text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{n}</span>
            <button type="button" onClick={() => setN((v) => Math.min(6, v + 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">+</button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.lookup)}</span>
          <input
            type="number"
            min={0}
            max={999}
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder={tr(L.keyHint)}
            className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-[#0d1322] dark:text-slate-100"
          />
        </div>
      </div>

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
    </LabShell>
  );
}
