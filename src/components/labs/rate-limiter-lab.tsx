"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import type { Localized } from "@/lib/types";

type Algo = "token" | "leaky";

const L = {
  algo: { en: "Algorithm", ar: "الخوارزمية" },
  token: { en: "Token Bucket", ar: "دلو الرموز" },
  leaky: { en: "Leaky Bucket", ar: "الدلو المثقوب" },
  capacity: { en: "Capacity", ar: "السعة" },
  refill: { en: "Refill / sec", ar: "تعبئة/ثانية" },
  leak: { en: "Leak / sec", ar: "تسريب/ثانية" },
  reqRate: { en: "Requests / sec", ar: "طلبات/ثانية" },
  auto: { en: "Auto traffic", ar: "ترافيك تلقائي" },
  pause: { en: "Pause", ar: "إيقاف" },
  send1: { en: "Send 1", ar: "أرسل 1" },
  burst: { en: "Burst +12", ar: "دفعة +12" },
  reset: { en: "Reset", ar: "إعادة" },
  tokens: { en: "Tokens", ar: "الرموز" },
  inBucket: { en: "In bucket", ar: "في الدلو" },
  allowed: { en: "Allowed", ar: "مسموحة" },
  served: { en: "Served", ar: "مُخدَّمة" },
  rejected: { en: "Rejected (429)", ar: "مرفوضة (429)" },
  recent: { en: "Recent requests", ar: "الطلبات الأخيرة" },
  tokenHow: { en: "A bucket holds up to N tokens and refills steadily. Each request spends one token; no token left → HTTP 429. It permits short bursts (up to the bucket size).", ar: "دلو يحمل حتى N رمزاً ويُعبَّأ بثبات. كل طلب يصرف رمزاً؛ لا رمز → HTTP 429. يسمح بدفعات قصيرة (حتى حجم الدلو)." },
  leakyHow: { en: "Requests pour into a bucket and drain at a fixed rate (like a hole in the bottom). If the bucket overflows → HTTP 429. Output is perfectly smooth — no bursts pass through.", ar: "الطلبات تنصبّ في دلو وتُصرَّف بمعدّل ثابت (كثقب بالقاع). إن فاض الدلو → HTTP 429. الخرج ناعم تماماً — لا تمرّ دفعات." },
} satisfies Record<string, Localized>;

interface Snapshot {
  algo: Algo;
  level: number; // tokens (floored) or queue
  frac: number; // 0..1 for the bar
  capacity: number;
  allowed: number;
  rejected: number;
  recent: boolean[];
}

const DEFAULTS = { capacity: 8, rate: 3, reqRate: 5 };

function initialSnapshot(): Snapshot {
  return { algo: "token", level: DEFAULTS.capacity, frac: 1, capacity: DEFAULTS.capacity, allowed: 0, rejected: 0, recent: [] };
}

