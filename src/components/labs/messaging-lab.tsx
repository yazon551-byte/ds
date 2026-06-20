"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import { TryIt, Aha, MissionTracker } from "@/components/labs/ux";
import { messagingInfo } from "@/lib/labs/messaging";
import type { Localized } from "@/lib/types";

const L = {
  publishOk: { en: "Publish message", ar: "انشر رسالة" },
  publishBad: { en: "Publish poison ☠", ar: "انشر سامّة ☠" },
  rate: { en: "Publish / sec", ar: "نشر/ثانية" },
  auto: { en: "Auto publish", ar: "نشر تلقائي" },
  pause: { en: "Pause", ar: "إيقاف" },
  subs: { en: "Subscribers", ar: "المشتركون" },
  maxRetries: { en: "Max retries", ar: "أقصى محاولات" },
  reset: { en: "Reset", ar: "إعادة" },
  publisher: { en: "Publisher", ar: "الناشر" },
  topic: { en: "Topic (broker)", ar: "الموضوع (الوسيط)" },
  processing: { en: "processing", ar: "تُعالَج" },
  queued: { en: "queued", ar: "بالطابور" },
  delivered: { en: "delivered", ar: "مُسلّمة" },
  published: { en: "Published", ar: "منشورة" },
  deliveredM: { en: "Deliveries", ar: "تسليمات" },
  retried: { en: "Retried", ar: "أُعيدت" },
  dead: { en: "Dead-lettered", ar: "ميتة" },
  dlq: { en: "Dead-Letter Queue", ar: "طابور الرسائل الميتة" },
  dlqEmpty: { en: "Empty — publish a poison message to fill it.", ar: "فارغ — انشر رسالة سامّة لتملأه." },
  retry: { en: "retry", ar: "محاولة" },
  concepts: { en: "The concepts", ar: "المفاهيم" },
} satisfies Record<string, Localized>;

interface Item { msgId: number; poison: boolean; attempts: number; }
interface Sub {
  name: string;
  queue: Item[];
  current: Item | null;
  doneAt: number;
  delivered: number;
  dlq: Item[];
}

interface SubView {
  name: string;
  queue: Item[];
  current: Item | null;
  delivered: number;
  dlqCount: number;
}
interface Snapshot {
  subs: SubView[];
  published: number;
  delivered: number;
  retried: number;
  dead: number;
  dlq: { id: number; sub: string }[];
}

function buildSubs(n: number): Sub[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `Sub ${String.fromCharCode(65 + i)}`,
    queue: [],
    current: null,
    doneAt: 0,
    delivered: 0,
    dlq: [],
  }));
}

const procTime = () => 500 + Math.random() * 500;

function initialSnapshot(): Snapshot {
  return {
    subs: buildSubs(3).map((s) => ({ name: s.name, queue: [], current: null, delivered: 0, dlqCount: 0 })),
    published: 0,
    delivered: 0,
    retried: 0,
    dead: 0,
    dlq: [],
  };
}

