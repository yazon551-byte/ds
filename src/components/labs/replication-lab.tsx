"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import { replicationInfo } from "@/lib/labs/replication";
import type { Localized } from "@/lib/types";

type Mode = "active" | "passive";
const NODE_LABELS = ["A", "B", "C", "D"];
const LAG_FACTORS = [1, 0.6, 1.0, 1.5]; // per-node lag multiplier (index 0 = initial primary)

const L = {
  mode: { en: "Replication mode", ar: "نمط النسخ" },
  active: { en: "Active", ar: "نشط" },
  passive: { en: "Passive", ar: "خامل" },
  sync: { en: "Sync", ar: "متزامن" },
  async: { en: "Async", ar: "غير متزامن" },
  lag: { en: "Replication lag", ar: "تأخّر النسخ" },
  rate: { en: "Writes / sec", ar: "كتابات/ثانية" },
  auto: { en: "Auto writes", ar: "كتابة تلقائية" },
  pause: { en: "Pause", ar: "إيقاف" },
  write: { en: "Write (+1)", ar: "اكتب (+1)" },
  killPrimary: { en: "Kill primary", ar: "أوقف الأساسي" },
  reset: { en: "Reset", ar: "إعادة" },
  primary: { en: "PRIMARY", ar: "أساسي" },
  replica: { en: "REPLICA", ar: "نسخة" },
  down: { en: "DOWN", ar: "متوقف" },
  behind: { en: "behind by", ar: "متأخّر بـ" },
  upToDate: { en: "up to date", ar: "محدّث" },
  read: { en: "Read", ar: "اقرأ" },
  writes: { en: "Total writes", ar: "إجمالي الكتابات" },
  lost: { en: "Lost writes", ar: "كتابات مفقودة" },
  readLog: { en: "Read log", ar: "سجل القراءات" },
  empty: { en: "Read a replica to see if it returns fresh or stale data.", ar: "اقرأ من نسخة لترى إن كانت تعيد بيانات حديثة أم قديمة." },
  stale: { en: "STALE", ar: "قديمة" },
  fresh: { en: "fresh", ar: "حديثة" },
  node: { en: "Node", ar: "عقدة" },
  explainer: { en: "The concepts", ar: "المفاهيم" },
} satisfies Record<string, Localized>;

interface NodeView {
  label: string;
  applied: number;
  isPrimary: boolean;
  down: boolean;
  behind: number;
}
interface ReadEntry { seq: number; node: string; value: number; stale: boolean; }
interface Snapshot {
  nodes: NodeView[];
  primarySeq: number;
  totalWrites: number;
  lostWrites: number;
  reads: ReadEntry[];
}

function initialSnapshot(): Snapshot {
  return {
    nodes: NODE_LABELS.map((label, i) => ({ label, applied: 0, isPrimary: i === 0, down: false, behind: 0 })),
    primarySeq: 0,
    totalWrites: 0,
    lostWrites: 0,
    reads: [],
  };
}

