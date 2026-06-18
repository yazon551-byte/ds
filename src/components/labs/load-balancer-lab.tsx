"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import {
  avgLatency,
  chooseServer,
  defaultServers,
  processingTime,
  strategies,
  strategyInfo,
  type ChooseContext,
  type ServerSim,
  type StrategyId,
} from "@/lib/labs/load-balancing";
import type { Localized } from "@/lib/types";

const OVERLAY_H = 52; // px height of the packet travel area

// ── lab-local bilingual strings ─────────────────────────────────────────
const L = {
  strategy: { en: "Strategy", ar: "الخوارزمية" },
  rate: { en: "Requests / sec", ar: "طلبات/ثانية" },
  auto: { en: "Auto traffic", ar: "ترافيك تلقائي" },
  pause: { en: "Pause", ar: "إيقاف" },
  send1: { en: "Send 1", ar: "أرسل 1" },
  burst: { en: "Burst +20", ar: "دفعة +20" },
  reset: { en: "Reset", ar: "إعادة" },
  total: { en: "Total", ar: "الإجمالي" },
  completed: { en: "Completed", ar: "مكتملة" },
  dropped: { en: "Dropped", ar: "مفقودة" },
  inflight: { en: "In-flight", ar: "قيد التنفيذ" },
  latency: { en: "Avg latency", ar: "متوسط الزمن" },
  throughput: { en: "Throughput", ar: "الإنتاجية" },
  distribution: { en: "Request distribution", ar: "توزيع الطلبات" },
  howItWorks: { en: "How it works", ar: "كيف يعمل" },
  pros: { en: "Strengths", ar: "النقاط القوية" },
  cons: { en: "Trade-offs", ar: "المقايضات" },
  log: { en: "Routing log", ar: "سجل التوجيه" },
  empty: { en: "No requests yet — hit play or “Send 1”.", ar: "لا طلبات بعد — شغّل أو اضغط «أرسل 1»." },
  kill: { en: "Kill", ar: "إيقاف" },
  revive: { en: "Revive", ar: "تشغيل" },
  down: { en: "DOWN", ar: "متوقف" },
  activeLbl: { en: "active", ar: "نشطة" },
  handledLbl: { en: "handled", ar: "مُنجزة" },
  recentLbl: { en: "recent", ar: "حديث" },
  reqs: { en: "req/s", ar: "ط/ث" },
  lb: { en: "Load Balancer", ar: "موازِن الأحمال" },
  // log kinds
  arrow: { en: "→", ar: "←" },
  dropMsg: { en: "dropped — all servers down", ar: "مفقود — كل الخوادم متوقفة" },
  wentDown: { en: "went down", ar: "توقف" },
  recovered: { en: "recovered", ar: "تعافى" },
  lost: { en: "lost", ar: "مفقودة" },
} satisfies Record<string, Localized>;

// ── snapshot view types ─────────────────────────────────────────────────
interface ServerView {
  id: string;
  name: string;
  color: string;
  weight: number;
  active: number;
  capacity: number;
  handled: number;
  avg: number;
  ewma: number;
  down: boolean;
  sharePct: number;
}
interface PacketView {
  id: number;
  leftPct: number;
  topPx: number;
  color: string;
}
type LogKind = "route" | "drop" | "down" | "up";
interface LogEntry {
  seq: number;
  kind: LogKind;
  reqId?: number;
  server?: string;
  color?: string;
  lost?: number;
}
interface Snapshot {
  servers: ServerView[];
  packets: PacketView[];
  total: number;
  completed: number;
  dropped: number;
  inFlight: number;
  avg: number;
  throughput: number;
  log: LogEntry[];
}

interface Req {
  id: number;
  server: number;
  start: number;
  duration: number;
  done: boolean;
}

function loadColor(ratio: number): string {
  if (ratio >= 0.9) return "bg-rose-500";
  if (ratio >= 0.6) return "bg-amber-500";
  return "bg-emerald-500";
}

/** A fresh, zeroed snapshot for first render (does not read any refs). */
function initialSnapshot(): Snapshot {
  const servers = defaultServers();
  return {
    servers: servers.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      weight: s.weight,
      active: 0,
      capacity: s.capacity,
      handled: 0,
      avg: s.baseLatency,
      ewma: s.ewma,
      down: false,
      sharePct: 0,
    })),
    packets: [],
    total: 0,
    completed: 0,
    dropped: 0,
    inFlight: 0,
    avg: 0,
    throughput: 0,
    log: [],
  };
}