export function RateLimiterLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [algo, setAlgo] = useState<Algo>("token");
  const [capacity, setCapacity] = useState(DEFAULTS.capacity);
  const [rate, setRate] = useState(DEFAULTS.rate);
  const [reqRate, setReqRate] = useState(DEFAULTS.reqRate);
  const [running, setRunning] = useState(false); // start paused — user presses ▶ when ready

  // ── gamification: overflow the limiter and compare the two algorithms ─
  const [missions, setMissions] = useState({ rejected: false, burst: false, compared: false });
  const allDone = missions.rejected && missions.burst && missions.compared;

  const algoRef = useRef(algo);
  const capRef = useRef(capacity);
  const rateRef = useRef(rate);
  const reqRateRef = useRef(reqRate);
  const runningRef = useRef(running);
  useEffect(() => void (algoRef.current = algo), [algo]);
  useEffect(() => void (capRef.current = capacity), [capacity]);
  useEffect(() => void (rateRef.current = rate), [rate]);
  useEffect(() => void (reqRateRef.current = reqRate), [reqRate]);
  useEffect(() => void (runningRef.current = running), [running]);

  const tokensRef = useRef(DEFAULTS.capacity);
  const queueRef = useRef(0);
  const drainAccRef = useRef(0);
  const allowedRef = useRef(0);
  const rejectedRef = useRef(0);
  const recentRef = useRef<boolean[]>([]);
  const spawnAccRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastSnapRef = useRef(0);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  const pushRecent = (ok: boolean) => {
    recentRef.current.push(ok);
    if (recentRef.current.length > 36) recentRef.current.shift();
  };

  const handleRequest = useCallback(() => {
    if (algoRef.current === "token") {
      if (tokensRef.current >= 1) {
        tokensRef.current -= 1;
        allowedRef.current++;
        pushRecent(true);
      } else {
        rejectedRef.current++;
        pushRecent(false);
        setMissions((m) => (m.rejected ? m : { ...m, rejected: true }));
      }
    } else {
      if (queueRef.current < capRef.current) {
        queueRef.current += 1;
        pushRecent(true); // accepted into bucket
      } else {
        rejectedRef.current++;
        pushRecent(false); // overflow
        setMissions((m) => (m.rejected ? m : { ...m, rejected: true }));
      }
    }
  }, []);

  const buildSnapshot = useCallback((): Snapshot => {
    const a = algoRef.current;
    const cap = capRef.current;
    const level = a === "token" ? Math.floor(tokensRef.current) : queueRef.current;
    const frac = a === "token" ? tokensRef.current / cap : queueRef.current / cap;
    return {
      algo: a,
      level,
      frac: Math.max(0, Math.min(1, frac)),
      capacity: cap,
      allowed: allowedRef.current,
      rejected: rejectedRef.current,
      recent: [...recentRef.current],
    };
  }, []);

  const reset = useCallback(() => {
    tokensRef.current = capRef.current;
    queueRef.current = 0;
    drainAccRef.current = 0;
    allowedRef.current = 0;
    rejectedRef.current = 0;
    recentRef.current = [];
    spawnAccRef.current = 0;
    setSnap(buildSnapshot());
  }, [buildSnapshot]);

  const sendMany = useCallback((count: number) => {
    for (let i = 0; i < count; i++) handleRequest();
    setSnap(buildSnapshot());
  }, [handleRequest, buildSnapshot]);

  // ── loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = Math.min(100, now - last);
      lastTsRef.current = now;

      // refill / leak
      if (algoRef.current === "token") {
        tokensRef.current = Math.min(capRef.current, tokensRef.current + (rateRef.current * dt) / 1000);
      } else {
        drainAccRef.current += (rateRef.current * dt) / 1000;
        while (drainAccRef.current >= 1 && queueRef.current > 0) {
          drainAccRef.current -= 1;
          queueRef.current -= 1;
          allowedRef.current++; // a request was served (drained)
        }
      }

      // incoming traffic
      if (runningRef.current) {
        spawnAccRef.current += (dt / 1000) * reqRateRef.current;
        while (spawnAccRef.current >= 1) {
          spawnAccRef.current -= 1;
          handleRequest();
        }
      }

      if (now - lastSnapRef.current >= 60) {
        lastSnapRef.current = now;
        setSnap(buildSnapshot());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [handleRequest, buildSnapshot]);

  const isToken = algo === "token";
  const bucketColor = snap.frac >= 0.5 ? (isToken ? "from-emerald-500 to-cyan-500" : "from-amber-500 to-orange-500") : isToken ? "from-amber-500 to-rose-500" : "from-amber-400 to-amber-600";

  return (
    <LabShell
      icon="🚦"
      title={{ en: "Rate Limiter", ar: "محدّد المعدّل" }}
      difficulty="Intermediate"
      intro={{
        en: "The problem: clients (or a runaway script) can send far more requests than your server can handle, and a flood takes everyone down. The fix is a rate limiter standing at the door: it lets requests through up to a set rate and rejects the rest with HTTP 429 — sacrificing a few to protect the many. Token Bucket allows short bursts; Leaky Bucket forces a perfectly steady output. Run the three experiments below to feel the difference.",
        ar: "المشكلة: العملاء (أو سكربت فالت) ممكن يبعتوا طلبات أكتر بكتير مما يتحمّل الخادم، والطوفان بيوقّع الكل. الحل محدّد معدّل واقف عالباب: بيسمح للطلبات لحدّ معدّل معيّن ويرفض الباقي بـ HTTP 429 — بيضحّي بالقليل ليحمي الكثير. «دلو الرموز» بيسمح بدفعات قصيرة؛ و«الدلو المثقوب» بيفرض خرج ثابت تماماً. جرّب التجارب الثلاث تحت لتحسّ بالفرق.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Trigger a 429", done: missions.rejected },
          { label: "Fire a burst", done: missions.burst },
          { label: "Compare both buckets", done: missions.compared },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-5 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.algo)}</span>
          <div className="flex gap-1.5">
            {(["token", "leaky"] as Algo[]).map((a) => (
              <button key={a} type="button" onClick={() => { setAlgo(a); if (a === "leaky") setMissions((m) => (m.compared ? m : { ...m, compared: true })); }} className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", algo === a ? "bg-indigo-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")}>
                {a === "token" ? tr(L.token) : tr(L.leaky)}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tr(L.capacity)}: <b className="text-slate-700 dark:text-slate-200">{capacity}</b>
          <input type="range" min={3} max={16} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="accent-indigo-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {isToken ? tr(L.refill) : tr(L.leak)}: <b className="text-slate-700 dark:text-slate-200">{rate}</b>
          <input type="range" min={1} max={12} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-cyan-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tr(L.reqRate)}: <b className="text-slate-700 dark:text-slate-200">{reqRate}</b>
          <input type="range" min={1} max={25} value={reqRate} onChange={(e) => setReqRate(Number(e.target.value))} className="accent-rose-500" />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRunning((r) => !r)} className={["rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors", running ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"].join(" ")}>
            {running ? `⏸ ${tr(L.pause)}` : `▶ ${tr(L.auto)}`}
          </button>
          <button type="button" onClick={() => sendMany(1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">{tr(L.send1)}</button>
          <button type="button" onClick={() => { sendMany(12); setMissions((m) => (m.burst ? m : { ...m, burst: true })); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">{tr(L.burst)}</button>
          <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
        </div>
      </div>

      <TryIt
        items={[
          <>Press <b>▶ {tr(L.auto)}</b>, then drag <b>{tr(L.reqRate)}</b> up past the <b>{isToken ? tr(L.refill) : tr(L.leak)}</b> rate and watch red <b>429</b> marks appear in <i>{tr(L.recent)}</i>.</>,
          <>Pause auto traffic, then hit <b>{tr(L.burst)}</b> — Token Bucket lets a whole burst through at once (up to its capacity).</>,
          <>Switch to <b>{tr(L.leaky)}</b> and burst again — the output stays perfectly smooth instead.</>,
        ]}
      />

      {/* ── Bucket + stats ───────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="relative h-44 w-28 overflow-hidden rounded-b-xl rounded-t-md border-2 border-slate-300 dark:border-white/15">
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${bucketColor} transition-all duration-150`} style={{ height: `${snap.frac * 100}%` }} />
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-3xl font-bold text-slate-900 mix-blend-luminosity dark:text-white">{snap.level}</span>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isToken ? tr(L.tokens) : tr(L.inBucket)} / {snap.capacity}
          </span>
          {isToken && <span className="text-2xl">{snap.frac > 0.1 ? "🪙" : "🚫"}</span>}
          {!isToken && <span className="text-2xl">💧</span>}
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{snap.allowed}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{isToken ? tr(L.allowed) : tr(L.served)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{snap.rejected}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(L.rejected)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{snap.allowed + snap.rejected}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{tr(L.recent)}</span>
            <div className="mt-2 flex flex-wrap gap-1">
              {snap.recent.length === 0 ? <span className="text-xs text-slate-400">—</span> : snap.recent.map((ok, i) => (
                <span key={i} className={`h-3 w-3 rounded-sm ${ok ? "bg-emerald-500" : "bg-rose-500"}`} title={ok ? "ok" : "429"} />
              ))}
            </div>
          </div>

          <p className="rounded-xl border border-slate-200 bg-white/60 p-4 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            {isToken ? tr(L.tokenHow) : tr(L.leakyHow)}
          </p>
        </div>
      </div>

      <Aha show={missions.rejected}>
        Requests came in faster than the bucket could refill/drain, so the limiter started
        rejecting with <b>HTTP 429 (Too Many Requests)</b>. That&apos;s deliberate: dropping a few
        requests keeps the server alive for everyone else, instead of letting a flood crash it.
        Clients are expected to back off and retry later.
      </Aha>
      <Aha show={missions.compared}>
        Same flood, two shapes. <b>Token Bucket</b> saves up unused capacity, so it can let a
        sudden burst straight through (great for bursty-but-fair traffic). <b>Leaky Bucket</b>
        drains at a fixed rate no matter what, so the output is perfectly steady — it never
        lets a burst reach the server. Pick bursty-friendly vs strictly-smooth based on what
        you&apos;re protecting.
      </Aha>

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
          {allDone ? "🎉 You've shed load and compared both buckets." : "Limiting is one of several ways to survive overload"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          A rate limiter caps the <i>input</i>. But you also need to spread load across servers,
          and stop calling a service that&apos;s already drowning. These continue the story:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Load Balancer",
              desc: "Spread accepted requests across a pool so no single server takes the whole flood.",
              href: "/labs/load-balancer",
            },
            {
              fix: "Fault Tolerance",
              desc: "A circuit breaker sheds load too — it stops calling a service that's already overwhelmed.",
              href: "/labs/fault-tolerance",
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
