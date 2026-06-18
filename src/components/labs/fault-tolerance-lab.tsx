"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import {
  backoffDelay,
  breakerStates,
  breakerStateInfo,
  patterns,
  type BreakerState,
} from "@/lib/labs/fault-tolerance";
import type { Localized } from "@/lib/types";

const HB_INTERVAL = 1300; // ms between heartbeats
const BASE_BACKOFF = 800; // ms
const CAP_BACKOFF = 8000; // ms

function latency() {
  return 250 + Math.random() * 300;
}

// ── lab-local bilingual strings ─────────────────────────────────────────
const L = {
  service: { en: "Service", ar: "الخدمة" },
  failRate: { en: "Failure rate", ar: "نسبة الفشل" },
  forceOutage: { en: "Force outage", ar: "إسقاط الخدمة" },
  restore: { en: "Restore", ar: "استعادة" },
  breaker: { en: "Breaker", ar: "القاطع" },
  threshold: { en: "Trip threshold", ar: "عتبة القطع" },
  cooldown: { en: "Cooldown", ar: "التهدئة" },
  retry: { en: "Retry", ar: "إعادة المحاولة" },
  maxRetries: { en: "Max retries", ar: "أقصى محاولات" },
  jitter: { en: "Jitter", ar: "تشويش" },
  on: { en: "On", ar: "مفعّل" },
  off: { en: "Off", ar: "متوقف" },
  traffic: { en: "Traffic", ar: "الترافيك" },
  rate: { en: "Requests / sec", ar: "طلبات/ثانية" },
  auto: { en: "Auto traffic", ar: "ترافيك تلقائي" },
  pause: { en: "Pause", ar: "إيقاف" },
  send1: { en: "Send 1", ar: "أرسل 1" },
  reset: { en: "Reset", ar: "إعادة" },
  consecFail: { en: "Consecutive failures", ar: "أعطال متتالية" },
  cooldownLeft: { en: "Cooldown", ar: "التهدئة" },
  // metrics
  total: { en: "Total", ar: "الإجمالي" },
  succeeded: { en: "Succeeded", ar: "نجحت" },
  failed: { en: "Failed", ar: "فشلت" },
  blocked: { en: "Fast-failed", ar: "محجوبة" },
  fallback: { en: "Fallbacks", ar: "بدائل" },
  retries: { en: "Retries", ar: "محاولات" },
  heartbeat: { en: "Heartbeat monitor", ar: "مراقب النبض" },
  healthy: { en: "HEALTHY", ar: "سليمة" },
  unhealthy: { en: "UNHEALTHY", ar: "غير سليمة" },
  log: { en: "Event log", ar: "سجل الأحداث" },
  empty: { en: "No events yet — hit play or “Send 1”.", ar: "لا أحداث بعد — شغّل أو اضغط «أرسل 1»." },
  patterns: { en: "The patterns at work", ar: "الأنماط المستخدمة" },
} satisfies Record<string, Localized>;

// ── types ───────────────────────────────────────────────────────────────
type LogKind = "ok" | "fail" | "retry" | "fastfail" | "trip" | "halfopen" | "close" | "probefail";
interface LogEntry {
  seq: number;
  kind: LogKind;
  reqId?: number;
  attempts?: number;
  delayMs?: number;
  count?: number;
}
interface Metrics {
  total: number;
  succeeded: number;
  failed: number;
  fastFailed: number;
  fallback: number;
  retries: number;
}
interface Snapshot {
  state: BreakerState;
  consecutiveFailures: number;
  threshold: number;
  cooldownRemaining: number;
  cooldownMs: number;
  m: Metrics;
  beats: boolean[];
  health: "HEALTHY" | "UNHEALTHY";
  inFlight: number;
  log: LogEntry[];
}
interface Op {
  id: number;
  attempt: number; // 0-based retry index
  maxRetries: number;
  phase: "calling" | "backoff";
  at: number;
  probe: boolean;
  done?: boolean;
}

const DEFAULTS = {
  failureRate: 0.3,
  threshold: 4,
  cooldownMs: 5000,
  maxRetries: 2,
  jitter: true,
  rate: 4,
};

function initialSnapshot(): Snapshot {
  return {
    state: "CLOSED",
    consecutiveFailures: 0,
    threshold: DEFAULTS.threshold,
    cooldownRemaining: 0,
    cooldownMs: DEFAULTS.cooldownMs,
    m: { total: 0, succeeded: 0, failed: 0, fastFailed: 0, fallback: 0, retries: 0 },
    beats: [],
    health: "HEALTHY",
    inFlight: 0,
    log: [],
  };
}