export function LoadBalancerLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  // ── controls (UI state) ────────────────────────────────────────────
  const [strategy, setStrategy] = useState<StrategyId>("round-robin");
  const [rate, setRate] = useState(8);
  const [running, setRunning] = useState(true);

  // mirror controls into refs for the animation loop
  const strategyRef = useRef(strategy);
  const rateRef = useRef(rate);
  const runningRef = useRef(running);
  useEffect(() => void (strategyRef.current = strategy), [strategy]);
  useEffect(() => void (rateRef.current = rate), [rate]);
  useEffect(() => void (runningRef.current = running), [running]);

  // ── simulation state (refs, mutated by the loop) ───────────────────
  const serversRef = useRef<ServerSim[]>(defaultServers());
  const requestsRef = useRef<Req[]>([]);
  const ctxRef = useRef<ChooseContext>({ rrPointer: -1 });
  const idRef = useRef(0);
  const seqRef = useRef(0);
  const totalRef = useRef(0);
  const completedRef = useRef(0);
  const droppedRef = useRef(0);
  const completionsRef = useRef<number[]>([]);
  const logRef = useRef<LogEntry[]>([]);
  const spawnAccRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastSnapRef = useRef(0);

  const buildSnapshot = useCallback((now: number): Snapshot => {
    const servers = serversRef.current;
    const n = servers.length;
    const completed = completedRef.current;

    const serverViews: ServerView[] = servers.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      weight: s.weight,
      active: s.active,
      capacity: s.capacity,
      handled: s.handled,
      avg: avgLatency(s),
      ewma: s.ewma,
      down: s.down,
      sharePct: completed ? (s.handled / completed) * 100 : 0,
    }));

    const packets: PacketView[] = [];
    for (const r of requestsRef.current) {
      const travelMs = Math.min(380, r.duration);
      const p = (now - r.start) / travelMs;
      if (p >= 0 && p < 1) {
        const targetX = ((r.server + 0.5) / n) * 100;
        packets.push({
          id: r.id,
          leftPct: 50 + (targetX - 50) * p,
          topPx: p * OVERLAY_H,
          color: servers[r.server].color,
        });
      }
    }

    let latencySum = 0;
    for (const s of servers) latencySum += s.latencySum;

    return {
      servers: serverViews,
      packets,
      total: totalRef.current,
      completed,
      dropped: droppedRef.current,
      inFlight: requestsRef.current.length,
      avg: completed ? latencySum / completed : 0,
      throughput: completionsRef.current.length,
      log: logRef.current.slice(-9).reverse(),
    };
  }, []);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  const pushLog = useCallback((e: Omit<LogEntry, "seq">) => {
    logRef.current.push({ ...e, seq: seqRef.current++ });
    if (logRef.current.length > 60) logRef.current = logRef.current.slice(-60);
  }, []);

  const dispatchOne = useCallback(
    (now: number) => {
      const servers = serversRef.current;
      const idx = chooseServer(strategyRef.current, servers, ctxRef.current);
      totalRef.current++;
      const id = idRef.current++;
      if (idx < 0) {
        droppedRef.current++;
        pushLog({ kind: "drop", reqId: id });
        return;
      }
      const s = servers[idx];
      const duration = processingTime(s);
      s.active++;
      requestsRef.current.push({ id, server: idx, start: now, duration, done: false });
      pushLog({ kind: "route", reqId: id, server: s.name, color: s.color });
    },
    [pushLog],
  );

  const dispatchMany = useCallback(
    (count: number) => {
      const now = performance.now();
      for (let i = 0; i < count; i++) dispatchOne(now);
      setSnap(buildSnapshot(now));
    },
    [dispatchOne, buildSnapshot],
  );

  const toggleServer = useCallback(
    (index: number) => {
      const s = serversRef.current[index];
      if (!s.down) {
        // crash: drop in-flight requests on this server
        const lost = requestsRef.current.filter((r) => r.server === index).length;
        requestsRef.current = requestsRef.current.filter((r) => r.server !== index);
        s.down = true;
        s.active = 0;
        pushLog({ kind: "down", server: s.name, color: s.color, lost });
      } else {
        s.down = false;
        s.ewma = s.baseLatency;
        s.currentWeight = 0;
        pushLog({ kind: "up", server: s.name, color: s.color });
      }
      setSnap(buildSnapshot(performance.now()));
    },
    [pushLog, buildSnapshot],
  );

  const reset = useCallback(() => {
    serversRef.current = defaultServers();
    requestsRef.current = [];
    ctxRef.current = { rrPointer: -1 };
    idRef.current = 0;
    seqRef.current = 0;
    totalRef.current = 0;
    completedRef.current = 0;
    droppedRef.current = 0;
    completionsRef.current = [];
    logRef.current = [];
    spawnAccRef.current = 0;
    setSnap(buildSnapshot(performance.now()));
  }, [buildSnapshot]);

  // ── animation / simulation loop ────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = Math.min(100, now - last);
      lastTsRef.current = now;

      if (runningRef.current) {
        spawnAccRef.current += (dt / 1000) * rateRef.current;
        while (spawnAccRef.current >= 1) {
          spawnAccRef.current -= 1;
          dispatchOne(now);
        }
      }

      const reqs = requestsRef.current;
      let anyDone = false;
      for (const r of reqs) {
        if (!r.done && now >= r.start + r.duration) {
          r.done = true;
          anyDone = true;
          const s = serversRef.current[r.server];
          s.active = Math.max(0, s.active - 1);
          s.handled++;
          s.latencySum += r.duration;
          s.ewma = s.ewma === 0 ? r.duration : 0.3 * r.duration + 0.7 * s.ewma;
          completedRef.current++;
          completionsRef.current.push(now);
        }
      }
      if (anyDone) requestsRef.current = reqs.filter((r) => !r.done);

      const cutoff = now - 1000;
      if (completionsRef.current.length)
        completionsRef.current = completionsRef.current.filter((t) => t >= cutoff);

      // Only re-render while something is actually happening (avoids burning
      // frames when paused and idle). Manual actions update the snapshot directly.
      const busy = runningRef.current || requestsRef.current.length > 0;
      if (busy && now - lastSnapRef.current >= 55) {
        lastSnapRef.current = now;
        setSnap(buildSnapshot(now));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dispatchOne, buildSnapshot]);

  const info = useMemo(() => strategyInfo(strategy), [strategy]);
  const n = snap.servers.length;

  const metricCards = [
    { label: L.total, value: snap.total, accent: "text-slate-900 dark:text-white" },
    { label: L.completed, value: snap.completed, accent: "text-emerald-600 dark:text-emerald-400" },
    { label: L.inflight, value: snap.inFlight, accent: "text-indigo-600 dark:text-indigo-400" },
    { label: L.dropped, value: snap.dropped, accent: "text-rose-600 dark:text-rose-400" },
    { label: L.latency, value: `${Math.round(snap.avg)}ms`, accent: "text-amber-600 dark:text-amber-400" },
    { label: L.throughput, value: `${snap.throughput} ${tr(L.reqs)}`, accent: "text-cyan-600 dark:text-cyan-400" },
  ];

  return (
    <LabShell
      icon="⚖️"
      title={{ en: "Load Balancer Lab", ar: "مختبر موازنة الأحمال" }}
      difficulty="Intermediate"
      intro={{
        en: "Pick a routing strategy, fire traffic, and watch requests get distributed across servers in real time. Kill a server to see the balancer react, and compare how each algorithm spreads the load.",
        ar: "اختر خوارزمية توجيه، أطلق الترافيك، وشاهد توزيع الطلبات على الخوادم لحظياً. أوقف خادماً لترى كيف يتفاعل الموازِن، وقارن كيف توزّع كل خوارزمية الحِمل.",
      }}
    >
      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {tr(L.strategy)}
          </span>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as StrategyId)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-[#0d1322] dark:text-slate-100"
          >
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {tr(s.name)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-44 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {tr(L.rate)}: <span className="font-semibold text-slate-700 dark:text-slate-200">{rate}</span>
          </span>
          <input
            type="range"
            min={1}
            max={40}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="accent-indigo-500"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
              running ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600",
            ].join(" ")}
          >
            {running ? `⏸ ${tr(L.pause)}` : `▶ ${tr(L.auto)}`}
          </button>
          <button
            type="button"
            onClick={() => dispatchMany(1)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {tr(L.send1)}
          </button>
          <button
            type="button"
            onClick={() => dispatchMany(20)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {tr(L.burst)}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
          >
            ↺ {tr(L.reset)}
          </button>
        </div>
      </div>

      {/* ── Visualization ────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        {/* LB node */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25">
            <span>⚖️</span> {tr(L.lb)}
          </div>
        </div>

        {/* packet travel overlay */}
        <div className="relative mx-auto" style={{ height: OVERLAY_H }}>
          {snap.packets.map((p) => (
            <span
              key={p.id}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 rounded-full"
              style={{
                left: `${p.leftPct}%`,
                top: p.topPx,
                background: p.color,
                boxShadow: `0 0 8px ${p.color}`,
              }}
            />
          ))}
        </div>

        {/* server grid */}
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {snap.servers.map((s, i) => {
            const ratio = s.capacity ? s.active / s.capacity : 0;
            const fillPct = Math.min(100, ratio * 100);
            return (
              <div
                key={s.id}
                className={[
                  "relative flex flex-col gap-2 rounded-xl border p-3 transition-all",
                  s.down
                    ? "border-rose-400/40 bg-rose-500/5 opacity-70"
                    : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]",
                ].join(" ")}
                style={
                  !s.down && s.active > 0
                    ? { boxShadow: `0 0 0 1px ${s.color}55, 0 8px 24px -12px ${s.color}` }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleServer(i)}
                    className={[
                      "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors",
                      s.down
                        ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
                    ].join(" ")}
                  >
                    {s.down ? tr(L.revive) : tr(L.kill)}
                  </button>
                </div>

                {/* load bar */}
                <div className="h-20 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                  <div className="flex h-full flex-col justify-end">
                    <div
                      className={`${loadColor(ratio)} transition-all duration-200`}
                      style={{ height: `${fillPct}%` }}
                    />
                  </div>
                </div>

                {s.down ? (
                  <span className="text-center text-xs font-bold tracking-wider text-rose-500">
                    ✕ {tr(L.down)}
                  </span>
                ) : (
                  <div className="grid grid-cols-2 gap-x-2 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                    <span>
                      <b className="text-slate-800 dark:text-slate-200">{s.active}</b>/{s.capacity} {tr(L.activeLbl)}
                    </span>
                    <span className="text-right">
                      <b className="text-slate-800 dark:text-slate-200">{s.handled}</b> {tr(L.handledLbl)}
                    </span>
                    <span>w={s.weight}</span>
                    <span className="text-right">
                      {Math.round(s.ewma)}ms {tr(L.recentLbl)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Metrics ──────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((m) => (
          <div
            key={tr(m.label)}
            className="rounded-xl border border-slate-200 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className={`text-xl font-bold ${m.accent}`}>{m.value}</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {tr(m.label)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Distribution + Strategy explainer ───────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {tr(L.distribution)}
          </h3>
          <div className="flex flex-col gap-3">
            {snap.servers.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {s.name}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${s.sharePct}%`, background: s.color }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {Math.round(s.sharePct)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            {tr(info.name)}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr(info.short)}</p>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {tr(L.howItWorks)}
              </dt>
              <dd className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                {tr(info.how)}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-emerald-500/5 p-3">
                <dt className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ {tr(L.pros)}
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {tr(info.pro)}
                </dd>
              </div>
              <div className="rounded-lg bg-amber-500/5 p-3">
                <dt className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  ⚠ {tr(L.cons)}
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {tr(info.con)}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Routing log ──────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {tr(L.log)}
        </h3>
        {snap.log.length === 0 ? (
          <p className="text-sm text-slate-400">{tr(L.empty)}</p>
        ) : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {snap.log.map((e) => (
              <li key={e.seq} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                {e.kind === "route" && (
                  <>
                    <span className="text-slate-400">#{e.reqId}</span>
                    <span className="text-slate-400">{tr(L.arrow)}</span>
                    <span className="flex items-center gap-1 font-semibold" style={{ color: e.color }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                      {e.server}
                    </span>
                  </>
                )}
                {e.kind === "drop" && (
                  <span className="text-rose-500">
                    #{e.reqId} ✕ {tr(L.dropMsg)}
                  </span>
                )}
                {e.kind === "down" && (
                  <span className="text-rose-500">
                    ⚠ {e.server} {tr(L.wentDown)} — {e.lost} {tr(L.lost)}
                  </span>
                )}
                {e.kind === "up" && (
                  <span className="text-emerald-500">
                    ✓ {e.server} {tr(L.recovered)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </LabShell>
  );
}
