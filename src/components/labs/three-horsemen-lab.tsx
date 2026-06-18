"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { LabShell } from "@/components/lab-shell";
import type { Localized } from "@/lib/types";

const L = {
  // latency
  latencyTitle: { en: "1 · Latency — remote calls aren't instant", ar: "١ · التأخير — النداءات البعيدة ليست فورية" },
  latencyDesc: { en: "A remote call must cross the network and come back. Distance turns a 5ms local call into a ~800ms cross-region one — and they stack up.", ar: "النداء البعيد يعبر الشبكة ويعود. المسافة تحوّل نداءً محلياً 5ms إلى ~800ms عبر المناطق — وتتراكم." },
  local: { en: "Local", ar: "محلي" },
  remote: { en: "Cross-region", ar: "عبر منطقة" },
  send: { en: "Send request", ar: "أرسل طلباً" },
  sending: { en: "Waiting…", ar: "بالانتظار…" },
  done: { en: "Response received", ar: "وصل الرد" },
  oneCall: { en: "1 call", ar: "نداء واحد" },
  fiveCalls: { en: "5 sequential calls", ar: "5 نداءات متتالية" },
  // partial failure
  pfTitle: { en: "2 · Partial Failure — one part dies, the rest live on", ar: "٢ · الفشل الجزئي — جزء يموت والباقي يعمل" },
  pfDesc: { en: "The app server is fine, but its database is down. The request half-completes and you're left in an UNKNOWN state: did it save or not?", ar: "خادم التطبيق سليم، لكن قاعدة بياناته متوقفة. الطلب يكتمل جزئياً وتبقى في حالة مجهولة: هل حُفظ أم لا؟" },
  dbDown: { en: "Database down", ar: "قاعدة البيانات متوقفة" },
  dbUp: { en: "Database up", ar: "قاعدة البيانات تعمل" },
  save: { en: "Save data", ar: "احفظ البيانات" },
  app: { en: "App server", ar: "خادم التطبيق" },
  db: { en: "Database", ar: "قاعدة البيانات" },
  saved: { en: "✓ Saved successfully", ar: "✓ حُفظ بنجاح" },
  unknown: { en: "⚠ UNKNOWN — request reached the app but the DB failed. Did it save? (the 'zombie' problem)", ar: "⚠ مجهول — الطلب وصل للتطبيق لكن قاعدة البيانات فشلت. هل حُفظ؟ (مشكلة «الزومبي»)" },
  // concurrency
  cTitle: { en: "3 · Concurrency — two requests fight over one thing", ar: "٣ · التزامن — طلبان يتنازعان على شيء واحد" },
  cDesc: { en: "One seat left. Two users click 'Book' at the same instant. Without a lock, both pass the check before either decrements — and the seat is sold twice.", ar: "كرسي واحد متبقٍّ. مستخدمان يضغطان «احجز» باللحظة نفسها. بلا قفل، كلاهما يجتاز الفحص قبل أن ينقص أحدهما — فيُباع الكرسي مرّتين." },
  useLock: { en: "Use lock (synchronized)", ar: "استخدم قفلاً (synchronized)" },
  noLock: { en: "No lock", ar: "بلا قفل" },
  bothClick: { en: "Both users click at once", ar: "كلا المستخدمَين يضغطان معاً" },
  seatsLeft: { en: "Seats left", ar: "الكراسي المتبقية" },
  reset: { en: "Reset", ar: "إعادة" },
  got: { en: "got the seat ✓", ar: "حصل على الكرسي ✓" },
  soldOut: { en: "sold out ✕", ar: "نفدت ✕" },
  oversold: { en: "OVERSOLD! the seat was sold twice 😱", ar: "بيع زائد! بِيع الكرسي مرّتين 😱" },
  safe: { en: "Safe — exactly one booking.", ar: "آمن — حجز واحد بالضبط." },
} satisfies Record<string, Localized>;

const LAT_LOCAL = 5;
const LAT_REMOTE = 800;