export function ReplicationLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [mode, setMode] = useState<Mode>("passive");
  const [sync, setSync] = useState(false);
  const [lag, setLag] = useState(1500);
  const [rate, setRate] = useState(1.5);
  const [running, setRunning] = useState(false); // start paused — user presses ▶ when ready

  // ── gamification: feel the consistency-vs-durability trade-off ──────
  const [missions, setMissions] = useState({ stale: false, lost: false, safe: false });
  const allDone = missions.stale && missions.lost && missions.safe;

  const modeRef = useRef(mode);
  const syncRef = useRef(sync);
  const lagRef = useRef(lag);
  const rateRef = useRef(rate);
  const runningRef = useRef(running);
  useEffect(() => void (modeRef.current = mode), [mode]);
  useEffect(() => void (syncRef.current = sync), [sync]);
  useEffect(() => void (lagRef.current = lag), [lag]);
  useEffect(() => void (rateRef.current = rate), [rate]);
  useEffect(() => void (runningRef.current = running), [running]);

  // sim state
  const writesRef = useRef<{ t: number }[]>([]); // each write timestamped
  const appliedRef = useRef<number[]>(NODE_LABELS.map(() => 0));
  const downRef = useRef<boolean[]>(NODE_LABELS.map(() => false));
  const primaryRef = useRef(0);
  const lostRef = useRef(0);
  const totalRef = useRef(0);
  const readsRef = useRef<ReadEntry[]>([]);
  const readSeqRef = useRef(0);
  const spawnAccRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastSnapRef = useRef(0);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  // how many writes a given replica has applied "by now"
  const replicaApplied = useCallback((nodeIdx: number, now: number): number => {
    const writes = writesRef.current;
    if (modeRef.current === "active" || syncRef.current) return writes.length;
    const cutoff = now - lagRef.current * LAG_FACTORS[nodeIdx];
    // writes are timestamp-ascending; count those old enough to have arrived
    let c = 0;
    for (const w of writes) { if (w.t <= cutoff) c++; else break; }
    return c;
  }, []);

  const buildSnapshot = useCallback((now: number): Snapshot => {
    const primarySeq = writesRef.current.length;
    const nodes: NodeView[] = NODE_LABELS.map((label, i) => {
      const down = downRef.current[i];
      const isPrimary = primaryRef.current === i && !down;
      const applied = down ? appliedRef.current[i] : isPrimary ? primarySeq : replicaApplied(i, now);
      return { label, applied, isPrimary, down, behind: Math.max(0, primarySeq - applied) };
    });
    return {
      nodes,
      primarySeq,
      totalWrites: totalRef.current,
      lostWrites: lostRef.current,
      reads: readsRef.current.slice(-8).reverse(),
    };
  }, [replicaApplied]);

  const reset = useCallback(() => {
    writesRef.current = [];
    appliedRef.current = NODE_LABELS.map(() => 0);
    downRef.current = NODE_LABELS.map(() => false);
    primaryRef.current = 0;
    lostRef.current = 0;
    totalRef.current = 0;
    readsRef.current = [];
    readSeqRef.current = 0;
    spawnAccRef.current = 0;
    setSnap(buildSnapshot(performance.now()));
  }, [buildSnapshot]);

  const writeOnce = useCallback((now: number) => {
    writesRef.current.push({ t: now });
    totalRef.current++;
  }, []);

  const killPrimary = useCallback(() => {
    const now = performance.now();
    const p = primaryRef.current;
    if (downRef.current[p]) return;
    // candidates = alive replicas
    const candidates = NODE_LABELS.map((_, i) => i).filter((i) => i !== p && !downRef.current[i]);
    if (candidates.length === 0) return;
    // freeze each replica's current applied count
    NODE_LABELS.forEach((_, i) => {
      if (!downRef.current[i] && i !== p) appliedRef.current[i] = replicaApplied(i, now);
    });
    appliedRef.current[p] = writesRef.current.length;
    downRef.current[p] = true;
    // promote the most up-to-date replica
    let best = candidates[0];
    for (const i of candidates) if (appliedRef.current[i] > appliedRef.current[best]) best = i;
    const lost = writesRef.current.length - appliedRef.current[best];
    if (lost > 0) {
      lostRef.current += lost;
      writesRef.current = writesRef.current.slice(0, appliedRef.current[best]); // unreplicated writes are gone
      setMissions((m) => (m.lost ? m : { ...m, lost: true }));
    } else if (modeRef.current === "active" || syncRef.current) {
      // durable failover: a live replica was promoted with zero lost writes
      setMissions((m) => (m.safe ? m : { ...m, safe: true }));
    }
    primaryRef.current = best;
    setSnap(buildSnapshot(now));
  }, [replicaApplied, buildSnapshot]);

  const readFrom = useCallback((i: number) => {
    const now = performance.now();
    if (downRef.current[i]) return;
    const primarySeq = writesRef.current.length;
    const applied = primaryRef.current === i ? primarySeq : replicaApplied(i, now);
    const stale = applied < primarySeq;
    readsRef.current.push({ seq: readSeqRef.current++, node: NODE_LABELS[i], value: applied, stale });
    if (stale) setMissions((m) => (m.stale ? m : { ...m, stale: true }));
    setSnap(buildSnapshot(now));
  }, [replicaApplied, buildSnapshot]);

  // ── loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = Math.min(100, now - last);
      lastTsRef.current = now;

      if (runningRef.current && !downRef.current[primaryRef.current]) {
        spawnAccRef.current += (dt / 1000) * rateRef.current;
        while (spawnAccRef.current >= 1) {
          spawnAccRef.current -= 1;
          writeOnce(now);
        }
      }

      if (now - lastSnapRef.current >= 60) {
        lastSnapRef.current = now;
        setSnap(buildSnapshot(now));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [writeOnce, buildSnapshot]);

  const showSync = mode === "passive";
  const showLag = mode === "passive" && !sync;

  return (
    <LabShell
      icon="🔁"
      title={{ en: "Replication Lab", ar: "مختبر النسخ المتماثل" }}
      difficulty="Advanced"
      intro={{
        en: "The problem: if your data lives on one machine, a single disk failure wipes it out, and that one box has to serve every read. The fix is replication: keep copies on several nodes. But copies drift — writes hit the primary first and reach the replicas a moment later. That gap is where stale reads and lost writes hide. Run the three experiments below to feel the consistency-vs-durability trade-off.",
        ar: "المشكلة: إذا بياناتك على جهاز واحد، عطل قرص واحد بيمحيها، وهداك الجهاز لحاله لازم يخدم كل القراءات. الحل النسخ المتماثل (replication): خلّي نسخ على كذا عقدة. بس النسخ بتتأخّر — الكتابة بتوصل الأساسي أول، وبعد لحظة بتوصل النسخ. هاي الفجوة هي مخبأ القراءات القديمة والكتابات المفقودة. جرّب التجارب الثلاث تحت لتحسّ بالمقايضة بين الاتساق والمتانة.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Catch a stale read", done: missions.stale },
          { label: "Lose a write on failover", done: missions.lost },
          { label: "Make failover safe", done: missions.safe },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-5 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.mode)}</span>
          <div className="flex gap-1.5">
            {(["passive", "active"] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", mode === m ? "bg-indigo-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")}>
                {m === "active" ? tr(L.active) : tr(L.passive)}
              </button>
            ))}
          </div>
        </div>

        {showSync && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">&nbsp;</span>
            <div className="flex gap-1.5">
              {[false, true].map((s) => (
                <button key={String(s)} type="button" onClick={() => setSync(s)} className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", sync === s ? "bg-cyan-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")}>
                  {s ? tr(L.sync) : tr(L.async)}
                </button>
              ))}
            </div>
          </div>
        )}

        {showLag && (
          <label className="flex min-w-40 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(L.lag)}: <b className="text-slate-700 dark:text-slate-200">{(lag / 1000).toFixed(1)}s</b>
            <input type="range" min={200} max={4000} step={100} value={lag} onChange={(e) => setLag(Number(e.target.value))} className="accent-amber-500" />
          </label>
        )}

        <label className="flex min-w-36 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tr(L.rate)}: <b className="text-slate-700 dark:text-slate-200">{rate.toFixed(1)}</b>
          <input type="range" min={0.5} max={8} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-indigo-500" />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRunning((r) => !r)} className={["rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors", running ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"].join(" ")}>
            {running ? `⏸ ${tr(L.pause)}` : `▶ ${tr(L.auto)}`}
          </button>
          <button type="button" onClick={() => { writeOnce(performance.now()); setSnap(buildSnapshot(performance.now())); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            {tr(L.write)}
          </button>
          <button type="button" onClick={killPrimary} className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400">
            💥 {tr(L.killPrimary)}
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
        </div>
      </div>

      <TryIt
        items={[
          <>Keep <b>{tr(L.passive)}</b> + <b>{tr(L.async)}</b>, press <b>▶ {tr(L.auto)}</b> to start writes, then hit <b>📖 {tr(L.read)}</b> on a node that&apos;s <i>{tr(L.behind)}</i> — you&apos;ll get <b>{tr(L.stale)}</b> data.</>,
          <>While replicas are still catching up, press <b>💥 {tr(L.killPrimary)}</b> and watch <b>{tr(L.lost)}</b> climb above zero.</>,
          <>Now switch to <b>{tr(L.sync)}</b> (or <b>{tr(L.active)}</b> mode), repeat the kill, and see nothing is lost.</>,
        ]}
      />

      {/* ── Nodes ────────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snap.nodes.map((node, i) => {
          const fresh = node.behind === 0 && !node.down;
          return (
            <div
              key={node.label}
              className={[
                "flex flex-col gap-2 rounded-xl border p-4 transition-all",
                node.down
                  ? "border-rose-400/40 bg-rose-500/5 opacity-70"
                  : node.isPrimary
                    ? "border-indigo-400/50 bg-indigo-500/5"
                    : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{tr(L.node)} {node.label}</span>
                <span className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  node.down ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : node.isPrimary ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                      : "bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400",
                ].join(" ")}>
                  {node.down ? tr(L.down) : node.isPrimary ? `👑 ${tr(L.primary)}` : tr(L.replica)}
                </span>
              </div>

              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                v{node.applied}
              </div>

              {!node.down && (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <div className={`h-full rounded-full transition-all ${fresh ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${snap.primarySeq ? (node.applied / snap.primarySeq) * 100 : 100}%` }} />
                  </div>
                  <span className={`text-[11px] ${fresh ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {node.isPrimary || fresh ? tr(L.upToDate) : `${tr(L.behind)} ${node.behind}`}
                  </span>
                  <button type="button" onClick={() => readFrom(i)} className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                    📖 {tr(L.read)}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Metrics ──────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{snap.totalWrites}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.writes)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">v{snap.primarySeq}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.primary)}</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-center ${snap.lostWrites > 0 ? "border-rose-400/50 bg-rose-500/10" : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]"}`}>
          <div className={`text-xl font-bold ${snap.lostWrites > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>{snap.lostWrites}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.lost)}</div>
        </div>
      </div>

      <Aha show={missions.lost}>
        Those writes existed on the primary but hadn&apos;t reached any replica yet. When the
        primary died, the most up-to-date replica was promoted — and everything past its
        version simply vanished. That&apos;s the price of <b>async</b> replication: fast writes,
        but a crash can lose the last few. <b>Sync</b> replication waits for a replica to ack
        before confirming, so a promoted replica always has the write — slower, but durable.
      </Aha>

      {/* ── Read log ─────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.readLog)}</h3>
        {snap.reads.length === 0 ? (
          <p className="text-sm text-slate-400">{tr(L.empty)}</p>
        ) : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {snap.reads.map((r) => (
              <li key={r.seq} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span>📖 {tr(L.node)} {r.node} → <b>v{r.value}</b></span>
                {r.stale
                  ? <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-600 dark:text-amber-400">{tr(L.stale)}</span>
                  : <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">{tr(L.fresh)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Aha show={missions.stale}>
        The replica answered with an older version than the primary — not a bug, just lag.
        The write simply hadn&apos;t arrived yet. This is <b>eventual consistency</b>: replicas
        converge to the right value <i>eventually</i>. It&apos;s fine for a like count, dangerous
        for a bank balance — which is why some reads are sent straight to the primary, or wait
        for sync replication.
      </Aha>

      {/* ── Explainer ────────────────────────────────────────── */}
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.explainer)}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {replicationInfo.map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{tr(c.title)}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{tr(c.body)}</p>
            </div>
          ))}
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
          {allDone ? "🎉 You've felt the consistency-vs-durability trade-off first-hand." : "Who decides which replica becomes the new primary?"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Here we just promoted the most up-to-date replica by hand. In reality the nodes have
          to <i>agree</i> on a new leader — without two of them both thinking they&apos;re primary
          (split-brain). That&apos;s a consensus problem. These continue the thread:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Raft Consensus",
              desc: "How a cluster elects one leader and keeps every replica's log identical — the real failover machinery.",
              href: "/labs/raft",
            },
            {
              fix: "Sharding",
              desc: "Replication keeps copies of a slice; sharding decides how data is sliced in the first place.",
              href: "/labs/sharding",
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