export function MessagingLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  const [subsCount, setSubsCount] = useState(3);
  const [maxRetries, setMaxRetries] = useState(2);
  const [rate, setRate] = useState(1.5);
  const [running, setRunning] = useState(false); // start paused — user presses ▶ when ready

  // ── gamification: publish, poison, and watch the DLQ catch it ───────
  const [missions, setMissions] = useState({ published: false, poison: false, dlq: false });
  const allDone = missions.published && missions.poison && missions.dlq;

  const maxRetriesRef = useRef(maxRetries);
  const rateRef = useRef(rate);
  const runningRef = useRef(running);
  useEffect(() => void (maxRetriesRef.current = maxRetries), [maxRetries]);
  useEffect(() => void (rateRef.current = rate), [rate]);
  useEffect(() => void (runningRef.current = running), [running]);

  const subsRef = useRef<Sub[]>(buildSubs(3));
  const msgIdRef = useRef(0);
  const mRef = useRef({ published: 0, delivered: 0, retried: 0, dead: 0 });
  const dlqRef = useRef<{ id: number; sub: string }[]>([]);
  const spawnAccRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const lastSnapRef = useRef(0);

  const buildSnapshot = useCallback((): Snapshot => {
    return {
      subs: subsRef.current.map((s) => ({
        name: s.name,
        queue: s.queue.slice(0, 8),
        current: s.current,
        delivered: s.delivered,
        dlqCount: s.dlq.length,
      })),
      published: mRef.current.published,
      delivered: mRef.current.delivered,
      retried: mRef.current.retried,
      dead: mRef.current.dead,
      dlq: dlqRef.current.slice(-10).reverse(),
    };
  }, []);

  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  const publish = useCallback((poison: boolean) => {
    // backpressure: if any subscriber's queue is full, refuse the publish
    // instead of silently dropping it for that subscriber.
    if (subsRef.current.some((s) => s.queue.length >= 60)) return;
    const id = msgIdRef.current++;
    for (const s of subsRef.current) s.queue.push({ msgId: id, poison, attempts: 0 });
    mRef.current.published++;
    setMissions((m) => {
      if (poison) return m.poison ? m : { ...m, poison: true };
      return m.published ? m : { ...m, published: true };
    });
    setSnap(buildSnapshot());
  }, [buildSnapshot]);

  const setCount = useCallback((n: number) => {
    const clamped = Math.max(2, Math.min(4, n));
    const cur = subsRef.current;
    if (clamped > cur.length) {
      for (let i = cur.length; i < clamped; i++) {
        cur.push({ name: `Sub ${String.fromCharCode(65 + i)}`, queue: [], current: null, doneAt: 0, delivered: 0, dlq: [] });
      }
    } else if (clamped < cur.length) {
      subsRef.current = cur.slice(0, clamped);
    }
    setSubsCount(clamped);
    setSnap(buildSnapshot());
  }, [buildSnapshot]);

  const reset = useCallback(() => {
    subsRef.current = buildSubs(subsCount);
    msgIdRef.current = 0;
    mRef.current = { published: 0, delivered: 0, retried: 0, dead: 0 };
    dlqRef.current = [];
    spawnAccRef.current = 0;
    setSnap(buildSnapshot());
  }, [subsCount, buildSnapshot]);

  // ── loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const last = lastTsRef.current ?? now;
      const dt = Math.min(100, now - last);
      lastTsRef.current = now;
      const m = mRef.current;

      if (runningRef.current) {
        spawnAccRef.current += (dt / 1000) * rateRef.current;
        while (spawnAccRef.current >= 1) {
          // backpressure: a full subscriber queue pauses publishing instead of dropping
          if (subsRef.current.some((s) => s.queue.length >= 60)) { spawnAccRef.current = 0; break; }
          spawnAccRef.current -= 1;
          const poison = Math.random() < 0.18;
          const id = msgIdRef.current++;
          for (const s of subsRef.current) s.queue.push({ msgId: id, poison, attempts: 0 });
          m.published++;
        }
      }

      for (const s of subsRef.current) {
        if (!s.current && s.queue.length > 0) {
          s.current = s.queue.shift()!;
          s.doneAt = now + procTime();
        }
        if (s.current && now >= s.doneAt) {
          const item = s.current;
          if (!item.poison) {
            s.delivered++;
            m.delivered++;
            s.current = null;
          } else {
            item.attempts++;
            if (item.attempts >= maxRetriesRef.current + 1) {
              s.dlq.push(item);
              dlqRef.current.push({ id: item.msgId, sub: s.name });
              if (dlqRef.current.length > 40) dlqRef.current = dlqRef.current.slice(-40);
              m.dead++;
              s.current = null;
              setMissions((mm) => (mm.dlq ? mm : { ...mm, dlq: true }));
            } else {
              m.retried++;
              s.queue.push(item); // re-deliver (back of queue)
              s.current = null;
            }
          }
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
  }, [buildSnapshot]);

  const metricCards = [
    { label: L.published, value: snap.published, accent: "text-slate-900 dark:text-white" },
    { label: L.deliveredM, value: snap.delivered, accent: "text-emerald-600 dark:text-emerald-400" },
    { label: L.retried, value: snap.retried, accent: "text-amber-600 dark:text-amber-400" },
    { label: L.dead, value: snap.dead, accent: "text-rose-600 dark:text-rose-400" },
  ];

  const chip = (it: Item, key: string) => (
    <span key={key} className={["rounded px-1.5 py-0.5 font-mono text-[11px] font-medium", it.poison ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"].join(" ")}>
      {it.poison ? "☠" : "#"}{it.msgId}{it.attempts > 0 ? `·${tr(L.retry)}${it.attempts}` : ""}
    </span>
  );

  return (
    <LabShell
      icon="✉️"
      title={{ en: "Messaging & Pub/Sub", ar: "الرسائل و Pub/Sub" }}
      difficulty="Intermediate"
      intro={{
        en: "The problem: a direct call forces the sender to wait for the receiver, and breaks if the receiver is down. The fix is messaging: the publisher drops an event into a broker and moves on; each subscriber consumes it on its own time, and messages wait safely if a consumer is offline. But a message that always fails (a poison ☠) would retry forever and block everyone — so after a few tries it's quarantined in a Dead-Letter Queue. Run the three experiments below.",
        ar: "المشكلة: النداء المباشر بيجبر المُرسِل ينتظر المُستقبِل، وبينكسر إذا المُستقبِل واقع. الحل الرسائل (messaging): الناشر بيرمي حدث بالوسيط (broker) ويكمّل، وكل مشترك بيستهلكه على وقته، والرسائل بتنتظر بأمان إذا مستهلك أوفلاين. بس رسالة بتفشل دايماً (سامّة ☠) رح تعيد للأبد وتسدّ الطابور — لهيك بعد كم محاولة بتنعزل بطابور الرسائل الميتة (DLQ). جرّب التجارب الثلاث تحت.",
      }}
    >
      {/* ── Sticky mission tracker ────────────────────────────── */}
      <MissionTracker
        title="Experiments"
        missions={[
          { label: "Publish & fan out", done: missions.published },
          { label: "Send a poison ☠", done: missions.poison },
          { label: "Fill the Dead-Letter Queue", done: missions.dlq },
        ]}
      />

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <button type="button" onClick={() => publish(false)} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
          {tr(L.publishOk)}
        </button>
        <button type="button" onClick={() => publish(true)} className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400">
          {tr(L.publishBad)}
        </button>
        <button type="button" onClick={() => setRunning((r) => !r)} className={["rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors", running ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"].join(" ")}>
          {running ? `⏸ ${tr(L.pause)}` : `▶ ${tr(L.auto)}`}
        </button>

        <label className="flex min-w-32 flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tr(L.rate)}: <b className="text-slate-700 dark:text-slate-200">{rate.toFixed(1)}</b>
          <input type="range" min={0.5} max={6} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-indigo-500" />
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tr(L.maxRetries)}: <b className="text-slate-700 dark:text-slate-200">{maxRetries}</b>
          <input type="range" min={0} max={4} value={maxRetries} onChange={(e) => setMaxRetries(Number(e.target.value))} className="accent-amber-500" />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">{tr(L.subs)}: <b className="text-slate-700 dark:text-slate-200">{subsCount}</b></span>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Fewer subscribers" onClick={() => setCount(subsCount - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">−</button>
            <button type="button" aria-label="More subscribers" onClick={() => setCount(subsCount + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">+</button>
          </div>
        </div>

        <button type="button" onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
      </div>

      <TryIt
        items={[
          <>Press <b>{tr(L.publishOk)}</b> and watch the same message land in <i>every</i> subscriber&apos;s queue at once.</>,
          <>Press <b>{tr(L.publishBad)}</b> — it fails and gets re-queued (watch the <code>·{tr(L.retry)}</code> counter climb).</>,
          <>Keep going until a poison message exhausts its retries and drops into the <b>{tr(L.dlq)}</b> below.</>,
        ]}
      />

      {/* ── Flow: publisher → topic → subscribers ────────────── */}
      <div className="mt-5 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/60 px-4 py-6 dark:border-white/10 dark:bg-white/[0.03] lg:w-40 lg:flex-col">
          <span className="text-2xl">📤</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{tr(L.publisher)}</span>
        </div>
        <span className="hidden text-slate-300 lg:block dark:text-slate-600">→</span>
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-cyan-300/40 bg-cyan-500/5 px-4 py-6 lg:w-40">
          <span className="text-2xl">📨</span>
          <span className="text-center text-sm font-semibold text-cyan-700 dark:text-cyan-300">{tr(L.topic)}</span>
        </div>
        <span className="hidden text-slate-300 lg:block dark:text-slate-600">⇉</span>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snap.subs.map((s) => (
            <div key={s.name} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">📥 {s.name}</span>
                {s.dlqCount > 0 && <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">DLQ {s.dlqCount}</span>}
              </div>

              {/* now processing */}
              <div className="min-h-7">
                {s.current ? (
                  <span className="inline-flex animate-pulse items-center gap-1 rounded-lg border border-indigo-300/50 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    ⚙ {tr(L.processing)}: {chip(s.current, "cur")}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">—</span>
                )}
              </div>

              {/* queue */}
              <div className="flex flex-wrap gap-1">
                {s.queue.map((it, idx) => chip(it, `q${idx}`))}
              </div>

              <div className="mt-auto flex justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
                <span>{s.queue.length} {tr(L.queued)}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{s.delivered} {tr(L.delivered)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Aha show={missions.published}>
        One publish, and the broker copied that message into <i>every</i> subscriber&apos;s own
        queue. The publisher never knew who the subscribers were — that&apos;s the decoupling: you
        can add or remove consumers without touching the sender, and each works through its
        backlog at its own pace.
      </Aha>

      {/* ── Metrics ──────────────────────────────────────────── */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricCards.map((m) => (
          <div key={tr(m.label)} className="rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <div className={`text-xl font-bold ${m.accent}`}>{m.value}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr(m.label)}</div>
          </div>
        ))}
      </div>

      {/* ── DLQ ──────────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-rose-500">☠ {tr(L.dlq)}</h3>
        {snap.dlq.length === 0 ? (
          <p className="text-sm text-slate-400">{tr(L.dlqEmpty)}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {snap.dlq.map((d, i) => (
              <span key={i} className="rounded-lg bg-rose-500/10 px-2 py-1 font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
                ☠ #{d.id} · {d.sub}
              </span>
            ))}
          </div>
        )}
      </div>

      <Aha show={missions.dlq}>
        That poison message would have retried forever and clogged the queue behind it.
        Instead, after hitting the retry limit it was moved aside into the Dead-Letter Queue —
        the pipeline keeps flowing, and a human (or a separate job) can inspect the failures
        later. Try lowering <b>{tr(L.maxRetries)}</b> and watch messages reach the DLQ faster.
      </Aha>

      {/* ── Concepts ─────────────────────────────────────────── */}
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr(L.concepts)}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {messagingInfo.map((c) => (
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
          {allDone ? "🎉 You've published, poisoned, and dead-lettered." : "Events are the backbone of bigger workflows"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Once services talk through events instead of direct calls, you can chain them into
          long workflows — and you need a plan for when one step fails. You also need to stop a
          flood of messages from overwhelming a consumer. These continue the story:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              fix: "Saga",
              desc: "Chain steps across services with events, and undo the finished ones when a later step fails.",
              href: "/labs/saga",
            },
            {
              fix: "Rate Limiter",
              desc: "Cap how fast a consumer accepts work so a burst of messages can't overwhelm it.",
              href: "/labs/rate-limiter",
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