const stateNodeClass: Record<BreakerState, { active: string; idle: string }> = {
  CLOSED: {
    active: "border-emerald-400 bg-emerald-500/10 text-emerald-600 ring-2 ring-emerald-400/40 dark:text-emerald-400",
    idle: "border-slate-200 text-slate-400 dark:border-white/10",
  },
  OPEN: {
    active: "border-rose-400 bg-rose-500/10 text-rose-600 ring-2 ring-rose-400/40 dark:text-rose-400",
    idle: "border-slate-200 text-slate-400 dark:border-white/10",
  },
  HALF_OPEN: {
    active: "border-amber-400 bg-amber-500/10 text-amber-600 ring-2 ring-amber-400/40 dark:text-amber-400",
    idle: "border-slate-200 text-slate-400 dark:border-white/10",
  },
};

export function FaultToleranceLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  // ── controls ───────────────────────────────────────────────────────
  const [failureRate, setFailureRate] = useState(DEFAULTS.failureRate);
  const [forcedDown, setForcedDown] = useState(false);
  const [threshold, setThreshold] = useState(DEFAULTS.threshold);
  const [cooldownMs, setCooldownMs] = useState(DEFAULTS.cooldownMs);
  const [maxRetries, setMaxRetries] = useState(DEFAULTS.maxRetries);
  const [jitter, setJitter] = useState(DEFAULTS.jitter);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [running, setRunning] = useState(false); // start paused — user presses ▶ when ready

  // ── gamification: walk the breaker through its lifecycle ────────────
  const [missions, setMissions] = useState({ tripped: false, protected: false, recovered: false });
  const allDone = missions.tripped && missions.protected && missions.recovered;
  // setState fns are stable, so this needs no deps and won't go stale
  const markMission = useCallback((key: "tripped" | "protected" | "recovered") => {
    setMissions((m) => (m[key] ? m : { ...m, [key]: true }));
  }, []);

  // mirror to refs for the loop
  const failureRateRef = useRef(failureRate);
  const forcedDownRef = useRef(forcedDown);
  const thresholdRef = useRef(threshold);
  const cooldownRef = useRef(cooldownMs);
  const maxRetriesRef = useRef(maxRetries);
  const jitterRef = useRef(jitter);
  const rateRef = useRef(rate);
  const runningRef = useRef(running);
  useEffect(() => void (failureRateRef.current = failureRate), [failureRate]);
  useEffect(() => void (forcedDownRef.current = forcedDown), [forcedDown]);
  useEffect(() => void (thresholdRef.current = threshold), [threshold]);
  useEffect(() => void (cooldownRef.current = cooldownMs), [cooldownMs]);
  useEffect(() => void (maxRetriesRef.current = maxRetries), [maxRetries]);
  useEffect(() => void (jitterRef.current = jitter), [jitter]);
  useEffect(() => void (rateRef.current = rate), [rate]);
  useEffect(() => void (runningRef.current = running), [running]);

  // ── sim state ──────────────────────────────────────────────────────
  const breakerRef = useRef({ state: "CLOSED" as BreakerState, consecutiveFailures: 0, openedAt: 0, halfOpenInFlight: false });
  const opsRef = useRef<Op[]>([]);
  const idRef = useRef(0);
  const seqRef = useRef(0);
  const mRef = useRef<Metrics>({ total: 0, succeeded: 0, failed: 0, fastFailed: 0, fallback: 0, retries: 0 });
  const beatsRef = useRef<boolean[]>([]);
  const healthRef = useRef<"HEALTHY" | "UNHEALTHY">("HEALTHY");
  const logRef = useRef<LogEntry[]>([]);
  const spawnAccRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastHbRef = useRef(0);
  const lastSnapRef = useRef(0);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  const pushLog = useCallback((e: Omit<LogEntry, "seq">) => {
    logRef.current.push({ ...e, seq: seqRef.current++ });
    if (logRef.current.length > 80) logRef.current = logRef.current.slice(-80);
  }, []);

  const buildSnapshot = useCallback((now: number): Snapshot => {
    const b = breakerRef.current;
    return {
      state: b.state,
      consecutiveFailures: b.consecutiveFailures,
      threshold: thresholdRef.current,
      cooldownRemaining: b.state === "OPEN" ? Math.max(0, cooldownRef.current - (now - b.openedAt)) : 0,
      cooldownMs: cooldownRef.current,
      m: { ...mRef.current },
      beats: [...beatsRef.current],
      health: healthRef.current,
      inFlight: opsRef.current.length,
      log: logRef.current.slice(-10).reverse(),
    };
  }, []);

  const successProb = () => (forcedDownRef.current ? 0 : 1 - failureRateRef.current);

  const dispatchOne = useCallback(
    (now: number) => {
      const b = breakerRef.current;
      const m = mRef.current;
      m.total++;
      const id = idRef.current++;

      if (b.state === "OPEN") {
        m.fastFailed++;
        m.fallback++;
        pushLog({ kind: "fastfail", reqId: id });
        return;
      }
      if (b.state === "HALF_OPEN") {
        if (b.halfOpenInFlight) {
          m.fastFailed++;
          m.fallback++;
          pushLog({ kind: "fastfail", reqId: id });
          return;
        }
        b.halfOpenInFlight = true;
        opsRef.current.push({ id, attempt: 0, maxRetries: 0, phase: "calling", at: now + latency(), probe: true });
        return;
      }
      // CLOSED
      opsRef.current.push({ id, attempt: 0, maxRetries: maxRetriesRef.current, phase: "calling", at: now + latency(), probe: false });
    },
    [pushLog],
  );

  const reset = useCallback(() => {
    breakerRef.current = { state: "CLOSED", consecutiveFailures: 0, openedAt: 0, halfOpenInFlight: false };
    opsRef.current = [];
    idRef.current = 0;
    seqRef.current = 0;
    mRef.current = { total: 0, succeeded: 0, failed: 0, fastFailed: 0, fallback: 0, retries: 0 };
    beatsRef.current = [];
    healthRef.current = "HEALTHY";
    logRef.current = [];
    spawnAccRef.current = 0;
    setSnap(buildSnapshot(performance.now()));
  }, [buildSnapshot]);

  // ── simulation loop ────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = Math.min(100, now - last);
      lastTsRef.current = now;
      const b = breakerRef.current;
      const m = mRef.current;

      // OPEN -> HALF_OPEN once cooldown elapsed (time-based, even with no traffic)
      if (b.state === "OPEN" && now - b.openedAt >= cooldownRef.current) {
        b.state = "HALF_OPEN";
        b.halfOpenInFlight = false;
        pushLog({ kind: "halfopen" });
      }

      // generate traffic
      if (runningRef.current) {
        spawnAccRef.current += (dt / 1000) * rateRef.current;
        while (spawnAccRef.current >= 1) {
          spawnAccRef.current -= 1;
          dispatchOne(now);
        }
      }

      // advance ops
      let changed = false;
      for (const op of opsRef.current) {
        if (op.done) continue;
        if (op.phase === "calling" && now >= op.at) {
          changed = true;
          const ok = Math.random() < successProb();
          if (ok) {
            b.consecutiveFailures = 0;
            m.succeeded++;
            if (op.probe) {
              b.state = "CLOSED";
              b.halfOpenInFlight = false;
              pushLog({ kind: "close" });
              markMission("recovered");
            }
            pushLog({ kind: "ok", reqId: op.id, attempts: op.attempt + 1 });
            op.done = true;
          } else {
            b.consecutiveFailures++;
            if (op.probe) {
              b.state = "OPEN";
              b.openedAt = now;
              b.halfOpenInFlight = false;
              m.failed++;
              pushLog({ kind: "probefail", reqId: op.id });
              op.done = true;
            } else {
              if (b.state === "CLOSED" && b.consecutiveFailures >= thresholdRef.current) {
                b.state = "OPEN";
                b.openedAt = now;
                pushLog({ kind: "trip", count: b.consecutiveFailures });
              }
              if (op.attempt < op.maxRetries && b.state !== "OPEN") {
                const delay = backoffDelay(op.attempt, BASE_BACKOFF, CAP_BACKOFF, jitterRef.current);
                op.attempt++;
                op.phase = "backoff";
                op.at = now + delay;
                m.retries++;
                pushLog({ kind: "retry", reqId: op.id, delayMs: delay });
              } else {
                m.failed++;
                m.fallback++;
                pushLog({ kind: "fail", reqId: op.id, attempts: op.attempt + 1 });
                op.done = true;
              }
            }
          }
        } else if (op.phase === "backoff" && now >= op.at) {
          changed = true;
          if (b.state === "OPEN") {
            m.fastFailed++;
            m.fallback++;
            pushLog({ kind: "fastfail", reqId: op.id });
            op.done = true;
          } else {
            op.phase = "calling";
            op.at = now + latency();
          }
        }
      }
      if (changed) opsRef.current = opsRef.current.filter((o) => !o.done);

      // heartbeat
      if (now - lastHbRef.current >= HB_INTERVAL) {
        lastHbRef.current = now;
        const ok = Math.random() < successProb();
        beatsRef.current.push(ok);
        if (beatsRef.current.length > 14) beatsRef.current.shift();
        const last3 = beatsRef.current.slice(-3);
        const fails = last3.filter((x) => !x).length;
        healthRef.current = fails >= 2 ? "UNHEALTHY" : "HEALTHY";
      }

      // gamification progress (gated — setMissions bails out when unchanged)
      if (b.state !== "CLOSED") markMission("tripped");
      if (m.fastFailed > 0) markMission("protected");

      const busy = runningRef.current || opsRef.current.length > 0 || b.state !== "CLOSED";
      if (busy && now - lastSnapRef.current >= 55) {
        lastSnapRef.current = now;
        setSnap(buildSnapshot(now));
      } else if (now - lastSnapRef.current >= 250) {
        // keep heartbeat strip & countdown fresh even when idle
        lastSnapRef.current = now;
        setSnap(buildSnapshot(now));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dispatchOne, buildSnapshot, pushLog, markMission]);

  const sendOne = () => {
    dispatchOne(performance.now());
    setSnap(buildSnapshot(performance.now()));
  };

  const metricCards = [
    { label: L.total, value: snap.m.total, accent: "text-slate-900 dark:text-white" },
    { label: L.succeeded, value: snap.m.succeeded, accent: "text-emerald-600 dark:text-emerald-400" },
    { label: L.failed, value: snap.m.failed, accent: "text-rose-600 dark:text-rose-400" },
    { label: L.blocked, value: snap.m.fastFailed, accent: "text-amber-600 dark:text-amber-400" },
    { label: L.fallback, value: snap.m.fallback, accent: "text-cyan-600 dark:text-cyan-400" },
    { label: L.retries, value: snap.m.retries, accent: "text-indigo-600 dark:text-indigo-400" },
  ];

  const cooldownPct = snap.cooldownMs ? (snap.cooldownRemaining / snap.cooldownMs) * 100 : 0;
  const failPct = snap.threshold ? Math.min(100, (snap.consecutiveFailures / snap.threshold) * 100) : 0;

  return (
    <LabShell
      icon="🛡️"
      title={{ en: "Fault Tolerance Console", ar: "لوحة تحمّل الأعطال" }}
      difficulty="Intermediate"
      intro={{
        en: "The problem: a downstream service starts failing. If you keep hammering it, timeouts pile up and the failure spreads to your whole app — a cascading failure. The fix is a circuit breaker: after enough failures it trips OPEN and instantly fast-fails to a fallback, giving the service room to breathe, then carefully tests it (HALF-OPEN) before trusting it again. Run the three experiments below to take it through the full cycle.",
        ar: "المشكلة: خدمة تعتمد عليها بدأت تفشل. إذا ضليت تضربها بالطلبات، بتتكدّس المهلات وبينتشر الفشل لكل تطبيقك — فشل متسلسل (cascading). الحل قاطع الدارة (circuit breaker): بعد عدد كافٍ من الأعطال بيقفز لـ «مفتوح» ويفشل الطلبات فوراً نحو بديل، فبيعطي الخدمة فرصة تتنفّس، وبعدين بيجرّبها بحذر (نصف مفتوح) قبل ما يثق فيها من جديد. جرّب التجارب الثلاث تحت لتمشّيه بالدورة كاملة.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Trip the breaker", done: missions.tripped },
          { label: "Fast-fail to fallback", done: missions.protected },
          { label: "Recover (HALF-OPEN → CLOSED)", done: missions.recovered },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10 dark:bg-white/[0.03]">
        {/* service */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr(L.service)}</span>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(L.failRate)}: <b className="text-slate-700 dark:text-slate-200">{Math.round(failureRate * 100)}%</b>
            <input type="range" min={0} max={100} value={Math.round(failureRate * 100)} onChange={(e) => setFailureRate(Number(e.target.value) / 100)} className="accent-rose-500" />
          </label>
          <button
            type="button"
            onClick={() => setForcedDown((v) => !v)}
            className={["rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", forcedDown ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"].join(" ")}
          >
            {forcedDown ? `✓ ${tr(L.restore)}` : `✕ ${tr(L.forceOutage)}`}
          </button>
        </div>

        {/* breaker */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr(L.breaker)}</span>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(L.threshold)}: <b className="text-slate-700 dark:text-slate-200">{threshold}</b>
            <input type="range" min={2} max={8} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="accent-indigo-500" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(L.cooldown)}: <b className="text-slate-700 dark:text-slate-200">{(cooldownMs / 1000).toFixed(0)}s</b>
            <input type="range" min={2} max={10} value={cooldownMs / 1000} onChange={(e) => setCooldownMs(Number(e.target.value) * 1000)} className="accent-indigo-500" />
          </label>
        </div>

        {/* retry */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr(L.retry)}</span>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(L.maxRetries)}: <b className="text-slate-700 dark:text-slate-200">{maxRetries}</b>
            <input type="range" min={0} max={5} value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className="accent-indigo-500" />
          </label>
          <button
            type="button"
            onClick={() => setJitter((v) => !v)}
            className={["rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", jitter ? "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400" : "bg-slate-200/60 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400"].join(" ")}
          >
            {tr(L.jitter)}: {jitter ? tr(L.on) : tr(L.off)}
          </button>
        </div>

        {/* traffic */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr(L.traffic)}</span>
          <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
            {tr(L.rate)}: <b className="text-slate-700 dark:text-slate-200">{rate}</b>
            <input type="range" min={1} max={20} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-indigo-500" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setRunning((r) => !r)} className={["rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors", running ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"].join(" ")}>
              {running ? `⏸ ${tr(L.pause)}` : `▶ ${tr(L.auto)}`}
            </button>
            <button type="button" onClick={sendOne} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
              {tr(L.send1)}
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">
              ↺
            </button>
          </div>
        </div>
      </div>

      <TryIt
        items={[
          <>Press <b>▶ {tr(L.auto)}</b> to start traffic, then <b>✕ {tr(L.forceOutage)}</b> (or drag <b>{tr(L.failRate)}</b> up high) and watch failures stack until the breaker flips to <b>OPEN</b>.</>,
          <>While it&apos;s OPEN, notice new calls are <b>{tr(L.blocked)}</b> instantly — no waiting on the dead service.</>,
          <>Press <b>✓ {tr(L.restore)}</b> and wait out the cooldown — the breaker probes once (HALF-OPEN) and closes again.</>,
        ]}
      />

      {/* ── Breaker state machine ────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {breakerStates.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 sm:gap-4">
              <div
                className={[
                  "flex min-w-28 flex-col items-center gap-0.5 rounded-xl border px-4 py-3 text-center transition-all duration-300",
                  snap.state === s.id ? stateNodeClass[s.id].active + " scale-105" : stateNodeClass[s.id].idle,
                ].join(" ")}
              >
                <span className="text-sm font-bold">{tr(s.label)}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">{s.id}</span>
              </div>
              {i < breakerStates.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
            </div>
          ))}
        </div>

        {/* state detail */}
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-600 dark:text-slate-400">
          {tr(breakerStateInfo(snap.state).desc)}
        </p>

        {/* meters */}
        <div className="mx-auto mt-4 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{tr(L.consecFail)}</span>
              <span className="tabular-nums">{snap.consecutiveFailures}/{snap.threshold}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${failPct}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{tr(L.cooldownLeft)}</span>
              <span className="tabular-nums">{snap.state === "OPEN" ? `${(snap.cooldownRemaining / 1000).toFixed(1)}s` : "—"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${cooldownPct}%` }} />
            </div>
          </div>
        </div>

        <Aha show={missions.tripped}>
          Once consecutive failures hit the threshold, the breaker tripped to <b>OPEN</b>.
          From now on it stops calling the broken service at all — instead of waiting for
          each call to time out, it <i>fast-fails</i> straight to a fallback. That&apos;s what
          stops one sick service from dragging your whole app down.
        </Aha>
        <Aha show={missions.recovered}>
          After the cooldown the breaker didn&apos;t blindly trust the service again — it went
          <b> HALF-OPEN</b> and let a single trial call through. That probe succeeded, so it
          closed and resumed normal traffic. If the probe had failed, it would have snapped
          back to OPEN and waited another cooldown. That cautious retry is the whole trick.
        </Aha>
      </div>

      {/* ── Heartbeat ────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">💓 {tr(L.heartbeat)}</span>
          <div className="flex items-center gap-1">
            {snap.beats.length === 0
              ? <span className="text-xs text-slate-400">—</span>
              : snap.beats.map((ok, i) => (
                  <span key={i} className={["h-3 w-3 rounded-full", ok ? "bg-emerald-500" : "bg-rose-500", i === snap.beats.length - 1 ? "ring-2 ring-offset-1 ring-offset-transparent " + (ok ? "ring-emerald-300" : "ring-rose-300") : ""].join(" ")} />
                ))}
          </div>
        </div>
        <span className={["rounded-full px-3 py-1 text-xs font-bold", snap.health === "HEALTHY" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"].join(" ")}>
          {snap.health === "HEALTHY" ? `✓ ${tr(L.healthy)}` : `✕ ${tr(L.unhealthy)}`}
        </span>
      </div>

      {/* ── Metrics ──────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((m) => (
          <div key={tr(m.label)} className="rounded-xl border border-slate-200 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <div className={`text-xl font-bold ${m.accent}`}>{m.value}</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{tr(m.label)}</div>
          </div>
        ))}
      </div>

      {/* ── Event log ────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.log)}</h3>
        {snap.log.length === 0 ? (
          <p className="text-sm text-slate-400">{tr(L.empty)}</p>
        ) : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {snap.log.map((e) => (
              <li key={e.seq} className="text-slate-600 dark:text-slate-300">
                {e.kind === "ok" && <span className="text-emerald-600 dark:text-emerald-400">#{e.reqId} ✓ {lang === "ar" ? "نجح" : "succeeded"}{e.attempts && e.attempts > 1 ? ` (${e.attempts} ${lang === "ar" ? "محاولات" : "tries"})` : ""}</span>}
                {e.kind === "fail" && <span className="text-rose-500">#{e.reqId} ✕ {lang === "ar" ? "فشل → بديل" : "failed → fallback"}</span>}
                {e.kind === "retry" && <span className="text-indigo-500">#{e.reqId} ↻ {lang === "ar" ? "إعادة بعد" : "retry in"} {((e.delayMs ?? 0) / 1000).toFixed(1)}s</span>}
                {e.kind === "fastfail" && <span className="text-amber-500">#{e.reqId} ⚡ {lang === "ar" ? "محجوب (القاطع مفتوح) → بديل" : "blocked (circuit open) → fallback"}</span>}
                {e.kind === "trip" && <span className="font-bold text-rose-500">⚠ {lang === "ar" ? "القاطع → مفتوح" : "circuit → OPEN"} ({e.count} {lang === "ar" ? "أعطال متتالية" : "consecutive failures"})</span>}
                {e.kind === "halfopen" && <span className="text-amber-500">… {lang === "ar" ? "انتهت التهدئة → نصف مفتوح (تجربة)" : "cooldown elapsed → HALF-OPEN (trial)"}</span>}
                {e.kind === "close" && <span className="font-bold text-emerald-500">✓ {lang === "ar" ? "نجحت التجربة → مغلق" : "trial succeeded → CLOSED"}</span>}
                {e.kind === "probefail" && <span className="font-bold text-rose-500">✕ {lang === "ar" ? "فشلت التجربة → مفتوح" : "trial failed → OPEN"}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Patterns explainer ───────────────────────────────── */}
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.patterns)}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {patterns.map((p) => (
            <div key={p.key} className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{tr(p.title)}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{tr(p.body)}</p>
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
          {allDone ? "🎉 You drove the breaker through its whole cycle." : "Surviving one failure isn't the whole story"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          A circuit breaker protects <i>one</i> call to <i>one</i> service. But a real request
          often touches many services in a row — and you need a plan for when step 3 of 5
          fails after the first two already changed data. These pick up from here:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Saga",
              desc: "When a multi-step workflow fails halfway, undo the completed steps with compensating actions.",
              href: "/labs/saga",
            },
            {
              fix: "The Three Horsemen",
              desc: "This module is the direct answer to the 'partial failure' horseman from the intro — revisit it.",
              href: "/labs/three-horsemen",
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
