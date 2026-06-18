"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LabShell } from "@/components/lab-shell";

const LAT_LOCAL = 5;
const LAT_REMOTE = 800;

// ── small reusable UX bits ──────────────────────────────────────────────
function TryIt({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-1.5 rounded-xl border border-indigo-200/70 bg-indigo-50/60 p-3.5 text-sm dark:border-indigo-400/20 dark:bg-indigo-500/[0.06]">
      <span className="mb-0.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
        👉 Try this
      </span>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-indigo-500">{i + 1}.</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Aha({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <p className="mt-4 rounded-xl bg-emerald-500/10 p-3.5 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
      💡 <b>What just happened:</b> {children}
    </p>
  );
}

const SOLUTIONS = [
  { problem: "Latency", fix: "Load Balancer", desc: "Spread requests across servers and route around slow ones.", href: "/labs/load-balancer" },
  { problem: "Partial Failure", fix: "Fault Tolerance", desc: "Retries, circuit breakers and fallbacks for half-failed calls.", href: "/labs/fault-tolerance" },
  { problem: "Concurrency", fix: "Raft Consensus", desc: "Make many machines agree on one value, safely.", href: "/labs/raft" },
];

export function ThreeHorsemenLab() {
  // ── 1. Latency ──
  const [latMode, setLatMode] = useState<"local" | "remote">("remote");
  const [latState, setLatState] = useState<"idle" | "running" | "done">("idle");
  const latTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (latTimer.current) clearTimeout(latTimer.current); }, []);
  const latMs = latMode === "local" ? LAT_LOCAL : LAT_REMOTE;
  const animMs = latMode === "local" ? 400 : 1600;

  // ── 2. Partial failure ──
  const [dbDown, setDbDown] = useState(false);
  const [pfResult, setPfResult] = useState<"none" | "saved" | "unknown">("none");

  // ── 3. Concurrency ──
  const [useLock, setUseLock] = useState(false);
  const [seats, setSeats] = useState(1);
  const [cResults, setCResults] = useState<{ user: string; ok: boolean }[]>([]);

  // ── gamification: which problems has the user actually caused? ──
  const [disc, setDisc] = useState({ latency: false, pf: false, conc: false });
  const discoveredCount = Number(disc.latency) + Number(disc.pf) + Number(disc.conc);
  const allFound = discoveredCount === 3;

  const sendLatency = () => {
    if (latTimer.current) clearTimeout(latTimer.current);
    setLatState("running");
    latTimer.current = setTimeout(() => {
      setLatState("done");
      setDisc((d) => ({ ...d, latency: true }));
    }, animMs);
  };
  const doSave = () => {
    const r = dbDown ? "unknown" : "saved";
    setPfResult(r);
    if (r === "unknown") setDisc((d) => ({ ...d, pf: true }));
  };
  const bothClick = () => {
    if (useLock) {
      setSeats(0);
      setCResults([{ user: "User A", ok: true }, { user: "User B", ok: false }]);
    } else {
      setSeats(-1);
      setCResults([{ user: "User A", ok: true }, { user: "User B", ok: true }]);
      setDisc((d) => ({ ...d, conc: true }));
    }
  };
  const cReset = () => { setSeats(1); setCResults([]); };

  const chip = (label: string, on: boolean) => (
    <span className={["rounded-full px-3 py-1 text-xs font-semibold transition-colors", on ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400"].join(" ")}>
      {on ? "✓ " : "○ "}{label}
    </span>
  );

  return (
    <LabShell
      title="The Three Horsemen"
      intro="No background needed. This page isn't about solutions yet — it's about feeling the three problems that make distributed systems hard. Cause each one below, then scroll down to see how we'll solve them."
    >
      {/* ── Sticky mission tracker (stays visible while scrolling) ─ */}
      <div className="sticky top-16 z-40 -mx-4 mb-6 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 dark:border-white/10 dark:bg-[#060914]/85">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            🧭 Mission: trigger all three problems —{" "}
            <span className="text-indigo-600 dark:text-indigo-400">{discoveredCount}/3 found</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {chip("Latency", disc.latency)}
            {chip("Partial Failure", disc.pf)}
            {chip("Concurrency", disc.conc)}
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" style={{ width: `${(discoveredCount / 3) * 100}%` }} />
        </div>
      </div>

      {/* ── 1. Latency ─────────────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1 · Latency — remote calls aren&apos;t instant</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">A remote call has to cross the network and come back. Distance turns a 5ms local call into a ~800ms cross-region one — and they stack up.</p>

        <TryIt items={[
          <>Make sure <b>Cross-region</b> is selected.</>,
          <>Press <b>Send request</b> and watch how long the bar takes.</>,
          <>Switch to <b>Local</b> and send again — feel the difference.</>,
        ]} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["local", "remote"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setLatMode(m); setLatState("idle"); }} className={["rounded-lg px-3 py-2 text-sm font-medium transition-colors", latMode === m ? "bg-indigo-500 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"].join(" ")}>
              {m === "local" ? "Local" : "Cross-region"}
            </button>
          ))}
          <button type="button" onClick={sendLatency} disabled={latState === "running"} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {latState === "running" ? "Waiting…" : "Send request"}
          </button>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: latState === "idle" ? "0%" : "100%", transition: latState === "running" ? `width ${animMs}ms linear` : "width 120ms" }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-slate-500 dark:text-slate-400">1 call: <b className="text-slate-800 dark:text-slate-100">{latMs}ms</b></span>
          <span className="text-slate-500 dark:text-slate-400">5 sequential calls: <b className="text-amber-600 dark:text-amber-400">{latMs * 5}ms</b></span>
          {latState === "done" && <span className="font-semibold text-emerald-600 dark:text-emerald-400">Response received ({latMs}ms)</span>}
        </div>

        <Aha show={disc.latency}>That ~800ms is the network round-trip you can&apos;t avoid. Chain five such calls and the user waits 4 whole seconds. Good systems hide latency by caching, batching, and doing work in parallel.</Aha>
      </section>

      {/* ── 2. Partial failure ─────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2 · Partial Failure — one part dies, the rest live on</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">The app server is fine, but its database is down. The request half-completes and you&apos;re left in an UNKNOWN state: did it save or not?</p>

        <TryIt items={[
          <>Click the database button until it reads <b>Database: down</b>.</>,
          <>Press <b>Save data</b> and read the result.</>,
        ]} />

        {/* Controls — the buttons to click */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Controls</span>
          <button type="button" onClick={() => { setDbDown((v) => !v); setPfResult("none"); }} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 dark:bg-white/15 dark:hover:bg-white/25">
            🔌 Turn database {dbDown ? "on" : "off"}
          </button>
          <button type="button" onClick={doSave} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]">
            💾 Save data
          </button>
        </div>

        {/* Diagram — representation only (not clickable) */}
        <div className="mt-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System (diagram only)</span>
          <div className="mt-2 flex select-none items-stretch gap-3">
            <div className="flex flex-1 cursor-default items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-medium text-slate-600 dark:border-white/15 dark:bg-white/[0.02] dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 🖥️ App server
            </div>
            <span className={["flex items-center text-lg", pfResult === "unknown" ? "text-rose-500" : "text-slate-400"].join(" ")}>{pfResult === "unknown" ? "→✕" : "→"}</span>
            <div className={["flex flex-1 cursor-default items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-4 text-sm font-medium", dbDown ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/5 dark:text-rose-400" : "border-slate-300 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/[0.02] dark:text-slate-300"].join(" ")}>
              <span className={["h-2 w-2 rounded-full", dbDown ? "bg-rose-500" : "bg-emerald-500"].join(" ")} /> 🗄️ Database {dbDown ? "(down)" : ""}
            </div>
          </div>
        </div>
        {pfResult !== "none" && (
          <p className={["mt-3 rounded-lg p-3 text-sm font-medium", pfResult === "saved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"].join(" ")}>
            {pfResult === "saved" ? "✓ Saved successfully" : "⚠ UNKNOWN — the request reached the app but the DB failed. Did it save? (the 'zombie' problem)"}
          </p>
        )}

        <Aha show={disc.pf}>The app accepted your request but the DB died mid-write. You genuinely can&apos;t tell if it saved — retrying might double-charge, not retrying might lose it. That uncertainty (not the crash) is the hard part. Fixes: timeouts, idempotency, health checks.</Aha>
      </section>

      {/* ── 3. Concurrency ─────────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white/60 p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3 · Concurrency — two requests fight over one thing</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">One seat left. Two users click &quot;Book&quot; at the same instant. Without a lock, both pass the check before either decrements — and the seat is sold twice.</p>

        <TryIt items={[
          <>Leave it on <b>🔓 No lock</b>.</>,
          <>Press <b>Both users click at once</b> — watch the seat count.</>,
          <>Now switch to <b>🔒 Lock on</b> and try again.</>,
        ]} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setUseLock((v) => !v); cReset(); }} className={["rounded-lg px-3 py-2 text-sm font-semibold transition-colors", useLock ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-slate-200/60 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300"].join(" ")}>
            {useLock ? "🔒 Lock on (synchronized)" : "🔓 No lock"}
          </button>
          <button type="button" onClick={bothClick} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
            Both users click at once
          </button>
          <button type="button" onClick={cReset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5">↺ Reset</button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">Seats left:</span>
          <span className={["text-3xl font-bold tabular-nums", seats < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"].join(" ")}>{seats}</span>
        </div>
        {cResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-3">
              {cResults.map((r) => (
                <span key={r.user} className={["rounded-lg px-3 py-1.5 text-sm font-medium", r.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-200/60 text-slate-500 dark:bg-white/5 dark:text-slate-400"].join(" ")}>
                  {r.user}: {r.ok ? "got the seat ✓" : "sold out ✕"}
                </span>
              ))}
            </div>
            <p className={["text-sm font-semibold", seats < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"].join(" ")}>
              {seats < 0 ? "OVERSOLD! the seat was sold twice 😱" : "Safe — exactly one booking."}
            </p>
          </div>
        )}

        <Aha show={disc.conc}>Both buyers ran the &quot;is a seat available?&quot; check before either subtracted — so both got a &quot;yes&quot; and the seat sold twice. A lock forces them to take turns. On one machine that&apos;s <code>synchronized</code>; across machines you need a <b>distributed lock</b> or consensus.</Aha>
      </section>

      {/* ── Closing: these are real problems → solutions ─────── */}
      <section className={["mt-8 rounded-2xl border p-6 transition-colors", allFound ? "border-emerald-400/40 bg-emerald-500/5" : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]"].join(" ")}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {allFound ? "🎉 You found all three. Now let's solve them." : "These are real problems — and here's how we solve them"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Every distributed system on earth fights these three. That&apos;s exactly why this lab exists: each module takes one problem and lets you play with a real solution. Start with the one tied to each horseman:
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <Link key={s.problem} href={s.href} className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.problem}</span>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">{s.fix} →</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </LabShell>
  );
}