export function ThreeHorsemenLab() {
  const { lang } = useApp();
  const tr = (o: Localized) => o[lang];

  // ── latency ──
  const [latMode, setLatMode] = useState<"local" | "remote">("remote");
  const [latState, setLatState] = useState<"idle" | "running" | "done">("idle");
  const latTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (latTimer.current) clearTimeout(latTimer.current); }, []);
  const latMs = latMode === "local" ? LAT_LOCAL : LAT_REMOTE;
  const animMs = latMode === "local" ? 400 : 1600;
  const sendLatency = () => {
    if (latTimer.current) clearTimeout(latTimer.current);
    setLatState("running");
    latTimer.current = setTimeout(() => setLatState("done"), animMs);
  };

  // ── partial failure ──
  const [dbDown, setDbDown] = useState(false);
  const [pfResult, setPfResult] = useState<"none" | "saved" | "unknown">("none");
  const doSave = () => setPfResult(dbDown ? "unknown" : "saved");

  // ── concurrency ──
  const [useLock, setUseLock] = useState(false);
  const [seats, setSeats] = useState(1);
  const [cResults, setCResults] = useState<{ user: string; ok: boolean }[]>([]);
  const bothClick = () => {
    if (useLock) {
      // sequential: only one wins
      setSeats(0);
      setCResults([{ user: "User A", ok: true }, { user: "User B", ok: false }]);
    } else {
      // race: both pass the check, both decrement -> oversold
      setSeats(-1);
      setCResults([{ user: "User A", ok: true }, { user: "User B", ok: true }]);
    }
  };
  const cReset = () => { setSeats(1); setCResults([]); };

  return (
    <LabShell
      icon="🐎"
      title={{ en: "The Three Horsemen", ar: "الفرسان الثلاثة" }}
      difficulty="Beginner"
      intro={{
        en: "Almost every hard problem in distributed systems comes down to three things. Play with each one below to feel why they matter — they're the foundation everything else builds on.",
        ar: "معظم المشاكل الصعبة في الأنظمة الموزّعة تعود إلى ثلاثة أمور. جرّب كلاً منها بالأسفل لتشعر بأهميتها — فهي الأساس الذي يُبنى عليه كل شيء.",
      }}
    >
      {/* ── 1. Latency ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{tr(L.latencyTitle)}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tr(L.latencyDesc)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["local", "remote"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setLatMode(m); setLatState("idle"); }} className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", latMode === m ? "bg-indigo-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")}>
              {m === "local" ? tr(L.local) : tr(L.remote)}
            </button>
          ))}
          <button type="button" onClick={sendLatency} disabled={latState === "running"} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {latState === "running" ? tr(L.sending) : `▶ ${tr(L.send)}`}
          </button>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: latState === "idle" ? "0%" : "100%", transition: latState === "running" ? `width ${animMs}ms linear` : "width 120ms" }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-slate-500 dark:text-slate-400">{tr(L.oneCall)}: <b className="text-slate-800 dark:text-slate-100">{latMs}ms</b></span>
          <span className="text-slate-500 dark:text-slate-400">{tr(L.fiveCalls)}: <b className="text-amber-600 dark:text-amber-400">{latMs * 5}ms</b></span>
          {latState === "done" && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{tr(L.done)} ({latMs}ms)</span>}
        </div>
      </section>

      {/* ── 2. Partial failure ─────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{tr(L.pfTitle)}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tr(L.pfDesc)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setDbDown((v) => !v); setPfResult("none"); }} className={["rounded-lg px-3 py-2 text-sm font-semibold transition-colors", dbDown ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"].join(" ")}>
            {dbDown ? tr(L.dbDown) : tr(L.dbUp)}
          </button>
          <button type="button" onClick={doSave} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
            {tr(L.save)}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-emerald-300/50 bg-emerald-500/5 p-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">🖥️ {tr(L.app)}</div>
          <span className={pfResult === "unknown" ? "text-rose-500" : "text-slate-400"}>{pfResult === "unknown" ? "✕→" : "→"}</span>
          <div className={["flex-1 rounded-xl border p-3 text-center text-sm font-semibold", dbDown ? "border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-400" : "border-emerald-300/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"].join(" ")}>
            🗄️ {tr(L.db)} {dbDown ? "✕" : ""}
          </div>
        </div>
        {pfResult !== "none" && (
          <p className={["mt-3 rounded-lg p-3 text-sm font-medium", pfResult === "saved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"].join(" ")}>
            {pfResult === "saved" ? tr(L.saved) : tr(L.unknown)}
          </p>
        )}
      </section>

      {/* ── 3. Concurrency ─────────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{tr(L.cTitle)}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{tr(L.cDesc)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setUseLock((v) => !v); cReset(); }} className={["rounded-lg px-3 py-2 text-sm font-semibold transition-colors", useLock ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-slate-200/60 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"].join(" ")}>
            {useLock ? `🔒 ${tr(L.useLock)}` : `🔓 ${tr(L.noLock)}`}
          </button>
          <button type="button" onClick={bothClick} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
            {tr(L.bothClick)}
          </button>
          <button type="button" onClick={cReset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ {tr(L.reset)}</button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">{tr(L.seatsLeft)}:</span>
          <span className={["text-3xl font-bold tabular-nums", seats < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"].join(" ")}>{seats}</span>
        </div>
        {cResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-3">
              {cResults.map((r) => (
                <span key={r.user} className={["rounded-lg px-3 py-1.5 text-sm font-medium", r.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-200/60 text-slate-500 dark:bg-white/5 dark:text-slate-400"].join(" ")}>
                  {r.user}: {r.ok ? tr(L.got) : tr(L.soldOut)}
                </span>
              ))}
            </div>
            <p className={["text-sm font-semibold", seats < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"].join(" ")}>
              {seats < 0 ? tr(L.oversold) : tr(L.safe)}
            </p>
          </div>
        )}
      </section>
    </LabShell>
  );
}
